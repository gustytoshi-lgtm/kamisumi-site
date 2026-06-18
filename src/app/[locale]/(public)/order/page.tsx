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
    path: "/order",
    title: dictionary.pages.order.title,
    description: dictionary.pages.order.description,
  });
}

export default async function OrderPage({ params }: LocaleParams) {
  const locale = await getLocaleFromParams(params);
  const dictionary = getDictionary(locale);

  return (
    <>
      <PageIntro
        description={dictionary.pages.order.description}
        kicker={dictionary.nav.order}
        title={dictionary.pages.order.title}
      />
      <section className="page-section compact">
        <div className="content-shell stack">
          <ol className="responsive-grid">
            {dictionary.pages.order.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <Notice>{dictionary.common.shippingAfterConfirm}</Notice>
        </div>
      </section>
    </>
  );
}

