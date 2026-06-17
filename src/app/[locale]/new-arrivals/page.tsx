import type { Metadata } from "next";
import { ProductGrid } from "@/components/product/ProductGrid";
import { PageIntro } from "@/components/ui/PageIntro";
import { getDictionary } from "@/dictionaries";
import { getLocaleFromParams, type LocaleParams } from "@/lib/params";
import { buildMetadata } from "@/lib/seo";
import { getCommerceRepository } from "@/repositories";

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const locale = await getLocaleFromParams(params);
  const dictionary = getDictionary(locale);

  return buildMetadata({
    locale,
    path: "/new-arrivals",
    title: dictionary.pages.newArrivals.title,
    description: dictionary.pages.newArrivals.description,
  });
}

export default async function NewArrivalsPage({ params }: LocaleParams) {
  const locale = await getLocaleFromParams(params);
  const dictionary = getDictionary(locale);
  const products = await getCommerceRepository().listProducts({ newOnly: true, includeArchive: false });

  return (
    <>
      <PageIntro
        description={dictionary.pages.newArrivals.description}
        kicker={dictionary.nav.newArrivals}
        title={dictionary.pages.newArrivals.title}
      />
      <section className="page-section compact">
        <div className="content-shell">
          <ProductGrid dictionary={dictionary} locale={locale} products={products} />
        </div>
      </section>
    </>
  );
}

