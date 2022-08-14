import { Drawer } from "antd"
import { ShareLInk } from "./ShareLInk"
import { Footer } from "./footer"
import { Toc } from "/components/Toc"

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
      <div className="flex flex-col justify-between h-full">
        {state == "index" ? (
          <>index</>
        ) : (
          <div className="border-b-2 border-dotted mb-2 ">
            <Toc />
          </div>
        )}
        <div>
          <div className="flex justify-around text-3xl">
            <ShareLInk />
          </div>
          <Footer></Footer>
        </div>
      </div>
    </Drawer>
  )
}
