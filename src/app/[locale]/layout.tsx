import type { ReactNode } from "react";
import "@/styles/globals.css";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { localeHtmlLang, supportedLocales } from "@/config/site";
import { getDictionary } from "@/dictionaries";
import { getLocaleFromParams } from "@/lib/params";

export function generateStaticParams() {
  return supportedLocales.map((locale) => ({ locale }));
}

type LocaleLayoutProps = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const locale = await getLocaleFromParams(params);
  const dictionary = getDictionary(locale);

  return (
    <html lang={localeHtmlLang[locale]}>
      <body>
        <a className="skip-link" href="#main-content">
          {dictionary.common.skipToContent}
        </a>
        <div className="site-shell">
          <Header dictionary={dictionary} locale={locale} />
          <main className="page-main" id="main-content">
            {children}
          </main>
          <Footer dictionary={dictionary} locale={locale} />
        </div>
      </body>
    </html>
  );
}

