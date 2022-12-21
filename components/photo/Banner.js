import ShareLInk from "/components/ShareLInk"
import { CodeOutlined, CameraOutlined, BankOutlined } from "@ant-design/icons"
import { Carousel } from "antd"
import { PhotoProvider, PhotoView } from "react-photo-view"
import "react-photo-view/dist/react-photo-view.css"
import Link from "next/link"
export function Banner({}) {
  return (
    <div className="w-full flex flex-col-reverse md:flex-row items-center">
      {/* words */}
      <div className="w-full md:w-[50%] h-60 flex flex-col justify-center items-center text-white">
        <div className="text-3xl mt-9 font-serif">Taitan_Pascal</div>
        <div className="text-lg font-serif flex items-center ">
          <CodeOutlined className="text-base inline pr-1" />
          Programmer,
          <CameraOutlined className="tex-base inline px-1" />
          Photographer and ……
        </div>
        <div className="flex flex-col justify-center items-center ">
          <div className="font-serif  mb-2 text-lg m-3">
            联系我: 点击下面图标 👇
          </div>
          <div className="flex space-x-4 text-2xl">
            <ShareLInk />
          </div>
        </div>
        <div className="mt-5 mb-2 p-3 flex items-center border-2 border-gray-400 rounded-sm border-dotted">
          <BankOutlined className=" " />
          <div className="inline px-1">常驻 ujs.edu.cn 接受</div>
          <Link className="cursor-pointer" href="/photographer/order">
            <div className="inline text-sky-400 cursor-pointer">预约</div>
          </Link>
        </div>
      </div>
      {/* pics */}
      <div className="md:w-[50%] w-full">
        <PhotoProvider maskOpacity={0.5} pullClosable={true}>
          <Carousel className="w-full  overflow-hidde" effect="fade" autoplay>
            {[1, 2, 3, 4, 5].map((i) => (
              <PhotoView key={i} src={`/photography/banner/${i}.jpg`}>
                <div className="picon" key={i}>
                  <img
                    src={`/photography/banner/${i}.jpg`}
                    className="picinside h-full object-cover "
                  ></img>
                </div>
              </PhotoView>
            ))}
          </Carousel>
        </PhotoProvider>
      </div>
    </div>
  )
}
// You should use getStaticProps when:
//- The data required to render the page is available at build time ahead of a user’s request.
//- The data comes from a headless CMS.
//- The data can be publicly cached (not user-specific).
//- The page must be pre-rendered (for SEO) and be very fast — getStaticProps generates HTML and JSON files, both of which can be cached by a CDN for performance.
