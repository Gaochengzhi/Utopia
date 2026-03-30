#!/bin/bash
# sync-r2-wrangler.sh
# Upload files to R2 using wrangler CLI (no S3 API tokens needed).
# Wrangler must be already authenticated (npx wrangler login).
#
# Usage:
#   bash scripts/sync-r2-wrangler.sh                  # Upload all (post + .pic + photography)
#   bash scripts/sync-r2-wrangler.sh --dir post        # Upload only markdown articles
#   bash scripts/sync-r2-wrangler.sh --dir .pic        # Upload only .pic images
#   bash scripts/sync-r2-wrangler.sh --dir photography # Upload only photography images
#   bash scripts/sync-r2-wrangler.sh --dry-run         # Preview only

set -e

BUCKET="utopia-images"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

DRY_RUN=false
DIR_FILTER=""

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
  esac
done

# Parse --dir argument
for i in $(seq 1 $#); do
  arg="${!i}"
  if [ "$arg" = "--dir" ]; then
    next=$((i + 1))
    DIR_FILTER="${!next}"
  fi
done

TOTAL=0
UPLOADED=0
SKIPPED=0
ERRORS=0

upload_dir() {
  local LOCAL_DIR="$1"
  local R2_PREFIX="$2"
  local LABEL="$3"
  local EXTENSIONS="$4"

  if [ ! -d "$LOCAL_DIR" ]; then
    echo "⚠️  Directory not found: $LOCAL_DIR"
    return
  fi

  echo ""
  echo "📁 Scanning $LABEL..."

  # Find files matching extensions
  local FILES
  FILES=$(find "$LOCAL_DIR" -type f | grep -iE "\.(${EXTENSIONS})$" || true)
  local COUNT
  COUNT=$(echo "$FILES" | grep -c . || echo 0)
  echo "   Found $COUNT files"

  if [ "$COUNT" -eq 0 ]; then
    return
  fi

  TOTAL=$((TOTAL + COUNT))

  echo "$FILES" | while IFS= read -r filepath; do
    # Build R2 key
    local relative
    relative=$(python3 -c "import os; print(os.path.relpath('$filepath', '$LOCAL_DIR'))")
    local r2key="${R2_PREFIX}${relative}"

    if [ "$DRY_RUN" = true ]; then
      local size
      size=$(wc -c < "$filepath" | tr -d ' ')
      echo "   [DRY] $r2key ($(( size / 1024 )) KB)"
    else
      # Determine content type
      local ext="${filepath##*.}"
      ext=$(echo "$ext" | tr '[:upper:]' '[:lower:]')
      local ctype="application/octet-stream"
      case "$ext" in
        jpg|jpeg) ctype="image/jpeg" ;;
        png) ctype="image/png" ;;
        gif) ctype="image/gif" ;;
        webp) ctype="image/webp" ;;
        svg) ctype="image/svg+xml" ;;
        bmp) ctype="image/bmp" ;;
        ico) ctype="image/x-icon" ;;
        md|mdx) ctype="text/markdown; charset=utf-8" ;;
        txt) ctype="text/plain; charset=utf-8" ;;
      esac

      if npx wrangler r2 object put "${BUCKET}/${r2key}" --file "$filepath" --content-type "$ctype" --remote 2>/dev/null; then
        UPLOADED=$((UPLOADED + 1))
        if [ $((UPLOADED % 20)) -eq 0 ]; then
          echo "   ✅ Uploaded $UPLOADED files..."
        fi
      else
        echo "   ❌ Failed: $r2key"
        ERRORS=$((ERRORS + 1))
      fi
    fi
  done
}

# Sync directories based on filter
if [ -z "$DIR_FILTER" ] || [ "$DIR_FILTER" = "post" ]; then
  upload_dir "$ROOT/post" "post/" "Markdown articles (post/)" "md|mdx|txt"
fi

if [ -z "$DIR_FILTER" ] || [ "$DIR_FILTER" = ".pic" ]; then
  upload_dir "$ROOT/public/.pic" ".pic/" "Article images (.pic/)" "jpg|jpeg|png|gif|webp|svg|bmp|ico"
fi

if [ -z "$DIR_FILTER" ] || [ "$DIR_FILTER" = "photography" ]; then
  upload_dir "$ROOT/public/photography" "photography/" "Photography images" "jpg|jpeg|png|gif|webp|svg|bmp|ico"
fi

echo ""
echo "✨ Sync complete!"
if [ "$DRY_RUN" = true ]; then
  echo "   🔍 DRY RUN - no files were actually uploaded"
fi
