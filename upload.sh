#!/bin/bash
# ============================================
# upload.sh — Cloudflare 内容同步脚本
# ============================================
#
# 功能: 将本地文章和图片同步到 Cloudflare (R2 + D1)
#       以本地为准，远端多余的文件会被删除
#       自动跳过未更改的文件
#
# 用法:
#   ./upload.sh                    # 同步所有内容 (文章 + 图片)
#   ./upload.sh --articles-only    # 只同步文章
#   ./upload.sh --images-only      # 发布摄影图库（R2 变体 + D1 摄影索引）
#   ./upload.sh --full             # 全量重建 D1 (跳过增量，重新 seed)
#   ./upload.sh --dry-run          # 预览模式，不做任何修改
#   ./upload.sh --skip-images      # 跳过图片优化和同步
#   ./upload.sh --skip-d1          # 跳过 D1 数据库更新
#
# 架构:
#   Phase 0: preflight-sync-check.mjs — 本地/远端内容数量对比,
#            内容不全的机器直接拒绝同步 (防误删线上内容)
#   Phase 1: optimize-images.mjs --no-sync — 本地图片转 webp
#            (必须在索引构建之前完成,否则 D1 会记录已被转换删除的 .jpg)
#   ┌─────────────────── Phase 2: 并行执行 ──────────────────┐
#   │  Images:   sync-r2.mjs → R2, then build-photo-variants │
#   │  Articles: sync-r2.mjs --dir post → R2                 │
#   │  Index:    build-content-index.mjs → D1 SQL             │
#   └────────────────────────────────────────────────────────┘
#                         ↓ 全部完成后
#   Phase 3: d1-seed-remote.sh → D1 数据库
#

# Note: NOT using set -e — individual task failures are handled gracefully

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." 2>/dev/null && pwd || cd "$SCRIPT_DIR" && pwd)"

# 如果 SCRIPT_DIR 就是项目根目录 (脚本在根目录)
if [ -f "$SCRIPT_DIR/package.json" ]; then
  PROJECT_DIR="$SCRIPT_DIR"
fi

cd "$PROJECT_DIR"

# Ensure node is on PATH (nvm / homebrew / fnm)
export PATH="$HOME/.nvm/versions/node/$(ls $HOME/.nvm/versions/node/ 2>/dev/null | tail -1)/bin:$PATH" 2>/dev/null
export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.local/bin:$PATH"
if ! command -v node &>/dev/null; then
  # Try loading nvm explicitly
  [ -s "$HOME/.nvm/nvm.sh" ] && source "$HOME/.nvm/nvm.sh"
fi

# Resolve node executable once, and reuse it (important for GUI/non-login shells).
NODE_BIN="${NODE_BIN:-$(command -v node 2>/dev/null || true)}"
if [ -z "$NODE_BIN" ] && [ -x "/opt/homebrew/bin/node" ]; then
  NODE_BIN="/opt/homebrew/bin/node"
fi
if [ -z "$NODE_BIN" ] && [ -x "/usr/local/bin/node" ]; then
  NODE_BIN="/usr/local/bin/node"
fi
if [ -z "$NODE_BIN" ]; then
  echo -e "\033[0;31m❌ node not found in PATH. Install Node.js or check your shell config.\033[0m"
  exit 1
fi

# ============================================
# 参数解析
# ============================================
ARTICLES_ONLY=false
IMAGES_ONLY=false
FULL_REBUILD=false
DRY_RUN=false
SKIP_IMAGES=false
SKIP_D1=false
FORCE_DELETE=false

for arg in "$@"; do
  case "$arg" in
    --articles-only) ARTICLES_ONLY=true ;;
    --images-only)   IMAGES_ONLY=true ;;
    --full)          FULL_REBUILD=true ;;
    --dry-run)       DRY_RUN=true ;;
    --skip-images)   SKIP_IMAGES=true ;;
    --skip-d1)       SKIP_D1=true ;;
    --force-delete)  FORCE_DELETE=true ;;
    *)
      echo "⚠️  Unknown option: $arg"
      echo "Usage: ./upload.sh [--articles-only|--images-only|--full|--dry-run|--skip-images|--skip-d1|--force-delete]"
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
# 临时日志目录 (用于并行任务退出码)
# ============================================
LOG_DIR=$(mktemp -d)
trap 'rm -rf "$LOG_DIR"' EXIT

