#!/bin/bash

# 一键部署重启脚本
# 功能：上传文件 + 自动重启远程服务器的Next.js服务

# 从config.local.js读取服务器配置
SERVER_IP=$(node -e "console.log(require('./config.local.js').SERVER_IP)")
REMOTE_USER="kounarushi"
REMOTE_PATH="\$HOME/web/"

# SSH连接选项
SSH_OPTS="-p 22 -o ConnectTimeout=10 -o ServerAliveInterval=30"

# 颜色输出函数
print_status() {
    echo "🚀 $1"
}

print_success() {
    echo "✅ $1"
}

print_error() {
    echo "❌ $1"
}

print_warning() {
    echo "⚠️  $1"
}

# 检查服务器连接
check_connection() {
    print_status "检查服务器连接..."
    if ssh $SSH_OPTS "$REMOTE_USER@$SERVER_IP" "echo 'connection test'" >/dev/null 2>&1; then
        print_success "服务器连接正常"
        return 0
    else
        print_error "无法连接到服务器 $SERVER_IP"
        exit 1
    fi
}

# 执行文件上传
upload_files() {
    print_status "开始上传文件..."

    # 调用现有的upload.sh脚本
    if ./upload.sh; then
        print_success "文件上传完成"
        return 0
    else
        print_error "文件上传失败"
        exit 1
    fi
}

# 远程服务器重启Next.js服务

# 主函数
main() {
    echo "🎯 开始一键部署重启流程"
    echo "=========================="
    echo "🖥️  目标服务器: $SERVER_IP"
    echo "👤 用户: $REMOTE_USER"
    echo "📁 路径: $REMOTE_PATH"
    echo ""

    # 步骤1: 检查连接
    check_connection

    # 步骤2: 上传文件
    upload_files

    # 步骤3: 重启服务

    # 步骤4: 检查状态
    check_service_status

    echo ""
    echo "🎉 部署完成！"
    echo "🌐 访问地址: http://$SERVER_IP:8888"
}

# 信号处理 - 优雅退出
cleanup() {
    echo ""
    print_warning "收到中断信号，正在清理..."
    exit 130
}

trap cleanup INT TERM

# 检查依赖
if [ ! -f "./upload.sh" ]; then
    print_error "找不到upload.sh文件"
    exit 1
fi

if [ ! -f "./config.local.js" ]; then
    print_error "找不到config.local.js文件"
    exit 1
fi

# 运行主程序
main
