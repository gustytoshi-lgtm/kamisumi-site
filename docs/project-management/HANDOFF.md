# HANDOFF (Codex 移管用)

最終更新: 2026-06-19 (12) / 更新者: Claude Code

> **session 12 追加（人間向け運用基盤）**: 役割別 .cmd ランチャー / `verify:*` スモーク / dev-check ページ / 開発モードバー / mock reset API / `docs/LOCAL_VERIFICATION_GUIDE.md`。本番では dev 機能を無効化（`isDevToolsEnabled`）。非技術者が PowerShell なしで起動・確認・初期化できる。
> **session 13 追加（Phase 2B 管理UI）**: 業務設定 `/admin/settings`・仕入先 `/admin/suppliers`・仕入記録 `/admin/purchases`（原価配賦）・入金 `/admin/payments`・配送 `/admin/shipping`。共有 `AdminActionForm`。`ADMIN_DEV_LOCALE` で mock 管理 UI 言語切替（ja/zh-tw）。
> **session 14 追加（Phase 2B 永続化+分析）**: 抹茶ロット `/admin/matcha-lots`(0010)・陶器個体 `/admin/ceramic-units`(0011,原価=owner)・経費 `/admin/expenses`(0012,owner)・利益分析 `/admin/profit`(owner)・経営ダッシュボード(ロール別)。test 188・全ゲート＋verify:quick 緑。新 Supabase repo は全てスケルトン（mock 既定）。

> **Phase 2A: Implementation Complete / Real Supabase Validation Pending**（実 DB 検証まで `v0.2.0-phase2a` タグ未付与）。
> **Phase 2B: データ層/永続化 実装中**。完了: 原価配賦・抹茶FIFO/賞味期限・仕入先データ層(0007)・状態機械(入金/配送)+送料差額・利益計算・会計 export interface・配送永続化(0008)・入金永続化(0009)・仕入記録+原価配賦永続化。
> 残: 陶器個体/経費 repository、利益レポート/会計 export の永続化、**全ドメイン管理UI(ja/zh-tw)**、ダッシュボード。

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
- 管理画面 **専用クローム分離（I-009 解決）**: route group `(public)`/`(admin)` で公開 Header/Footer から分離。`[locale]/layout.tsx`=html/body+locale のみ、公開シェルは `(public)/layout.tsx`、admin は `(admin)/admin/layout.tsx` の専用 main。URL 不変
- **書込レイヤ**: `CommerceWriteRepository` 契約 + `commerceService`（RBAC/状態遷移/在庫整合性/冪等/監査）+ mock 書込 repo（in-memory, reset/seed）+ テスト72
- **管理CRUD接続（フル）**: 全 server action + client form パターン（useActionState + confirm + notify 辞書）
  - 商品: status change / soft delete / restore / `generateMetadata`（I-008 解決）
  - 在庫: create item / apply movement（全10理由）/ set status
  - 注文: create / status change / notes / reopen（cancel→inquiry_received）
  - 買付依頼: create / status change
  - Journal: create draft / translation（ja+zh-tw inline）/ publish / unpublish / soft delete
- **Supabase クライアント基盤 + SSR**: `@supabase/supabase-js` + `@supabase/ssr` 0.12.0。
  - `client.ts`=`createBrowserClient`（anon, Cookie）/ `server.ts`=`getSupabaseAdminClient`（service role, write 用）+ `getSupabaseServerAuthClient`（anon+Cookie, ログインユーザー評価）/ `middleware.ts`=`updateSupabaseSession`。
  - `proxy.ts` は `isSupabaseConfigured()` のときだけ session 更新（mock mode 完全不変）。
- **Supabase read/write repository 実クエリ実装済み（実 DB 検証待ち）**: 
  - write: 商品/在庫/注文/買付/Journal/監査の全メソッド。在庫は `apply_inventory_movement` RPC。
  - read: products/journal/sourcing/faq を PostgREST 埋め込み select で公開型へマッピング。
  - エラー変換 `src/lib/supabase/errors.ts` + 単体テスト（DB 不要）。
