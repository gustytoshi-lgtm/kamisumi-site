# HANDOFF (Codex 移管用)

最終更新: 2026-06-18 / 更新者: Claude Code

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
- `supabase/migrations` 0001-0004 + seed + ER.md + README、`npm run db:validate`
- 管理画面 i18n（ja/zh-tw）+ ナビ↔権限マップ（ルート未実装）

## 作業途中 / 未着手（次の具体的作業）
1. **`@supabase/supabase-js` 導入**し `src/lib/supabase/{client,server}.ts` を作成（client=anon, server=service role はサーバー専用）。
2. **`SupabaseCommerceRepository` 実装**: `supabaseCommerceRepository.ts` の各メソッドを 0001 スキーマに対するクエリで実装。`DATA_BACKEND=supabase` で公開サイトが mock と同結果を返すことを確認。
3. **Supabase Auth + セッション保護**: `/[locale]/admin` layout（server）で session 確認、`user_roles` から role 取得、`rbac.ts`/`adminNav.ts` でメニュー制御。未ログインは公開トップへ。
4. **管理画面 CRUD UI**: `adminNav` の各キー（products/inventory/customers/inquiries/orders/sourcing/journal/media/settings/audit）。`getAdminDictionary(adminLocale)` を使用、ラベル直書き禁止。feature flag（例 `ADMIN_ENABLED`）で既定無効にし、半完成を公開へ出さない。
5. **migration 実適用検証**: Supabase/psql で `supabase db reset` → `db lint`（I-002）。
6. Phase 2B 以降は ROADMAP 参照。

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

## テスト結果（2026-06-18）
typecheck/lint OK、test 45 passed、build 79ページ、db:validate OK、E2E timeout(I-001)。

## Codex 再開用プロンプト
```
KAMISUMI プロジェクト（C:\Users\tkats\OneDrive\01_HTML_CSS\kamisumi-site）を継続する。
まず docs/project-management/CURRENT_STATE.md と HANDOFF.md を読むこと。
現在 Phase 2A 基盤（型/スキーマ/RLS/repository切替/RBAC/管理i18n）は完了、管理画面UI・Supabase Auth・実Supabaseクエリが未着手。
次のタスク: (1) @supabase/supabase-js 導入と src/lib/supabase/{client,server}.ts、(2) supabaseCommerceRepository を 0001 スキーマで実装し DATA_BACKEND=supabase で公開サイトが mock と同結果になることを確認、(3) /[locale]/admin の Auth 保護と CRUD UI を adminNav+rbac+getAdminDictionary で実装（feature flag 既定無効）。
ルール: 公開サイトを壊さない、GitHub push しない、OneDrive外へ移動しない、適用済みmigrationは書き換えない、金額は整数*_minor、front_staffに原価/利益/口座/権限/全顧客CSVを見せない、秘密情報をcommitしない。
各機能ごとに npm run typecheck/lint/test/build/db:validate を通し、WORK_LOG と CURRENT_STATE を更新すること。
```
