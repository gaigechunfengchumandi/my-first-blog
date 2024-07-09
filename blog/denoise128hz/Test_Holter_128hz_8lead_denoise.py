import numpy as np
# import tensorflow as tf
from scipy import signal
import os
import gc
import time
import math
import pandas as pd

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
    global sess_1
    global node_in_1
    global model_out_1

    if readmodel == None:
        output_graph_1 = tf.Graph()
        output_graph_def_1 = tf.GraphDef()
        with open("DenoiseModel_128hz_8lead_1s.pb", "rb") as f:
            output_graph_def_1.ParseFromString(f.read())
        with output_graph_1.as_default():
            _ = tf.import_graph_def(output_graph_def_1, name="")
        sess_1 = tf.Session(graph=output_graph_1)
        node_in_1 = output_graph_1.get_tensor_by_name("inputs:0")
        model_out_1 = output_graph_1.get_tensor_by_name("complex_conv3d_16/add_1:0")


def predict_ecg_data(ecg_data, sample_rate):
    global readmodel
    global sess_1
    global node_in_1
    global model_out_1
    readmodel = 1

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

    if len(ecg_data_cut_segment[0]) == 128:
        ecg_data_re = ecg_data_cut_segment
    else:
        for i in range(len(ecg_data_cut_segment)):
            ecg_data_re[i] = signal.resample(ecg_data_cut_segment[i], 128 * 1)

    del ecg_data_cut_segment
    gc.collect()

########################################################################################################################


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

    for k in range(len(ecg_data_re_noise_segment)):
        for t in range(n_lead_1):
            f_ecg, t_ecg, Z_ecg = signal.stft(ecg_data_re_noise_segment[k, :, t], fs=sample_rate, window=win,
                                              nperseg=window_length, noverlap=Overlap,
                                              nfft=fft_num, return_onesided=True)
            feature_1[k, :, :, t, 0] = np.real(Z_ecg).astype('float64')
            feature_1[k, :, :, t, 1] = np.imag(Z_ecg).astype('float64')

        feature = np.expand_dims(feature_1[k], axis=0)

        feature_pred_1 = sess_1.run(model_out_1, feed_dict={node_in_1: feature})

        for t in range(n_lead_1):
            feature_pred_real = feature_pred_1[0, :, :, t, 0]
            feature_pred_imag = feature_pred_1[0, :, :, t, 1]
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

    for k in range(len(ecg_data_re_noise_segment)):
        if sample_rate != 128:
            ecg_istft_denoise[k] = signal.resample(ecg_istft_1[k], sample_rate)
        else:
            ecg_istft_denoise[k] = ecg_istft_1[k]

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
    return ecg_data


if __name__ == "__main__":

    data = pd.read_table('/home/devel/data', names=['ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6', 'ch7', 'ch8', 'ch9', 'ch10', 'ch11', 'ch12'])
    ECGdata1 = np.stack([data.ch1[2:], data.ch2[2:], data.ch3[2:], data.ch4[2:], data.ch5[2:], data.ch6[2:], data.ch7[2:], data.ch8[2:], data.ch9[2:], data.ch10[2:], data.ch11[2:], data.ch12[2:]])
    ECGdata1 = ECGdata1.transpose()#（1280，12）
    ecg_data = ECGdata1.astype('float64')
    ecg_data = ecg_data/200
    sample_rate = 128
    del data
    del ECGdata1
    gc.collect()

    initialize_variable()

    denoise_ecg_data = predict_ecg_data(ecg_data, sample_rate)

    print('finish Analyze')

