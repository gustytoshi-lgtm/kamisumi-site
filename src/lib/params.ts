import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/config/site";

export type LocaleParams = {
  params: Promise<{ locale: string }>;
};

export type LocaleSlugParams = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function getLocaleFromParams(params: Promise<{ locale: string }>): Promise<Locale> {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  return locale;
}

