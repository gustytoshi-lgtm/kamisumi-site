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
    path: "/sourcing/request",
    title: dictionary.pages.sourcingRequest.title,
    description: dictionary.pages.sourcingRequest.description,
  });
}

export default async function SourcingRequestPage({ params }: LocaleParams) {
  const locale = await getLocaleFromParams(params);
  const dictionary = getDictionary(locale);

  return (
    <>
      <PageIntro
        description={dictionary.pages.sourcingRequest.description}
        kicker={dictionary.nav.sourcing}
        title={dictionary.pages.sourcingRequest.title}
      />
      <section className="page-section compact">
        <div className="content-shell two-column">
          <Notice>{dictionary.common.demoNotice}</Notice>
          <InquiryForm dictionary={dictionary} mode="sourcing" />
        </div>
      </section>
    </>
  );
}

