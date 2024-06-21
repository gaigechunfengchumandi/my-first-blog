from django.contrib import admin
from .models import Post
# models里面定义了多少个类，你这个就要引进多少个，下面的注册也是一样


admin.site.register(Post)

# Register your models here.
