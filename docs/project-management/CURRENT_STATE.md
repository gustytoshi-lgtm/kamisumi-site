# CURRENT_STATE

最終更新: 2026-06-18 (session 8) / 更新者: Claude Code

> このディレクトリ `docs/project-management/` が今後の正規プロジェクト管理文書。
> ルート直下の `HANDOFF.md` / `DECISIONS.md` / `TODO.md` / `CHANGELOG.md` / `PROJECT_MAP.md` は
> Phase 1 引き継ぎ時に作成した初期セット（内容は有効、随時参照）。差異が出た場合は本ディレクトリを優先。

## 正式な作業パス

`C:\Users\tkats\OneDrive\01_HTML_CSS\kamisumi-site`（OneDrive配下・正式フォルダで直接作業。クラウドコピーではない）

## 現在Phase

- Phase 1（公開サイト）: **完了**＋仕上げ継続中
- Phase 2A（販売・運用管理基盤）: **コード実装ほぼ完了・実 DB 検証待ち**（ドメインロジック/スキーマ/RLS/repository切替/管理i18n/管理画面scaffold/書込レイヤ/管理CRUD全接続/**Supabase SSR**/**Supabase read+write repository 実クエリ**/**mock⇄Supabase 認証切替** 完了。残: 実 Supabase project 接続での contract test・read 一致・RLS 検証）
- Phase 2B / 3 / 4: 未着手（スキーマの一部とロードマップのみ）

## 完了済み

- 公開サイト全15ルート（zh-tw / ja、en は隠しscaffold）、SEO/JSON-LD/sitemap/robots、OG画像PNG（`/api/og`）、favicon
- soft-404修正、proxy(locale redirect)動作確認済み
- Commerce Core 型・境界（`CoreScope` 多テナント）
- ドメインロジック（`src/lib/commerce/`）: money / orderStatus / inventoryStatus / rbac / sourcingAcceptance / adminNav + テスト
- データ基盤: `DATA_BACKEND` 切替（既定 mock）、Supabase adapter スタブ、`.env.example`
- `supabase/migrations` 0001-0004（組織/カタログ/運用/仕入/RLS）、`seed.sql`、`ER.md`、`README.md`、`npm run db:validate`
- 管理画面 i18n 辞書（ja / zh-tw）+ ナビ↔権限マップ（ルート未実装）

## 実装中 / 未着手（次の作業）

- 管理画面 **全主要CRUD完了**（`/[locale]/admin`: dashboard/products[status/delete/restore]/inventory[create/movement/status]/orders[create/status/notes/reopen]/sourcing[create/status]/journal[draft/translation/publish/delete]。`ADMIN_ENABLED` 既定OFF）。**専用adminクローム分離 完了（I-009 解決, route group `(public)`/`(admin)`）**
- **Supabase 認証切替 完了（Step C）**: `getAdminSession` が `ADMIN_AUTH_MODE`（既定は `DATA_BACKEND` 追従）で mock/Supabase を選択。supabase path は Cookie セッション→`user_roles`/`profiles`（self-read RLS）。呼出側不変・async 化済
- **SupabaseCommerceRepository 実クエリ実装済み（read+write、実DB検証待ち I-012）**: 在庫は `apply_inventory_movement` RPC、Postgres errcode→`CommerceError` 変換、契約テストは実DBで skip
- 残（実 Supabase project 接続後）: contract test 実行 / read 一致 / RLS 検証 / migration 実適用（I-002）
- 利益分析ビュー、原価配賦の実運用フロー、抹茶ロットFIFO/賞味期限アラート、陶器個体管理UI
- Phase 3 adapter（cart/checkout/payment/通知/SNS下書き）interface
- 公開サイト仕上げ（hero画像軽量化、reserved/sold_out/restock_request の実例データ 等）

## データモード

- 既定 **mock**（`DATA_BACKEND` 未設定）。公開サイトは Phase 1 と同一挙動。
- 読取: `getCommerceRepository()` / 書込: `getCommerceWriteRepository()` + `getCommerceService()`（既定 mock）。
- **mock 書込は in-memory（reset/seed、fixture非破壊、再起動で消える）。public read(fixture) とは別ストア**（Supabase 化で統合）。
- Supabase は env と `DATA_BACKEND=supabase` 設定時のみ。**read/write とも実クエリ実装済み**（実 DB 接続で検証）。

## 公開サイト状態 / 管理画面状態

- 公開サイト: 動作（起動・リダイレクト・404・OG 確認済み）
- 管理画面: **scaffold + 全CRUD動作**（flag OFF=404で公開無影響、ON+devロールで各管理ページ・権限ガード確認済み）。**route group `(admin)` で公開Header/Footerを持たない専用クローム化済（I-009 解決）**。**認証は mock⇄Supabase 切替可（Step C）**。実 Supabase 接続のみ未
- レイアウト構成: `[locale]/layout.tsx`=html/body+locale のみ / `(public)/layout.tsx`=site-shell+Header+main+Footer / `(admin)/admin/layout.tsx`=admin専用main（route group は URL に影響しない）

## migration状態

- `supabase/migrations` 0001-0005 作成済み。**実DBへは未適用**（Supabase project なし）。
- 静的検証 `npm run db:validate` は OK（5 files）。実SQL妥当性は未検証（Postgres 必要、KNOWN_ISSUES I-002）。

## Git

- branch: `main`
- 最新 commit: `15b01bd`（実行時に `git log -1` で再確認）
- tag: なし（Phase 2A は実 DB 検証が残るため `v0.2.0-phase2a` は未付与）
- 履歴は線形・損失なし。**単一エージェント作業方針（I-014 Resolved）**
- リモート: なし（push しない）

## テスト状態

- lint / typecheck / **test(84 passed・1 skipped)** / build / db:validate(5): **成功**（supabase 契約テストは実 DB 必須で skip）
- E2E（playwright）: OneDrive遅延で timeout（KNOWN_ISSUES I-001）

## 再開コマンド

```bash
cd "C:/Users/tkats/OneDrive/01_HTML_CSS/kamisumi-site"
npm install            # 必要時のみ
npm run typecheck && npm run lint && npm run test && npm run db:validate
npm run build && npm run start   # http://localhost:3000
git log --oneline | head -5
```
