import Link from "next/link";
import type { Locale } from "@/config/site";
import { localizePath } from "@/lib/routes";

type Props = {
  backend: string;
  authMode: string;
  role: string;
  locale: Locale;
};

/**
 * 開発モードバー（mock 管理画面の最上部）。本番では描画しない（呼び出し側 isDevToolsEnabled で制御）。
 * 現在の状態を常時可視化し、データが再起動で消える旨を明示する。
 */
export function DevModeBar({ backend, authMode, role, locale }: Props) {
  return (
    <div
      style={{
        background: "#7d5c24",
        color: "#fffdf8",
        padding: "6px 16px",
        fontSize: "0.82rem",
        display: "flex",
        flexWrap: "wrap",
        gap: "12px",
        alignItems: "center",
      }}
    >
      <strong>MOCK MODE</strong>
      <span>backend: {backend}</span>
      <span>auth: {authMode}</span>
      <span>role: {role}</span>
      <span>locale: {locale}</span>
      <span style={{ opacity: 0.85 }}>※データは再起動時に消える可能性があります</span>
      <Link
        href={localizePath(locale, "/admin/dev-check")}
        style={{ marginLeft: "auto", textDecoration: "underline" }}
      >
        動作確認
      </Link>
      <Link
        href={localizePath(locale, "/admin/notifications")}
        style={{ textDecoration: "underline" }}
      >
        通知
      </Link>
    </div>
  );
}
