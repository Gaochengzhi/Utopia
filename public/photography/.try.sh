for file in $(find ./* -iname '*.jp[e]g'); do
    convert $file -resize 1640x1680 $file
done
