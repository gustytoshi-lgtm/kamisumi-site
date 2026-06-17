import type { Metadata } from "next";
import { ArticleGrid } from "@/components/journal/ArticleGrid";
import { ProductGrid } from "@/components/product/ProductGrid";
import { ScheduleList } from "@/components/sourcing/ScheduleList";
import { Hero } from "@/components/ui/Hero";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { siteConfig } from "@/config/site";
import { getDictionary } from "@/dictionaries";
import { buildMetadata } from "@/lib/seo";
import { getLocaleFromParams, type LocaleParams } from "@/lib/params";
import { localizePath } from "@/lib/routes";
import { getCommerceRepository } from "@/repositories";

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const locale = await getLocaleFromParams(params);
  const dictionary = getDictionary(locale);

  return buildMetadata({
    locale,
    title: siteConfig.brand.name,
    description: dictionary.pages.home.subtitle,
  });
}

export default async function HomePage({ params }: LocaleParams) {
  const locale = await getLocaleFromParams(params);
  const dictionary = getDictionary(locale);
  const repository = getCommerceRepository();
  const [products, schedules, posts] = await Promise.all([
    repository.listProducts({ includeArchive: false, limit: 6 }),
    repository.listSourcingSchedules(),
    repository.listJournalPosts({ limit: 3 }),
  ]);

  return (
    <>
      <Hero dictionary={dictionary} locale={locale} />
      <section className="page-section">
        <div className="content-shell">
          <SectionHeading
            description={dictionary.pages.home.currentSalesLead}
            title={dictionary.pages.home.currentSales}
          />
          <ProductGrid dictionary={dictionary} locale={locale} products={products} />
        </div>
      </section>
      <section className="page-section band-ivory">
        <div className="content-shell">
          <SectionHeading
            description={dictionary.pages.home.weeklySourcingLead}
            title={dictionary.pages.home.weeklySourcing}
          />
          <ScheduleList dictionary={dictionary} locale={locale} schedules={schedules.slice(0, 2)} />
        </div>
      </section>
      <section className="page-section">
        <div className="content-shell">
          <SectionHeading
            description={dictionary.pages.home.selectLead}
            title={dictionary.pages.home.selectTitle}
          />
          <ul className="responsive-grid">
            {(["matcha", "ceramics", "tea-tools", "gift-sets"] as const).map((category) => (
              <li className="stack" key={category}>
                <strong>{dictionary.categories[category]}</strong>
                <ButtonLink href={localizePath(locale, `/shop?category=${category}`)} variant="secondary">
                  {dictionary.common.viewProducts}
                </ButtonLink>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <section className="page-section band-matcha">
        <div className="content-shell">
          <SectionHeading title={dictionary.pages.home.journalTitle} />
          <ArticleGrid dictionary={dictionary} locale={locale} posts={posts} />
        </div>
      </section>
      <section className="page-section">
        <div className="content-shell two-column">
          <div className="stack">
            <SectionHeading
              description={dictionary.pages.home.editionsLead}
              title={dictionary.pages.home.editionsTitle}
            />
            <ButtonLink href={localizePath(locale, "/journal/making-first-matcha-set")} variant="secondary">
              {dictionary.productStatus.coming_soon.cta}
            </ButtonLink>
          </div>
          <div className="stack">
            <SectionHeading description={dictionary.pages.home.aboutLead} title={dictionary.nav.about} />
            <ButtonLink href={localizePath(locale, "/about")} variant="secondary">
              {dictionary.common.learnMore}
            </ButtonLink>
          </div>
        </div>
      </section>
      <section className="page-section band-ivory">
        <div className="content-shell">
          <SectionHeading title={dictionary.pages.home.orderTitle} />
          <ol className="responsive-grid">
            {dictionary.pages.home.orderSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
