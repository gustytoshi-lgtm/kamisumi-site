import type { ReactNode } from "react";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { getDictionary } from "@/dictionaries";
import { getLocaleFromParams, type LocaleParams } from "@/lib/params";

type PublicLayoutProps = LocaleParams & { children: ReactNode };

export default async function PublicLayout({ children, params }: PublicLayoutProps) {
  const locale = await getLocaleFromParams(params);
  const dictionary = getDictionary(locale);

  return (
    <div className="site-shell">
      <a className="skip-link" href="#main-content">
        {dictionary.common.skipToContent}
      </a>
      <Header dictionary={dictionary} locale={locale} />
      <main className="page-main" id="main-content">
        {children}
      </main>
      <Footer dictionary={dictionary} locale={locale} />
    </div>
  );
}
