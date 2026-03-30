#!/bin/bash
# ============================================
# deploy.sh — Cloudflare 全量部署脚本
# ============================================
#
# 功能: 构建 Next.js 代码 + 同步内容到 Cloudflare
#       = upload.sh (内容同步) + cf:build + wrangler deploy
#
# 用法:
#   ./deploy.sh                    # 完整部署 (内容 + 代码)
#   ./deploy.sh --code-only        # 只部署代码 (不同步内容)
#   ./deploy.sh --content-only     # 只同步内容 (= upload.sh)
#   ./deploy.sh --full             # 全量重建 D1 (不使用增量)
#   ./deploy.sh --dry-run          # 预览模式
#   ./deploy.sh --skip-images      # 跳过图片优化
#   ./deploy.sh --skip-d1          # 跳过 D1 数据库
#
# 架构:
#   1. upload.sh  → R2 (images + markdown) + D1 (metadata + FTS)
#   2. cf:build   → opennextjs-cloudflare → .open-next/
#   3. wrangler   → deploy Worker + Assets to Cloudflare
#

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# ============================================
# 参数解析
# ============================================
CODE_ONLY=false
CONTENT_ONLY=false
UPLOAD_ARGS=""

for arg in "$@"; do
  case "$arg" in
    --code-only)     CODE_ONLY=true ;;
    --content-only)  CONTENT_ONLY=true ;;
    --full|--dry-run|--skip-images|--skip-d1)
      UPLOAD_ARGS="$UPLOAD_ARGS $arg"
      ;;
    *)
      echo "⚠️  Unknown option: $arg"
      echo "Usage: ./deploy.sh [--code-only|--content-only|--full|--dry-run|--skip-images|--skip-d1]"
      exit 1
      ;;
  esac
done

# ============================================
# 颜色输出
# ============================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

step()    { echo -e "${BLUE}━━━ 🚀 $1${NC}"; }
success() { echo -e "${GREEN}✅ $1${NC}"; }
skip_msg(){ echo -e "${YELLOW}⏭️  $1${NC}"; }
error()   { echo -e "${RED}❌ $1${NC}"; }
info()    { echo -e "${CYAN}ℹ️  $1${NC}"; }

# ============================================
# 开始
# ============================================
START_TIME=$(date +%s)

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     🌐 Cloudflare Deploy                 ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════╝${NC}"
echo ""

if [ "$CODE_ONLY" = true ]; then
  info "Mode: 仅部署代码"
elif [ "$CONTENT_ONLY" = true ]; then
  info "Mode: 仅同步内容"
else
  info "Mode: 完整部署 (内容 + 代码)"
fi

echo ""

# ============================================
# Phase 1: 同步内容到 Cloudflare (R2 + D1)
# ============================================
if [ "$CODE_ONLY" = false ]; then
  step "Phase 1: 同步内容到 Cloudflare"
  echo ""
  
  if ./upload.sh $UPLOAD_ARGS; then
    success "内容同步完成"
  else
    error "内容同步失败"
    exit 1
  fi
  echo ""
else
  skip_msg "Phase 1: 跳过内容同步"
  echo ""
fi

# ============================================
# Phase 2: 构建 Next.js 应用
# ============================================
if [ "$CONTENT_ONLY" = false ]; then
  step "Phase 2: 构建 Next.js 应用 (opennextjs-cloudflare)"
  
  DRY_RUN_CHECK=false
  for arg in $UPLOAD_ARGS; do
    if [ "$arg" = "--dry-run" ]; then
      DRY_RUN_CHECK=true
    fi
  done
  
  if [ "$DRY_RUN_CHECK" = true ]; then
    info "DRY RUN: 跳过构建和部署"
  else
    if npm run cf:build; then
      success "构建完成"
    else
      error "构建失败"
      exit 1
    fi
    echo ""
    
    # ============================================
    # Phase 3: 部署到 Cloudflare Workers
    # ============================================
    step "Phase 3: 部署到 Cloudflare Workers"
    
    if npx wrangler deploy; then
      success "部署完成"
    else
      error "部署失败"
      exit 1
    fi
  fi
  echo ""
else
  skip_msg "Phase 2-3: 跳过代码构建和部署"
  echo ""
fi

# ============================================
# 完成报告
# ============================================
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     🎉 部署完成!                         ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
echo ""
echo -e "   ⏱️  耗时: ${DURATION}s"
echo -e "   🌐 网站: https://gaochengzhi.com"
echo ""
