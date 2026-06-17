import type { Dictionary } from "@/dictionaries";
import type { Locale } from "@/config/site";
import { localizePath } from "@/lib/routes";
import { ButtonLink } from "./ButtonLink";
import styles from "./UI.module.css";

type HeroProps = {
  locale: Locale;
  dictionary: Dictionary;
};

export function Hero({ locale, dictionary }: HeroProps) {
  return (
    <section className={styles.hero}>
      <div className={`${styles.heroContent} content-shell`}>
        <span className="kicker">{dictionary.pages.home.eyebrow}</span>
        <h1>{dictionary.pages.home.title}</h1>
        <p>{dictionary.pages.home.subtitle}</p>
        <div className={styles.heroActions}>
          <ButtonLink href={localizePath(locale, "/shop")} variant="light">
            {dictionary.common.viewProducts}
          </ButtonLink>
          <ButtonLink href={localizePath(locale, "/sourcing/schedule")} variant="secondary">
            {dictionary.common.viewSchedule}
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
