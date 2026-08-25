#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
output_dir="$SCRIPT_DIR/public/.pic"
mkdir -p "$output_dir"

if [ "$#" -eq 0 ]; then
    echo "Upload failed: No image paths were provided."
    exit 1
fi

export PATH="$HOME/.nvm/versions/node/$(ls $HOME/.nvm/versions/node/ 2>/dev/null | tail -1)/bin:$PATH" 2>/dev/null
export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.local/bin:$PATH"
if ! command -v node >/dev/null 2>&1; then
    if [ -s "$HOME/.nvm/nvm.sh" ]; then
        . "$HOME/.nvm/nvm.sh"
    fi
fi

NODE_BIN="${NODE_BIN:-$(command -v node 2>/dev/null || true)}"
if [ -z "$NODE_BIN" ] && [ -x "/opt/homebrew/bin/node" ]; then
    NODE_BIN="/opt/homebrew/bin/node"
fi
if [ -z "$NODE_BIN" ] && [ -x "/usr/local/bin/node" ]; then
    NODE_BIN="/usr/local/bin/node"
fi
if [ -z "$NODE_BIN" ]; then
    echo "Upload failed: Node.js is required but was not found."
    exit 1
fi

if ! command -v magick >/dev/null 2>&1; then
    echo "Upload failed: ImageMagick ('magick') is required but was not found."
    exit 1
fi

if ! command -v uuidgen >/dev/null 2>&1; then
    echo "Upload failed: 'uuidgen' is required but was not found."
    exit 1
fi

uploaded_urls=""

for var in "$@"; do
    if [ ! -f "$var" ]; then
        echo "Upload failed: Image file not found: $var"
        exit 1
    fi

    # Generate a unique filename (always output webp for blog images)
    imgName="$(uuidgen).webp"
    out_file="$output_dir/$imgName"

    # Unified pipeline for all input formats:
    # 1) auto-orient: bake EXIF orientation into pixels
    # 2) resize: cap max width to 1680 (no enlargement)
    # 3) strip metadata and encode as webp
    if ! magick "$var" \
            -auto-orient \
            -resize "1680x>" \
            -strip \
            -quality 82 \
            "$out_file"; then
        rm -f "$out_file"
        echo "Upload failed: Could not process image: $var"
        exit 1
    fi

    # sync-r2 resolves both .env and local file roots from process.cwd().
    # Typora starts custom commands from its own working directory, so run the
    # Node process explicitly from the project root.
    if sync_output="$(
        cd "$SCRIPT_DIR" &&
        "$NODE_BIN" "$SCRIPT_DIR/scripts/sync-r2.mjs" --file "$out_file" 2>&1
    )"; then
        :
    else
        sync_status=$?
        rm -f "$out_file"
        printf '%s\n' "$sync_output" >&2
        echo "Upload failed: Could not upload image to Cloudflare R2: $var"
        exit "$sync_status"
    fi

    uploaded_urls="${uploaded_urls}file://${out_file}
"
done

# Typora treats this header as success. Emit it only after every image has
# been processed and uploaded, followed by one replacement URL per input.
echo "Upload Success:"
printf '%s' "$uploaded_urls"
