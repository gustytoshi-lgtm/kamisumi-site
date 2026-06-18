# HANDOFF (Codex 移管用)

最終更新: 2026-06-18 (5) / 更新者: Claude Code

## 概要
KAMISUMI（運営: KAGURAKOJI）の公開サイト + KAGURAKOJI Commerce Core 基盤。
Next.js 16 (App Router) / TypeScript strict / CSS Modules。データは既定 mock、Supabase は段階導入。

## 正式パス
`C:\Users\tkats\OneDrive\01_HTML_CSS\kamisumi-site`（OneDrive内・正式フォルダで直接作業。GitHub push しない / OneDrive外へ移動しない）

## Git
- branch: `main` / tag: なし / リモート: なし
- commit 履歴: `cd3f608`→`fd80f74`→`c77bb8e`→`45570a3`→`fcd791f`(+docs commit)。再開時 `git log --oneline` で最新を確認。

## 完了済み
- 公開サイト（zh-tw/ja、en隠し）全15ルート、SEO/JSON-LD/sitemap/robots、OG PNG(`/api/og`)、favicon、soft-404修正
- ドメインロジック `src/lib/commerce/`（money/orderStatus/inventoryStatus/rbac/sourcingAcceptance/adminNav）+ テスト45件
- データ基盤: `DATA_BACKEND` 切替（既定mock）、Supabase adapterスタブ、`.env.example`
- `supabase/migrations` 0001-0005 + seed + ER.md + README、`npm run db:validate`
- 管理画面 i18n（ja/zh-tw）+ ナビ↔権限マップ（新フィールド追加済み: quantity/reason/note/restore/publish/unpublish 等）
- 管理画面 **scaffold + 主要CRUD**: `/[locale]/admin`（flag `ADMIN_ENABLED` 既定OFF→proxyで真404、mock認証 `ADMIN_DEV_ROLE`）。dashboard/products/inventory/orders/sourcing/journal の各ページ + 権限ガード確認済み
- **書込レイヤ**: `CommerceWriteRepository` 契約 + `commerceService`（RBAC/状態遷移/在庫整合性/冪等/監査）+ mock 書込 repo（in-memory, reset/seed）+ テスト72
- **管理CRUD接続（フル）**: 全 server action + client form パターン（useActionState + confirm + notify 辞書）
  - 商品: status change / soft delete / restore / `generateMetadata`（I-008 解決）
  - 在庫: create item / apply movement（全10理由）/ set status
  - 注文: create / status change / notes / reopen（cancel→inquiry_received）
  - 買付依頼: create / status change
  - Journal: create draft / translation（ja+zh-tw inline）/ publish / unpublish / soft delete
- **Supabase クライアント基盤**: `@supabase/supabase-js` 2.108.2 + `src/lib/supabase/client.ts`（anon）+ `src/lib/supabase/server.ts`（service role、server-only）

## 作業途中 / 未着手（次の具体的作業）
1. **Supabase read/write 実装**: `supabaseCommerceRepository.ts`（読取）と `supabaseCommerceWriteRepository.ts`（書込）の各メソッドを 0001-0005 スキーマ/RPC（`apply_inventory_movement`）で実装。`DATA_BACKEND=supabase` で公開サイトが mock と同結果を返すこと、`tests/writeContract.test.ts` の `runWriteContract` を Supabase 実装にも適用して同一挙動を確認。Supabase project・env が揃った段階で実装。
2. **Supabase Auth + セッション保護**: `getAdminSession()`（現在は mock ADMIN_DEV_ROLE）を Supabase Auth の session+user_roles から返すよう差替（呼び出し側不変）。`src/lib/admin/auth.ts` のみ変更。
3. **admin metadata(I-008)**: `/[locale]/admin/*` の各ページに `generateMetadata` 追加（タブタイトル）。
4. **admin 専用クローム(I-009)**: 公開 Header/Footer を含まない admin 専用レイアウトへ route group 分離。Phase 1 構成は壊さない。
5. **migration 実適用検証**: Supabase/psql で `supabase db reset` → `db lint`（I-002）。
6. Phase 2B 以降は ROADMAP 参照。

