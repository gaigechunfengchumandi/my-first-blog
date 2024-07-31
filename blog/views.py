from django.shortcuts import render
from django.utils import timezone
from .models import Post
from django.shortcuts import render, get_object_or_404
from .forms import PostForm
from django.shortcuts import redirect
from django.http import JsonResponse
from .utils import denoise_file, analyze_file  # 假设你在utils.py中实现了这些函数
import matplotlib.pyplot as plt
from django.conf import settings
from django.core.files.storage import default_storage
import matplotlib
import numpy as np
import json
from .denoise500hz.Test_ECG_500hz_12lead_denoise_openvino import initialize_variable as init_denoise500hz, predict_ecg_data as denoise_500hz
from .denoise128hz.Test_Holter_128hz_8lead_denoise_openvino import initialize_variable as init_denoise128hz, predict_ecg_data as denoise_128hz
from .segment500hz.segment_500hz_openvino import initialize_variable_s as init_seg, segment_2s as segment2s


matplotlib.use('Agg')  # 使用无窗口的 Agg 后端


from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login
from django.contrib import messages

def login_view(request):
    if request.method == 'POST':
        username = request.POST['username']
        password = request.POST['password']
        user = authenticate(request, username=username, password=password)
        if user is not None:
            login(request, user)
            return redirect('post_list')  # 重定向用户到另一个 URL 的一种方式。这里的 'post_list' 是一个 URL 模式的名称。
        else:
            messages.error(request, '用户名或密码错误')
    return render(request, 'blog/login.html')

#
def post_list(request):
    posts = Post.objects.all().order_by('created_date') #filter(published_date__lte=timezone.now()).order_by('published_date')
    return render(request, 'blog/post_list.html', {'posts': posts})#函数 render 将呈现（组合）我们的模板 blog/post_list.html 


def post_detail(request, pk):
    # 根据提供的pk，尝试获取对应的文章对象，如果不存在则返回404错误页面
    post = get_object_or_404(Post, pk=pk)
    # 渲染文章详细信息模板，并将文章对象传递给模板以展示详细信息
    return render(request, 'blog/post_detail.html', {'post': post})


def post_new(request):
    # 检查请求方法是否为POST
    if request.method == "POST":
        # 使用请求的POST数据初始化表单
        form = PostForm(request.POST)
        # 检查表单数据是否有效
        if form.is_valid():
            # 预备保存表单数据，但不立即提交到数据库
            post = form.save(commit=False)
            # 设置文章的作者为当前请求的用户
            post.author = request.user
            # 设置文章的发布日期为当前时间
            post.published_date = timezone.now()
            # 将文章保存到数据库
            post.save()
            # 重定向到新发表文章的详情页
            return redirect('post_detail', pk=post.pk)
    else:
        # 如果请求方法不是POST，创建一个空的表单
        form = PostForm()
    # 渲染表单页面
    return render(request, 'blog/post_edit.html', {'form': form})


def post_edit(request, pk):
    post = get_object_or_404(Post, pk=pk)
    context = {}  # 初始化一个空字典，将在后续用来存储模板上下文数据。
    init_denoise500hz()# 降噪函数的初始化方法
    init_denoise128hz()
    init_seg() # 分割函数的初始化方法
    if request.method == "POST":
        form = PostForm(request.POST, request.FILES, instance=post)# 创建一个 PostForm 表单实例，用 request.POST 和 request.FILES 填充，同时指定要更新的实例 post。
        # 同时将 instance 参数设置为当前的 post 对象，这意味着表单会被用来更新这个对象。
        if form.is_valid():
            post = form.save(commit=False)# 保存表单数据到 post 对象，但不提交到数据库。
            if request.FILES: # 检查是否有文件上传。
                for file in request.FILES.values():# 遍历所有上传的文件。
                    array_ori, array_denoise, array_denoise_500 = signal_draw_12(file) 
                    array_segment, perameter = segment2s(array_denoise_500)
                    context = {
                        'array_ori': json.dumps(array_ori.tolist()),
                        'array_denoise': json.dumps(array_denoise.tolist()),
                        'array_segment': json.dumps(array_segment.tolist()),
                        'perameter': json.dumps(perameter)
                    }
            post.save()#保存 post 对象到数据库。
            context_keys = ['array_ori', 'array_denoise', 'array_segment', 'perameter']
            context_dict = {key: context.get(key) for key in context_keys}
            context_dict['form'] = form
            return render(request, 'blog/post_edit.html', context_dict)
    else: #处理非 POST 请求（即 GET 请求）。
        form = PostForm(instance=post)# 创建一个 PostForm 表单实例，使用 post 对象填充表单
    return render(request, 'blog/post_edit.html', {'form':form})# 渲染模板并返回响应，只传递表单数据给模板。


