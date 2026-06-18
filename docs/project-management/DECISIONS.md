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
| PM-010 | 2026-06-18 | 注文「再開」は cancelled→inquiry_received の限定遷移のみ許可 | orderStatus の前進機械は un-cancel を許さないため、再開は専用の限定操作として扱う | 任意状態へ戻す | 運用要件が出たら再検討 | commerceService.reopenOrder |
| PM-011 | 2026-06-18 | 書込は「service層=業務ルール / repository=永続不変条件」に分離 | 同じ業務ルールを mock/Supabase で再実装しないため。repository は契約として差し替え可能 | repository に業務ルールを埋める | — | commerceService / writeRepository |
| PM-012 | 2026-06-18 | 複数テーブル更新は DB function/RPC で原子実行 + idempotencyKey で冪等 | 在庫移動/予約/注文状態/監査の途中状態を残さない。二重実行で二重減算しない | アプリ側で逐次更新 | — | apply_inventory_movement(0005), 在庫サービス |
| PM-013 | 2026-06-18 | mock 書込は in-memory store（fixture 非破壊、reset/seed）。public read(fixture) とは別ストア | 開発・テスト用。source を書き換えない。Supabase 化で read/write 統合 | fixture を直接書換 / ファイル永続化 | Supabase 実装時に統合 | mockCommerceWriteRepository。**注意: 開発サーバー再起動で消える**（本番DB代替ではない） |
