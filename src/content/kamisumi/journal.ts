import type { JournalPost } from "@/types/commerce";
import { kamisumiScope } from "./scope";

export const journalPosts: JournalPost[] = [
  {
    ...kamisumiScope,
    id: "journal-sourcing-kyoto",
    slug: "kyoto-sourcing-note",
    category: "sourcing-diary",
    title: {
      "zh-tw": "京都採買日誌：在店外排隊前先整理希望清單",
      ja: "京都買付日誌：店外に並ぶ前に希望リストを整える",
      en: "Kyoto Sourcing Note: Preparing the Request List",
    },
    excerpt: {
      "zh-tw": "採買不是只看商品名，還要確認數量限制、賞味期限與是否適合寄送。",
      ja: "買付は商品名だけでなく、数量制限、賞味期限、発送可否まで確認します。",
      en: "Sourcing means checking limits, best-before dates, and shipping fit beyond the product name.",
    },
    body: {
      "zh-tw": [
        "採買前會先把希望商品、預算、替代候選整理成清單。熱門抹茶不一定能買到，也可能有数量制限。",
        "KAMISUMI 會避免把未確認的採買路線公開成固定保證。公開頁面只保留顧客需要判斷的資訊。",
        "正式價格與運費仍需在實際取得商品後確認。",
      ],
      ja: [
        "買付前に希望商品、予算、代替候補をリスト化します。人気の抹茶は必ず買えるとは限らず、数量制限がある場合もあります。",
        "KAMISUMIでは未確認の買付ルートを固定保証のように公開しません。公開ページには、お客様の判断に必要な情報だけを残します。",
        "正式価格と送料は、実際に商品を確保した後に確認します。",
      ],
      en: [
        "Before sourcing, requests, budgets, and alternatives are organized into a list. Popular matcha may be limited or unavailable.",
        "KAMISUMI avoids presenting unconfirmed sourcing routes as guaranteed access.",
        "Final price and shipping are confirmed after the item is secured.",
      ],
    },
    coverImage: {
      src: "/images/placeholders/sourcing-street.svg",
      alt: {
        "zh-tw": "日本街道與採買路線示意",
        ja: "日本の街並みと買付ルートのイメージ",
        en: "Japanese street and sourcing route illustration",
      },
      kind: "documentary",
    },
    relatedProductIds: ["uji-koicha-hikari", "shigaraki-chawan-earth"],
    publishedAt: "2026-06-09",
  },
  {
    ...kamisumiScope,
    id: "journal-matcha-storage",
    slug: "matcha-storage-after-opening",
    category: "care-and-use",
    title: {
      "zh-tw": "抹茶開封後的保存方式",
      ja: "抹茶を開封した後の保存方法",
      en: "How to Store Matcha After Opening",
    },
    excerpt: {
      "zh-tw": "香氣會隨時間變化，密封、避光與低溫是基本原則。",
      ja: "香りは時間とともに変わります。密封、遮光、低温が基本です。",
      en: "Matcha aroma changes over time. Seal, shade, and cool storage are the basics.",
    },
    body: {
      "zh-tw": [
        "抹茶開封後最怕濕氣、光線與氣味移轉。建議使用乾燥湯匙，取用後立即密封。",
        "冷藏保存時，取出後先讓容器回到接近室溫再打開，可減少結露。",
        "賞味期限與保存建議會依商品批次確認，不以固定通則取代正式標示。",
      ],
      ja: [
        "抹茶は開封後、湿気、光、におい移りに注意します。乾いた匙を使い、取った後はすぐ密封します。",
        "冷蔵保存する場合は、容器を室温に近づけてから開封すると結露を減らせます。",
        "賞味期限と保存方法は商品ロットごとに確認し、固定の一般論で正式表示を置き換えません。",
      ],
      en: [
        "After opening, protect matcha from humidity, light, and odor transfer.",
        "When refrigerated, let the container warm slightly before opening to reduce condensation.",
        "Best-before and storage notes are confirmed per product lot.",
      ],
    },
    coverImage: {
      src: "/images/placeholders/matcha-canister.svg",
      alt: { "zh-tw": "抹茶罐保存示意", ja: "抹茶缶の保存イメージ", en: "Matcha tin storage image" },
      kind: "brand",
    },
    relatedProductIds: ["kyoto-usucha-midori", "chasen-standard-bamboo"],
    publishedAt: "2026-06-05",
  },
  {
    ...kamisumiScope,
    id: "journal-ceramic-care",
    slug: "ceramic-care-before-use",
    category: "care-and-use",
    title: {
      "zh-tw": "陶器使用前，需要先做什麼？",
      ja: "陶器を使う前に確認したいこと",
      en: "Before Using a Ceramic Piece",
    },
    excerpt: {
      "zh-tw": "手作陶器有個體差，使用前先確認吸水、釉面與清洗方式。",
      ja: "手作り陶器には個体差があります。吸水、釉面、洗い方を確認します。",
      en: "Handmade ceramics vary. Check water absorption, glaze, and washing guidance.",
    },
    body: {
      "zh-tw": [
        "陶器可能有貫入、鐵粉、針孔或釉色差異，這些不一定是瑕疵。",
        "是否需要預先處理，需依材質、釉藥與作家建議確認。KAMISUMI 不會在未確認時斷定。",
        "出貨前會盡量確認高台與口緣，但破損規約需在正式公開前完成。",
      ],
      ja: [
        "陶器には貫入、鉄粉、ピンホール、釉薬の差が見られることがあり、必ずしも不良ではありません。",
        "目止めの要否は素材、釉薬、作家の推奨により異なります。未確認のまま断定しません。",
        "発送前に高台や口縁を確認しますが、破損時の規約は公開前に確定が必要です。",
      ],
      en: [
        "Crazing, iron specks, pinholes, and glaze variation can be part of ceramic character.",
        "Sealing needs depend on clay, glaze, and maker guidance, so KAMISUMI will not overstate it before confirmation.",
        "Foot and rim are checked before shipment, while breakage policy remains a pre-launch decision.",
      ],
    },
    coverImage: {
      src: "/images/placeholders/chawan-earth.svg",
      alt: { "zh-tw": "手作茶碗細節", ja: "手作り茶碗の細部", en: "Handmade bowl detail" },
      kind: "detail",
    },
    relatedProductIds: ["shigaraki-chawan-earth", "mino-yunomi-ash"],
    publishedAt: "2026-05-30",
  },
  {
    ...kamisumiScope,
    id: "journal-making-editions",
    slug: "making-first-matcha-set",
    category: "making-kamisumi",
    title: {
      "zh-tw": "Making KAMISUMI：入門組合的開發方向",
      ja: "Making KAMISUMI：入門セットの開発方向",
      en: "Making KAMISUMI: First Set Direction",
    },
    excerpt: {
      "zh-tw": "原創系列不是急著販售，而是先決定內容、包裝與説明責任。",
      ja: "オリジナルは急いで販売せず、内容、包装、説明責任を先に固めます。",
      en: "Original items begin with contents, packaging, and explanation duties before sales.",
    },
    body: {
      "zh-tw": [
        "First Matcha Set 仍是開發候選，內容、價格、包裝都未定。",
        "我們希望把第一次點茶需要的工具與説明整理成一組，而不是只把商品放進盒子。",
        "正式上市前會透過 Journal 記錄試作與判斷。",
      ],
      ja: [
        "First Matcha Setはまだ開発候補で、内容、価格、包装は未定です。",
        "初めて点茶する人に必要な道具と説明を一つにまとめることを目指しています。",
        "正式発売前に、試作と判断の過程をJournalで記録します。",
      ],
      en: [
        "First Matcha Set is still a candidate, with contents, pricing, and packaging undecided.",
        "The goal is to pair tools with explanation, not simply place items in a box.",
        "Prototyping and decisions will be recorded in the journal before launch.",
      ],
    },
    coverImage: {
      src: "/images/placeholders/gift-set.svg",
      alt: { "zh-tw": "KAMISUMI 原創組合概念", ja: "KAMISUMIオリジナルセットの概念", en: "KAMISUMI original set concept" },
      kind: "brand",
    },
    relatedProductIds: ["first-matcha-set"],
    publishedAt: "2026-05-18",
  },
];
