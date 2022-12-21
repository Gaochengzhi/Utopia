import { Drawer } from "antd"
import ShareLInk from "./ShareLInk"
import { Footer } from "./footer"
import { Toc } from "/components/Toc"
import SearchBar from "/components/SearchBar"
export function DrawerView({ onClose, visible, state }) {
  return (
    <Drawer
      title="More"
      placement="right"
      onClose={onClose}
      visible={visible}
      className="transition-all duration-150 ease-in"
      width={299}
    >
      <div className="sticky top-0 ">
        <SearchBar />
      </div>
      <div className="flex flex-col justify-between ">
        {state == "index" ? (
          <div className="h-full flex justify-center items-center text-gray-400">
            Ecce homo
          </div>
        ) : (
          <div className="border-y-2 border-dashed my-6 h-[75vh] overflow-auto">
            <Toc />
          </div>
        )}
        <div className="-mb-8">
          <div className="flex justify-around text-3xl ">
            <ShareLInk />
          </div>
          <Footer></Footer>
        </div>
      </div>
    </Drawer>
  )
}
