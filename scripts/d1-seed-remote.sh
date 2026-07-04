#!/bin/bash
# d1-seed-remote.sh
# Splits d1-seed.sql into chunks and uploads them to D1 sequentially.
# D1's --file upload has a ~1MB limit per file, so we split into ~800KB chunks.
#
# Usage:
#   bash scripts/d1-seed-remote.sh [--dry-run]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SEED_FILE="$SCRIPT_DIR/d1-seed.sql"
DB_NAME="utopia-db"
MAX_CHUNK_BYTES=800000  # ~800KB per chunk
CHUNK_DIR=""
WRANGLER_ENV_FILE=""

DRY_RUN=false
if [ "${1:-}" = "--dry-run" ]; then
  DRY_RUN=true
fi

if [ ! -f "$SEED_FILE" ]; then
  echo "❌ Seed file not found: $SEED_FILE"
  echo "   Run 'npm run build:content-index' first."
  exit 1
fi

SEED_SIZE=$(wc -c < "$SEED_FILE" | tr -d ' ')

cleanup() {
  if [ -n "${CHUNK_DIR:-}" ] && [ -d "$CHUNK_DIR" ]; then
    rm -rf "$CHUNK_DIR"
  fi
  if [ -n "${WRANGLER_ENV_FILE:-}" ] && [ -f "$WRANGLER_ENV_FILE" ]; then
    rm -f "$WRANGLER_ENV_FILE"
  fi
}
trap cleanup EXIT

# Wrangler auto-loads .env by default. Keep D1 uploads on OAuth auth even when
# the project .env contains CLOUDFLARE_API_TOKEN for other scripts.
WRANGLER_ENV_FILE=$(mktemp "${TMPDIR:-/tmp}/wrangler-empty-env.XXXXXX")

upload_sql_file() {
  local sql_file="$1"
  local label="$2"

  echo -n "   ⬆️  Uploading $label... "
  if npx wrangler d1 execute "$DB_NAME" --remote --file "$sql_file" --yes --env-file "$WRANGLER_ENV_FILE" 2>&1; then
    echo "✅"
    return 0
  fi

  echo "❌ FAILED"
  echo "   ⚠️  Stopping due to failure. Fix the issue and re-run."
  return 1
}

if [ "$SEED_SIZE" -le "$MAX_CHUNK_BYTES" ]; then
  echo "📦 Seed file is $(( SEED_SIZE / 1024 )) KB, uploading directly without chunking..."
  echo ""

  if [ "$DRY_RUN" = true ]; then
    echo "🏁 Dry run complete. Would upload: $SEED_FILE"
    exit 0
  fi

  echo "🚀 Uploading seed file to D1 (${DB_NAME})..."
  echo ""
  if upload_sql_file "$SEED_FILE" "$(basename "$SEED_FILE")"; then
    echo ""
    echo "🎉 Seed file uploaded successfully!"
    echo "✨ Done!"
    exit 0
  fi

  echo ""
  echo "❌ Upload failed."
  exit 1
fi

echo "📦 Splitting $SEED_FILE into chunks (max ${MAX_CHUNK_BYTES} bytes each)..."

# Use a unique temp dir to avoid overlapping upload jobs deleting each
# other's chunks while Wrangler is still reading them.
CHUNK_DIR=$(mktemp -d "${TMPDIR:-/tmp}/d1-seed-chunks.XXXXXX")

# Split the SQL file into chunks, respecting statement boundaries.
# Key challenge: INSERT statements contain multi-line blog content with
# newlines and semicolons inside SQL string literals. We must track quote
# state to find real statement boundaries.
python3 - "$SEED_FILE" "$CHUNK_DIR" "$MAX_CHUNK_BYTES" << 'PYTHON_SCRIPT'
import sys, os

seed_file = sys.argv[1]
chunk_dir = sys.argv[2]
max_bytes = int(sys.argv[3])

with open(seed_file, 'r', encoding='utf-8') as f:
    content = f.read()

# Parse into complete SQL statements by tracking quote state.
# In SQL, strings are delimited by single quotes, and '' is an escaped quote.
statements = []
current_start = 0
in_string = False
i = 0

while i < len(content):
    c = content[i]
    
    if in_string:
        if c == "'":
            # Check for escaped quote ''
            if i + 1 < len(content) and content[i + 1] == "'":
                i += 2  # Skip ''
                continue
            else:
                in_string = False
        i += 1
    else:
        if c == "'":
            in_string = True
            i += 1
        elif c == ';':
            # End of statement
            stmt = content[current_start:i + 1].strip()
            if stmt and stmt != ';':
                statements.append(stmt)
            current_start = i + 1
            i += 1
        elif c == '-' and i + 1 < len(content) and content[i + 1] == '-':
            # SQL comment — find end of line
            end = content.find('\n', i)
            if end == -1:
                end = len(content)
            comment = content[current_start:end].strip()
            if comment:
                statements.append(comment)
            current_start = end + 1
            i = end + 1
        else:
            i += 1

# Remaining content
remaining = content[current_start:].strip()
if remaining:
    statements.append(remaining)

# Group statements into chunks by byte size
chunk_idx = 0
current_chunk = []
current_size = 0

for stmt in statements:
    stmt_bytes = len((stmt + '\n').encode('utf-8'))
    
    if current_size + stmt_bytes > max_bytes and current_chunk:
        chunk_path = os.path.join(chunk_dir, f'chunk_{chunk_idx:03d}.sql')
        with open(chunk_path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(current_chunk) + '\n')
        chunk_idx += 1
        current_chunk = []
        current_size = 0
    
    current_chunk.append(stmt)
    current_size += stmt_bytes

if current_chunk:
    chunk_path = os.path.join(chunk_dir, f'chunk_{chunk_idx:03d}.sql')
    with open(chunk_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(current_chunk) + '\n')
    chunk_idx += 1

print(f'Split into {chunk_idx} chunks')
PYTHON_SCRIPT

CHUNK_COUNT=$(ls "$CHUNK_DIR"/chunk_*.sql 2>/dev/null | wc -l | tr -d ' ')
echo "✅ Created $CHUNK_COUNT chunk files"

if [ "$CHUNK_COUNT" -eq 0 ]; then
  echo "❌ No chunk files were created."
  exit 1
fi

# Show chunk sizes
echo ""
echo "📊 Chunk sizes:"
for chunk in "$CHUNK_DIR"/chunk_*.sql; do
  size=$(wc -c < "$chunk" | tr -d ' ')
  name=$(basename "$chunk")
  echo "   $name: $(( size / 1024 )) KB"
done

if [ "$DRY_RUN" = true ]; then
  echo ""
  echo "🏁 Dry run complete. Chunks are in: $CHUNK_DIR"
  exit 0
fi

echo ""
echo "🚀 Uploading $CHUNK_COUNT chunks to D1 (${DB_NAME})..."
echo ""

FAILED=0
for chunk in "$CHUNK_DIR"/chunk_*.sql; do
  if [ ! -f "$chunk" ]; then
    echo "❌ Missing chunk file before upload: $chunk"
    FAILED=$((FAILED + 1))
    break
  fi

  name=$(basename "$chunk")
  if ! upload_sql_file "$chunk" "$name"; then
    FAILED=$((FAILED + 1))
    break
  fi
done

echo ""
if [ "$FAILED" -eq 0 ]; then
  echo "🎉 All $CHUNK_COUNT chunks uploaded successfully!"
else
  echo "❌ Upload failed. $FAILED chunk(s) had errors."
  exit 1
fi

echo "🧹 Cleaning up chunk files..."
echo "✨ Done!"
