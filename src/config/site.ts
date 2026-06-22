export const supportedLocales = ["zh-tw", "ja", "en"] as const;
export const visibleLocales = ["zh-tw", "ja"] as const;

export type Locale = (typeof supportedLocales)[number];

export const defaultLocale: Locale = "zh-tw";

export const localeHtmlLang: Record<Locale, string> = {
  "zh-tw": "zh-TW",
  ja: "ja",
  en: "en",
};

export const localeNames: Record<Locale, string> = {
  "zh-tw": "繁體中文",
  ja: "日本語",
  en: "English",
};

export function isLocale(value: string): value is Locale {
  return supportedLocales.includes(value as Locale);
}

export const siteConfig = {
  siteUrl: "https://kamisumi.kagurakoji.com",
  defaultLocale,
  supportedLocales,
  visibleLocales,
  brand: {
    id: "brand-kamisumi",
    name: "KAMISUMI",
    tagline: {
      "zh-tw": "從日本尋找、挑選，送往世界。",
      ja: "日本で見つけ、選び、世界へ届ける。",
      en: "Discovered in Japan. Chosen with care.",
    },
    subline: "Japanese Tea & Craft",
  },
  organization: {
    id: "org-kagurakoji",
    // 実 DB（organizations.code）と一致させる正規コード。id は mock 用スラッグで UUID ではないため、
    // Supabase 層はこの code から実 UUID を解決する（supabaseSettingsRepository 参照）。
    code: "kagurakoji",
    name: "KAGURAKOJI",
    displayName: "神楽小路 / KAGURAKOJI",
  },
  commerceCore: {
    name: "KAGURAKOJI Commerce Core",
  },
  store: {
    id: "store-kamisumi-tw",
    name: "KAMISUMI Taiwan",
    defaultCurrency: "TWD",
    countryCode: "TW",
    salesChannelId: "sales-channel-web",
  },
  warehouse: {
    id: "warehouse-japan-home",
    name: "Japan Home Base",
    countryCode: "JP",
  },
  contact: {
    // TODO: Replace before launch after official inbox and SNS accounts are finalized.
    email: "hello@example.com",
  },
  socials: {
    threads: "",
    instagram: "",
  },
} as const;

