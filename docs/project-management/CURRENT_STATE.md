# CURRENT_STATE

最終更新: 2026-06-18 / 更新者: Claude Code

> このディレクトリ `docs/project-management/` が今後の正規プロジェクト管理文書。
> ルート直下の `HANDOFF.md` / `DECISIONS.md` / `TODO.md` / `CHANGELOG.md` / `PROJECT_MAP.md` は
> Phase 1 引き継ぎ時に作成した初期セット（内容は有効、随時参照）。差異が出た場合は本ディレクトリを優先。

## 正式な作業パス

`C:\Users\tkats\OneDrive\01_HTML_CSS\kamisumi-site`（OneDrive配下・正式フォルダで直接作業。クラウドコピーではない）

## 現在Phase

- Phase 1（公開サイト）: **完了**＋仕上げ継続中
- Phase 2A（販売・運用管理基盤）: **基盤実装中**（ドメインロジック/スキーマ/RLS/repository切替/管理i18n/管理画面scaffold[読取] は完了。CRUD書込・実Supabaseクエリ・Supabase認証は未着手）
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

- 管理画面 **scaffold 完了**（`/[locale]/admin`: レイアウト/ダッシュボード/商品一覧[読取]、feature flag `ADMIN_ENABLED` 既定OFF→真の404、mock認証アダプタ `ADMIN_DEV_ROLE`）。**残: CRUD書込フォーム・Supabase Auth差替・各メニュー実装・admin metadata(title)・専用adminクローム分離**
- `SupabaseCommerceRepository` の実クエリ（**スタブ**）
- 利益分析ビュー、原価配賦の実運用フロー、抹茶ロットFIFO/賞味期限アラート、陶器個体管理UI
- Phase 3 adapter（cart/checkout/payment/通知/SNS下書き）interface
- 公開サイト仕上げ（hero画像軽量化、reserved/sold_out/restock_request の実例データ 等）

## データモード

- 既定 **mock**（`DATA_BACKEND` 未設定）。公開サイトは Phase 1 と同一挙動。
- Supabase は env（`NEXT_PUBLIC_SUPABASE_URL` 等）と `DATA_BACKEND=supabase` を設定したときのみ。現状は接続なし。

## 公開サイト状態 / 管理画面状態

- 公開サイト: 動作（起動・リダイレクト・404・OG 確認済み）
- 管理画面: **scaffold動作**（flag OFF=404で公開無影響、ON+devロールでダッシュボード/商品一覧[読取]表示、権限ガード確認済み）。書込CRUD・実Auth・実Supabaseは未

## migration状態

- `supabase/migrations` 0001-0004 作成済み。**実DBへは未適用**（Supabase project なし）。
- 静的検証 `npm run db:validate` は OK。実SQL妥当性は未検証（Postgres 必要、KNOWN_ISSUES I-002）。

## Git

- branch: `main`
- 最新 commit: `f745444`（admin scaffold）※実行時に `git log -1` で再確認
- tag: なし（Phase 2A 未完了のため `v0.2.0-phase2a` は未付与）
- リモート: なし（push しない）

## テスト状態

- lint / typecheck / test(45) / build(79p) / db:validate: **成功**
- E2E（playwright）: OneDrive遅延で timeout（KNOWN_ISSUES I-001）

## 再開コマンド

```bash
cd "C:/Users/tkats/OneDrive/01_HTML_CSS/kamisumi-site"
npm install            # 必要時のみ
npm run typecheck && npm run lint && npm run test && npm run db:validate
npm run build && npm run start   # http://localhost:3000
git log --oneline | head -5
```
