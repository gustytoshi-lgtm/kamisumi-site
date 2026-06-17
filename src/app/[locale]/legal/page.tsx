import type { Metadata } from "next";
import { Notice } from "@/components/ui/Notice";
import { PageIntro } from "@/components/ui/PageIntro";
import { getDictionary } from "@/dictionaries";
import { getLocaleFromParams, type LocaleParams } from "@/lib/params";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const locale = await getLocaleFromParams(params);
  const dictionary = getDictionary(locale);

  return buildMetadata({
    locale,
    path: "/legal",
    title: dictionary.pages.legal.title,
    description: dictionary.pages.legal.description,
  });
}

export default async function LegalPage({ params }: LocaleParams) {
  const locale = await getLocaleFromParams(params);
  const dictionary = getDictionary(locale);

  return (
    <>
      <PageIntro
        description={dictionary.pages.legal.description}
        kicker={dictionary.pages.legal.title}
        title={dictionary.pages.legal.title}
      />
      <section className="page-section compact">
        <div className="content-shell">
          <Notice>{dictionary.pages.legal.description}</Notice>
        </div>
      </section>
    </>
  );
}

