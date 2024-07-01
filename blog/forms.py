from django import forms
from .models import Post
class PostForm(forms.ModelForm):   #告诉 Django 这个形式是一个 ModelForm

    class Meta:  
        model = Post #告诉 Django 应该使用哪个模型来创建这个表单 
        fields = ('file',)

    file = forms.FileField(required=False)