from django import forms
from .models import Post
class PostForm(forms.ModelForm):   #告诉 Django 这个形式是一个 ModelForm

    class Meta:  
        model = Post #告诉 Django 应该使用哪个模型来创建这个表单 
        fields = ('file',)

    file = forms.FileField(required=False)#required=False：表示这个字段不是必填的。

    #处理这个表单的视图将在 request.FILES 中接收文件数据，它是一个字典，包含表单中每个 FileField
    #（或 ImageField，或其他 FileField 子类）的键。所以上述表单中的数据将以 request.FILES['file'] 的形式被访问。
    #注意 request.FILES 只有当请求方法是 POST，至少有一个文件字段被实际发布，
    # 并且发布请求的 <form> 有 enctype="multipart/form-data" 属性时，才会包含数据。否则 request.FILES 将为空。