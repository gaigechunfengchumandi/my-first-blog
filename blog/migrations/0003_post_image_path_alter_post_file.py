# Generated by Django 4.2.11 on 2024-06-18 01:57

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("blog", "0002_post_file"),
    ]

    operations = [
        migrations.AddField(
            model_name="post",
            name="image_path",
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
        migrations.AlterField(
            model_name="post",
            name="file",
            field=models.FileField(default=1, upload_to="uploads/"),
            preserve_default=False,
        ),
    ]