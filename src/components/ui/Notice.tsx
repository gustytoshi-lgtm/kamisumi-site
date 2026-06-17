import type { ReactNode } from "react";
import styles from "./UI.module.css";

type NoticeProps = {
  children: ReactNode;
};

export function Notice({ children }: NoticeProps) {
  return <div className={styles.notice}>{children}</div>;
}

