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
    <div className="bg-white dark:bg-gray-900">
      <DirectoryTree
        className="transition-all duration-150 ease-in min-w-[16rem] overflow-y-scroll text-gray-900 dark:text-gray-100"
        multiple
        selectable={false}
        onClick={onSelect}
        defaultExpandedKeys={["myrootkey"]}
        treeData={[paths]}
      />
    </div>
  )
}
