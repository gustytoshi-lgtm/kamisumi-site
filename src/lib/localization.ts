import { defaultLocale, type Locale } from "@/config/site";
import type { LocalizedString, LocalizedStringList } from "@/types/commerce";

const fallbackOrder: Locale[] = [defaultLocale, "ja", "en"];

export function getLocalizedText(value: LocalizedString, locale: Locale): string {
  return value[locale] ?? fallbackOrder.map((fallback) => value[fallback]).find(Boolean) ?? "";
}

export function getLocalizedList(value: LocalizedStringList, locale: Locale): string[] {
  return value[locale] ?? fallbackOrder.map((fallback) => value[fallback]).find(Boolean) ?? [];
}

export function getDateFormatter(locale: Locale, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(locale === "zh-tw" ? "zh-TW" : locale, {
    dateStyle: "medium",
    ...options,
  });
}

