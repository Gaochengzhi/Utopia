#!/bin/bash

# 快速部署脚本 - 简化版
# 使用方法: ./quick-deploy.sh

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_step() {
    echo -e "${BLUE}🚀 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 检查依赖文件
check_dependencies() {
    if [ ! -f "./deploy.sh" ]; then
        print_error "找不到deploy.sh文件"
        exit 1
    fi
    
    if [ ! -x "./deploy.sh" ]; then
        chmod +x ./deploy.sh
        print_step "已添加deploy.sh执行权限"
    fi
}

# 显示部署信息
show_deploy_info() {
    SERVER_IP=$(node -e "console.log(require('./config.local.js').SERVER_IP)" 2>/dev/null)
    
    echo ""
    echo "======================================="
    echo "🎯 一键部署到生产服务器"
    echo "======================================="
    echo "🖥️  服务器: $SERVER_IP:8888"
    echo "📝 操作: 上传文件 + 重启服务"
    echo "⏱️  预计耗时: 30-60秒"
    echo ""
}

# 确认部署 - 自动开始，无需确认
confirm_deploy() {
    echo "⚡ 自动开始部署..."
}

# 主函数
main() {
    show_deploy_info
    confirm_deploy
    
    print_step "开始执行部署..."
    
    # 执行完整部署脚本
    if ./deploy.sh; then
        echo ""
        print_success "🎉 部署成功完成!"
        
        SERVER_IP=$(node -e "console.log(require('./config.local.js').SERVER_IP)" 2>/dev/null)
        echo -e "${GREEN}🌐 访问地址: http://$SERVER_IP:8888${NC}"
    else
        echo ""
        print_error "部署失败"
        exit 1
    fi
}

# 检查依赖并运行
check_dependencies
main