import type { Metadata } from "next";
import { PageIntro } from "@/components/ui/PageIntro";
import { getDictionary } from "@/dictionaries";
import { getLocalizedText } from "@/lib/localization";
import { getLocaleFromParams, type LocaleParams } from "@/lib/params";
import { buildMetadata } from "@/lib/seo";
import { getCommerceRepository } from "@/repositories";

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const locale = await getLocaleFromParams(params);
  const dictionary = getDictionary(locale);

  return buildMetadata({
    locale,
    path: "/faq",
    title: dictionary.pages.faq.title,
    description: dictionary.pages.faq.description,
  });
}

export default async function FaqPage({ params }: LocaleParams) {
  const locale = await getLocaleFromParams(params);
  const dictionary = getDictionary(locale);
  const faqs = await getCommerceRepository().listFaqs();

  return (
    <>
      <PageIntro
        description={dictionary.pages.faq.description}
        kicker={dictionary.nav.faq}
        title={dictionary.pages.faq.title}
      />
      <section className="page-section compact">
        <div className="content-shell stack">
          {faqs.map((faq) => (
            <details key={faq.id}>
              <summary>{getLocalizedText(faq.question, locale)}</summary>
              <p>{getLocalizedText(faq.answer, locale)}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}

