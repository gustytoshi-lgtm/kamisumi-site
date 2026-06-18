import type { Metadata } from "next";
import { ProductGrid } from "@/components/product/ProductGrid";
import { PageIntro } from "@/components/ui/PageIntro";
import { getDictionary } from "@/dictionaries";
import { getLocaleFromParams, type LocaleParams } from "@/lib/params";
import { buildMetadata } from "@/lib/seo";
import { getCommerceRepository } from "@/repositories";
import type { ProductCategory, ProductStatus } from "@/types/commerce";

type ShopPageProps = LocaleParams & {
  searchParams?: Promise<{ category?: string; status?: string }>;
};

const categories: ProductCategory[] = ["matcha", "ceramics", "tea-tools", "gift-sets", "originals"];
const statuses: ProductStatus[] = [
  "in_stock",
  "low_stock",
  "preorder",
  "sourcing_available",
  "awaiting_arrival",
  "reserved",
  "sold_out",
  "restock_request",
  "archive",
  "coming_soon",
];

function parseCategory(category?: string): ProductCategory | undefined {
  return categories.includes(category as ProductCategory) ? (category as ProductCategory) : undefined;
}

function parseStatus(status?: string): ProductStatus | undefined {
  return statuses.includes(status as ProductStatus) ? (status as ProductStatus) : undefined;
}

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const locale = await getLocaleFromParams(params);
  const dictionary = getDictionary(locale);

  return buildMetadata({
    locale,
    path: "/shop",
    title: dictionary.pages.shop.title,
    description: dictionary.pages.shop.description,
  });
}

export default async function ShopPage({ params, searchParams }: ShopPageProps) {
  const locale = await getLocaleFromParams(params);
  const dictionary = getDictionary(locale);
  const query = (await searchParams) ?? {};
  const repository = getCommerceRepository();
  const products = await repository.listProducts({
    category: parseCategory(query.category),
    status: parseStatus(query.status),
    includeArchive: true,
  });

  return (
    <>
      <PageIntro
        description={dictionary.pages.shop.description}
        kicker={dictionary.nav.shop}
        title={dictionary.pages.shop.title}
      />
      <section className="page-section compact">
        <div className="content-shell">
          <ProductGrid dictionary={dictionary} locale={locale} products={products} />
        </div>
      </section>
    </>
  );
}

