import { SearchOutlined } from "@ant-design/icons"
import { Input } from "antd"
export function SearchBox({}) {
  return (
    <>
      <Input placeholder="command k to search" prefix={<SearchOutlined />} />
    </>
  )
}
