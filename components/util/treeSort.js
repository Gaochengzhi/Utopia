export function tree2list(tree) {
  var queen = []
  var out = []
  queen = queen.concat(tree)
  while (queen.length) {
    var first = queen.shift()
    if (first.title !== "x") {
      if (first.children) {
        queen = queen.concat(first.children)
        delete first["children"]
      }

      out.push(first)
    }
  }
  return out
}

export const toTimestamp = (strDate) => {
  const dt = Date.parse(strDate)
  return dt / 1000
}

export const formateTime = (unixTime) => {
  let timeStr = new Date(unixTime)
  const res = timeStr.toLocaleDateString("zh-cn", {
    weekday: "long",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
  })
  return res
}

export const deleteTree = (data, callbacki = (i) => i.title === "x") => {
  data.map((item, i) => {
    if (item.children) deleteTree(item.children, callbacki)
    if (callbacki(item)) {
      data.splice(i, 1)
    }
  })
  return data
}
export const firstUpperCase = ([first, ...rest]) =>
  first.toUpperCase() + rest.join("")
