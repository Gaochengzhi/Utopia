#!/bin/bash

# 简单部署脚本 - 适用于网络不稳定的情况
# 功能：顺序同步 + 重启服务

# 配置
SERVER_IP=$(node -e "console.log(require('./config.local.js').SERVER_IP)")
REMOTE_USER="kounarushi"
REMOTE_PATH="\$HOME/web/"

# 更强的SSH选项
SSH_OPTS="-p 22 -o ConnectTimeout=60 -o ServerAliveInterval=120 -o ServerAliveCountMax=10 -o TCPKeepAlive=yes -o Compression=yes"

# 需要同步的目录和文件
SYNC_ITEMS=(
    "post"
    "public"
    "pages"
    "components"
    "contexts"
    "styles"
    "next.config.js"
    "config.local.js"
    "tailwind.config.js"
)

print_status() {
    echo "🚀 $1"
}

print_success() {
    echo "✅ $1"
}

print_error() {
    echo "❌ $1"
}

# 测试连接
test_connection() {
    print_status "测试服务器连接..."
    local max_retries=3
    local retry=0
    
    while [ $retry -lt $max_retries ]; do
        if ssh $SSH_OPTS "$REMOTE_USER@$SERVER_IP" "echo 'connection test'" >/dev/null 2>&1; then
            print_success "连接测试成功"
            return 0
        else
            ((retry++))
            echo "⚠️  连接失败，重试 $retry/$max_retries..."
            sleep 5
        fi
    done
    
    print_error "无法连接到服务器"
    exit 1
}

# 顺序同步文件
sync_files() {
    print_status "开始顺序同步文件..."
    
    local success_count=0
    local failed_items=()
    
    for item in "${SYNC_ITEMS[@]}"; do
        if [ ! -e "$item" ]; then
            echo "⚠️  跳过不存在的项目: $item"
            continue
        fi
        
        print_status "同步: $item"
        
        # 根据文件类型选择rsync选项
        local rsync_opts="-avt --timeout=600 --delete --compress --partial --inplace"
        
        # 重试机制
        local max_retries=3
        local retry=0
        local success=false
        
        while [ $retry -lt $max_retries ] && [ "$success" = false ]; do
            if rsync -e "ssh $SSH_OPTS" $rsync_opts "$item" "$REMOTE_USER@$SERVER_IP:$REMOTE_PATH" 2>/dev/null; then
                print_success "$item 同步成功"
                ((success_count++))
                success=true
            else
                ((retry++))
                if [ $retry -lt $max_retries ]; then
                    echo "⚠️  $item 同步失败，重试 $retry/$max_retries..."
                    sleep 3
                else
                    print_error "$item 同步失败"
                    failed_items+=("$item")
                fi
            fi
        done
    done
    
    echo ""
    echo "📊 同步结果:"
    echo "✅ 成功: $success_count"
    echo "❌ 失败: ${#failed_items[@]}"
    
    if [ ${#failed_items[@]} -gt 0 ]; then
        echo "失败项目:"
        for item in "${failed_items[@]}"; do
            echo "  - $item"
        done
        
        # 即使有失败项目也继续重启服务
        echo "⚠️  部分文件同步失败，但继续重启服务..."
    fi
}

# 重启远程服务
restart_service() {
    print_status "重启远程Next.js服务..."
    
    ssh $SSH_OPTS "$REMOTE_USER@$SERVER_IP" << 'EOF'
        cd "$HOME/web/"
        
        echo "🔍 停止现有Next.js进程..."
        
        # 查找并停止Next.js进程
        PIDS=$(ps aux | grep "next start" | grep -v grep | awk '{print $2}')
        
        if [ -n "$PIDS" ]; then
            echo "停止进程: $PIDS"
            echo $PIDS | xargs kill -TERM 2>/dev/null
            sleep 3
            
            # 强制停止残留进程
            REMAINING_PIDS=$(ps aux | grep "next start" | grep -v grep | awk '{print $2}')
            if [ -n "$REMAINING_PIDS" ]; then
                echo "强制停止: $REMAINING_PIDS"
                echo $REMAINING_PIDS | xargs kill -KILL 2>/dev/null
            fi
        fi
        
        echo "🚀 启动新服务..."
        nohup npm start > "$HOME/web-server.log" 2>&1 &
        
        NEW_PID=$!
        echo "新进程PID: $NEW_PID"
        
        sleep 5
        
        if ps -p $NEW_PID > /dev/null; then
            echo "✅ 服务启动成功"
            echo "📋 服务日志:"
            tail -n 5 "$HOME/web-server.log"
        else
            echo "❌ 服务启动失败"
            echo "📋 错误日志:"
            tail -n 10 "$HOME/web-server.log"
            exit 1
        fi
EOF
    
    if [ $? -eq 0 ]; then
        print_success "服务重启成功"
        print_success "🌐 网站地址: http://$SERVER_IP:8888"
    else
        print_error "服务重启失败"
        exit 1
    fi
}

# 主函数
main() {
    echo "🎯 简单部署模式"
    echo "=================="
    echo "🖥️  服务器: $SERVER_IP"
    echo "📝 模式: 顺序同步 + 服务重启"
    echo ""
    
    test_connection
    sync_files
    restart_service
    
    echo ""
    print_success "🎉 部署完成!"
}

# 信号处理
cleanup() {
    echo ""
    echo "🛑 部署中断"
    exit 130
}

trap cleanup INT TERM

# 检查依赖
if [ ! -f "./config.local.js" ]; then
    print_error "找不到config.local.js文件"
    exit 1
fi

# 运行
main