- **管理画面認証 mock⇄Supabase 切替（Step C, session 8）**: `getAdminSession` が `ADMIN_AUTH_MODE`（既定 `DATA_BACKEND` 追従）で選択。supabase は Cookie セッション→`user_roles`/`profiles`（self-read RLS）、`pickPrimaryRole` で owner 優先。呼出側不変（async 化）。
- **接続手順書 `docs/SUPABASE_SETUP.md`**: env / project / migration / seed / owner / user_roles / Storage / RLS / contract test / 完了チェックリスト。

## 作業途中 / 未着手（次の具体的作業）
1. **実 Supabase project 接続 + 検証**（人間が project/env を用意 → docs/SUPABASE_SETUP.md の順）:
   - migration 0001-0005 適用 + `db lint`（I-002）。
   - `RUN_SUPABASE_CONTRACT=1` で `tests/writeContract.supabase.test.ts` を実行（**注: contract の productId "p1" は FK 違反。seed 済み実 UUID を使う setup へ拡張が必要**）。
   - `DATA_BACKEND=supabase` で公開サイトが mock と同結果になる read 一致確認。
2. ~~**Supabase Auth 差替**~~: **完了（session 8, Step C）**。`getAdminSession()` が `ADMIN_AUTH_MODE`（既定 `DATA_BACKEND` 追従）で mock/Supabase を切替。supabase は Cookie セッション→`user_roles`/`profiles`（self-read RLS）。残るは実 project 接続でのログイン疎通確認のみ。
3. ~~**setOrderNotes 恒久対応**~~: **完了（session 9, migration 0006）**。`provisional_orders` に customer_note/internal_note/notes_updated_by/notes_updated_at を追加し write repo を列 UPDATE に変更。
4. **migration 実適用検証**（I-002、0001-0006）。
5. **Phase 2B 続き**（純ロジック・仕入先/仕入記録/配送/入金 の永続化は実装済み）。次の具体作業:
   - repository 実装の残: matcha_lots、ceramic_units、expenses（既存パターン: core 型 + interface + mock + supabase + service + contract）。matcha は I-015 の on-hand 供給を確定。
   - 利益レポート/会計 export の永続化: profit.ts / accountingExport.ts を実データ（注文/仕入/送料/為替）へ接続。front_staff へ原価/利益を出さない。
   - 管理UI(ja/zh-tw): 仕入先→仕入・買付→入金→配送→抹茶→陶器→経費→利益分析→ダッシュボード→会計export の順に画面追加。actions.ts + client form パターン、adminNav + 辞書追加。RBAC は purchase:manage（仕入/入金=owner）/ order:update_status（配送=member）。
   - 既存の getProcurementService / getFulfillmentService / getPaymentService を UI から呼ぶ（UI から DB 直書きしない）。
6. ~~編集可能な業務設定 UI（§8）~~: **完了（session 13）**。残: 設定値の公開サイト反映 + `supabaseSettingsRepository` 実装（site_settings + 履歴表）。I-017。
7. **Phase 2B 管理UI**: purchases/抹茶ロット/陶器個体/経費/利益分析/ダッシュボード **完了(session 13-14)**。残り: **会計export永続化+UI**（accountingExport.ts は IF/冪等mock 有 → repo+migration+UI 化）、**画像管理基盤**（mock→Supabase Storage）。
   - **Supabase repo 実クエリ実装の残**: matcha/ceramic/expense/settings は現状スケルトン（NotImplemented）。実 DB 接続時に procurement/payment/fulfillment と同様 PostgREST/RPC で実装し contract test を流用。
   - mock 永続は in-memory（再起動で消える）。原価/利益/経費は owner 限定（front_staff/inventory に非表示）を維持すること。
8. **画像管理 UI（§9, I-018）**: mock 画像管理 → Supabase Storage（public/private, MIME/サイズ/寸法検証）。レシート等は private。
9. （任意）在ブラウザの dev 専用ロール切替（cookie ベース、I-019）。現状は役割別ランチャー + `ADMIN_DEV_LOCALE` で代替。

