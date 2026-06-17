import Link from "next/link";
import { siteConfig, type Locale } from "@/config/site";
import type { Dictionary } from "@/dictionaries";
import { localizePath } from "@/lib/routes";
import styles from "./Footer.module.css";

type FooterProps = {
  locale: Locale;
  dictionary: Dictionary;
};

export function Footer({ locale, dictionary }: FooterProps) {
  const links = [
    ["shop", "/shop"],
    ["newArrivals", "/new-arrivals"],
    ["sourcing", "/sourcing/schedule"],
    ["journal", "/journal"],
    ["about", "/about"],
    ["order", "/order"],
    ["shipping", "/shipping"],
    ["faq", "/faq"],
    ["legal", "/legal"],
    ["privacy", "/privacy"],
  ] as const;

  return (
    <footer className={styles.footer}>
      <div className="content-shell">
        <div className={styles.inner}>
          <div className={styles.brand}>
            <span className={styles.brandName}>{siteConfig.brand.name}</span>
            <span>{dictionary.common.byOperator}</span>
            <p className={styles.muted}>{siteConfig.organization.displayName}</p>
          </div>
          <nav className={styles.links} aria-label={dictionary.common.footerNavigationLabel}>
            {links.map(([key, href]) => (
              <Link href={localizePath(locale, href)} key={href}>
                {key === "legal"
                  ? dictionary.pages.legal.title
                  : key === "privacy"
                    ? dictionary.pages.privacy.title
                    : dictionary.nav[key]}
              </Link>
            ))}
          </nav>
        </div>
        <p className={styles.finePrint}>{dictionary.common.commerceCoreNote}</p>
      </div>
    </footer>
  );
}
