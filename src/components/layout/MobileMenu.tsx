"use client";

import Link from "next/link";
import { useState } from "react";
import type { Dictionary } from "@/dictionaries";
import type { Locale } from "@/config/site";
import { localizePath } from "@/lib/routes";
import { LanguageSwitcher } from "./LanguageSwitcher";
import styles from "./Header.module.css";

type MobileMenuProps = {
  locale: Locale;
  dictionary: Dictionary;
};

export function MobileMenu({ locale, dictionary }: MobileMenuProps) {
  const [open, setOpen] = useState(false);
  const nav = [
    ["shop", "/shop"],
    ["newArrivals", "/new-arrivals"],
    ["sourcing", "/sourcing/schedule"],
    ["journal", "/journal"],
    ["about", "/about"],
    ["order", "/order"],
    ["shipping", "/shipping"],
    ["faq", "/faq"],
    ["contact", "/contact"],
  ] as const;

  return (
    <>
      <button
        aria-expanded={open}
        aria-controls="mobile-navigation"
        aria-label={open ? dictionary.common.closeMenu : dictionary.common.openMenu}
        className={styles.menuButton}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        {open ? "X" : "≡"}
      </button>
      <div className={styles.mobilePanel} hidden={!open} id="mobile-navigation">
        {nav.map(([key, href]) => (
          <Link href={localizePath(locale, href)} key={key} onClick={() => setOpen(false)}>
            {dictionary.nav[key]}
          </Link>
        ))}
        <LanguageSwitcher dictionary={dictionary} locale={locale} />
      </div>
    </>
  );
}