# stream_task <prefix> <color_code> <log_file> -- 将子进程输出实时加前缀打印
# 用法: { some_command; } | stream_task "🖼️  图片" "$CYAN" "$LOG_DIR/images.log"
stream_task() {
  local prefix="$1"
  local color="$2"
  local logfile="$3"
  awk -v p="$prefix" -v c="$color" -v r='\033[0m' \
    '{ print c "[" p "]" r " " $0; fflush() }' | tee -a "$logfile"
}

# ============================================
# 开始
# ============================================
START_TIME=$(date +%s)

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     📤 Cloudflare Content Sync           ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════╝${NC}"
echo ""

if [ "$DRY_RUN" = true ]; then
  info "DRY RUN — 不会做任何实际修改"
  DRY_FLAG="--dry-run"
else
  DRY_FLAG=""
fi

if [ "$ARTICLES_ONLY" = true ]; then
  info "Mode: 仅同步文章"
elif [ "$IMAGES_ONLY" = true ]; then
  info "Mode: 发布摄影图库（不触及文章与博客插图）"
else
  info "Mode: 同步所有内容 (并行)"
fi

echo ""

# ============================================
# Phase 0: 预检 — 内容不全的机器直接拒绝同步
# ============================================
step "Phase 0: 预检 (本地 vs 远端内容对比)"

PREFLIGHT_ARGS=""
if [ "$ARTICLES_ONLY" = true ]; then PREFLIGHT_ARGS="--articles-only"; fi
if [ "$IMAGES_ONLY" = true ]; then PREFLIGHT_ARGS="--images-only"; fi
if [ "$FORCE_DELETE" = true ]; then PREFLIGHT_ARGS="$PREFLIGHT_ARGS --force"; fi

if ! "$NODE_BIN" scripts/preflight-sync-check.mjs $PREFLIGHT_ARGS; then
  error "预检失败: 本机内容不完整，同步会删除线上内容。已中止。"
  error "如确认要以本机为准，请使用 --force-delete 重新运行。"
  exit 1
fi
echo ""

# ============================================
# Phase 1: 图片本地优化 (必须在索引构建之前)
# ============================================
# 优化会把 .jpg 转成 .webp 并删除原文件。如果和索引构建并行，
# D1 索引会记录已被删除的 .jpg 路径，导致图片 404。
if [ "$ARTICLES_ONLY" = true ] || [ "$SKIP_IMAGES" = true ]; then
  skip_msg "Phase 1: 跳过图片优化"
else
  step "Phase 1: 图片本地优化 (webp 转换)"
  if ! ( set -o pipefail; "$NODE_BIN" scripts/optimize-images.mjs --scope all --no-sync $DRY_FLAG 2>&1 \
      | stream_task "🖼️ 优化" "$CYAN" "$LOG_DIR/optimize.log" ); then
    error "图片优化失败，中止上传"
    exit 1
  fi
fi
echo ""

# ============================================
# Phase 2: 并行任务定义
# ============================================
SYNC_EXTRA=""
if [ "$DRY_RUN" = true ]; then SYNC_EXTRA="$SYNC_EXTRA --dry-run"; fi
if [ "$FORCE_DELETE" = true ]; then SYNC_EXTRA="$SYNC_EXTRA --force-delete"; fi

PIDS=()
TASK_NAMES=()

