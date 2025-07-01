#!/bin/bash

# 从config.local.js读取服务器配置
SERVER_IP=$(node -e "console.log(require('./config.local.js').SERVER_IP)")
REMOTE_USER="kounarushi"
REMOTE_PATH="~/web/"

# SSH连接选项
SSH_OPTS="-p 22 -o ConnectTimeout=30 -o ServerAliveInterval=60"
RSYNC_OPTS="-avt --timeout=300 --delete"

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

echo "开始同步到服务器: $SERVER_IP"

# 循环同步每个项目
for item in "${SYNC_ITEMS[@]}"; do
    echo "正在同步: $item"

    if [[ "$item" == *.js ]]; then
        # 单个文件使用-av选项
        rsync -e "ssh $SSH_OPTS" -av --timeout=300 --delete "$item" "$REMOTE_USER@$SERVER_IP:$REMOTE_PATH"
    else
        # 目录使用-avt选项
        rsync -e "ssh $SSH_OPTS" $RSYNC_OPTS "$item" "$REMOTE_USER@$SERVER_IP:$REMOTE_PATH"
    fi

    if [ $? -eq 0 ]; then
        echo "✓ $item 同步成功"
    else
        echo "✗ $item 同步失败"
        exit 1
    fi
done

echo "所有文件同步完成!"
