import { PhotoProvider, PhotoView } from "react-photo-view"
import "react-photo-view/dist/react-photo-view.css"
export function Walls({ path }) {
  return (
    <div className="flex w-full flex-wrap justify-center">
      <PhotoProvider maskOpacity={0.5} pullClosable={true}>
        {path.map((o) => (
          <PhotoView key={o.key} src={o.path}>
            <div className="w-[32%] overflow-hidden m-[2px]">
              <div className="piconsq">
                <img
                  src={o.path}
                  className="object-cover picinside h-full w-full"
                  alt=""
                  loading="lazy"
                />
              </div>
            </div>
          </PhotoView>
        ))}
      </PhotoProvider>
    </div>
  )
}