# --- Task A: 同步图片到 R2 ---
run_images_sync() {
  set -o pipefail
  if [ "$ARTICLES_ONLY" = true ] || [ "$SKIP_IMAGES" = true ]; then
    skip_msg "跳过: 图片 R2 同步"
    exit 0
  fi
  {
    if [ "$IMAGES_ONLY" = false ]; then
      "$NODE_BIN" scripts/sync-r2.mjs --dir .pic --delete $SYNC_EXTRA
    fi
    "$NODE_BIN" scripts/sync-r2.mjs --dir photography --delete $SYNC_EXTRA \
      && "$NODE_BIN" scripts/build-photo-variants.mjs $DRY_FLAG
  } 2>&1 | stream_task "🖼️ 图片" "$CYAN" "$LOG_DIR/images.log"
}

# --- Task B: 同步文章 Markdown 到 R2 ---
run_articles_r2() {
  set -o pipefail
  if [ "$IMAGES_ONLY" = true ]; then
    skip_msg "跳过: 文章 R2 同步"
    exit 0
  fi
  "$NODE_BIN" scripts/sync-r2.mjs --dir post --delete $SYNC_EXTRA 2>&1 \
    | stream_task "📄 文章" "$BLUE" "$LOG_DIR/articles_r2.log"
}

# --- Task C: 构建文章 / 摄影索引 ---
run_build_index() {
  set -o pipefail
  if [ "$SKIP_D1" = true ]; then
    skip_msg "跳过: 内容索引构建"
    exit 0
  fi
  local BUILD_ARGS=""
  if [ "$FULL_REBUILD" = false ]; then
    BUILD_ARGS="--incremental"
  fi
  if [ "$DRY_RUN" = true ]; then
    BUILD_ARGS="$BUILD_ARGS --dry-run"
  fi
  "$NODE_BIN" scripts/build-content-index.mjs $BUILD_ARGS 2>&1 \
    | stream_task "📝 索引" "$YELLOW" "$LOG_DIR/build_index.log"
}

# ============================================
# Phase 2: 启动并行任务
# ============================================
step "Phase 2: 启动并行任务..."
echo ""

run_images_sync &
PIDS+=($!)
TASK_NAMES+=("🖼️  图片R2同步")

run_articles_r2 &
PIDS+=($!)
TASK_NAMES+=("📄 文章R2同步")

run_build_index &
PIDS+=($!)
TASK_NAMES+=("📝 内容索引构建")

info "已启动 ${#PIDS[@]} 个并行任务，实时输出如下:"
echo ""

# ============================================
# 等待所有并行任务完成
# ============================================
FAILED=0
for i in "${!PIDS[@]}"; do
  pid=${PIDS[$i]}
  name=${TASK_NAMES[$i]}
  if wait "$pid"; then
    success "$name 完成"
  else
    error "$name 失败"
    FAILED=$((FAILED + 1))
  fi
done

echo ""

if [ "$FAILED" -gt 0 ]; then
  error "有 $FAILED 个任务失败，停止后续 D1 更新"
  exit 1
fi

# ============================================
# 串行步骤: 上传 SQL 到 D1 (依赖 build_index 完成)
# ============================================
if [ "$SKIP_D1" = false ]; then
  step "上传到 D1 数据库"
  
  SEED_FILE="scripts/d1-seed.sql"
  if [ ! -f "$SEED_FILE" ]; then
    skip_msg "没有找到 d1-seed.sql，跳过 D1 上传"
  elif [ "$DRY_RUN" = true ]; then
    SEED_SIZE=$(wc -c < "$SEED_FILE" | tr -d ' ')
    info "DRY RUN: 会上传 $(( SEED_SIZE / 1024 )) KB 到 D1"
  else
    if bash scripts/d1-seed-remote.sh; then
      success "D1 数据库更新完成"
    else
      error "D1 数据库更新失败"
      exit 1
    fi
  fi
  echo ""
else
  skip_msg "跳过 D1 数据库更新"
  echo ""
fi

# ============================================
# 完成报告
# ============================================
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     🎉 同步完成!                         ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
echo ""
echo -e "   ⏱️  耗时: ${DURATION}s"
if [ "$DRY_RUN" = true ]; then
  echo -e "   🔍 DRY RUN — 没有做任何修改"
fi
echo ""
