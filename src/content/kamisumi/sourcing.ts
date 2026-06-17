import type { SourcingSchedule } from "@/types/commerce";
import { kamisumiScope } from "./scope";

export const sourcingSchedules: SourcingSchedule[] = [
  {
    ...kamisumiScope,
    id: "schedule-kyoto-2026-07-01",
    date: "2026-07-01",
    region: { "zh-tw": "京都", ja: "京都", en: "Kyoto" },
    publicLocationName: {
      "zh-tw": "京都市內・茶舖區域",
      ja: "京都市内・茶舗エリア",
      en: "Kyoto city tea shop area",
    },
    category: ["matcha", "tea-tools"],
    applicationDeadline: "2026-06-29",
    status: "open",
    note: {
      "zh-tw": "可諮詢抹茶與基本茶道具。具體店名可能依當日狀況不公開。",
      ja: "抹茶と基本茶道具を相談できます。具体的な店舗名は当日の状況により非公開の場合があります。",
      en: "Matcha and basic tea tools can be requested. Specific store names may remain private depending on the day.",
    },
    acceptsRequests: true,
  },
  {
    ...kamisumiScope,
    id: "schedule-kansai-ceramic-2026-07-10",
    date: "2026-07-10",
    region: { "zh-tw": "關西", ja: "関西", en: "Kansai" },
    publicLocationName: {
      "zh-tw": "陶器・生活道具區域",
      ja: "陶器・生活道具エリア",
      en: "Ceramics and lifestyle goods area",
    },
    category: ["ceramics", "gift-sets"],
    applicationDeadline: "2026-07-07",
    status: "limited",
    note: {
      "zh-tw": "易碎品會先確認尺寸與包裝可行性。",
      ja: "割れ物は寸法と梱包の可否を先に確認します。",
      en: "Fragile items are checked for size and packing feasibility first.",
    },
    acceptsRequests: true,
  },
  {
    ...kamisumiScope,
    id: "schedule-archive-2026-06-05",
    date: "2026-06-05",
    region: { "zh-tw": "奈良", ja: "奈良", en: "Nara" },
    publicLocationName: {
      "zh-tw": "茶道具巡回",
      ja: "茶道具巡回",
      en: "Tea tool sourcing round",
    },
    category: ["tea-tools"],
    applicationDeadline: "2026-06-02",
    status: "completed",
    note: {
      "zh-tw": "本回受理已完成，相關到貨會整理到商品頁。",
      ja: "今回の受付は完了しました。関連入荷は商品ページへ整理します。",
      en: "This round is complete. Related arrivals will be organized on product pages.",
    },
    acceptsRequests: false,
  },
];
