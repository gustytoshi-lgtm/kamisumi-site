"use client";

import { useEffect, useState } from "react";
import styles from "@/components/ui/UI.module.css";

type Props = {
  /** ボタン文言（dictionary.contactInfo.dmButton）。 */
  label: string;
};

/**
 * 商品ページの「Threadsで相談・注文」ボタン。
 * 商品ページを SSG のまま保つため、Threads URL は runtime API（/api/contact）から取得する。
 * owner が設定で social_threads を入れていなければ何も表示しない。
 */
export function ProductThreadsCta({ label }: Props) {
  const [url, setUrl] = useState("");

  useEffect(() => {
    let active = true;
    void fetch("/api/contact", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : { threads: "" }))
      .then((data: { threads?: string }) => {
        if (active) setUrl(typeof data.threads === "string" ? data.threads : "");
      })
      .catch(() => {
        if (active) setUrl("");
      });
    return () => {
      active = false;
    };
  }, []);

  if (!url) return null;

  return (
    <a className={`${styles.button} ${styles.primary}`} href={url} rel="noopener noreferrer" target="_blank">
      {label}
    </a>
  );
}
