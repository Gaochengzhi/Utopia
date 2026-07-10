import Link from "next/link"
import { useRouter } from "next/router"
import { useLocale } from "/lib/i18n/useLocale"
import LangSwitch from "/components/photo/darkroom/LangSwitch"

// Stripe Payment Link URLs — created once via `stripe payment_links create`,
// never expire, no backend needed to keep them working.
const PACKAGES = [
  {
    id: "2h",
    price: "$100",
    title: { zh: "2小时人像 / 情侣拍摄", en: "2-Hour Portrait / Couple Session", ja: "2時間 ポートレート／カップル撮影" },
    desc: {
      zh: "单人、情侣、闺蜜写真，南京市区内选景",
      en: "Solo, couple, or friends portraits — location scouted within Nanjing",
      ja: "個人・カップル・友人写真、南京市内でロケーション撮影",
    },
    link: "https://buy.stripe.com/bJeaEQa0pe7m6YjfOm63K00",
  },
  {
    id: "half",
    price: "$300",
    title: { zh: "半天跟拍（婚礼 / 毕业照 / 活动）", en: "Half-Day Coverage (Wedding / Graduation / Event)", ja: "半日撮影（結婚式／卒業写真／イベント）" },
    desc: {
      zh: "约4小时跟拍含转场，适合婚礼、毕业照、团体活动",
      en: "~4 hours including venue transfers — weddings, graduations, group events",
      ja: "移動込み約4時間、結婚式・卒業写真・団体イベント向け",
    },
    link: "https://buy.stripe.com/6oU28kgoN5AQbez8lU63K01",
  },
]

const T = {
  back: { zh: "返回", en: "Back", ja: "戻る" },
  bookTitle: { zh: "预约拍摄", en: "Book a Session", ja: "撮影を予約" },
  paidTitle: { zh: "付款成功", en: "Payment Received", ja: "お支払い完了" },
  paidThanks: { zh: "已收到付款，感谢预约！", en: "Payment received — thank you for booking!", ja: "お支払いを確認しました。ご予約ありがとうございます！" },
  wechatPrompt: {
    zh: "请添加微信，备注拍摄人数、类型和意向时间地点：",
    en: "Please add WeChat, and note the number of people, shoot type, and preferred time/location:",
    ja: "WeChatを追加し、人数・撮影内容・希望の日時と場所を備考欄にご記入ください：",
  },
  refStyle: {
    zh: "建议提前在 Ins / 微博 / 小红书 上找好想要的风格参考",
    en: "Tip: browse Instagram / Weibo / Xiaohongshu beforehand for style references",
    ja: "事前に Instagram や Weibo、小紅書などで参考スタイルを探しておくのがおすすめです",
  },
  payNow: { zh: "立即支付预约", en: "Pay & Book Now", ja: "支払って予約する" },
  afterPay: {
    zh: "付款后请添加微信 Gaocz1999wechat 沟通具体时间地点",
    en: "After payment, add WeChat Gaocz1999wechat to arrange the exact time and location",
    ja: "お支払い後、WeChat（Gaocz1999wechat）にて日時と場所をご相談ください",
  },
}

export default function Order() {
  const router = useRouter()
  const paid = router.query.paid
  const [locale, setLocale] = useLocale()
  const t = key => T[key][locale]

  return (
    <div className="w-full min-h-screen bg-black">
      <div className="max-w-4xl mx-auto">
        <div className="flex space-x-6 items-end p-4">
          <div className="text-white text-4xl">{paid ? t("paidTitle") : t("bookTitle")}</div>
          <Link href={"/photographer"}>
            <div className="text-gray-500 text-2xl cursor-pointer">{t("back")}</div>
          </Link>
          <LangSwitch locale={locale} onChange={setLocale} className="ml-auto" />
        </div>

        {paid ? (
          <div className="text-white text-lg m-5 space-y-2">
            <div>{t("paidThanks")}</div>
            <div>
              {t("wechatPrompt")} <a href="#" className="text-sky-400">Gaocz1999wechat</a>
            </div>
            <div>{t("refStyle")}</div>
          </div>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 gap-6 m-5">
              {PACKAGES.map((p) => (
                <div
                  key={p.id}
                  className="border border-gray-700 rounded-lg p-6 flex flex-col"
                >
                  <div className="text-white text-xl font-medium">{p.title[locale]}</div>
                  <div className="text-sky-400 text-3xl mt-2">{p.price}</div>
                  <div className="text-gray-400 mt-2 flex-1">{p.desc[locale]}</div>
                  <a
                    href={p.link}
                    className="mt-6 inline-block text-center bg-sky-500 hover:bg-sky-400 transition-colors text-black font-medium rounded py-2"
                  >
                    {t("payNow")}
                  </a>
                </div>
              ))}
            </div>
            <div className="text-gray-500 text-sm m-5">{t("afterPay")}</div>
          </>
        )}
      </div>
    </div>
  )
}