> 書込の使い方: `getCommerceService()`（既定 mock）→ `service.setProductStatus(actor, id, status)` 等。actor = `{ userId, role }`。業務ルールは service が強制、永続不変条件は repository が担う。

## 最初に読むファイル
1. `docs/project-management/CURRENT_STATE.md` / `ROADMAP.md` / `KNOWN_ISSUES.md` / `DECISIONS.md`
2. `README.md`, `docs/PHASE2A_IMPLEMENTATION_PLAN.md`
3. `src/types/commerce.ts`, `src/repositories/`, `src/lib/commerce/`, `supabase/`

## 実行コマンド
```bash
npm install
npm run typecheck && npm run lint && npm run test && npm run db:validate
npm run build && npm run start     # http://localhost:3000
# E2E は OneDrive 遅延で timeout（I-001）
```

## 環境変数（`.env.example` 参照）
`DATA_BACKEND`(既定mock), `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`。秘密値・実口座・顧客情報はコミットしない。

## migration状態
0001-0004 作成済み・**実DB未適用**。`db:validate` OK。実SQL妥当性は未検証（I-002）。

## mock / Supabase 切替
`src/config/dataBackend.ts` → `getDataBackend()`。`src/repositories/index.ts` の factory が mock/supabase を選択。Supabase 未設定で `DATA_BACKEND=supabase` にすると factory が明示エラー（誤設定検知）。

## 注意設計 / 変更禁止
- 金額は必ず整数 `*_minor` + currency（`src/lib/commerce/money.ts`）。number で金額計算しない。
- front_staff に原価/利益/口座/権限/全顧客CSV/秘密設定を見せない（`rbac.ts` の SENSITIVE_PERMISSIONS、RLS 0004）。
- 適用済み migration は書き換えず新番号で追加。`src/proxy.ts` のファイル/関数名 `proxy` を変えない（Next.js 16 規約）。
- 公開サイトの URL・slug・主要導線・Phase 1 デザインを維持。実在しない業務ルール・提携・受賞・正規代理店表記を作らない。

## 未決事項（人間が決める）
連絡先メール / SNS URL / 法務・支払い・キャンセル・台湾食品配送規定 / 実商品データ・価格・画像・ロゴ・商標 / 台湾口座 / 本番決済・メール送信サービス / 英語公開時期 / Supabase本番project。

## 既知問題
KNOWN_ISSUES.md（I-001 E2E timeout, I-002 migration未検証, I-003 OneDrive build lock, I-004 npm audit, I-005 商品OG SVG, ...）。

## テスト結果（2026-06-18 session 5）
typecheck/lint OK（warning 0）、test 72 passed、build clean、db:validate(5) OK、E2E timeout(I-001)。

## Codex 再開用プロンプト
```
KAMISUMI プロジェクト（C:\Users\tkats\OneDrive\01_HTML_CSS\kamisumi-site）を継続する。
まず docs/project-management/CURRENT_STATE.md と HANDOFF.md を読むこと。
現在 Phase 2A は 基盤 + 管理画面scaffold + 書込レイヤ(interface/service/mock/テスト72) + 管理CRUD接続(商品ステータス) まで完了。Supabase の実read/write・Supabase Auth・残CRUDフォームが未着手。
次のタスク: (1) @supabase/supabase-js 導入と src/lib/supabase/{client,server}.ts、(2) supabaseCommerceRepository(読取)と supabaseCommerceWriteRepository(書込)を 0001-0005/RPC で実装し、DATA_BACKEND=supabase で公開サイトが mock と同結果・runWriteContract も通ることを確認、(3) getAdminSession を Supabase Auth へ差替、(4) 在庫/注文/買付/Journal の管理CRUDフォームを actions.ts+client form パターンで追加。
ルール: 公開サイトを壊さない、GitHub push しない、OneDrive外へ移動しない、適用済みmigrationは書き換えない、金額は整数*_minor、front_staffに原価/利益/口座/権限/全顧客CSVを見せない、秘密情報をcommitしない。
各機能ごとに npm run typecheck/lint/test/build/db:validate を通し、WORK_LOG と CURRENT_STATE を更新すること。
```
