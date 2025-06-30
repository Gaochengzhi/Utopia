import {
    TwitterOutlined,
    GithubOutlined,
    WechatOutlined,
    WeiboOutlined,
} from "@ant-design/icons"
import { Modal } from "antd"
import { useState } from "react"
const config = require('../config.local.js')
export default function ShareLInk() {
    const [isModalVisible, setIsModalVisible] = useState(false)
    const handleOk = () => {
        setIsModalVisible(false)
    }

    const handleCancel = () => {
        setIsModalVisible(false)
    }

    function showModal() {
        setIsModalVisible(true)
    }
    const goToUrl = (index) => {
        if (index === 3) {
            showModal()
            return
        }
        const urlList = [
            config.SOCIAL_LINKS.twitter,
            config.SOCIAL_LINKS.github,
            config.SOCIAL_LINKS.weibo,
            "#",
            config.SOCIAL_LINKS.douban,
        ]
        window.open(urlList[index], "_blank")
    }

    return (
        <>
            {" "}
            <div className="clickable flex justify-center items-center text-2xl">
                <TwitterOutlined onClick={() => goToUrl(0)} />
            </div>
            <div className="clickable flex justify-center items-center text-2xl">
                <GithubOutlined onClick={() => goToUrl(1)} />
            </div>
            <div className="clickable flex justify-center items-center text-2xl">
                <WeiboOutlined onClick={() => goToUrl(2)} />
            </div>
            <div className="clickable flex justify-center items-center text-2xl">
                <WechatOutlined onClick={() => goToUrl(3)} />
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
