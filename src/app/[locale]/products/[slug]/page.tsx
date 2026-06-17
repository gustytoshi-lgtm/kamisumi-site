import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { JsonLd } from "@/components/seo/JsonLd";
import { PriceDisplay } from "@/components/product/PriceDisplay";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductGrid } from "@/components/product/ProductGrid";
import { ProductStatusBadge } from "@/components/product/ProductStatusBadge";
import { ArticleGrid } from "@/components/journal/ArticleGrid";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { supportedLocales } from "@/config/site";
import { getDictionary } from "@/dictionaries";
import { getLocalizedList, getLocalizedText } from "@/lib/localization";
import { getLocaleFromParams, type LocaleSlugParams } from "@/lib/params";
import { journalPath, localizePath } from "@/lib/routes";
import { absoluteUrl, breadcrumbJsonLd, buildMetadata, productJsonLd } from "@/lib/seo";
import { getProductStatusPresentation } from "@/lib/status";
import { getCommerceRepository } from "@/repositories";

// すべてのslugは generateStaticParams（モックデータ由来）で出力されるため、
// 未知のslugは soft-404（HTTP 200）ではなく真の404にする。
export const dynamicParams = false;

export async function generateStaticParams() {
  const repository = getCommerceRepository();
  const products = await repository.listProducts({ includeArchive: true });

  return supportedLocales.flatMap((locale) =>
    products.map((product) => ({ locale, slug: product.slug })),
  );
}

export async function generateMetadata({ params }: LocaleSlugParams): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getLocaleFromParams(params);
  const dictionary = getDictionary(locale);
  const product = await getCommerceRepository().getProductBySlug(slug);

  if (!product) {
    return buildMetadata({
      locale,
      title: dictionary.pages.notFound.title,
      description: dictionary.pages.notFound.description,
    });
  }

  return buildMetadata({
    locale,
    path: `/products/${product.slug}`,
    title: getLocalizedText(product.title, locale),
    description: getLocalizedText(product.shortDescription, locale),
    image: product.images[0]?.src,
  });
}

