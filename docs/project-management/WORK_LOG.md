# WORK_LOG

過去記録は削除せず追記する。新しい記録を上に追加。

---

## 2026-06-18 (5) — Claude Code — Phase 2A 管理CRUD仕上げ + I-008 解決

### 目的
管理画面 CRUD をフル実装し Phase 2A の UI 部分を完成させる。I-008（admin metadata）を解決。

### 実施内容
1. **I-008 解決**: 全管理ページ（dashboard/products/inventory/orders/sourcing/journal）に `generateMetadata` を追加（`<title>: {nav.label} | KAMISUMI Admin`）。
2. **作成フォーム追加**: `CreateInventoryItemForm` / `CreateOrderForm` / `CreateSourcingRequestForm` / `CreateJournalDraftForm`（各ページ上部に配置）。
3. **商品管理完結**: `softDeleteProductAction` / `restoreProductAction` + `ProductManageForm`。products ページに `includeDeleted: true` で論理削除品も表示・復元可能に。
4. **Journal 翻訳**: `JournalTranslationForm`（ja/zh-tw 各列 inline 入力）を journal ページに追加。
5. **注文再開**: `reopenOrderAction`（cancelled → inquiry_received、service.reopenOrder）+ `ReopenOrderForm`（cancelled 時のみ表示）。
6. `AdminDictionary` に `common.reopen` 追加（ja: 再開 / zh-tw: 重啟）。

### 完成した admin 操作マトリクス
| 対象 | 操作 | 状態 |
|---|---|---|
| 商品 | ステータス変更 / 論理削除 / 復元 | ✅ |
| 在庫 | アイテム作成 / 移動（全10理由）/ ステータス変更 | ✅ |
| 注文 | 作成 / 状態変更 / メモ / 再開 | ✅ |
| 買付依頼 | 作成 / 状態変更 | ✅ |
| Journal | 下書き作成 / 翻訳（ja+zh-tw）/ 公開・非公開 / 削除 | ✅ |

### Phase 2A 残課題（env 待ちで blocked）
- Supabase Auth `getAdminSession` 差替（HANDOFF 手順 2）
- SupabaseCommerceRepository 実クエリ（HANDOFF 手順 1）
- migration 実 DB 適用（I-002）
- admin 専用クローム（I-009, Low severity, Phase 1 変更リスクあり）

### コマンド / テスト
- typecheck/lint OK（warning 0）、test **72 passed**、build clean、db:validate(5) OK

### commit hashes
- `7968245` fix(admin): generateMetadata (I-008)
- `eb5f623` feat(admin): create forms
- `07af2de` feat(admin): product manage + journal translation
- `cb39cd9` feat(admin): reopen order

---

## 2026-06-18 (4) — Claude Code — Phase 2A Supabase基盤 + 管理CRUD拡張

### 目的
`@supabase/supabase-js` を導入し Supabase クライアント基盤を作成。管理画面の残 CRUD（在庫・注文・買付・Journal）を server action + client form パターンで接続。

### 実施内容
1. `@supabase/supabase-js` 2.108.2 インストール（package.json dependencies に追加）。
2. `src/lib/supabase/client.ts` — ブラウザ用 anon key クライアント（env 未設定時に明示エラー）。
3. `src/lib/supabase/server.ts` — サーバー専用 service role key クライアント（`server-only` import で誤用防止）。
4. `AdminDictionary` に新フィールド追加（`common.quantity/reason/note/customerNote/internalNote/slug/category/title/excerpt/restore/publish/unpublish/viewHistory`）。ja/zh-tw 辞書を両言語で更新。
5. `app/[locale]/admin/actions.ts` に全 CRUD アクション追加：
   - 在庫: `createInventoryItemAction` / `applyInventoryMovementAction` / `setInventoryStatusAction`
   - 注文: `createOrderAction` / `changeOrderStatusAction` / `setOrderNotesAction`
   - 買付: `createSourcingRequestAction` / `setSourcingRequestStatusAction`
   - Journal: `createJournalDraftAction` / `upsertJournalTranslationAction` / `setJournalStatusAction` / `softDeleteJournalAction`
