import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArticleGrid } from "@/components/journal/ArticleGrid";
import styles from "@/components/journal/Article.module.css";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { JsonLd } from "@/components/seo/JsonLd";
import { ProductGrid } from "@/components/product/ProductGrid";
import { supportedLocales } from "@/config/site";
import { getDictionary } from "@/dictionaries";
import { getLocalizedList, getLocalizedText, getDateFormatter } from "@/lib/localization";
import { getLocaleFromParams, type LocaleSlugParams } from "@/lib/params";
import { journalPath, localizePath } from "@/lib/routes";
import { absoluteUrl, articleJsonLd, breadcrumbJsonLd, buildMetadata } from "@/lib/seo";
import { getCommerceRepository } from "@/repositories";

// すべてのslugは generateStaticParams（モックデータ由来）で出力されるため、
// 未知のslugは soft-404（HTTP 200）ではなく真の404にする。
export const dynamicParams = false;

export async function generateStaticParams() {
  const posts = await getCommerceRepository().listJournalPosts();
  return supportedLocales.flatMap((locale) => posts.map((post) => ({ locale, slug: post.slug })));
}

export async function generateMetadata({ params }: LocaleSlugParams): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getLocaleFromParams(params);
  const dictionary = getDictionary(locale);
  const post = await getCommerceRepository().getJournalPostBySlug(slug);

  if (!post) return buildMetadata({ locale, title: dictionary.pages.notFound.title, description: dictionary.pages.notFound.description });

  return buildMetadata({
    locale,
    path: `/journal/${post.slug}`,
    title: getLocalizedText(post.title, locale),
    description: getLocalizedText(post.excerpt, locale),
    image: post.coverImage.src,
  });
}

export default async function JournalDetailPage({ params }: LocaleSlugParams) {
  const { slug } = await params;
  const locale = await getLocaleFromParams(params);
  const dictionary = getDictionary(locale);
  const repository = getCommerceRepository();
  const post = await repository.getJournalPostBySlug(slug);

  if (!post) notFound();

  const relatedProducts = (await repository.listProducts({ includeArchive: true })).filter((product) =>
    post.relatedProductIds.includes(product.slug),
  );
  const morePosts = (await repository.listJournalPosts({ limit: 3 })).filter((item) => item.id !== post.id);

  return (
    <>
      <JsonLd data={articleJsonLd(post, locale)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: dictionary.common.breadcrumbHome, url: absoluteUrl(locale) },
          { name: dictionary.nav.journal, url: absoluteUrl(locale, "/journal") },
          { name: getLocalizedText(post.title, locale), url: absoluteUrl(locale, `/journal/${post.slug}`) },
        ])}
      />
      <article className="page-section compact">
        <div className="content-shell stack">
          <Breadcrumb
            ariaLabel={dictionary.common.breadcrumbLabel}
            items={[
              { label: dictionary.common.breadcrumbHome, href: localizePath(locale) },
              { label: dictionary.nav.journal, href: localizePath(locale, "/journal") },
              { label: getLocalizedText(post.title, locale), href: journalPath(locale, post.slug) },
            ]}
          />
          <span className="kicker">{dictionary.journalCategories[post.category]}</span>
          <h1>{getLocalizedText(post.title, locale)}</h1>
          <p className="muted">
            {getDateFormatter(locale).format(new Date(post.publishedAt))}
          </p>
          <Image
            alt={getLocalizedText(post.coverImage.alt, locale)}
            className={styles.cover}
            height={720}
            src={post.coverImage.src}
            width={1120}
          />
          <div className={styles.articleBody}>
            {getLocalizedList(post.body, locale).map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </div>
      </article>
      {relatedProducts.length > 0 ? (
        <section className="page-section band-ivory">
          <div className="content-shell">
            <SectionHeading title={dictionary.nav.shop} />
            <ProductGrid dictionary={dictionary} locale={locale} products={relatedProducts} />
          </div>
        </section>
      ) : null}
      {morePosts.length > 0 ? (
        <section className="page-section">
          <div className="content-shell">
            <SectionHeading title={dictionary.pages.journal.title} />
            <ArticleGrid dictionary={dictionary} locale={locale} posts={morePosts} />
          </div>
        </section>
      ) : null}
    </>
  );
}