> 運用基盤メモ: 開発専用機能は `src/config/devtools.ts` の `isDevToolsEnabled()`（非本番 かつ ADMIN 有効 かつ mock）で一元ガード。dev-check=`/[locale]/admin/dev-check`、mock 初期化=`/api/dev/reset`（POST, 本番404）。停止は `.dev-server.pid` 記録分のみ（無差別 kill しない）。

> ✅ **並行作業（I-014）Resolved**: session 8 で並行ライター停止を確認・診断（損失/競合コピーなし）。以後**単一エージェント**で作業する。再開時も 1 ブランチ 1 作業者を厳守。

> 書込の使い方: `getCommerceService()`（既定 mock）→ `service.setProductStatus(actor, id, status)` 等。actor = `{ userId, role }`。業務ルールは service が強制、永続不変条件は repository が担う。

## 最初に読むファイル
1. `docs/project-management/CURRENT_STATE.md` / `ROADMAP.md` / `KNOWN_ISSUES.md` / `DECISIONS.md`
2. `README.md`, `docs/PHASE2A_IMPLEMENTATION_PLAN.md`
3. `src/types/commerce.ts`, `src/repositories/`, `src/lib/commerce/`, `supabase/`

## 実行コマンド
```bash
npm install
npm run verify:full     # typecheck+lint+test+db:validate+build（最後のゲート）
npm run verify:quick    # 公開/管理の軽量スモーク（別ポート3100, 1-3分）
npm run dev:owner       # mock owner で管理画面（or START_KAMISUMI_*.cmd をダブルクリック）
# 人間向け手順は docs/LOCAL_VERIFICATION_GUIDE.md。E2E は OneDrive 遅延で timeout（I-001）
```
Windows ランチャー: `START_KAMISUMI_MOCK.cmd`(dev-check) / `_OWNER` / `_FRONT_STAFF` / `_INVENTORY` / `_PUBLIC_ONLY` / `STOP_KAMISUMI.cmd` / `CHECK_KAMISUMI.cmd` / `RESET_MOCK_DATA.cmd`。

## 環境変数（`.env.example` 参照）
`DATA_BACKEND`(既定mock), `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`。秘密値・実口座・顧客情報はコミットしない。

## migration状態
0001-0012 作成済み（0006=注文メモ, 0007=仕入先詳細, 0008=配送状態+履歴, 0009=入金詳細, 0010=抹茶ロット quantity, 0011=陶器個体 status/lifecycle, 0012=経費）・**実DB未適用**。`db:validate` OK（12 files）。実SQL妥当性は未検証（I-002）。

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

## テスト結果（2026-06-19 session 14）
typecheck/lint OK（warning 0）、**test 188 passed・3 skipped**（supabase 契約は実 DB 必須で skip）、db:validate(12) OK、build clean、`verify:quick` 全✅（管理画面 全11 画面含む）、E2E timeout(I-001)。

## Codex 再開用プロンプト
```
KAMISUMI プロジェクト（C:\Users\tkats\OneDrive\01_HTML_CSS\kamisumi-site）を継続する。
まず docs/project-management/CURRENT_STATE.md と HANDOFF.md を読むこと。
現在 Phase 2A は 基盤 + 管理画面scaffold + 書込レイヤ(interface/service/mock/テスト72) + 管理CRUD接続(商品ステータス) まで完了。Supabase の実read/write・Supabase Auth・残CRUDフォームが未着手。
次のタスク: (1) @supabase/supabase-js 導入と src/lib/supabase/{client,server}.ts、(2) supabaseCommerceRepository(読取)と supabaseCommerceWriteRepository(書込)を 0001-0005/RPC で実装し、DATA_BACKEND=supabase で公開サイトが mock と同結果・runWriteContract も通ることを確認、(3) getAdminSession を Supabase Auth へ差替、(4) 在庫/注文/買付/Journal の管理CRUDフォームを actions.ts+client form パターンで追加。
ルール: 公開サイトを壊さない、GitHub push しない、OneDrive外へ移動しない、適用済みmigrationは書き換えない、金額は整数*_minor、front_staffに原価/利益/口座/権限/全顧客CSVを見せない、秘密情報をcommitしない。
各機能ごとに npm run typecheck/lint/test/build/db:validate を通し、WORK_LOG と CURRENT_STATE を更新すること。
```
