from django.urls import path
from . import views
from django.conf import settings
from django.conf.urls.static import static

from django.views.generic.base import RedirectView
from .views import login_view
urlpatterns = [
    path('', RedirectView.as_view(url='/login/', permanent=False), name='home'),  # 将根URL重定向到登录视图
    # path('', views.login_view, name='login'),#为根 URL 分配一个 view 调用 login_view,name='login' 将用于标识视图的 URL 的名称

    path('post_list/', views.post_list, name='post_list'),  # 定义命名URL模式
    path('post/<int:pk>/', views.post_detail, name='post_detail'),
    path('post/new/', views.post_new, name='post_new'),
    path('post/<int:pk>/edit/', views.post_edit, name='post_edit'), 
    path('login/', login_view, name='login'),
]+ static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