def signal_draw_12(file):
    file_content = file.read().decode('utf-8') 
    #-------------------------------------------检查一下数据问题，为什么要乘以-1
    data = [float(x) * -1 for line in file_content.splitlines() for x in line.split()]# 把文件读成一个1维的列表
    row = len(data)//12 # 计算行数，是多少hz的采样率数据，就有多少*10行，5000赫兹的就是5000行，128赫兹的就是1280行，1000赫兹就是10000行
    array_ori = np.array(data).reshape(row, 12)# 把一个1维的列表先重塑成(5000,12)或(10000,12)的array，在函数输出的时候再转置为(12,5000)，注意重塑和转置的过程不能颠倒
    # 增加对row的判断，如果row是5000，那么直接使用函数denoise_500hz，如果row是10000，那么需要重新采样到5000然后使用函数denoise_500hz
    print('开始降噪')
    if row == 5000:
        array_denoise = denoise_500hz(array_ori, 500)# in (5000,12) out (5000,12)
    elif row == 10000:
        # 重新采样到 5000 行
        array_resampled = down_sample_to(array_ori,5000) # in (10000,12) out (5000,12)
        array_denoise = denoise_500hz(array_resampled, 500) # in (5000,12) out (5000,12)
    elif row == 1280:
        array_denoise = denoise_128hz(array_ori, 128)# in (1280,12) out (1280,12)
        array_denoise = upsample_array(array_denoise,(5000, 12))#in (1280,12) out(5000,12) 如果原信号的128赫兹的，要先上采样到500才能给分割模型做输入

    array_ori_draw = down_sample_to(array_ori,1280).T # 画图只画1280个点,重采样很快，重复弄没关系,用于画图，要转置为(12,1280)
    array_denoise_draw = down_sample_to(array_denoise,1280).T    
    print('降噪结束')
    return array_ori_draw, array_denoise_draw, array_denoise # 前两个用于画图，最后一个是用于给分割模型做输入的不用转置，直接输出(5000,12)

def down_sample_to(array_ori, target_points): # 这个函数只适合做下采样
    # 计算采样间隔
    sampling_interval = array_ori.shape[0] / target_points
    # 使用np.arange创建下采样后的索引
    sampled_indices = np.arange(0, array_ori.shape[0], sampling_interval).astype(int)#起始值，终止值，数列中相邻元素的步长
    # 获取下采样后的点
    downsampled_points = array_ori[sampled_indices,:]

    return downsampled_points # 输出的形状是(target_points,12)

def upsample_array(array, target_shape):

    # Ensure the input array has the correct shape
    assert array.shape[1] == target_shape[1], "Number of columns must match."
    
    # Get the current and target number of rows
    current_rows, num_columns = array.shape
    target_rows = target_shape[0]

    # Generate the indices for the current and target arrays
    current_indices = np.arange(current_rows)
    target_indices = np.linspace(0, current_rows - 1, target_rows)

    # Interpolate each column
    upsampled_array = np.zeros((target_rows, num_columns))
    for col in range(num_columns):
        upsampled_array[:, col] = np.interp(target_indices, current_indices, array[:, col])

    return upsampled_array