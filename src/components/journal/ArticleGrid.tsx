import type { Locale } from "@/config/site";
import type { Dictionary } from "@/dictionaries";
import type { JournalPost } from "@/types/commerce";
import { EmptyState } from "@/components/ui/EmptyState";
import { ArticleCard } from "./ArticleCard";
import styles from "./Article.module.css";

type ArticleGridProps = {
  posts: JournalPost[];
  locale: Locale;
  dictionary: Dictionary;
};

export function ArticleGrid({ posts, locale, dictionary }: ArticleGridProps) {
  if (posts.length === 0) return <EmptyState message={dictionary.common.noItems} />;

  return (
    <div className={styles.grid}>
      {posts.map((post) => (
        <ArticleCard dictionary={dictionary} key={post.id} locale={locale} post={post} />
      ))}
    </div>
  );
}

