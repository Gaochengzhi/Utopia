#!/bin/bash

# 从config.local.js读取服务器配置
SERVER_IP="74.48.115.131"
REMOTE_USER="kounarushi"
REMOTE_PATH="~/web/"

# SSH连接选项 - 增加超时时间和重试机制
SSH_OPTS="-p 22 -o ConnectTimeout=30 -o ServerAliveInterval=60 -o ServerAliveCountMax=3 -o TCPKeepAlive=yes -o Compression=yes"

# 需要同步的目录和文件
SYNC_ITEMS=(
    "post"
    "public"
    "pages"
    "lib"
    "components"
    "contexts"
    "styles"
    "next.config.js"
    "config.local.js"
    "tailwind.config.js"
    ".env.local"
)

# 自动检测系统配置
AUTO_CONCURRENT=$(nproc 2>/dev/null || echo "4")
if [ $AUTO_CONCURRENT -gt 8 ]; then
    MAX_CONCURRENT=8
elif [ $AUTO_CONCURRENT -lt 2 ]; then
    MAX_CONCURRENT=2
else
    MAX_CONCURRENT=$AUTO_CONCURRENT
fi

# 全局变量
PIDS=()
ITEMS_STATUS=()
START_TIME=$(date +%s)

echo "🚀 开始智能异步同步到服务器: $SERVER_IP"
echo "📊 自动检测并发数: $MAX_CONCURRENT"

# 测试连接速度并自动调整超时
test_connection() {
    echo "🔍 测试服务器连接..."
    local test_start=$(date +%s)

    if ssh $SSH_OPTS "$REMOTE_USER@$SERVER_IP" "echo 'connection test'" >/dev/null 2>&1; then
        local test_end=$(date +%s)
        local connection_time=$((test_end - test_start))

        if [ $connection_time -gt 5 ]; then
            SSH_OPTS="-p 22 -o ConnectTimeout=90 -o ServerAliveInterval=120 -o ServerAliveCountMax=5 -o TCPKeepAlive=yes -o Compression=yes"
            echo "⚠️  网络较慢，已自动调整超时设置"
        else
            echo "✅ 网络连接良好"
        fi
        return 0
    else
        echo "❌ 无法连接到服务器"
        exit 1
    fi
}

# 智能选择rsync选项
get_rsync_opts() {
    local item="$1"
    local base_opts="--timeout=600 --delete --compress --partial --inplace"

    # Exclude server-side generated files
    local exclude_opts="--exclude=pageviews.json"

    # 根据文件类型自动优化
    if [[ "$item" == *.js ]] || [[ "$item" == *.json ]] || [[ "$item" == *.css ]]; then
        echo "-av $base_opts $exclude_opts --compress-level=9"
    elif [[ "$item" == "public" ]] || [[ "$item" == "post" ]]; then
        # 静态资源，可能包含图片等，适度压缩
        echo "-avt $base_opts $exclude_opts --compress-level=6"
    else
        # 代码文件，高压缩比
        echo "-avt $base_opts $exclude_opts --compress-level=9"
    fi
}

# 异步同步函数
async_sync() {
    local item="$1"
    local index="$2"

    local rsync_opts=$(get_rsync_opts "$item")
    local temp_log="/tmp/sync_${item//\//_}_$$.log"

    {
        echo "[$(date '+%H:%M:%S')] [$index] 开始同步: $item"

        if rsync -e "ssh $SSH_OPTS" $rsync_opts "$item" "$REMOTE_USER@$SERVER_IP:$REMOTE_PATH" 2>&1; then
            echo "[$(date '+%H:%M:%S')] [$index] ✅ $item 同步成功"
            echo "SUCCESS:$index:$item" >>"$temp_log"
        else
            echo "[$(date '+%H:%M:%S')] [$index] ❌ $item 同步失败"
            echo "FAILED:$index:$item" >>"$temp_log"
        fi
    } &

    local pid=$!
    echo $pid # 返回PID
}

# 智能进度显示
show_progress() {
    local completed=0
    local total=${#SYNC_ITEMS[@]}

    while [ $completed -lt $total ]; do
        sleep 2
        completed=0

        for pid in "${PIDS[@]}"; do
            if ! kill -0 "$pid" 2>/dev/null; then
                ((completed++))
            fi
        done

        local progress=$((completed * 100 / total))
        printf "\r📈 进度: %d/%d (%d%%) " $completed $total $progress
    done
    echo
}

# 主执行流程
main() {
    # 测试连接
    test_connection

    # 启动所有异步任务
    echo "🔄 启动异步同步任务..."
    local index=1

    for item in "${SYNC_ITEMS[@]}"; do
        # 检查文件/目录是否存在
        if [ ! -e "$item" ]; then
            echo "⚠️  跳过不存在的项目: $item"
            continue
        fi

        local pid=$(async_sync "$item" "$index")
        PIDS+=($pid)
        ITEMS_STATUS+=("$index:$item:RUNNING")

        echo "🚀 已启动: $item (PID: $pid)"
        ((index++))

        # 控制并发数
        if [ ${#PIDS[@]} -ge $MAX_CONCURRENT ]; then
            echo "⏳ 等待部分任务完成..."
            # 等待第一个进程完成
            if [ ${#PIDS[@]} -gt 0 ] && [ -n "${PIDS[0]}" ]; then
                wait ${PIDS[0]} 2>/dev/null || true
                # 移除已完成的进程ID
                PIDS=("${PIDS[@]:1}")
            fi
        fi
    done

    # 显示进度
    show_progress &
    local progress_pid=$!

    # 等待所有任务完成
    echo "⏳ 等待所有同步任务完成..."
    for pid in "${PIDS[@]}"; do
        if [ -n "$pid" ]; then
            wait "$pid" 2>/dev/null || true
        fi
    done

    # 停止进度显示
    kill $progress_pid 2>/dev/null || true

    # 收集结果
    local success_count=0
    local failed_count=0
    local failed_items=()

    for log_file in /tmp/sync_*_$$.log; do
        if [ -f "$log_file" ]; then
            while IFS=':' read -r status index item; do
                if [ "$status" = "SUCCESS" ]; then
                    ((success_count++))
                else
                    ((failed_count++))
                    failed_items+=("$item")
                fi
            done <"$log_file"
            rm -f "$log_file"
        fi
    done

    # 显示最终结果
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    echo
    echo "🎯 同步完成报告"
    echo "=========================="
    echo "⏱️  总耗时: ${duration}秒"
    echo "📊 总任务: ${#SYNC_ITEMS[@]}"
    echo "✅ 成功: $success_count"
    echo "❌ 失败: $failed_count"

    if [ $failed_count -gt 0 ]; then
        echo "失败项目:"
        for item in "${failed_items[@]}"; do
            echo "  - $item"
        done
        echo
        echo "💡 建议: 检查网络连接或手动重试失败的项目"
        exit 1
    else
        echo "🎉 所有文件同步成功!"
        echo "🌐 网站已更新: http://$SERVER_IP"
    fi
}

# 信号处理 - 优雅退出
cleanup() {
    echo
    echo "🛑 收到中断信号，正在清理..."
    for pid in "${PIDS[@]}"; do
        if [ -n "$pid" ]; then
            kill "$pid" 2>/dev/null || true
        fi
    done
    rm -f /tmp/sync_*_$$.log
    exit 130
}

trap cleanup INT TERM

# 运行主程序
main