6. フォームコンポーネント作成（すべて useActionState + confirm + notify 辞書）：
   - `InventoryMovementForm` / `InventoryStatusForm` / `OrderStatusForm` / `OrderNotesForm` / `SourcingRequestStatusForm` / `JournalStatusForm`
7. 管理ページ作成（権限ガード・書込ストア参照・audit ログ活用）：
   - `admin/inventory/page.tsx` / `admin/orders/page.tsx` / `admin/sourcing/page.tsx` / `admin/journal/page.tsx`
8. admin layout の `IMPLEMENTED_ROUTES` に inventory/orders/sourcing/journal を追加（リンク有効化）。

### コマンド / テスト
- typecheck/lint OK（warning 0）、test **72 passed**、build clean、db:validate(5) OK

### 残課題（次セッション優先）
- Supabase read/write repository の実クエリ実装（env + 実プロジェクト待ち、I-012）
- `getAdminSession` を Supabase Auth へ差替（I-013 関連）
- admin metadata `<title>` 追加（I-008）
- admin 専用クローム分離（I-009）
- migration 実 DB 適用検証（I-002）

### commit hash
- `ac9e7b1` feat(phase2a): supabase client base + admin CRUD (inventory/order/sourcing/journal)

---

## 2026-06-18 (3) — Claude Code — Phase 2A 書込レイヤ

### 目的
mock 専用に閉じず Supabase へ差し替え可能な共通契約で、商品/在庫/注文/買付/Journal の書込ユースケースを実装。

### 実施内容（指定順序 1-8）
1-3. 書込 interface（`core/commerceWriteRepository.ts` + `core/writeModels.ts`）/ service層（`lib/commerce/commerceService.ts`）/ mock 書込 repository（`repositories/mock/mockCommerceWriteRepository.ts`、in-memory・reset/seed・fixture非破壊）。
4. 管理画面CRUD接続（代表: 商品ステータス変更）。server action `app/[locale]/admin/actions.ts` + client `ProductStatusForm`（useActionState・確認・両言語通知）。admin/products を書込ストア参照に。
5. 状態遷移・在庫整合性テスト（`tests/commerceService.test.ts`, `tests/writeContract.test.ts`）。
6-7. Supabase 書込スケルトン（`repositories/supabase/supabaseCommerceWriteRepository.ts`）+ migration `0005_write_support.sql`（reserved/held 列・idempotency_keys・原子的 apply_inventory_movement）+ README 方針。
8. mock 既定で動作継続（DATA_BACKEND 未設定）。

### コマンド / テスト
- typecheck/lint OK、test **72 passed**、build clean、db:validate(5) OK
- 実機: admin ON+owner で商品ステータス変更フォーム描画(200)、OFFで /admin 404、公開導線維持

### 業務ルール（テスト済）
不正遷移拒否 / 販売可能在庫を下回る予約拒否 / 在庫負数防止 / 二重実行防止(idempotency) /
予約解除で在庫復元 / 出荷は予約分のみ / 完売・参考掲載の購入拒否 / 監査記録 / 論理削除除外 /
owner・front_staff・inventory_staff 権限差 / mock reset 分離 / repository 契約テスト。

### 残課題
- Supabase 書込メソッド実装（RPC/テーブル）+ contract test 流用、`@supabase/supabase-js` 導入
- 管理画面の残 CRUD（在庫移動・注文状態・買付・Journal フォーム。商品ステータスと同パターン）
- mock 書込と public read(fixture) の統合（Supabase 化で解消）

### commit hash
- `271028c` 書込レイヤ / `4df0187` admin CRUD接続 / `7f813a0` Supabase書込スケルトン+0005

---

## 2026-06-18 (2) — Claude Code — Phase 2A 管理画面 scaffold

### 目的
実Supabaseなしで完全検証できる管理画面の土台を、公開サイトを壊さず追加する。

### 実施内容
- `src/config/features.ts`（`ADMIN_ENABLED` 既定OFF）
- `src/lib/admin/auth.ts`（mock認証アダプタ `ADMIN_DEV_ROLE` + `resolveAdminLocale`）
- `src/proxy.ts`: flag OFF 時の `/[locale]/admin` を真の404（ソフト404回避）
- `src/app/[locale]/admin/{layout,page,products/page}.tsx`（ダッシュボード/商品一覧[読取]、rbac+adminNav+辞書で制御）
- `src/components/admin/Admin.module.css`
- `tests/adminAuth.test.ts`

