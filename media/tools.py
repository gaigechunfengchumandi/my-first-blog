import os

def concatenate_txt_files(input_folder, output_file):
    with open(output_file, 'w', encoding='utf-8') as outfile:
        for filename in sorted(os.listdir(input_folder)):
            if filename.endswith('.txt'):
                file_path = os.path.join(input_folder, filename)
                with open(file_path, 'r', encoding='utf-8') as infile:
                    outfile.write(infile.read())
                    outfile.write("\n")  # 添加换行符以区分不同文件内容

# 使用示例
input_folder = '/Users/xingyulu/Desktop/信号质量筛查/刘加义txt'  # 替换为包含txt文件的文件夹路径
output_file = '/Users/xingyulu/Desktop/信号质量筛查/output_file.txt'  # 替换为你想要保存的拼接后的文件路径

concatenate_txt_files(input_folder, output_file)