export default async function ProductDetailPage({ params }: LocaleSlugParams) {
  const { slug } = await params;
  const locale = await getLocaleFromParams(params);
  const dictionary = getDictionary(locale);
  const repository = getCommerceRepository();
  const product = await repository.getProductBySlug(slug);

  if (!product) notFound();

  const relatedProducts = (await repository.listProducts({ includeArchive: true })).filter((item) =>
    product.relatedProductIds.includes(item.slug),
  );
  const relatedPosts = (await repository.listJournalPosts()).filter((post) =>
    product.relatedJournalIds.includes(post.id),
  );
  const status = getProductStatusPresentation(dictionary, product.publicStatus);
  const shouldUseRelatedJournal =
    product.publicStatus === "archive" || product.publicStatus === "coming_soon";
  const ctaHref =
    product.publicStatus === "sourcing_available"
      ? localizePath(locale, "/sourcing/request")
      : shouldUseRelatedJournal && relatedPosts[0]
        ? journalPath(locale, relatedPosts[0].slug)
        : localizePath(locale, "/contact");
  const breadcrumbItems = [
    { label: dictionary.common.breadcrumbHome, href: localizePath(locale) },
    { label: dictionary.nav.shop, href: localizePath(locale, "/shop") },
    { label: getLocalizedText(product.title, locale) },
  ];

  return (
    <>
      <JsonLd data={productJsonLd(product, locale)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: dictionary.common.breadcrumbHome, url: absoluteUrl(locale) },
          { name: dictionary.nav.shop, url: absoluteUrl(locale, "/shop") },
          { name: getLocalizedText(product.title, locale), url: absoluteUrl(locale, `/products/${product.slug}`) },
        ])}
      />
      <section className="page-section compact">
        <div className="content-shell">
          <Breadcrumb ariaLabel={dictionary.common.breadcrumbLabel} items={breadcrumbItems} />
          <div className="two-column">
            <ProductGallery images={product.images} locale={locale} />
            <div className="stack">
              <span className="kicker">{dictionary.categories[product.category]}</span>
              <h1>{getLocalizedText(product.title, locale)}</h1>
              <ProductStatusBadge presentation={status} />
              <PriceDisplay
                dictionary={dictionary}
                locale={locale}
                price={product.price}
                referencePrices={product.referencePrices}
              />
              <p>{getLocalizedText(product.description, locale)}</p>
              <p className="muted">{dictionary.common.shippingAfterConfirm}</p>
              <ButtonLink href={ctaHref}>{status.cta}</ButtonLink>
            </div>
          </div>
        </div>
      </section>
      <section className="page-section band-ivory">
        <div className="content-shell two-column">
          <div className="stack">
            <SectionHeading title={dictionary.common.product} />
            <p>{getLocalizedText(product.story, locale)}</p>
            <dl className="detailList">
              {product.brandName ? (
                <div>
                  <dt>{dictionary.productFields.brand}</dt>
                  <dd>{getLocalizedText(product.brandName, locale)}</dd>
                </div>
              ) : null}
              {product.region ? (
                <div>
                  <dt>{dictionary.productFields.region}</dt>
                  <dd>{getLocalizedText(product.region, locale)}</dd>
                </div>
              ) : null}
              <div>
                <dt>{dictionary.productFields.sku}</dt>
                <dd>{product.sku}</dd>
              </div>
              <div>
                <dt>{dictionary.productFields.dispatch}</dt>
                <dd>{getLocalizedText(product.estimatedDispatch, locale)}</dd>
              </div>
            </dl>
          </div>
          <div className="stack">
            {product.matchaDetail ? (
              <DetailPanel
                items={[
                  [dictionary.productFields.weight, product.matchaDetail.weight],
                  [
                    dictionary.productFields.usucha,
                    product.matchaDetail.suitableForUsucha
                      ? dictionary.productFields.yes
                      : dictionary.productFields.no,
                  ],
                  [
                    dictionary.productFields.koicha,
                    product.matchaDetail.suitableForKoicha
                      ? dictionary.productFields.yes
                      : dictionary.productFields.no,
                  ],
                  [dictionary.productFields.bitterness, `${product.matchaDetail.bitterness}/5`],
                  [dictionary.productFields.umami, `${product.matchaDetail.umami}/5`],
                  [dictionary.productFields.aroma, `${product.matchaDetail.aroma}/5`],
                  [dictionary.productFields.sweetness, `${product.matchaDetail.sweetness}/5`],
                  [
                    dictionary.productFields.use,
                    product.matchaDetail.recommendedUse
                      ? getLocalizedList(product.matchaDetail.recommendedUse, locale).join(", ")
                      : "",
                  ],
                ]}
              />
            ) : null}
            {product.ceramicDetail ? (
              <DetailPanel
                items={[
                  [dictionary.productFields.dimensions, product.ceramicDetail.dimensions],
                  [dictionary.productFields.capacity, product.ceramicDetail.capacity ?? ""],
                  [
                    dictionary.productFields.material,
                    product.ceramicDetail.material
                      ? getLocalizedText(product.ceramicDetail.material, locale)
                      : "",
                  ],
                  [
                    dictionary.productFields.glaze,
                    product.ceramicDetail.glaze
                      ? getLocalizedText(product.ceramicDetail.glaze, locale)
                      : "",
                  ],
                  [
                    dictionary.productFields.microwave,
                    product.ceramicDetail.microwaveSafe
                      ? dictionary.productFields.yes
                      : dictionary.productFields.no,
                  ],
                  [
                    dictionary.productFields.dishwasher,
                    product.ceramicDetail.dishwasherSafe
                      ? dictionary.productFields.yes
                      : dictionary.productFields.no,
                  ],
                ]}
              />
            ) : null}
          </div>
        </div>
      </section>
      {relatedPosts.length > 0 ? (
        <section className="page-section">
          <div className="content-shell">
            <SectionHeading title={dictionary.nav.journal} />
            <ArticleGrid dictionary={dictionary} locale={locale} posts={relatedPosts} />
          </div>
        </section>
      ) : null}
      {relatedProducts.length > 0 ? (
        <section className="page-section band-ivory">
          <div className="content-shell">
            <SectionHeading title={dictionary.nav.shop} />
            <ProductGrid dictionary={dictionary} locale={locale} products={relatedProducts} />
          </div>
        </section>
      ) : null}
    </>
  );
}

function DetailPanel({ items }: { items: [string, string][] }) {
  return (
    <dl className="detailList">
      {items
        .filter(([, value]) => value)
        .map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
    </dl>
  );
}
