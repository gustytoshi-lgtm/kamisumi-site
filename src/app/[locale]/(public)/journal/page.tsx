import type { Metadata } from "next";
import { ArticleGrid } from "@/components/journal/ArticleGrid";
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
    path: "/journal",
    title: dictionary.pages.journal.title,
    description: dictionary.pages.journal.description,
  });
}

export default async function JournalPage({ params }: LocaleParams) {
  const locale = await getLocaleFromParams(params);
  const dictionary = getDictionary(locale);
  const posts = await getCommerceRepository().listJournalPosts();

  return (
    <>
      <PageIntro
        description={dictionary.pages.journal.description}
        kicker={dictionary.nav.journal}
        title={dictionary.pages.journal.title}
      />
      <section className="page-section compact">
        <div className="content-shell">
          <ArticleGrid dictionary={dictionary} locale={locale} posts={posts} />
        </div>
      </section>
    </>
  );
}

