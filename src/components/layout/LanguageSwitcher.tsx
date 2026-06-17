"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { localeHtmlLang, localeNames, visibleLocales, type Locale } from "@/config/site";
import type { Dictionary } from "@/dictionaries";
import { replaceLocaleInPath } from "@/lib/routes";
import styles from "./Header.module.css";

type LanguageSwitcherProps = {
  locale: Locale;
  dictionary: Dictionary;
};

export function LanguageSwitcher({ locale, dictionary }: LanguageSwitcherProps) {
  const pathname = usePathname();

  return (
    <nav className={styles.languageSwitcher} aria-label={dictionary.common.languageSwitcherLabel}>
      {visibleLocales.map((targetLocale) => (
        <Link
          aria-current={targetLocale === locale ? "page" : undefined}
          className={`${styles.languageLink} ${
            targetLocale === locale ? styles.languageLinkActive : ""
          }`}
          href={replaceLocaleInPath(pathname, targetLocale)}
          key={targetLocale}
          lang={localeHtmlLang[targetLocale]}
        >
          {localeNames[targetLocale].slice(0, 2)}
        </Link>
      ))}
    </nav>
  );
}
