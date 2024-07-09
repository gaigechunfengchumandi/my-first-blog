from django.shortcuts import render
from django.utils import timezone
from .models import Post
from django.shortcuts import render, get_object_or_404
from .forms import PostForm
from django.shortcuts import redirect
from django.http import JsonResponse
from .utils import denoise_file, analyze_file  # 假设你在utils.py中实现了这些函数
import matplotlib.pyplot as plt
import os
from django.conf import settings
from django.core.files.storage import default_storage
import pdb
import matplotlib
import numpy as np
from PIL import Image
import io
import json

from .denoise128hz.Test_Holter_128hz_8lead_denoise_openvino import initialize_variable, predict_ecg_data


matplotlib.use('Agg')  # 使用无窗口的 Agg 后端
#
def post_list(request):
    posts = Post.objects.all().order_by('created_date') #filter(published_date__lte=timezone.now()).order_by('published_date')
    return render(request, 'blog/post_list.html', {'posts': posts})#函数 render 将呈现（组合）我们的模板 blog/post_list.html 


def post_detail(request, pk):
    """
    根据文章的唯一标识符pk，展示文章的详细信息。

    参数:
    - request: 来自客户端的请求对象，包含请求的相关信息。
    - pk: 文章的主键（Primary Key），用于唯一标识一篇文章。

    返回:
    - 渲染后的文章详细信息页面，包含所请求文章的内容。
    """
    # 根据提供的pk，尝试获取对应的文章对象，如果不存在则返回404错误页面
    post = get_object_or_404(Post, pk=pk)
    # 渲染文章详细信息模板，并将文章对象传递给模板以展示详细信息
    return render(request, 'blog/post_detail.html', {'post': post})


def post_new(request):
    """
    处理发表新文章的请求。
    
    如果请求方法为"POST"，则尝试提交表单数据。如果表单数据有效，则创建并保存新文章，
    设置文章的作者和发布日期，然后重定向到文章详情页面。
    
    如果请求方法不是"POST"，则显示一个空的表单。
    
    参数:
    - request: HttpRequest对象，包含用户请求的信息。
    
    返回:
    - HttpResponse对象，呈现表单或重定向到新发表文章的详情页。
    """
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


# 1小时的数据
# 比例尺要对，时间，幅值
def post_edit(request, pk):
    post = get_object_or_404(Post, pk=pk)
    context = {}  # 设置默认值为 None
    initialize_variable()
    if request.method == "POST":
        form = PostForm(request.POST, request.FILES, instance=post)# 建一个 PostForm 实例，并使用 request.POST 和 request.FILES 填充表单，
        # 同时将 instance 参数设置为当前的 post 对象，这意味着表单会被用来更新这个对象。
        if form.is_valid():
            post = form.save(commit=False)
            # 获取上传的文件并处理
            if request.FILES:
                for file in request.FILES.values():
                    array,array_denoise = signal_view_12(file)
                    context['array'] = json.dumps(array.tolist())  # Convert numpy array to list and then to JSON 
                    context['array_denoise'] = json.dumps(array_denoise.tolist())
            post.save()
            return render(request, 'blog/post_edit.html', {'form': form, 'array': context.get('array'), 'array_denoise': context.get('array_denoise')})
    else:
        form = PostForm(instance=post)
    return render(request, 'blog/post_edit.html', {'form':form})# 使用 render 函数渲染模板 blog/post_edit.html，并将表单实例作为上下文传递。

def signal_view_1(file):
    # 读取文件内容并转换为 numpy 数组
    file_content = file.read().decode('utf-8')  # 假设文件是 UTF-8 编码
    lines = file_content.splitlines()
    data =  [float(x) for x in lines]  
    array = np.array(data)
    return array

def signal_view_12(file):
    # 读取文件内容并转换为 numpy 数组
    file_content = file.read().decode('utf-8')  # 假设文件是 UTF-8 编码
    lines = file_content.splitlines()  # len() = 1280
    data = []
    for line in lines:
        values = line.split()  # 按空格拆分每行的数值
        data.extend([float(x) for x in values])
    
    
    row = int(len(data)/12)
    array = np.array(data).reshape(row, 12).T

    # 降噪函数调用
    array_denose = signal_denoise(data)

    return array, array_denose

# 降噪函数
def signal_denoise(data):
    # 对data里的所有数据求均值方差
    # mean = np.mean(data)
    # std = np.std(data)
    # # 数据标准化处理
    # data = [(x - mean) / std for x in data]

    row = int(len(data)/12)
    # 将 data 转换为形状为 (1280, 12) 的二维数组，不转置为 (12, 1280)
    array = np.array(data).reshape(row, 12)
    print("before enter denoise function")
    array = predict_ecg_data(array, 128)
    print("denoise function finish")
    array = array.T # 转置为 (12, 1280)

    return array







# region abandon
def txt_to_image(request,post):

    # 处理上传的txt文件
    uploaded_file = request.FILES.get('file')
    # pdb.set_trace()
    if uploaded_file and uploaded_file.name.endswith('.txt'):
        print('Uploaded file:', uploaded_file.name)
        # 保存上传的txt文件 
        file_path = default_storage.save(os.path.join('uploads', uploaded_file.name), uploaded_file)
        full_file_path = os.path.join(settings.MEDIA_ROOT, file_path)
        
        print('File saved to:', full_file_path)

        # 读取txt文件内容并生成图片
        with open(full_file_path, 'r', encoding='utf-8') as file:
            content = file.read()
        print('File content read')

        # 按换行符分割数据并转换为浮点数列表
        data_lines = content.strip().split('\n')
        x_label = data_lines[0]
        y_values = [float(value) for value in data_lines[1:]]

        # 创建与y_values长度相同的x轴值序列
        x_values = range(len(y_values))

        # 绘制数据
        plt.figure(figsize=(10, 5))
        plt.plot(x_values, y_values, marker='o', linestyle='-', color='b')
        plt.title('Line Plot from txt File')
        plt.xlabel('Index')
        plt.ylabel('Values')
        plt.grid(True)

        # 使用文件中的标签注释x轴
        plt.xticks(ticks=x_values, labels=[x_label]*len(x_values), rotation=45)
        # 保存图片
        image_path = os.path.join('images', f'{post.pk}.png')
        plt.savefig(os.path.join(settings.MEDIA_ROOT, image_path))
        plt.close()
    return image_path
# endregion