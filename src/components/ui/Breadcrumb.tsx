import Link from "next/link";
import styles from "./UI.module.css";

type BreadcrumbItem = {
  label: string;
  href?: string;
};

export function Breadcrumb({ items, ariaLabel }: { items: BreadcrumbItem[]; ariaLabel: string }) {
  return (
    <nav className={styles.breadcrumb} aria-label={ariaLabel}>
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`}>
          {index > 0 ? " / " : null}
          {item.href ? <Link href={item.href}>{item.label}</Link> : <span>{item.label}</span>}
        </span>
      ))}
    </nav>
  );
}
