import Link from "next/link";
import { siteConfig, type Locale } from "@/config/site";
import type { Dictionary } from "@/dictionaries";
import { localizePath } from "@/lib/routes";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { MobileMenu } from "./MobileMenu";
import styles from "./Header.module.css";

type HeaderProps = {
  locale: Locale;
  dictionary: Dictionary;
};

export function Header({ locale, dictionary }: HeaderProps) {
  const nav = [
    ["shop", "/shop"],
    ["newArrivals", "/new-arrivals"],
    ["sourcing", "/sourcing/schedule"],
    ["journal", "/journal"],
    ["about", "/about"],
  ] as const;

  return (
    <header className={styles.header}>
      <div className={`${styles.inner} content-shell`}>
        <Link className={styles.brand} href={localizePath(locale)}>
          <span className={styles.brandName}>{siteConfig.brand.name}</span>
          <span className={styles.brandSubline}>{siteConfig.brand.subline}</span>
        </Link>
        <nav className={styles.nav} aria-label={dictionary.common.mainNavigationLabel}>
          {nav.map(([key, href]) => (
            <Link className={styles.navLink} href={localizePath(locale, href)} key={key}>
              {dictionary.nav[key]}
            </Link>
          ))}
        </nav>
        <div className={`${styles.actions} ${styles.actionsDesktop}`}>
          <LanguageSwitcher dictionary={dictionary} locale={locale} />
          <Link className={styles.orderLink} href={localizePath(locale, "/contact")}>
            {dictionary.nav.contact}
          </Link>
        </div>
        <MobileMenu dictionary={dictionary} locale={locale} />
      </div>
    </header>
  );
}
