import { Tree } from "antd"
import { useRouter } from "next/router"
const { DirectoryTree } = Tree
export default function FileTree({ paths }) {
  const router = useRouter()
  const onSelect = (_, info) => {
    const fullpath = info.path ?? ""
    const filname = fullpath.split("/").pop()
    let reg = /(?:\.([^.]+))?$/
    if (reg.exec(filname)[1] === "md") {
      router.push(fullpath)
    }
  }

  return (
    <div>
      <DirectoryTree
        className="transition-all duration-150 ease-in min-w-[16rem] overflow-y-scroll "
        multiple
        selectable={false}
        onClick={onSelect}
        defaultExpandedKeys={["myrootkey"]}
        treeData={[paths]}
      />
    </div>
  )
}
