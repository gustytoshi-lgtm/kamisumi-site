import type { Locale } from "@/config/site";
import { defaultLocale } from "@/config/site";
import { en } from "./en";
import { ja } from "./ja";
import { zhTw } from "./zh-tw";

const dictionaries = {
  "zh-tw": zhTw,
  ja,
  en,
} as const;

export function getDictionary(locale: Locale) {
  return dictionaries[locale] ?? dictionaries[defaultLocale];
}

export type { Dictionary, StatusPresentation } from "./types";
