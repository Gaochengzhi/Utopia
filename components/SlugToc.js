import FileTree from "/components/main/FileTree"
export function SlugToc({ paths }) {
  return <div>{<FileTree paths={paths} />}</div>
}
