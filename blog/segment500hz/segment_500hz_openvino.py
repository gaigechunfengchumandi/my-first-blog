import numpy as np
from openvino.inference_engine import IECore
from scipy import signal
import os
import gc
import time
import math
import pandas as pd
import matplotlib.pyplot as plt

# os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
#
# config = tf.compat.v1.ConfigProto(gpu_options=tf.compat.v1.GPUOptions(allow_growth=True))
# sess = tf.compat.v1.Session(config=config)
# os.environ["CUDA_VISIBLE_DEVICES"] = "0"

os.environ["CUDA_VISIBLE_DEVICES"] = "-1"

readmodel = None



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


def predict_ecg_data(ecg_data):

    global readmodel
    global net
    global exec_net
    readmodel = 1

    
    feature = ecg_data #np.zeros((1,1008, 1))


    input_blob = next(iter(net.input_info))
    output_info = net.outputs
    output_blob = next(iter(output_info))

    feature_pred_ori = exec_net.infer(inputs={input_blob: feature})

    feature_pred_1 = feature_pred_ori[output_blob]
  
    del feature_pred_ori
    gc.collect()
    return feature_pred_1

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
        pred_single_lead = predict_ecg_data(data_clip2s_single_lead)#ndarray(n,1008,4)
        pred_single_lead = np.argmax(pred_single_lead,axis=2)#ndarray(n,1008)把每格采样点的预测结果最大的索引取到
        pred_9_lead.append(pred_single_lead)
    pred_9_lead = np.array(pred_9_lead)
    return pred_9_lead


def extract_wave(data_9_lead, model_out, lead_idx):
    one_of_lead_qrs = np.array(data_9_lead[:,lead_idx])
    p_pred, qrs_pred, t_pred = [],[],[]
    discard_length = 100 #窗口末尾舍弃的长度
    step = 500 # 滑窗步长
    combine_modelout = []
    combine_modelout.extend(model_out[0][:-discard_length])
    for i in range(1,len(model_out)-1):
        combine_modelout.extend(model_out[i][1008-discard_length-step:1008-discard_length])
    combine_modelout.extend(model_out[len(model_out)-1][1008-discard_length-step:1008])
    for t in range(len(combine_modelout)):
        if combine_modelout[t] == 1:
            p_pred.append(t)
        elif combine_modelout[t] == 2:
            qrs_pred.append(t)
        elif combine_modelout[t] == 3:
            t_pred.append(t)
        if combine_modelout[t] !=2:
            one_of_lead_qrs[t] = -1
    return one_of_lead_qrs,p_pred, qrs_pred, t_pred, combine_modelout




def segment_2s(denoise_data):
    data_128hz = denoise_data#拿到降噪后的数据（12，1280）
    # 将数据从 128 Hz 重采样到 500 Hz
    # 新的采样点数目为 (500 / 128) * 原来的采样点数目
    num_samples = int(500 / 128 * data_128hz.shape[1])
    data_500hz = signal.resample(data_128hz, num_samples, axis=1).transpose() # data_500hz 12通道数据 (5000,12)
    input_lead = [0,1,2,6,7,8,9,10,11]# 定义用于预测的导联
    ecg_data = data_500hz[:,input_lead]# ecg_data 9通道数据 (5000,9)
    zero_box = np.zeros((8,9))
    ecg_zero_box = np.concatenate((ecg_data,zero_box),axis=0) # (5008,9)
    model_out_9_lead = go_throught_model(ecg_zero_box)# model_out_9_lead (9,9,1008)(9导联,9个有重叠片段,每段长度1008)

    combine_result_9_lead = []
    for lead_idx in range(9):
        model_out = model_out_9_lead[lead_idx]
        one_of_lead_qrs, pred, qrs_pred, t_pred, combine_result = extract_wave(ecg_zero_box, model_out, lead_idx)

        combine_result_9_lead.append(combine_result)
    combine_result_9_lead = np.array(combine_result_9_lead)# (9,5008)9个导联的分割结果
    # 去掉每一列的后8个元素
    trimmed_array = combine_result_9_lead[:, :-8]

    # 确认 trimmed_array 的形状是 (9, 5000)
    assert trimmed_array.shape == (9, 5000), "The shape of trimmed array is not correct."



    # 将每一行降采样成 1280 个元素
    downsampled_array = downsample(trimmed_array, 1280)

    return downsampled_array

# 定义一个函数进行降采样
def downsample(array, target_length):
    factor = array.shape[1] // target_length #factor 是一个整数，表示在降采样过程中要跳过的元素数。具体来说，它是原始列数 m 除以目标列数 target_length 的整数部分。
    return array[:, ::factor][:, :target_length]#对于 array.shape[1] = 5000 和 target_length = 1280，factor 计算结果为 5000 // 1280 = 3。这意味着我们每隔 3 个元素选择一个元素，以实现降采样。
    #array[:, ::factor]: 对数组进行切片操作，选择每行中每隔 factor 个元素的一个元素。具体来说，它会从每行的第一个元素开始，每隔 factor 个元素选择一个元素。
    #例如，factor = 3 时，对于一行 [a0, a1, a2, a3, a4, a5, a6, ...]，会选择 [a0, a3, a6, ...]。
    # [:, :target_length]: 确保结果数组的每行都正好有 target_length 个元素。由于前面的切片操作可能会多出几个元素，这一步确保我们只保留前 target_length 个元素。


if __name__ == "__main__":

    initialize_variable_s()
    file_path = '/Users/xingyulu/Desktop/文件汇总/txtForDjango/刘加义-20180703-195634_raw_0_696320_00004.txt'

    with open(file_path, 'r', encoding='utf-8') as file:
        file_content = file.read()
        lines = file_content.splitlines()  # len() = 1280
        data = []
        for line in lines:
            values = line.split()  # 按空格拆分每行的数值
            data.extend([float(x) for x in values])

    row = int(len(data)/12)
    # 将数据转换为 numpy 数组并重塑为 (12, 1280)
    data_128hz = np.array(data).reshape(row, 12).T  # 12通道数据 (12,1280)

    # 将数据从 128 Hz 重采样到 500 Hz
    # 新的采样点数目为 (500 / 128) * 原来的采样点数目
    num_samples = int(500 / 128 * data_128hz.shape[1])
    data_500hz = signal.resample(data_128hz, num_samples, axis=1).transpose() # data_500hz 12通道数据 (5000,12)
    input_lead = [0,1,2,6,7,8,9,10,11]
    ecg_data = data_500hz[:,input_lead]# ecg_data 9通道数据 (5000,9)
    zero_box = np.zeros((8,9))
    ecg_zero_box = np.concatenate((ecg_data,zero_box),axis=0) # (5008,9)
    model_out_9_lead = go_throught_model(ecg_zero_box)# model_out_9_lead (9,9,1008)(9导联,9个有重叠片段,每段长度1008)

    combine_result_9_lead = []
    for lead_idx in range(9):
        model_out = model_out_9_lead[lead_idx]
        one_of_lead_qrs, pred, qrs_pred, t_pred, combine_result = extract_wave(ecg_zero_box, model_out, lead_idx)

        combine_result_9_lead.append(combine_result)
    combine_result_9_lead = np.array(combine_result_9_lead)# (9,5008)9个导联的分割结果
    

    print('finish Analyze')

