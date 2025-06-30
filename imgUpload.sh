#!/bin/bash
output_dir="/Users/kounarushi/mycode/web-blog/public/.pic"
echo "Upload Success:"
for var in "$@"; do
    # Get the file extension
    filename=$(basename -- "$var")
    extension="${filename##*.}"

    # Generate a unique filename
    imgName=$(uuidgen)."${extension}"

    # Resize the image using sips
    sips --resampleWidth 1080 "$var" --out "$output_dir/$imgName" >/dev/null

    # Optimize the image based on the file extension
    if [ "$extension" = "png" ]; then
        # Use pngcrush for PNG files
        pngcrush -q -ow "$output_dir/$imgName"
    else
        # Use ImageOptim for other file types
        /Applications/ImageOptim.app/Contents/MacOS/ImageOptim "$output_dir/$imgName"
    fi
    # Print the file URL
    echo "file://$output_dir/$imgName"
done
