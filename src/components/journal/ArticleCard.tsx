import Link from "next/link";
import Image from "next/image";
import type { Locale } from "@/config/site";
import type { Dictionary } from "@/dictionaries";
import { getDateFormatter, getLocalizedText } from "@/lib/localization";
import { journalPath } from "@/lib/routes";
import type { JournalPost } from "@/types/commerce";
import styles from "./Article.module.css";

type ArticleCardProps = {
  post: JournalPost;
  locale: Locale;
  dictionary: Dictionary;
};

export function ArticleCard({ post, locale, dictionary }: ArticleCardProps) {
  return (
    <article className={styles.card}>
      <Image
        alt={getLocalizedText(post.coverImage.alt, locale)}
        className={styles.image}
        height={520}
        src={post.coverImage.src}
        width={830}
      />
      <div className={styles.body}>
        <span className={styles.meta}>
          {dictionary.journalCategories[post.category]} /{" "}
          {getDateFormatter(locale).format(new Date(post.publishedAt))}
        </span>
        <h3>
          <Link href={journalPath(locale, post.slug)}>{getLocalizedText(post.title, locale)}</Link>
        </h3>
        <p>{getLocalizedText(post.excerpt, locale)}</p>
        <Link href={journalPath(locale, post.slug)}>{dictionary.common.readMore}</Link>
      </div>
    </article>
  );
}
