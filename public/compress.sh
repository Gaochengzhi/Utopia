for file in ./*.jpg; do
  if [[ -f "$file" ]]; then
    sips --resampleWidth 1080 "$file" > /dev/null
  fi
done

# Compress images using ImageOptim
for file in ./*.jpg; do
  if [[ -f "$file" ]]; then
    /Applications/ImageOptim.app/Contents/MacOS/ImageOptim "$file"
  fi
done
