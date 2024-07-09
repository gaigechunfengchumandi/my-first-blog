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

def SNR_1lead(clean_signal, noise_signal):
    try:
        power_clean_signal = np.sum((clean_signal) * (clean_signal))
        power_noise_signal = np.sum((clean_signal - noise_signal) * (clean_signal - noise_signal))
        snr = 10 * math.log((power_clean_signal / (power_noise_signal + 1e-16)), 10)
    except:
        snr = 0
    return snr


def initialize_variable():

    global readmodel
    global net
    global exec_net

    if readmodel == None:
        ie = IECore()
        abs_file = __file__
        folder = os.path.split(abs_file)[0]
        model_xml = 'blog/denoise128hz/DenoiseModel_128hz_8lead_1s.xml'
        model_bin = 'blog/denoise128hz/DenoiseModel_128hz_8lead_1s.bin'
        net = ie.read_network(model=model_xml, weights=model_bin)
        exec_net = ie.load_network(network=net, device_name='CPU')


def predict_ecg_data(ecg_data, sample_rate):

    global readmodel
    global net
    global exec_net
    readmodel = 1

    print("step1")
########################################################################################################################

    if (len(ecg_data)) % (sample_rate)==0:
        ecg_data_cut_segment = np.zeros((int(len(ecg_data)/sample_rate), sample_rate, 12))
    else:
        ecg_data_cut_segment = np.zeros((int(len(ecg_data)/sample_rate)+1, sample_rate, 12))

    for i in range(len(ecg_data_cut_segment)):
        if (i+1) * sample_rate <= len(ecg_data):
            ecg_data_cut_segment[i, :, :] = ecg_data[i*sample_rate:((i+1)*sample_rate), :]
        else:
            ecg_data_cut_segment[i, 0:(len(ecg_data)-(i*sample_rate)), :] = ecg_data[(i*sample_rate):len(ecg_data), :]

    ecg_data_re = np.zeros((len(ecg_data_cut_segment), 128, 12))
    
    print("step2")
    if len(ecg_data_cut_segment[0]) == 128:
        ecg_data_re = ecg_data_cut_segment
    else:
        for i in range(len(ecg_data_cut_segment)):
            ecg_data_re[i] = signal.resample(ecg_data_cut_segment[i], 128 * 1)

    del ecg_data_cut_segment
    gc.collect()

