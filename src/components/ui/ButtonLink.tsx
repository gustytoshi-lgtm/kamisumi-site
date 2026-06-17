import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./UI.module.css";

type ButtonLinkProps = {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "light";
};

export function ButtonLink({ href, children, variant = "primary" }: ButtonLinkProps) {
  return (
    <Link className={`${styles.button} ${styles[variant]}`} href={href}>
      {children}
    </Link>
  );
}

