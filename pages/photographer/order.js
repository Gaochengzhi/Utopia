import Link from "next/link"

export default function Order() {
  return (
    <>
      <div className="w-full  h-screen bg-black">
        <div className="max-w-4xl  mx-auto">
          <div className="flex space-x-6 items-end  p-4">
            <div className="text-white text-4xl">Notice</div>

            <Link href={"/photographer"}>
              <div className="text-gray-500 text-2xl cursor-pointer">Back</div>
            </Link>
          </div>
          <div className="text-white text-lg m-5">
            <div>
              1. 添加微信，备注拍摄人数和类型（单人，情侣，毕业照……）:{" "}
              <a href="#">Gaocz1999wechat</a>{" "}
            </div>
            <div>2. 在Ins/微博/小红书上寻找预期效果</div>
            <div>3. 微信协商时间地点</div>
          </div>
        </div>
      </div>
    </>
  )
}
