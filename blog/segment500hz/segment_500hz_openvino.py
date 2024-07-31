import numpy as np
from openvino.inference_engine import IECore
from scipy import signal
import os
import gc
import time
import math
import pandas as pd
import matplotlib.pyplot as plt
from scipy.signal import find_peaks


# os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
#
# config = tf.compat.v1.ConfigProto(gpu_options=tf.compat.v1.GPUOptions(allow_growth=True))
# sess = tf.compat.v1.Session(config=config)
# os.environ["CUDA_VISIBLE_DEVICES"] = "0"

os.environ["CUDA_VISIBLE_DEVICES"] = "-1"

readmodel = None

# 这个函数在view里调用，页面初始化的时候就初始化模型
def initialize_variable_s():

    global readmodel
    global net
    global exec_net

    if readmodel == None:
        ie = IECore()
        abs_file = __file__
        folder = os.path.split(abs_file)[0]
        model_xml = 'blog/segment500hz/dualpath_singlelead_2s.xml'#
        model_bin = 'blog/segment500hz/dualpath_singlelead_2s.bin'#
        net = ie.read_network(model=model_xml, weights=model_bin)
        exec_net = ie.load_network(network=net, device_name='CPU')


# region 模型处理代码
#直接对openvino模型的调用， 输入的形状必须是(9,1008,1)，输出的形状是(9.1008,4) 该函数被go_throught_model调用
def openvino_predict(ecg_data):

    global readmodel
    global net
    global exec_net
    readmodel = 1

    feature = ecg_data #(9,1008,1)

    input_blob = next(iter(net.input_info))
    output_info = net.outputs
    output_blob = next(iter(output_info))

    feature_pred_ori = exec_net.infer(inputs={input_blob: feature})

    feature_pred_1 = feature_pred_ori[output_blob]
  
    del feature_pred_ori
    gc.collect()
    return feature_pred_1
