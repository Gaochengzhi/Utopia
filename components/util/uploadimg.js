var fs = require("fs")
let imgList = process.argv.slice(2)
const str = "/Users/kounarushi/mycode/web-blog/public/"
imgList.map((o) => {
  fs.copyFile(o, str + o, (err) => {
    if (err) throw err
    console.error("source.txt was copied to destination.txt")
  })
  console.log(str + o.split("/").pop())
})
