#!/bin/bash

# Markdown 文件标题去重脚本
# 用法: ./dedup_titles.sh [目录路径]
# 如果不指定目录，默认处理当前目录

set -e  # 遇到错误立即退出

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 获取目标目录
TARGET_DIR="${1:-.}"

# 检查目录是否存在
if [ ! -d "$TARGET_DIR" ]; then
    echo -e "${RED}错误: 目录 '$TARGET_DIR' 不存在${NC}"
    exit 1
fi

# 创建备份目录
BACKUP_DIR="${TARGET_DIR}/.backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
echo -e "${GREEN}备份目录已创建: $BACKUP_DIR${NC}"

# 计数器
total_files=0
modified_files=0
skipped_files=0

# 标准化标题函数：去除空格、下划线、标点等，用于比较
normalize_title() {
    local title="$1"
    # 转换为小写，去除所有空格、下划线、连字符、标点符号
    echo "$title" | tr '[:upper:]' '[:lower:]' | sed 's/[[:space:]_-]//g' | sed 's/[[:punct:]]//g'
}

# 计算两个字符串的相似度（简单版本）
is_similar() {
    local str1="$1"
    local str2="$2"
    
    # 完全相同
    if [ "$str1" = "$str2" ]; then
        return 0
    fi
    
    # 标准化后相同
    local norm1=$(normalize_title "$str1")
    local norm2=$(normalize_title "$str2")
    
    if [ "$norm1" = "$norm2" ]; then
        return 0
    fi
    
    # 计算长度差异
    local len1=${#str1}
    local len2=${#str2}
    local len_diff=$((len1 - len2))
    len_diff=${len_diff#-}  # 取绝对值
    
    # 如果长度差异小于3，且标准化后相同，认为相似
    if [ $len_diff -lt 3 ] && [ "$norm1" = "$norm2" ]; then
        return 0
    fi
    
    return 1
}

# 处理单个文件的函数
process_file() {
    local file="$1"
    local filename=$(basename "$file")
    
    echo -e "\n${YELLOW}处理: $filename${NC}"
    
    # 备份原文件
    cp "$file" "$BACKUP_DIR/$filename"
    
    # 提取所有一级标题（去除首尾空格）
    local titles=()
    local line_numbers=()
    local line_num=0
    
    while IFS= read -r line; do
        line_num=$((line_num + 1))
        
        # 只检查前15行（增加检测范围）
        if [ $line_num -gt 15 ]; then
            break
        fi
        
        # 检查是否是一级标题
        if [[ "$line" =~ ^#[[:space:]]+ ]]; then
            # 提取标题内容（去除 # 和空格）
            title=$(echo "$line" | sed 's/^#[[:space:]]*//' | sed 's/[[:space:]]*$//')
            
            if [ -n "$title" ]; then
                titles+=("$title")
                line_numbers+=($line_num)
                echo "  发现标题 (行 $line_num): $title"
            fi
        fi
    done < "$file"
    
    # 如果没有找到标题，跳过
    if [ ${#titles[@]} -eq 0 ]; then
        echo -e "  ${YELLOW}跳过: 未找到一级标题${NC}"
        return 1
    fi
    
    # 如果只有一个标题，跳过
    if [ ${#titles[@]} -eq 1 ]; then
        echo -e "  ${GREEN}跳过: 只有一个标题，无需处理${NC}"
        return 1
    fi
    
    # 检查前几个标题是否重复（使用模糊匹配）
    local first_title="${titles[0]}"
    local duplicate_count=0
    local lines_to_delete=()
    
    echo "  第一个标题标准化: $(normalize_title "$first_title")"
    
    for i in "${!titles[@]}"; do
        if [ "$i" -eq 0 ]; then
            continue
        fi
        
        local current_title="${titles[$i]}"
        echo "  比较标题 $((i+1)) 标准化: $(normalize_title "$current_title")"
        
        # 使用模糊匹配
        if is_similar "$first_title" "$current_title"; then
            duplicate_count=$((duplicate_count + 1))
            lines_to_delete+=(${line_numbers[$i]})
            echo -e "  ${RED}发现相似/重复标题 (行 ${line_numbers[$i]}): $current_title${NC}"
        else
            # 遇到不同的标题就停止
            echo "  遇到不同标题，停止检查"
            break
        fi
    done
    
    # 如果没有重复，跳过
    if [ $duplicate_count -eq 0 ]; then
        echo -e "  ${GREEN}跳过: 未发现重复标题${NC}"
        return 1
    fi
    
    # 删除重复的标题行
    echo -e "  ${GREEN}将删除 $duplicate_count 个重复/相似标题${NC}"
    
    # 使用临时文件
    local temp_file=$(mktemp)
    local current_line=0
    
    while IFS= read -r line; do
        current_line=$((current_line + 1))
        
        # 检查当前行是否是要删除的重复标题行
        local should_delete=false
        for delete_line in "${lines_to_delete[@]}"; do
            if [ "$current_line" -eq "$delete_line" ]; then
                should_delete=true
                break
            fi
        done
        
        # 如果不是要删除的行，写入临时文件
        if [ "$should_delete" = false ]; then
            echo "$line" >> "$temp_file"
        fi
    done < "$file"
    
    # 替换原文件
    mv "$temp_file" "$file"
    
    echo -e "  ${GREEN}✓ 已删除第 ${lines_to_delete[*]} 行${NC}"
    return 0
}

# 遍历所有 .md 文件
echo -e "${GREEN}开始处理 $TARGET_DIR 目录下的所有 .md 文件...${NC}"

while IFS= read -r -d '' file; do
    total_files=$((total_files + 1))
    
    if process_file "$file"; then
        modified_files=$((modified_files + 1))
    else
        skipped_files=$((skipped_files + 1))
    fi
    
done < <(find "$TARGET_DIR" -maxdepth 1 -name "*.md" -type f -print0)

# 输出统计信息
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}处理完成！${NC}"
echo -e "总文件数: $total_files"
echo -e "${GREEN}已修改: $modified_files${NC}"
echo -e "${YELLOW}已跳过: $skipped_files${NC}"
echo -e "${GREEN}备份位置: $BACKUP_DIR${NC}"
echo -e "${GREEN}========================================${NC}"

# 如果没有修改任何文件，删除备份目录
if [ $modified_files -eq 0 ]; then
    rm -rf "$BACKUP_DIR"
    echo -e "${YELLOW}未修改任何文件，已删除备份目录${NC}"
fi
