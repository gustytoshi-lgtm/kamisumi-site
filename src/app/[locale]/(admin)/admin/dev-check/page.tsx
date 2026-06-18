import { notFound } from "next/navigation";
import { MockResetButton } from "@/components/admin/MockResetButton";
import { isDevToolsEnabled } from "@/config/devtools";
import { getAdminSession, resolveAdminLocale } from "@/lib/admin/auth";
import { getDevDiagnostics } from "@/lib/admin/devDiagnostics";
import { getLocaleFromParams, type LocaleParams } from "@/lib/params";
import { localizePath } from "@/lib/routes";

export const dynamic = "force-dynamic";

function Badge({ level, children }: { level: "ok" | "warn" | "unset" | "todo"; children: React.ReactNode }) {
  const color = { ok: "#44513b", warn: "#a47a5c", unset: "#615d53", todo: "#a58a55" }[level];
  return (
    <span style={{ background: color, color: "#fffdf8", borderRadius: "4px", padding: "1px 8px", fontSize: "0.78rem" }}>
      {children}
    </span>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: "12px", padding: "4px 0", borderBottom: "1px solid #d3ccbf" }}>
      <span style={{ minWidth: "180px", color: "#615d53" }}>{label}</span>
      <span>{children}</span>
    </div>
  );
}

export default async function DevCheckPage({ params }: LocaleParams) {
  if (!isDevToolsEnabled()) notFound();

  const locale = await getLocaleFromParams(params);
  const session = await getAdminSession();
  const adminLocale = resolveAdminLocale(locale, session);
  const d = await getDevDiagnostics();

  const publicLinks = [
    { label: "日本語トップ", href: "/ja" },
    { label: "繁體中文トップ", href: "/zh-tw" },
    { label: "商品一覧", href: "/ja/shop" },
    { label: "商品詳細", href: "/ja/products/kyoto-usucha-midori" },
    { label: "買付予定", href: "/ja/sourcing/schedule" },
    { label: "Journal", href: "/ja/journal" },
  ];
  const adminLinks = d.implementedAdmin.map((key) => ({
    label: key,
    href: key === "dashboard" ? localizePath(locale, "/admin") : localizePath(locale, `/admin/${key === "sourcing" ? "sourcing" : key}`),
  }));

  return (
    <div style={{ display: "grid", gap: "24px", maxWidth: "880px" }}>
      <div>
        <h1>動作確認 (dev-check)</h1>
        <p className="muted">
          開発専用ページです。本番では表示されません。長いログを読まずに全体状況を確認できます（言語: {adminLocale}）。
        </p>
      </div>

      <section>
        <h2>環境</h2>
        <Row label="NODE_ENV">{d.nodeEnv}</Row>
        <Row label="データバックエンド">
          <Badge level={d.backend === "mock" ? "warn" : "ok"}>{d.backend}</Badge>
        </Row>
        <Row label="認証モード">{d.authMode}</Row>
        <Row label="現在のロール">{session?.role ?? "(未ログイン)"}</Row>
        <Row label="管理画面">
          {d.adminEnabled ? <Badge level="ok">有効</Badge> : <Badge level="unset">無効</Badge>}
        </Row>
        <Row label="Supabase 接続">
          {d.supabaseConfigured ? <Badge level="ok">設定あり</Badge> : <Badge level="unset">未設定 (mock)</Badge>}
        </Row>
        <Row label="最新 commit">{d.commit}</Row>
      </section>

      <section>
        <h2>環境変数（有無のみ・値は非表示）</h2>
        {d.envPresence.map((e) => (
          <Row key={e.name} label={e.name}>
            {e.present ? <Badge level="ok">あり</Badge> : <Badge level="unset">なし</Badge>}
          </Row>
        ))}
      </section>

      <section>
        <h2>mock データ</h2>
        {d.mockCounts ? (
          <>
            <Row label="商品件数">{d.mockCounts.products}</Row>
            <Row label="監査ログ件数">{d.mockCounts.auditLogs}</Row>
            <Row label="初期化">
              <MockResetButton
                confirmText="mock データを初期状態へ戻します。よろしいですか？"
                label="mock データをリセット"
                successPrefix="初期化しました"
              />
            </Row>
            <p className="muted">※ mock データはサーバー再起動でも初期状態に戻ります。</p>
          </>
        ) : (
          <p className="muted">Supabase モードのため mock 件数はありません。</p>
        )}
      </section>

      <section>
        <h2>migration（{d.migrations.length} 件 / 最新 {d.latestMigration}）</h2>
        <p className="muted" style={{ wordBreak: "break-all" }}>
          {d.migrations.join(" / ") || "なし"}
        </p>
        <p className="muted">※ 実 DB への適用状況はこの画面では判定しません（KNOWN_ISSUES I-002）。</p>
      </section>

      <section>
        <h2>管理画面</h2>
        <Row label="実装済み">
          <span style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {d.implementedAdmin.map((k) => (
              <Badge key={k} level="ok">{k}</Badge>
            ))}
          </span>
        </Row>
        <Row label="未実装（予定）">
          <span style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {d.pendingAdmin.map((k) => (
              <Badge key={k} level="todo">{k}</Badge>
            ))}
          </span>
        </Row>
      </section>

      <section>
        <h2>ワンクリック確認（新しいタブで開く）</h2>
        <h3 style={{ marginBottom: "4px" }}>公開ページ</h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
          {publicLinks.map((l) => (
            <a href={l.href} key={l.href} rel="noreferrer" target="_blank">
              {l.label}
            </a>
          ))}
        </div>
        <h3 style={{ margin: "12px 0 4px" }}>管理ページ</h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
          {adminLinks.map((l) => (
            <a href={l.href} key={l.href} rel="noreferrer" target="_blank">
              {l.label}
            </a>
          ))}
        </div>
      </section>

      <section>
        <h2>既知の問題</h2>
        <p className="muted">
          詳細は docs/project-management/KNOWN_ISSUES.md。主なもの: E2E timeout(I-001) / migration 未適用検証(I-002) /
          OneDrive build lock(I-003) / mock と公開 read の別ストア(I-011)。
        </p>
      </section>
    </div>
  );
}
