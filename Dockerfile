# Use an official Python runtime as a parent image
FROM python:3.8

# Set the working directory in the container
WORKDIR /app

# Copy the current directory contents into the container at /app
COPY . /app

# Install any needed packages specified in requirements.txt
RUN pip3 install -i http://pypi.tuna.tsinghua.edu.cn/simple --upgrade pip
RUN pip3 install -r requirements.txt

# Make port 8000 available to the world outside this container
EXPOSE 8000

# 定义环境变量：设置 DJANGO_SETTINGS_MODULE 环境变量为你的 Django 项目的设置模块。
ENV DJANGO_SETTINGS_MODULE=mysite.settings.py

# 运行 Django 开发服务器：使用 CMD 指令运行 Django 开发服务器，使其监听所有 IP 地址的 8000 端口。
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]