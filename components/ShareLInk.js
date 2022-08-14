import {
  InstagramOutlined,
  GithubOutlined,
  WechatOutlined,
  WeiboOutlined,
} from "@ant-design/icons"
import { Modal } from "antd"
import { useState } from "react"
export function ShareLInk() {
  const [isModalVisible, setIsModalVisible] = useState(false)
  const handleOk = () => {
    setIsModalVisible(false)
  }

  const handleCancel = () => {
    setIsModalVisible(false)
  }

  const showModal = () => {
    setIsModalVisible(true)
  }
  const goToUrl = (index) => {
    if (index === 3) {
      showModal()
      return
    }
    const urlList = [
      "https://www.instagram.com/gaochengzhi1999/",
      "https://github.com/Gaochengzhi",
      "https://m.weibo.cn/profile/5637399935",
      "#",
      "https://www.douban.com/people/121879545",
    ]
    window.open(urlList[index], "_blank")
  }

  return (
    <>
      {" "}
      <div className="clickable flex justify-center items-center ">
        <InstagramOutlined onClick={() => goToUrl(0)} />
      </div>
      <div className="clickable flex justify-center items-center ">
        <GithubOutlined onClick={() => goToUrl(1)} />
      </div>
      <div className="clickable flex justify-center items-center ">
        <WeiboOutlined onClick={() => goToUrl(2)} />
      </div>
      <div className="clickable flex justify-center items-center ">
        <WechatOutlined onClick={() => goToUrl(3)} />
      </div>
      <div
        className=" clickable  rounded-md bg-black  p-1 flex justify-center items-center   text-white"
        onClick={() => goToUrl(4)}
      >
        <div className=" font-mono md:text-sm w-5  text-base md:w-4 md:h-4 flex justify-center items-center">
          豆
        </div>
      </div>
      <Modal
        title="添加微信"
        visible={isModalVisible}
        onOk={handleOk}
        onCancel={handleCancel}
        className="max-w-[60%]"
      >
        <img src="/me.jpeg" alt="" />
      </Modal>
    </>
  )
}
