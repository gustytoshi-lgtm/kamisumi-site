import type { Metadata } from "next";
import { InquiryForm } from "@/components/forms/InquiryForm";
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
    path: "/contact",
    title: dictionary.pages.contact.title,
    description: dictionary.pages.contact.description,
  });
}

export default async function ContactPage({ params }: LocaleParams) {
  const locale = await getLocaleFromParams(params);
  const dictionary = getDictionary(locale);

  return (
    <>
      <PageIntro
        description={dictionary.pages.contact.description}
        kicker={dictionary.nav.contact}
        title={dictionary.pages.contact.title}
      />
      <section className="page-section compact">
        <div className="content-shell two-column">
          <Notice>{dictionary.common.demoNotice}</Notice>
          <InquiryForm dictionary={dictionary} mode="contact" />
        </div>
      </section>
    </>
  );
}

