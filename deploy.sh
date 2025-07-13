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
restart_service() {
    print_status "正在重启远程服务器的Next.js服务..."

    # 执行远程命令
    ssh $SSH_OPTS "$REMOTE_USER@$SERVER_IP" <<'EOF'
        cd "$HOME/web/"
        
        echo "🔍 查找并停止现有的Next.js进程..."
        
        # 查找Next.js进程并杀死
        PIDS=$(ps aux | grep "next start" | grep -v grep | awk '{print $2}')
        
        if [ -n "$PIDS" ]; then
            echo "📋 找到以下Next.js进程: $PIDS"
            echo $PIDS | xargs kill -TERM 2>/dev/null
            
            # 等待进程优雅退出
            sleep 3
            
            # 强制杀死仍在运行的进程
            REMAINING_PIDS=$(ps aux | grep "next start" | grep -v grep | awk '{print $2}')
            if [ -n "$REMAINING_PIDS" ]; then
                echo "🔥 强制停止残留进程: $REMAINING_PIDS"
                echo $REMAINING_PIDS | xargs kill -KILL 2>/dev/null
            fi
            
            echo "✅ 旧进程已停止"
        else
            echo "ℹ️  没有找到运行中的Next.js进程"
        fi
        
        # 等待端口释放
        echo "⏳ 等待端口释放..."
        sleep 2
        
        # 启动新的Next.js服务
        echo "🚀 启动新的Next.js服务..."
        
        # 检查目录和环境
        echo "📁 当前目录: $(pwd)"
        echo "📁 HOME目录: $HOME"
        echo "📁 检查web目录是否存在:"
        ls -la "$HOME/" | grep web || echo "web目录不存在"
        
        # 设置Node.js环境
        echo "🔍 设置Node.js环境..."
        
        # 加载nvm环境
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"
        [ -s "$NVM_DIR/bash_completion" ] && source "$NVM_DIR/bash_completion"
        
        # 加载其他环境配置
        [ -f "$HOME/.bashrc" ] && source "$HOME/.bashrc"
        [ -f "$HOME/.profile" ] && source "$HOME/.profile"
        
        # 使用nvm的默认Node.js版本
        if command -v nvm >/dev/null 2>&1; then
            nvm use default 2>/dev/null || nvm use node 2>/dev/null || echo "nvm使用当前版本"
        fi
        
        # 设置PATH包含nvm的Node.js路径
        export PATH="$HOME/.nvm/versions/node/v18.18.1/bin:$PATH"
        
        # 进入web目录
        cd "$HOME/web" || exit 1
        echo "✅ 已进入目录: $(pwd)"
        
        echo "🔍 检查启动方式:"
        echo "Node.js: $(which node 2>/dev/null || echo '未找到')"
        echo "NPM: $(which npm 2>/dev/null || echo '未找到')"
        echo "NPX: $(which npx 2>/dev/null || echo '未找到')"
        
        # 尝试多种启动方式
        echo "🚀 启动Next.js服务..."
        
        if command -v npx >/dev/null 2>&1; then
            echo "使用npx启动..."
            nohup npx next start > "$HOME/web-server.log" 2>&1 &
        elif command -v npm >/dev/null 2>&1; then
            echo "使用npm start启动..."
            nohup npm start > "$HOME/web-server.log" 2>&1 &
        elif [ -f "./node_modules/.bin/next" ]; then
            echo "使用本地next二进制启动..."
            nohup ./node_modules/.bin/next start > "$HOME/web-server.log" 2>&1 &
        else
            echo "❌ 无法找到可用的Next.js启动方式"
            echo "尝试直接使用node启动..."
            if [ -f "./node_modules/next/dist/bin/next" ]; then
                nohup npx next build > "$HOME/web-server.log" 2>&1 &
                nohup node ./node_modules/next/dist/bin/next start > "$HOME/web-server.log" 2>&1 &
            else
                echo "❌ 所有启动方式都失败"
                exit 1
            fi
        fi
        
        # 获取新进程PID
        NEW_PID=$!
        echo "📝 新进程PID: $NEW_PID"
        
        # 等待服务启动
        echo "⏳ 等待服务启动..."
        sleep 5
        
        # 检查服务是否正常启动
        if ps -p $NEW_PID > /dev/null; then
            echo "✅ Next.js服务启动成功 (PID: $NEW_PID)"
            echo "🌐 服务已在端口8888运行"
            
            # 显示最新的日志
            echo "📋 最新日志："
            tail -n 10 "$HOME/web-server.log"
        else
            echo "❌ Next.js服务启动失败"
            echo "📋 错误日志："
            tail -n 20 "$HOME/web-server.log"
            exit 1
        fi
EOF

    local remote_exit_code=$?

    if [ $remote_exit_code -eq 0 ]; then
        print_success "远程服务重启成功"
        print_success "🌐 网站已更新: http://$SERVER_IP:8888"
    else
        print_error "远程服务重启失败"
        exit 1
    fi
}

# 检查服务状态
check_service_status() {
    print_status "检查服务状态..."

    ssh $SSH_OPTS "$REMOTE_USER@$SERVER_IP" <<'EOF'
        echo "📊 当前Next.js进程状态："
        ps aux | grep "next start" | grep -v grep || echo "没有找到Next.js进程"
        
        echo ""
        echo "🌐 端口使用情况："
        netstat -tlnp 2>/dev/null | grep :8888 || echo "端口8888未被占用"
        
        echo ""
        echo "📋 最新服务日志 (最后10行)："
        if [ -f "$HOME/web-server.log" ]; then
            tail -n 10 "$HOME/web-server.log"
        else
            echo "日志文件不存在"
        fi
EOF
}

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
    restart_service

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
