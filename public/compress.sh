#!/bin/bash

# 默认目录为当前目录
target_dir="."

# 检查是否提供了文件夹参数
if [ $# -eq 1 ]; then
    target_dir="$1"
    # 检查指定目录是否存在
    if [ ! -d "$target_dir" ]; then
        echo "错误：目录 '$target_dir' 不存在。"
        exit 1
    fi
fi

# 定义支持的图片格式后缀（可以根据需要扩展）
image_extensions=("jpg" "jpeg" "JPG" "JPEG" "png" "gif" "bmp" "tiff" "webp")

# 调整图片尺寸
for ext in "${image_extensions[@]}"; do
    for file in "$target_dir"/*."$ext"; do
        if [[ -f "$file" ]]; then
            echo "正在调整尺寸：$file"
            sips --resampleWidth 1400 --rotate auto "$file" > /dev/null 2>&1
        fi
    done
done

# 压缩图片
for ext in "${image_extensions[@]}"; do
    for file in "$target_dir"/*."$ext"; do
        if [[ -f "$file" ]]; then
            echo "正在压缩：$file"
            /Applications/ImageOptim.app/Contents/MacOS/ImageOptim "$file" 2>&1
        fi
    done
done

echo "处理完成！"

