rsync -avt --delete ~/mycode/web-blog/post kounarushi@124.220.179.145:~/website/Utopia/
rsync -avt --delete ~/mycode/web-blog/public kounarushi@124.220.179.145:~/website/Utopia/

rsync -avt --delete ~/mycode/web-blog/pages kounarushi@124.220.179.145:~/website/Utopia/
rsync -avt --delete ~/mycode/web-blog/components kounarushi@124.220.179.145:~/website/Utopia/
rsync -avt --delete ../web-blog/styles kounarushi@124.220.179.145:~/website/Utopia/
# rsync -av --delete ../web-blog/next.config.js  kounarushi@124.220.179.145:~/website/Utopia/
rsync -avt --delete ../web-blog/package.json kounarushi@124.220.179.145:~/website/Utopia/
