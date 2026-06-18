import type { Metadata } from "next";
import { PageIntro } from "@/components/ui/PageIntro";
import { Notice } from "@/components/ui/Notice";
import { getDictionary } from "@/dictionaries";
import { getLocaleFromParams, type LocaleParams } from "@/lib/params";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const locale = await getLocaleFromParams(params);
  const dictionary = getDictionary(locale);

  return buildMetadata({
    locale,
    path: "/shipping",
    title: dictionary.pages.shipping.title,
    description: dictionary.pages.shipping.description,
  });
}

export default async function ShippingPage({ params }: LocaleParams) {
  const locale = await getLocaleFromParams(params);
  const dictionary = getDictionary(locale);

  return (
    <>
      <PageIntro
        description={dictionary.pages.shipping.description}
        kicker={dictionary.nav.shipping}
        title={dictionary.pages.shipping.title}
      />
      <section className="page-section compact">
        <div className="content-shell stack">
          {dictionary.pages.shipping.notes.map((note) => (
            <Notice key={note}>{note}</Notice>
          ))}
        </div>
      </section>
    </>
  );
}

