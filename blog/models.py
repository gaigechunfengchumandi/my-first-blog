from django.conf import settings
from django.db import models
from django.utils import timezone

# 这个是在admin中显示的
class Post(models.Model):
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    title = models.CharField(max_length=200)# 患者姓名
    text = models.TextField() # 患者详情
    created_date = models.DateTimeField(default=timezone.now)# 创建日期
    published_date = models.DateTimeField(blank=True, null=True)# 发布日期
    file = models.FileField(upload_to='uploads/', blank=True, null=True)  # 上传文件字段

    def publish(self):
        self.published_date = timezone.now()
        self.save()

    def __str__(self):
        return self.title
    



