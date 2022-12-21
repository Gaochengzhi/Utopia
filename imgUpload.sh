for var in "$@"; do
    convert $var -resize 1640x1680 $var 
    /Applications/ImageOptim.app/Contents/MacOS/ImageOptim "$var" 
    cp "$var" /Users/kounarushi/mycode/web-blog/public/.pic/`basename $var`
done
echo "Upload Success:"
for var in "$@"; do
    echo  file:///Users/kounarushi/mycode/web-blog/public/.pic/`basename $var`
done
