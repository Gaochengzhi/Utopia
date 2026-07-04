#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
output_dir="$SCRIPT_DIR/public/.pic"
mkdir -p "$output_dir"

export PATH="$HOME/.nvm/versions/node/$(ls $HOME/.nvm/versions/node/ 2>/dev/null | tail -1)/bin:$PATH" 2>/dev/null
export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.local/bin:$PATH"
if ! command -v node >/dev/null 2>&1; then
    [ -s "$HOME/.nvm/nvm.sh" ] && source "$HOME/.nvm/nvm.sh"
fi

NODE_BIN="${NODE_BIN:-$(command -v node 2>/dev/null || true)}"
if [ -z "$NODE_BIN" ] && [ -x "/opt/homebrew/bin/node" ]; then
    NODE_BIN="/opt/homebrew/bin/node"
fi
if [ -z "$NODE_BIN" ] && [ -x "/usr/local/bin/node" ]; then
    NODE_BIN="/usr/local/bin/node"
fi
if [ -z "$NODE_BIN" ]; then
    echo "Error: Node.js is required but not found in PATH." >&2
    exit 1
fi

if ! command -v magick >/dev/null 2>&1; then
    echo "Error: ImageMagick ('magick') is required but not found in PATH." >&2
    exit 1
fi

echo "Upload Success:"

for var in "$@"; do
    # Generate a unique filename (always output webp for blog images)
    imgName="$(uuidgen).webp"
    out_file="$output_dir/$imgName"

    # Unified pipeline for all input formats:
    # 1) auto-orient: bake EXIF orientation into pixels
    # 2) resize: cap max width to 1680 (no enlargement)
    # 3) strip metadata and encode as webp
    magick "$var" \
        -auto-orient \
        -resize "1680x>" \
        -strip \
        -quality 82 \
        "$out_file"

    "$NODE_BIN" "$SCRIPT_DIR/scripts/sync-r2.mjs" --file "$out_file" >/dev/null

    # Print the file URL
    echo "file://$out_file"
done
