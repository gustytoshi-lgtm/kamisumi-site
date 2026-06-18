import type { ReactNode } from "react";
import "@/styles/globals.css";
import { localeHtmlLang, supportedLocales } from "@/config/site";
import { getLocaleFromParams } from "@/lib/params";

export function generateStaticParams() {
  return supportedLocales.map((locale) => ({ locale }));
}

type LocaleLayoutProps = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

// ルート（locale）レイアウトは html/body と locale 設定のみを担う。
// 公開シェル（Header/Footer）は (public)/layout.tsx、管理クロームは (admin) 配下で構成する。
export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const locale = await getLocaleFromParams(params);

  return (
    <html lang={localeHtmlLang[locale]}>
      <body>{children}</body>
    </html>
  );
}
