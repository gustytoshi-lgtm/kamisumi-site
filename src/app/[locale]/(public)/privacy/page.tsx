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
    path: "/privacy",
    title: dictionary.pages.privacy.title,
    description: dictionary.pages.privacy.description,
  });
}

export default async function PrivacyPage({ params }: LocaleParams) {
  const locale = await getLocaleFromParams(params);
  const dictionary = getDictionary(locale);

  return (
    <>
      <PageIntro
        description={dictionary.pages.privacy.description}
        kicker={dictionary.pages.privacy.title}
        title={dictionary.pages.privacy.title}
      />
      <section className="page-section compact">
        <div className="content-shell">
          <Notice>{dictionary.pages.privacy.description}</Notice>
        </div>
      </section>
    </>
  );
}
