import type { FaqItem } from "@/types/commerce";

export const faqs: FaqItem[] = [
  {
    id: "stock-before-payment",
    category: "order",
    question: {
      "zh-tw": "送出暫訂購後就需要付款嗎？",
      ja: "仮注文後すぐ支払いが必要ですか？",
      en: "Do I need to pay right after an inquiry?",
    },
    answer: {
      "zh-tw": "不需要。KAMISUMI 會先確認庫存、商品狀態與運費，再提供正式通知。",
      ja: "いいえ。KAMISUMIが在庫、商品状態、送料を確認してから正式に案内します。",
      en: "No. KAMISUMI first confirms stock, condition, and shipping before sending official guidance.",
    },
  },
  {
    id: "shipping-quote",
    category: "shipping",
    question: {
      "zh-tw": "運費可以自動計算嗎？",
      ja: "送料は自動計算できますか？",
      en: "Can shipping be calculated automatically?",
    },
    answer: {
      "zh-tw": "Phase 1 採個別通知。陶器或多件商品會因包裝方式而影響運費。",
      ja: "Phase 1では個別案内です。陶器や複数商品は梱包方法で送料が変わります。",
      en: "In Phase 1, shipping is quoted individually because packing changes the final cost.",
    },
  },
  {
    id: "sourcing-success",
    category: "sourcing",
    question: {
      "zh-tw": "採買委託一定會成功嗎？",
      ja: "買付依頼は必ず成功しますか？",
      en: "Are sourcing requests guaranteed?",
    },
    answer: {
      "zh-tw": "不一定。可能遇到數量限制、休業或售罄，因此會事前確認是否可接受替代候選。",
      ja: "いいえ。数量制限、休業、売切などがあります。代替候補の可否を事前に確認します。",
      en: "No. Limits, closures, and sell-outs can happen. Alternatives are discussed in advance.",
    },
  },
  {
    id: "official-agent",
    category: "legal",
    question: {
      "zh-tw": "KAMISUMI 是各茶舖或作家官方代理嗎？",
      ja: "KAMISUMIは各茶舗や作家の公式代理店ですか？",
      en: "Is KAMISUMI an official agent for listed makers?",
    },
    answer: {
      "zh-tw": "除非明確記載並確認，KAMISUMI 不表示為官方代理店。商品背景介紹會避免造成誤認。",
      ja: "明確に確認・記載しない限り、公式代理店とは表示しません。商品背景の紹介も誤認を避けます。",
      en: "Unless explicitly confirmed and stated, KAMISUMI does not present itself as an official agent.",
    },
  },
  {
    id: "food-shipping",
    category: "shipping",
    question: {
      "zh-tw": "抹茶可以寄到台湾以外的國家嗎？",
      ja: "抹茶は台湾以外にも発送できますか？",
      en: "Can matcha be shipped outside Taiwan?",
    },
    answer: {
      "zh-tw": "未來預計擴大服務，但需先確認食品進口規則。Phase 1 會優先以台灣為主。",
      ja: "将来対応を想定していますが、食品輸入ルール確認が必要です。Phase 1では台湾向けを優先します。",
      en: "Future support is planned, but food import rules must be checked. Phase 1 prioritizes Taiwan.",
    },
  },
];
