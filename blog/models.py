from django.conf import settings
from django.db import models
from django.utils import timezone
import os
# 这个是在admin中显示的
class Post(models.Model):
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    title = models.CharField(u'患者姓名', max_length=200)# 患者姓名
    text = models.TextField(u'患者详情') # 患者详情
    created_date = models.DateTimeField(default=timezone.now)# 创建日期
    published_date = models.DateTimeField(blank=True, null=True)# 发布日期
    file = models.FileField(u'文件')
    image_path = models.CharField(max_length=255, blank=True, null=True) 

    def publish(self):
        self.published_date = timezone.now()
        self.save()

    def __str__(self):
        return self.title
    
