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
#   ./upload.sh --images-only      # 只同步图片
#   ./upload.sh --full             # 全量重建 D1 (跳过增量，重新 seed)
#   ./upload.sh --dry-run          # 预览模式，不做任何修改
#   ./upload.sh --skip-images      # 跳过图片优化和同步
#   ./upload.sh --skip-d1          # 跳过 D1 数据库更新
#
# 架构:
#   ┌─────────────────── 并行执行 ───────────────────┐
#   │  Images:   optimize-images.mjs → R2             │
#   │  Articles: sync-r2.mjs --dir post → R2          │
#   │  Index:    build-content-index.mjs → SQL         │
#   └────────────────────────────────────────────────┘
#                         ↓ 全部完成后
#          D1:   d1-seed-remote.sh → D1 数据库
#

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." 2>/dev/null && pwd || cd "$SCRIPT_DIR" && pwd)"

# 如果 SCRIPT_DIR 就是项目根目录 (脚本在根目录)
if [ -f "$SCRIPT_DIR/package.json" ]; then
  PROJECT_DIR="$SCRIPT_DIR"
fi

cd "$PROJECT_DIR"

# ============================================
# 参数解析
# ============================================
ARTICLES_ONLY=false
IMAGES_ONLY=false
FULL_REBUILD=false
DRY_RUN=false
SKIP_IMAGES=false
SKIP_D1=false

for arg in "$@"; do
  case "$arg" in
    --articles-only) ARTICLES_ONLY=true ;;
    --images-only)   IMAGES_ONLY=true ;;
    --full)          FULL_REBUILD=true ;;
    --dry-run)       DRY_RUN=true ;;
    --skip-images)   SKIP_IMAGES=true ;;
    --skip-d1)       SKIP_D1=true ;;
    *)
      echo "⚠️  Unknown option: $arg"
      echo "Usage: ./upload.sh [--articles-only|--images-only|--full|--dry-run|--skip-images|--skip-d1]"
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
# 临时日志目录 (用于并行任务输出)
# ============================================
LOG_DIR=$(mktemp -d)
trap 'rm -rf "$LOG_DIR"' EXIT

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
  info "Mode: 仅同步图片"
else
  info "Mode: 同步所有内容 (并行)"
fi

echo ""

# ============================================
# 并行任务定义
# ============================================
PIDS=()
TASK_NAMES=()

# --- Task A: 图片优化 + 同步到 R2 ---
run_images() {
  if [ "$ARTICLES_ONLY" = true ] || [ "$SKIP_IMAGES" = true ]; then
    echo "[SKIP] 图片处理" > "$LOG_DIR/images.log"
    return 0
  fi
  {
    echo "━━━ 🖼️  图片优化 + R2 同步"
    node scripts/optimize-images.mjs $DRY_FLAG 2>&1
  } > "$LOG_DIR/images.log" 2>&1
}

# --- Task B: 同步文章 Markdown 到 R2 ---
run_articles_r2() {
  if [ "$IMAGES_ONLY" = true ]; then
    echo "[SKIP] 文章 R2 同步" > "$LOG_DIR/articles_r2.log"
    return 0
  fi
  {
    echo "━━━ 📄 文章 R2 同步"
    R2_ARGS="--dir post --delete"
    if [ "$DRY_RUN" = true ]; then
      R2_ARGS="$R2_ARGS --dry-run"
    fi
    node scripts/sync-r2.mjs $R2_ARGS 2>&1
  } > "$LOG_DIR/articles_r2.log" 2>&1
}

# --- Task C: 构建文章索引 ---
run_build_index() {
  if [ "$IMAGES_ONLY" = true ] || [ "$SKIP_D1" = true ]; then
    echo "[SKIP] 文章索引构建" > "$LOG_DIR/build_index.log"
    return 0
  fi
  {
    echo "━━━ 📝 构建文章索引"
    BUILD_ARGS=""
    if [ "$FULL_REBUILD" = false ]; then
      BUILD_ARGS="--incremental"
    fi
    if [ "$DRY_RUN" = true ]; then
      BUILD_ARGS="$BUILD_ARGS --dry-run"
    fi
    node scripts/build-content-index.mjs $BUILD_ARGS 2>&1
  } > "$LOG_DIR/build_index.log" 2>&1
}

# ============================================
# 启动并行任务
# ============================================
step "启动并行任务..."
echo ""

run_images &
PIDS+=($!)
TASK_NAMES+=("🖼️  图片优化+R2")

run_articles_r2 &
PIDS+=($!)
TASK_NAMES+=("📄 文章R2同步")

run_build_index &
PIDS+=($!)
TASK_NAMES+=("📝 文章索引构建")

info "已启动 ${#PIDS[@]} 个并行任务，等待完成..."
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

# 输出各任务的详细日志
for logfile in "$LOG_DIR"/*.log; do
  [ -f "$logfile" ] || continue
  content=$(cat "$logfile")
  # 跳过只有 [SKIP] 的日志
  if echo "$content" | grep -q "^\[SKIP\]"; then
    taskname=$(echo "$content" | sed 's/\[SKIP\] //')
    skip_msg "跳过: $taskname"
    continue
  fi
  echo "$content"
  echo ""
done

if [ "$FAILED" -gt 0 ]; then
  error "有 $FAILED 个任务失败，中止"
  exit 1
fi

# ============================================
# 串行步骤: 上传 SQL 到 D1 (依赖 build_index 完成)
# ============================================
if [ "$IMAGES_ONLY" = false ] && [ "$SKIP_D1" = false ]; then
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
