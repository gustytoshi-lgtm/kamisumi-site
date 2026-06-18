"use client";

import { useState } from "react";

type Props = { label: string; confirmText: string; successPrefix: string };

/** mock データ初期化ボタン（dev-check 専用）。確認ダイアログ → /api/dev/reset。 */
export function MockResetButton({ label, confirmText, successPrefix }: Props) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function onClick() {
    if (!window.confirm(confirmText)) return;
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/dev/reset", { method: "POST" });
      if (res.ok) {
        const body = await res.json();
        setMessage(`${successPrefix} (商品 ${body?.counts?.products ?? "?"})`);
        // 画面の件数表示を更新するため再読み込み
        setTimeout(() => window.location.reload(), 600);
      } else {
        setMessage(`HTTP ${res.status}`);
      }
    } catch {
      setMessage("接続できませんでした");
    }
    setBusy(false);
  }

  return (
    <span style={{ display: "inline-flex", gap: "8px", alignItems: "center" }}>
      <button disabled={busy} onClick={onClick} type="button">
        {label}
      </button>
      {message ? (
        <span className="muted" role="status">
          {message}
        </span>
      ) : null}
    </span>
  );
}