#以10s，9导联的样本为单位先做滑窗处理然后调用openvino_predict函数，得到带重叠的片段输出， in (5008,9)，out (9,9,1008)
def go_throught_model(unlabel_data):
    slice_data =[] # 用于存放滑窗分割出来的2s片段
    pred_9_lead = [] # 用于存放预测结果，9导联分别的到9个预测结果，一个个地往这个列表添加
    step = 500 # 滑窗步长
    max_segment_num = int((5008-1008)//step)
    for i in range(max_segment_num+1):
        win_start_idx = i*step
        win_end_idx = win_start_idx + 1008
        slice_data.append(unlabel_data[win_start_idx:win_end_idx])
    slice_data = np.array(slice_data)# 这里的形状是（n,1008,9）n(9)是片段数，9是9导联
    for lead_idx in range(9):# 把导联一个一个取出来，推理完之后再合回来
        data_clip2s_single_lead = slice_data[:,:,lead_idx:lead_idx+1]#lead_idx:lead_idx+1可以保持切片后仍人保持3维的（n,1008,9）->(n,1008,1)
        pred_single_lead = openvino_predict(data_clip2s_single_lead)#ndarray(n,1008,4)
        pred_single_lead = np.argmax(pred_single_lead,axis=2)#ndarray(n,1008)把每格采样点的预测结果最大的索引取到
        pred_9_lead.append(pred_single_lead)
    pred_9_lead = np.array(pred_9_lead)# (9,n,1008) 对应（9导联，n（9）片段数，1008个点）n个片段会在外面使用extract_wave函数提取并拼接
    return pred_9_lead
# endregion

# region 整理导联，滑窗，频率
# 把有重叠的滑窗片段拼接好 in (9,1008) out (1,5008)
def concatenate_windows(model_out):
    discard_length = 100 #窗口末尾舍弃的长度
    step = 500 # 滑窗步长
    combine_modelout = []
    # 使用一个滑窗策略，把原本有重叠的n个片滑窗预测结果掐头去尾后合并起来，无重叠地拼接成一个长度5008的标签：combine_modelout
    combine_modelout.extend(model_out[0][:-discard_length])#先把第一段的除了discard_length的地方取到
    for i in range(1,len(model_out)-1): # 后面的n个段，负责把前一个片段末尾的discard_length个点补回去，然后新预测一段区域接在后面
        combine_modelout.extend(model_out[i][1008-discard_length-step:1008-discard_length])#起点：窗口右侧端点-舍弃长度-步长 终点：窗口右侧端点-舍弃长度
    combine_modelout.extend(model_out[len(model_out)-1][1008-discard_length-step:1008])#最后一个片段不舍弃，全部要
    return combine_modelout

# 遍历9个导联，每导联调用一次concatenate_windows函数 in (9,9,1008) out (9,5000)
def loop_9_lead(model_out_9_lead):
    
    combine_result_9_lead = []
    for lead_idx in range(9):
        model_out = model_out_9_lead[lead_idx]
        combine_result = concatenate_windows(model_out)
        combine_result_9_lead.append(combine_result)# （n,5008)
    combine_result_9_lead = np.array(combine_result_9_lead)# (9,5008)9个导联的分割结果

    # 去掉每一行的之前多加的8个点
    trimmed_label = combine_result_9_lead[:, :-8]# (9,5000)
    return trimmed_label


def downsample(trimmed_array):
    # 确认 trimmed_array 的形状是 (9, 5000)
    assert trimmed_array.shape == (9, 5000), "The shape of trimmed array is not correct."
    # 目标采样点数
    target_points = 1280
    # 计算采样间隔
    sampling_interval = trimmed_array.shape[1] / target_points
    # 使用np.arange创建下采样后的索引
    sampled_indices = np.arange(0, trimmed_array.shape[1], sampling_interval).astype(int)
    # 获取下采样后的点
    downsampled_points = trimmed_array[:,sampled_indices]#(9,1280)

    return downsampled_points
# endregion

# region 前处理代码
# 选取导联加0padding
def zero_box_resize(data_12,select_lead_idx):
    data_9 = data_12[:,select_lead_idx]# 只拿9个导联的数据 (5000,9)
    ecg_zero_box = np.concatenate((data_9,np.zeros((8,9))),axis=0) # 在后面补8个0，用于适配滑窗截取，(5008,9)
    return ecg_zero_box
# endregion

# region 后处理代码
# region 提取波形参数的工具函数
def extract_wave(data, label):#返回单导联的标签，单导联的电压信号，单导联在3个特征波出现处的电压信号，单导联的3个特征波的索引
    data_lead_idx = 1 #输入9导联只取二导联
    label_lead_idx = 1 #输入9导联只取二导联
    label_1 = label[:,label_lead_idx]#单根导联的标签(5000,)
    data_1 = data[:, data_lead_idx].copy()#单根导联的电压信号(5000,)

    # 初始化特征波的电压信号
    data_lead_p = np.full_like(data_1, -1)
    data_lead_qrs = np.full_like(data_1, -1)
    data_lead_t = np.full_like(data_1, -1)
    

    # 初始化特征波的索引
    label_p = np.where(label_1 == 1)[0].tolist()
    label_qrs = np.where(label_1 == 2)[0].tolist()
    label_t = np.where(label_1 == 3)[0].tolist()
    
    # 将特征波的电压信号赋值
    data_lead_p[label_p] = data_1[label_p]
    data_lead_qrs[label_qrs] = data_1[label_qrs]
    data_lead_t[label_t] = data_1[label_t]

    return label_1, data_1, data_lead_p, data_lead_qrs, data_lead_t, label_p, label_qrs, label_t

def get_start_point(wave,data):#返回输入波的每一段的起始点x坐标和y坐标
    wave_on_x = []
    wave_on_y = []  
    for i in range(len(wave)):
        if i ==0 or wave[i]!=wave[i-1]+1:
            wave_on_x.append(i)
            wave_on_y.append(data[i])
    return wave_on_x,wave_on_y
def find_consecutive_lengths(wave):#返回输入的波的每一段连续的长度的平均值
    if not wave:
        return [], 0
    
    lengths = []
    current_length = 1

    for i in range(1, len(wave)):
        if wave[i] == wave[i - 1] + 1:
            current_length += 1
        else:
            lengths.append(current_length)
            current_length = 1

    lengths.append(current_length)

    lengths_ms = [length * 2 for length in lengths]  # 将长度转换为毫秒
    average_length = round(sum(lengths_ms) / len(lengths_ms), 0) if lengths_ms else 0

    return lengths_ms, average_length


def found_peaks(data_lead_x):#返回峰值点y坐标和平均峰值
    current_peak = None
    current_peak_index = None
    peak_x, peak_y = [],[]

    # 遍历输入数据，寻找峰值点
    for i, num in enumerate(data_lead_x):
        if num != -1:# 如果当前点不是-1
            if current_peak is None or num > current_peak:
                # 更新当前峰值和峰值索引
                current_peak = num
                current_peak_index = i
        else: # 当前点是-1，表示一个峰值的结束
            if current_peak is not None:
                # 将峰值点的索引和峰值添加到列表中
                peak_x.append(current_peak_index)
                peak_y.append(current_peak)
                # 重置当前峰值和峰值索引
                current_peak = None
                current_peak_index = None

     # 计算平均峰值
    if peak_y:
        average_peaks_value = round(sum(peak_y) / len(peak_y), 3)
    else:
        average_peaks_value = 0
    # 返回峰值点索引列表，峰值点y坐标列表和平均峰值
    return peak_x, peak_y, average_peaks_value

def get_heart_rate(peaks):
    # 返回每搏RR间隙，平均RR间隔时间和心率
    if len(peaks) < 2:
        return [], 0, 0

    interval_time_list = []
    heart_rate_list = []

    for i in range(len(peaks) - 1):
        interval_point = peaks[i + 1] - peaks[i]  # 计算相邻峰值点间隔时间
        interval_time = interval_point * 2  # 500Hz的采样点要转换为毫秒就是乘以2
        interval_time_list.append(interval_time)

        heart_rate = int(60000 / interval_time)
        heart_rate_list.append(heart_rate)

    average_interval_time = round(sum(interval_time_list) / len(interval_time_list), 0)
    average_heart_rate = int(sum(heart_rate_list) / len(heart_rate_list))

    return interval_time_list, average_interval_time, average_heart_rate


def findout_st_qt(label):# 返回ST段和QT段索引，平均ST段长度和QT段长度
    st_indices = []  # ST段索引
    qt_indices = []  # QT段索引
    st_len = []  # ST段长度
    qt_len = []  # QT段长度
    i = 0
    label = list(map(int, label))  # 将label列表中的元素转换为整数列表

    while i < len(label):
        try:
            qrs_index = label[i:].index(2) + i   # index(2)返回的是相对于子列表中的索引位置，所以还要加上起始位置才能得到整个列表的索引
        except ValueError:
            break
        try:
            t_index = label[qrs_index:].index(3) + qrs_index  # 找到T波的起始位置
        except ValueError:
            break

        # # 找到T波标志之后，就当前位置i开始一直到这个T波标志之间，所有的0值元素的索引取到，这就是st，所有0值加非零值的索引取到，这就是qt
        zero_between = [j for j in range(qrs_index, t_index) if label[j] == 0]
        all_index_between = [j for j in range(qrs_index, t_index)]
        i = t_index

        if len(zero_between) > 140:
            zero_between = zero_between[:40]  # ST段强制限制在40个点
            all_index_between = all_index_between[:40]
            i -= 60

        st_len.append(len(zero_between))
        qt_len.append(len(all_index_between))
        st_indices.extend(zero_between)
        qt_indices.extend(all_index_between)

    st_len_ms = [length * 2 for length in st_len]  # 转换为毫秒
    qt_len_ms = [length * 2 for length in qt_len]

    average_st_len = round(sum(st_len_ms) / len(st_len_ms), 0) if st_len_ms else 0
    average_qt_len = round(sum(qt_len_ms) / len(qt_len_ms), 0) if qt_len_ms else 0

    return st_indices, qt_len_ms, average_st_len, average_qt_len

def findout_pr_interval(label):# 返回PR间期的索引，PR间期长度和平均PR间期长度
    pr_indices = []
    pr_len = []
    i = 0
    label = list(map(int, label))  # 将label列表中的元素转换为list 后面的index才能用
    while i < len(label):
        try: #寻找下一个p波的索引
            p_index = label[i:].index(1)+i
        except ValueError:
            break
        try: #寻找下一个qrs波的索引
            qrs_index = label[p_index:].index(2)+p_index
        except ValueError:
            break
        # 找到qrs波的索引后，从当前位置i开始一直到这个qrs波标志之间，所有元素的索引取到，这就是pr段
        interval = [j for j in range(p_index,qrs_index)]
        i = qrs_index
        if len(interval) > 300:
            interval = interval[0:300]#pr段强制限制在300个点
            i -= 60

        pr_len.append(len(interval))
        pr_indices.extend(interval)

    pr_len_ms = [length * 2 for length in pr_len]  # PR间期长度转换为毫秒

    average_pr_len = round(sum(pr_len_ms) / len(pr_len_ms), 0) if pr_len_ms else 0
    
    return pr_indices,pr_len_ms,average_pr_len


def find_measure_point(st_indices, data):# 返回测量的参考点，测量值，测量值的平均值
    measure_point_indices = []
    measure_point_value = []
    current_segment = []

    for num in st_indices: # 遍历每一个st段索引里的数字
        if not current_segment or num == current_segment[-1] + 1: # 如果当前段为空或者当前数字等于当前段最后一个数字加1，则将当前数字添加到当前段中
            current_segment.append(num)
        else: #离开这个st段，则将当前段的60%处的点添加到测量点索引列表中，并将当前段重置为空
            point = int(len(current_segment) * 0.6)
            measure_point_indices.append(current_segment[point])
            measure_point_value.append(data[current_segment[point]])
            current_segment = []
    if current_segment:
        point_index = int(len(current_segment) * 0.6)
        measure_point_indices.append(current_segment[point_index])
        measure_point_value.append(data[current_segment[point_index]])

    average_measure_point_value = round(sum(measure_point_value) / len(measure_point_value), 3) if measure_point_value else 0

    return measure_point_indices, measure_point_value, average_measure_point_value

def elevation_assess(list1, list2):
    # 评估两个列表的差异，返回评估列表、差异列表和平均差异值
    threshold = 0.01
    assess_list = []
    level_list = []

    for i in range(min(len(list1), len(list2))):
        diff = list1[i] - list2[i]
        if abs(diff) < threshold:
            assess_list.append(0)
        else:
            assess_list.append(1 if diff > 0 else -1)
        level_list.append(diff)

    if len(list1) != len(list2):
        assess_list.append(None)

    average_level = round(sum(level_list) / len(level_list), 3) if level_list else 0

    return assess_list, level_list, average_level
    

# endregion
# region 提取波形参数
def extract_perameter(data_12, label_9):
    label_9 = label_9.transpose() # 把label_9转成（5000，9）    data_12 已经是（5000，12）
    # 调用extract_wave函数，选择分析导联
    label_1, data_1, data_lead_p, data_lead_qrs, data_lead_t, label_p, label_qrs, label_t = extract_wave(data_12, label_9)
    #(5000,)  (5000,)  (5000,)  (5000,)  list:700~1400 list:700~1400 list:700~1400

    # 获取每个波的起始点的坐标值，因为需要纵坐标，所以要将标签数据和信号数据一起输进去
    p_on_x,p_on_y = get_start_point(label_p,data_1) 
    qrs_on_x,qrs_on_y = get_start_point(label_qrs,data_1)
    t_on_x, t_on_y = get_start_point(label_t,data_1)

    # 获取每个波段的长度
    p_len, average_len_p = find_consecutive_lengths(label_p)
    qrs_len, average_len_qrs = find_consecutive_lengths(label_qrs)
    t_len, average_len_t = find_consecutive_lengths(label_t)

    # 获取每个波段的最大值索引和高度和平均高度
    peaks_p, p_h, average_peaks_value_p = found_peaks(data_lead_p)#data_lead_p是5000个点，在是p波的地方是电压值，在不是p波的地方就是-1
    peaks_qrs, qrs_h, average_peaks_value_qrs = found_peaks(data_lead_qrs)
    peaks_t, t_h, average_peaks_value_t = found_peaks(data_lead_t)

    # 求心率
    rr_interval, average_rr, heart_rate= get_heart_rate(peaks_qrs)

    # 找到st段和qt段，并计算平均长度
    st_indices, qt_len, average_st_segment, average_qt_interval = findout_st_qt(label_1)
    # 找到pr段，并计算平均长度
    pr_indices, pr_len, average_pr_len= findout_pr_interval(label_1)

    # 根据st段的长度，确定st段测量的参考点，得到测量值，并计算平均值
    measurement_indies, measurement_value, average_st_value = find_measure_point(st_indices, data_1)

    # 用上面得到的测量值根等电位线的瞬时值做对比
    assess_list, level_list, average_st_level = elevation_assess(qrs_on_y,measurement_value)
    

    results = {
        'p_on_x': p_on_x,
        'p_on_y': p_on_y,
        'qrs_on_x': qrs_on_x,
        'qrs_on_y': qrs_on_y,
        't_on_x': t_on_x,
        't_on_y': t_on_y,
        'p_len': p_len,
        'qrs_len': qrs_len,
        't_len': t_len,
        'P(ms)': average_len_p,
        'QRS(ms)': average_len_qrs,
        'T(ms)': average_len_t,
        'peaks_p': peaks_p,
        'peaks_qrs': peaks_qrs,
        'peaks_t': peaks_t,
        'p_h': p_h,
        'qrs_h': qrs_h,
        't_h': t_h,
        'P(mv)': average_peaks_value_p,
        'QRS(mv)': average_peaks_value_qrs,
        'T(mv)': average_peaks_value_t,
        'rr_interval': rr_interval,
        'R-R(ms)': average_rr,
        'HR(bpm)': heart_rate,
        'st_indies': st_indices,
        'qt_len': qt_len,
        'ST(ms)': average_st_segment,
        'QT(ms)': average_qt_interval,
        'pr_indies': pr_indices,
        'pr_len': pr_len,
        'PR(ms)': average_pr_len,
        'measurement_indies': measurement_indies,
        'measurement_value': measurement_value,
        'ST(mv)': average_st_value,
        'assess_list': assess_list,
        'level_list': level_list,
        # 'average_st_level': average_st_level,
    }
    return results

# endregion

# endregion
# region 在view中被调用的函数，以降噪后的数据（5000，12）作为输入,选择分析导联之后再调用go_throught_model
def segment_2s(denoise_data):
    select_lead_idx  = [0,1,2,6,7,8,9,10,11]
    ecg_zero_box = zero_box_resize(denoise_data,select_lead_idx) # in (5000,12) out (5008,9)
    model_out_9_lead = go_throught_model(ecg_zero_box)# in (5008,9)  out (9,9,1008)(9导联,9个有重叠片段,每段长度1008)
    # 循环9个导联，得到9个导联的滑窗拼接好的标签
    combine_result_9_lead = loop_9_lead(model_out_9_lead)# in(9,9,1008) out(9,5000) 9个导联的分割结果

    # 提取特征参数，需要输入原始信号数据和预测的标签数据，输出为字典
    perametera = extract_perameter(denoise_data, combine_result_9_lead)

    # 调用downsample函数,把每一个导联变回1280个点
    downsampled_points = downsample(combine_result_9_lead)# (9,1280）

    return downsampled_points, perametera


# endregion



