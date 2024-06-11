from django.shortcuts import render
from django.utils import timezone
from .models import Post
from django.shortcuts import render, get_object_or_404
from .forms import PostForm
from django.shortcuts import redirect


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

def post_edit(request, pk):
    post = get_object_or_404(Post, pk=pk)
    if request.method == "POST":
        form = PostForm(request.POST, instance=post)
        if form.is_valid():
            post = form.save(commit=False)
            post.author = request.user
            post.published_date = timezone.now()
            post.save()
            return redirect('post_detail', pk=post.pk)
    else:
        form = PostForm(instance=post)
    return render(request, 'blog/post_edit.html', {'form': form})