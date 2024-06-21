from django.urls import path
from . import views
from django.conf import settings
from django.conf.urls.static import static
urlpatterns = [
    path('', views.post_list, name='post_list'),#为根 URL 分配一个 view 调用 post_list,name='post_list' 将用于标识视图的 URL 的名称
    path('post/<int:pk>/', views.post_detail, name='post_detail'),
    path('post/new/', views.post_new, name='post_new'),
    path('post/<int:pk>/edit/', views.post_edit, name='post_edit'),
]+ static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