### コマンド / テスト
- typecheck/lint OK、test 51 passed、build clean、db:validate OK
- 実機: OFF→admin 404 & 公開導線維持 / ON+owner→表示 / ON+inventory_staff→権限なし(漏れなし) / ON+未ログイン→サインイン

### 問題 / 解決
- `notFound()` がソフト404(200)になる挙動 → proxy で flag OFF の /admin をルーティング前に真404化（KNOWN_ISSUES I-010）。
- `pkill -f next` がGit Bashで効かず EADDRINUSE → PowerShell `Stop-Process`（port 3000）で確実停止。

### 残課題
- CRUD書込フォーム、Supabase Auth差替、残メニュー実装、admin metadata(I-008)、admin専用クローム(I-009)。

### commit hash
- `f745444` feat(phase2a): feature-flagged admin scaffold

---

## 2026-06-18 — Claude Code — Phase 2A 基盤

### 目的
Phase 1 を壊さず、KAGURAKOJI Commerce Core / Phase 2A の安全な技術基盤（データ・ドメインロジック・権限・i18n・移行）を確定する。

### 実施内容
1. 公開サイト仕上げ（前段）: soft-404 修正、favicon、OG画像PNG化（`/api/og`）、`stripLocale` 整理、`--space-5`。
2. Git ローカル初期化（`main`、baseline）。
3. ドメインロジック（純粋関数 + テスト）: money / orderStatus / inventoryStatus / rbac / sourcingAcceptance / adminNav。
4. データ基盤: `DATA_BACKEND` 切替（既定 mock）、Supabase adapter スタブ、`.env.example`。
5. `supabase/`: migrations 0001-0004（組織/カタログ/運用/仕入/RLS）、seed、ER.md、README、`db:validate` スクリプト。
6. 管理画面 i18n（ja/zh-tw）+ ナビ↔権限マップ（ルートなし）。
7. プロジェクト管理文書 `docs/project-management/*` を作成。

### 変更ファイル（主なもの）
- `src/lib/commerce/{money,orderStatus,inventoryStatus,rbac,sourcingAcceptance,adminNav}.ts`
- `src/config/dataBackend.ts`, `src/repositories/index.ts`, `src/repositories/supabase/supabaseCommerceRepository.ts`
- `src/dictionaries/admin/*`
- `src/app/api/og/route.tsx`, `src/lib/seo.ts`, `src/app/icon.svg`, `src/lib/routes.ts`, `src/styles/globals.css`
- `supabase/**`, `scripts/validate-migrations.mjs`, `.env.example`, `package.json`
- `tests/{money,commerceStatus,rbac,sourcingAcceptance,adminNav}.test.ts`
- `docs/project-management/*`

### migration
- 0001-0004 作成。実DB未適用（Supabase project なし）。`db:validate` OK。

### コマンド / テスト
- `npm run typecheck` 成功 / `npm run lint` 成功 / `npm run test` 45 passed / `npm run build` 79ページ成功 / `npm run db:validate` OK
- `npm run test:e2e` は OneDrive遅延で timeout（未解決・KNOWN_ISSUES I-001）

### 問題 / 解決
- OneDrive が `.next` をロックし `next build` が `EPERM unlink` で失敗 → `.next` 削除後に再ビルドで解消（再発防止は KNOWN_ISSUES I-003）。
- 当初 OG を `/og` に置いたが proxy が `/zh-tw/og` へリダイレクト → `/api/og`（matcher 除外）へ移動して解決。
- `next start` 残存で `EADDRINUSE :3000` → `Get-NetTCPConnection` で PID 特定し停止。

### 残課題
- 管理画面UI / Supabase Auth / 実Supabaseクエリ / 利益ビュー / Phase 2B-4 実装（ROADMAP 参照）。

### commit hash
- `cd3f608` baseline / `fd80f74` git docs / `c77bb8e` OG PNG / `45570a3` phase2a foundation / `fcd791f` admin i18n scaffold