########################################################################################################################

    
    print("step3")
    ecg_data_re_noise_segment = ecg_data_re[:, :, [0, 1, 6, 7, 8, 9, 10, 11]]

    window_length = 64
    fft_num = 64
    win = signal.hamming(window_length, sym=False)
    Overlap = round(0.75 * window_length)
    n_lead_1 = 8
    n_time_1 = 1
    feature_1 = np.zeros([len(ecg_data_re_noise_segment), 33, 9, 8, 2])
    ecg_istft_1 = np.zeros([len(ecg_data_re_noise_segment), sample_rate * n_time_1, 12])
    ecg_istft_1_temp = np.zeros([sample_rate * n_time_1, 12])
    print("step4")
    for k in range(len(ecg_data_re_noise_segment)):
        for t in range(n_lead_1):
            f_ecg, t_ecg, Z_ecg = signal.stft(ecg_data_re_noise_segment[k, :, t], fs=sample_rate, window=win,
                                              nperseg=window_length, noverlap=Overlap,
                                              nfft=fft_num, return_onesided=True)
            feature_1[k, :, :, t, 0] = np.real(Z_ecg).astype('float64')
            feature_1[k, :, :, t, 1] = np.imag(Z_ecg).astype('float64')

        feature = np.zeros([1, 2, 33, 9, 8])

        feature[0, 0, :, :, :] = feature_1[k, :, :, :, 0]
        feature[0, 1, :, :, :] = feature_1[k, :, :, :, 1]

        input_blob = next(iter(net.input_info))
        output_info = net.outputs
        output_blob = next(iter(output_info))

        feature_pred_ori = exec_net.infer(inputs={input_blob: feature})

        feature_pred_1 = feature_pred_ori[output_blob]
        print("step5")
        for t in range(n_lead_1):
            feature_pred_real = feature_pred_1[0, 0, :, :, t]
            feature_pred_imag = feature_pred_1[0, 1, :, :, t]
            re_spectrum = feature_pred_real + 1.0j * feature_pred_imag
            # 进行istft变换
            t_istft, ecg_istft_data = signal.istft(re_spectrum, fs=sample_rate, window=win,
                                                       nperseg=window_length, noverlap=Overlap, nfft=fft_num)
            ecg_istft_1[k, :, t] = ecg_istft_data[:sample_rate * n_time_1]

        ecg_istft_1_temp[:, 2:8] = ecg_istft_1[k, :, 2:8]

        leadIII = ecg_istft_1[k, :, 1] - ecg_istft_1[k, :, 0]
        dataAVR = -(ecg_istft_1[k, :, 1] + ecg_istft_1[k, :, 0]) / 2
        dataAVL = ecg_istft_1[k, :, 0] - ((ecg_istft_1[k, :, 1]) / 2)
        dataAVF = ecg_istft_1[k, :, 1] - ((ecg_istft_1[k, :, 0]) / 2)

        ecg_istft_1[k, :, 2] = leadIII
        ecg_istft_1[k, :, 3] = dataAVR
        ecg_istft_1[k, :, 4] = dataAVL
        ecg_istft_1[k, :, 5] = dataAVF
        ecg_istft_1[k, :, 6] = ecg_istft_1_temp[:, 2]
        ecg_istft_1[k, :, 7] = ecg_istft_1_temp[:, 3]
        ecg_istft_1[k, :, 8] = ecg_istft_1_temp[:, 4]
        ecg_istft_1[k, :, 9] = ecg_istft_1_temp[:, 5]
        ecg_istft_1[k, :, 10] = ecg_istft_1_temp[:, 6]
        ecg_istft_1[k, :, 11] = ecg_istft_1_temp[:, 7]

    ecg_istft_denoise = np.zeros([len(ecg_data_re_noise_segment), sample_rate*n_time_1, 12])
    print("step6")
    for k in range(len(ecg_data_re_noise_segment)):
        if sample_rate != 128:
            ecg_istft_denoise[k] = signal.resample(ecg_istft_1[k], sample_rate)
        else:
            ecg_istft_denoise[k] = ecg_istft_1[k]
    print("step7")
    for k in range(len(ecg_data_re_noise_segment)):
        if (k+1)*sample_rate <= len(ecg_data):
            ecg_data[(k*sample_rate):((k+1)*sample_rate), :] = ecg_istft_denoise[k]
        else:
            ecg_data[(k*sample_rate):len(ecg_data), :] = ecg_istft_denoise[k, 0:(len(ecg_data)-(k*sample_rate)), :]

########################################################################################################################

    del feature_1
    del feature_pred_1
    del ecg_istft_1
    del ecg_istft_1_temp
    gc.collect()
    print("step8")
    return ecg_data


if __name__ == "__main__":

    # data = pd.read_table('/home/devel/data', names=['ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6', 'ch7', 'ch8', 'ch9', 'ch10', 'ch11', 'ch12'])
    # ECGdata1 = np.stack([data.ch1[2:], data.ch2[2:], data.ch3[2:], data.ch4[2:], data.ch5[2:], data.ch6[2:], data.ch7[2:], data.ch8[2:], data.ch9[2:], data.ch10[2:], data.ch11[2:], data.ch12[2:]])
    # ECGdata1 = ECGdata1.transpose()
    # ecg_data = ECGdata1.astype('float64')
    # ecg_data = ecg_data/200
    ecg_data = np.zeros([1280,12])

    sample_rate = 128
    # del data
    # del ECGdata1
    gc.collect()

    initialize_variable()

    denoise_ecg_data = predict_ecg_data(ecg_data, sample_rate)

    print('finish Analyze')

