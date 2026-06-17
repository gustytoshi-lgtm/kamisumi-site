# DECISIONS

設計判断の記録。ルートの `DECISIONS.md`（D-001〜D-008, Phase 1）も有効。本ファイルは Phase 2A 以降を扱う。

| ID | 日付 | 内容 | 背景 / 理由 | 却下案 | 見直し条件 | 影響範囲 |
|---|---|---|---|---|---|---|
| PM-001 | 2026-06-18 | データバックエンドを `DATA_BACKEND`(mock/supabase) で切替、既定 mock | 公開サイトを壊さず Supabase を段階導入。env 未設定なら Phase 1 と同一挙動 | 即 Supabase 化（本番情報なし） | Supabase 本番 project 確定時 | `src/config/dataBackend.ts`, `src/repositories/index.ts` |
| PM-002 | 2026-06-18 | 金額は最小通貨単位の整数 + currency。`src/lib/commerce/money.ts` 経由で計算 | 浮動小数点誤差の排除（§8 必須） | number で直接計算 | — | 全金額処理、DB `*_minor` 列 |
| PM-003 | 2026-06-18 | ステータスは TS union と DB `CHECK(... in ...)` で二重定義し一致させる | enum 移行の手間回避と型安全の両立 | PG enum 型 | 状態追加が頻繁なら enum 検討 | `orderStatus`/`inventoryStatus`/migrations |
| PM-004 | 2026-06-18 | RBAC を単一マトリクス（`rbac.ts`）で定義し、アプリ側ガードと RLS の二重防御 | front_staff から原価/利益/口座/権限/全顧客CSV を確実に遮断 | RLS のみ | ロール追加時 | `rbac.ts`, `adminNav.ts`, RLS 0004 |
| PM-005 | 2026-06-18 | 翻訳は `*_translations`（locale 行）に分離、コードへラベル直書きしない | 公開/管理とも i18n 一貫。将来翻訳追加に強い | jsonb 1列に全locale | — | migrations, `dictionaries/admin/*` |
| PM-006 | 2026-06-18 | OG 既定画像を `next/og` の動的PNG（`/api/og`）にし、`/api` 配下に置く | SVG はSNS非対応。`/og` は proxy が locale リダイレクトするため `/api` 除外を利用 | 静的PNGコミット / `/og` | 実ブランド画像確定時に差し替え | `src/app/api/og/route.tsx`, `seo.ts` |
| PM-007 | 2026-06-18 | 管理画面UI・実Supabaseクエリ・Auth ランタイムは本セッションで未実装とし、型/スキーマ/権限/i18n を先行 | 半完成UIで公開サイトを壊すリスク回避（§17 非該当のため mock/flag で吸収し継続） | 管理画面まで一気に実装 | 次セッションで実装 | 管理画面全般 |
| PM-008 | 2026-06-18 | プロジェクト管理文書を `docs/project-management/` に集約（正規） | spec の参照順に合わせ、Codex 引き継ぎを明確化 | ルート直下のみ | — | docs 構成 |
| PM-009 | 2026-06-18 | `@supabase/supabase-js` は本セッションで未導入 | 本番情報なしで依存追加・lock 変更を避け、adapter スタブで契約のみ確定 | 先に依存追加 | Supabase 実装着手時に追加 | 依存関係 |
