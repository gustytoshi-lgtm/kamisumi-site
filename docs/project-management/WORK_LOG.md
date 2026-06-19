# WORK_LOG

過去記録は削除せず追記する。新しい記録を上に追加。

## 2026-06-19 (18) — Claude — Git stage/commit 復旧 + 未コミット整理

### 目的
優先タスク1（Git stage/commit 可能化と未コミット変更の整理）。前セッションで `.git` ACL により commit 不能とされていた状態を確認し、機能単位でコミット/プッシュする。

### 確認した内容
- 正式パス `C:\dev\sites\kamisumi-site` で作業（OneDrive 旧フォルダは未参照）。
- `.git` 直下の Deny ACL は**現在のユーザー `maomao-desk\tkats` ではなく別 SID**（解決不能 `S-1-5-21-...-1010570570`）が対象。`git add` 実テストで成功を確認 → I-022 は現ユーザーでは実害なし。
- `index.lock` 残存なし。
- `next-env.d.ts` の差分は LF→CRLF の行末ノイズのみ → `git checkout` で復元。
- `.env.example` / `docs/SUPABASE_SETUP.md` は空プレースホルダ・`<owner-uid>` 等のみで実秘密なし。

### コミット（機能単位、main）
1. `b3fd010 feat(customer): customer portal foundation (migration 0016 + auth/repo/service)`
2. `8ab7e97 test(supabase): contract test entrypoints for phase 2B repositories`
3. `f855b2d chore(dev): stabilize verify smoke for Windows sequential dev servers`
4. `95cf2a1 docs(pm): handoff-prep snapshot (session 17 → 18)`

### 確認
- `npm.cmd run verify:full`: 成功（exit 0。typecheck / lint / test 237 passed・9 skipped / db:validate 16 files / build）。コミットはツリー内容を変えていないため検証状態は維持。
- コミット後 `git status --short`: クリーン。

### 残
- origin/main へ push。
- 実 Supabase 接続検証（優先2）、顧客マイページ公開 UI（優先3）以降。

---

## 2026-06-19 (handoff prep) — Codex — 引き継ぎ準備

### 目的
次の Claude Code セッションへ安全に引き継ぐため、実装を行わず、確認済みの Git 状態・検証結果・未完了タスクをプロジェクト管理文書へ反映した。

### 確認した内容
- `git status --short`: 未コミット変更あり。Supabase contract test 基盤、顧客マイページ基盤、smoke script 改善、関連ドキュメント更新が作業ツリーに残っている。
- current branch: `main`。
- latest commit: `f3c4571 docs(pm): finalize HANDOFF for Codex (session 17 state)`。
- `git log --oneline -20`: HANDOFF.md に記録。
- 秘密情報点検: 追跡対象の env/鍵/credential は `.env.example` のみ確認済み。
- Git 操作制約: `.git` ACL により `git add` が `index.lock: Permission denied` で失敗するため、コミット/ push は未実施。

### 反映した検証結果
- `npm.cmd run verify:full`: 成功（typecheck / lint / test **237 passed・9 skipped** / `db:validate` **16 files OK** / build）。
- `npm.cmd run verify:quick`: 成功（public smoke / owner 全16管理画面 / inventory 権限制限）。
- `npm.cmd run test -- customerPortalService customerAuth`: 8 passed。
- `npm.cmd run test -- customerPortal`: 6 passed / 1 skipped。
- `npm.cmd run db:validate`: 16 files OK。
- `npm.cmd run typecheck`: OK。

### 更新
- `CURRENT_STATE.md`: 最新の実装済み範囲、未実装/未検証、Git状態、検証結果へ更新。
- `HANDOFF.md`: branch / latest commit / worktree status / git log / 実装済み内容 / テスト状況 / 優先タスク / 注意事項 / Claude Code 推奨プロンプトを記録。
- `ROADMAP.md`: Phase 2B と Phase 3 の状態を最新化。
- `KNOWN_ISSUES.md`: 実DB未検証範囲を 0016/customer portal まで更新し、`.git` ACL 問題（I-022）を追加。

### 残
- `.git` ACL 復旧後、未コミット変更を機能単位で commit/push する。
- 実 Supabase project 接続検証は未実施。

---

## 2026-06-19 (9) — Codex — 顧客マイページ基盤

### 目的
公開マイページ UI の前提として、Supabase Auth ユーザーと顧客台帳を安全にリンクする顧客本人向け基盤を作った。全顧客 export・内部メモ・原価/利益など管理者向け情報は契約に含めない。

### 実装
- migration **0016_customer_accounts.sql**: `customer_accounts` を追加し、`profiles.id` と `customers.id` をリンク。`is_customer_self(customer_id)` と本人向け RLS（customers/customer_addresses/orders/sourcing_requests の本人 read/update 範囲）を追加。
- core: `customerModels.ts` / `customerRepository.ts`。
- repo: `mockCustomerPortalRepository` / `supabaseCustomerPortalRepository`。
- auth: `src/lib/customer/auth.ts`（`CUSTOMER_AUTH_MODE`、mock⇄Supabase、preferredLocale 解決）。
- service: `customerPortalService`（未ログイン拒否・account/customerId mismatch 拒否・プロフィール/住所操作）。
- tests: `customerPortalService.test.ts` / `customerAuth.test.ts` / `customerPortalContract*.test.ts`。
- `.env.example` と `docs/SUPABASE_SETUP.md` に顧客 contract 用 env を追記。

### 確認
- `npm.cmd run test -- customerPortalService customerAuth`: 8 passed。
- `npm.cmd run test -- customerPortal`: 6 passed / 1 skipped（Supabase 実DB）。
- `npm.cmd run db:validate`: 16 files OK。
- `npm.cmd run typecheck`: OK。
- `npm.cmd run verify:full`: OK（typecheck / lint / test 237 passed・9 skipped / db:validate 16 files / build）。
- `npm.cmd run verify:quick`: OK（公開 / owner 全16管理画面 / inventory 権限制限）。

### 残
- `/[locale]/account` など公開UIは未実装（I-021）。
- 実 Supabase project で 0016 適用・RLS・`customerPortalContract.supabase.test.ts` 実行が必要。

---

## 2026-06-19 (8) — Codex — Supabase 実 DB 契約テスト入口拡張

### 目的
実 Supabase project/env がまだ無い状態でも次の検証へ進めるように、Phase 2B/運用系 repository の mock 契約テストと実 DB 用 `*.supabase.test.ts`（既定 skip）を追加した。実データ・秘密情報は含めず、実 DB 実行時は `SUPABASE_CONTRACT_ACTOR_ID` に `profiles.id` を渡す。

### 実装
- 追加: `tests/repositoryContractFixtures.ts`（seed 固定 UUID と Supabase 契約テストの env 判定）。
- 追加: 抹茶ロット / 陶器個体 / 経費 / メディア / 業務設定の contract runner、mock contract test、Supabase contract test。
- Supabase 実行条件: `RUN_SUPABASE_CONTRACT=1` + `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` + `SUPABASE_CONTRACT_ACTOR_ID`。
- `scripts/smoke.mjs` をブロック単位の独立 Node プロセス実行へ変更。Windows で `next dev` を同一プロセス内連続起動するとポート解放待ちが不安定だったため、公開/owner/inventory を安全に分離した。
- docs 補正: `docs/SUPABASE_SETUP.md` を migration 0001-0015 と全 Supabase 契約テスト一覧へ更新。CURRENT_STATE/HANDOFF/ROADMAP/KNOWN_ISSUES/DECISIONS/LOCAL_VERIFICATION_GUIDE の古い記述（0009止まり、スケルトン、OneDrive）を最新化。

### 確認
- `npm.cmd run test -- matchaLotContract ceramicUnitContract expenseContract mediaContract settingsContract`: 12 passed / 5 skipped（実 DB 必須の Supabase は既定 skip）。
- `npm.cmd run typecheck`: OK。
- `npm.cmd run verify:quick`: OK（公開 / owner 全16管理画面 / inventory 権限制限）。
- `npm.cmd run verify:full`: OK（typecheck / lint / test 228 passed・8 skipped / db:validate 15 files / build）。

### 次
- 実 Supabase env が無い限り、次の合理的な縦スライスは顧客マイページ基盤または cart/checkout 公開UI。

---

## 2026-06-19 (7) — Claude Code — GitHub 連携 + 通知の実配線

### GitHub
- 秘密情報点検（.env系/鍵/node_modules/.next は ignore、追跡は空テンプレ .env.example のみ、SUPABASE_SETUP.md はプレースホルダ）→ 問題なし。
- `git push -u origin main`（`https://github.com/gustytoshi-lgtm/kamisumi-site.git`）。以後 commit ごとに push。

### 通知の実配線（commit cc073b6）
- `lib/commerce/notify.ts`（notifyBestEffort・失敗非ブロッキング）+ `mockNotifier` シングルトン。
- commerceService.changeOrderStatus→order_status / paymentService.recordReceipt→payment_received / fulfillmentService.changeShipmentStatus→shipment_update を enqueue。notifier はコンストラクタ任意注入（後方互換）。factory `getNotifier()` 注入。
- test 216（配線5件追加）。本番送信なし（mock）。

### 追加（同 session）
- 通知ビューア(dev) `/admin/notifications`（`62dbb58`・dev限定・mockNotifier.listSent 表示・DevModeBar リンク）。
- 操作履歴ビューア `/admin/audit-logs`（`d1022bf`・owner=audit_log:view・nav auditLogs キー実装・直近200件）。管理画面 全16画面。

### 設計判断
PM-031（通知は best-effort・任意 notifier 注入。失敗は業務処理を止めない。本番送信は adapter 差替で将来）。

---

## 2026-06-19 (6) — Claude Code — プロジェクト移設（OneDrive→C:\dev）

### 目的
OneDrive 同期競合/ロック（I-003）の根本解決。正式作業パスを `C:\dev\sites\kamisumi-site` へ移設（人間が実施）。

### 確認
- 新パスは git リポジトリで HEAD=`14bb392`（移設前の最新 commit）と一致。tracked 320 files・node_modules あり・typecheck 緑。**孤立コピーではなく全履歴・全作業を保持**。
- 旧パス `C:\Users\tkats\OneDrive\01_HTML_CSS\kamisumi-site` も同一 commit で残存（重複コピー）。以後**参照・編集しない**。

### 実施
- 正規パス参照を新パスへ更新: CURRENT_STATE / HANDOFF（正式パス・再開コマンド・Codex 再開プロンプトを現状へ刷新）/ PHASE1_FINAL_REVIEW。
- I-003（OneDrive build lock）→ **Resolved（移設）**。I-001（E2E timeout）→ 移設で改善・要再評価。
- .cmd ランチャーは `%~dp0`（自身の場所基準）のため変更不要（新パスでもそのまま動作）。

### 注意
- shell の cwd は毎回リセットされ旧 OneDrive パスに戻るため、コマンドは毎回 `cd "C:/dev/sites/kamisumi-site"` を付ける。

### 設計判断
PM-030（正式作業パスを OneDrive 外 `C:\dev\sites\kamisumi-site` へ移設。同期競合/ロック回避。旧コピーは触らない）。

---

## 2026-06-18 (11) — Claude Code — Phase 2B 永続化（配送/入金/仕入記録）

### 目的
Phase 2B の状態機械・純ロジックを実 DB スキーマへ接続する。配送・入金・仕入記録（原価配賦）を
migration + repository(mock/supabase) + service + contract test の縦スライスで実装。

### 実施内容（小さな完結単位ごとにコミット）
1. **配送永続化**（`68ef272`）: migration **0008**（shipments.status + CHECK / status_updated_at・by / `shipment_status_events` + index + member RLS）。`FulfillmentRepository`（mock/supabase）+ `fulfillmentService`（shipmentStatus 状態機械強制、`order:update_status` RBAC）。送料差額は kamisumiBorneFreight。contract + service テスト（不正遷移/権限）。
2. **入金永続化**（`7718f0d`）: migration **0009**（payments に payment_type/expected_amount_minor/matching_number/paid_at。実口座番号なし）。`PaymentRepository`（mock/supabase）+ `paymentService`（paymentStatus 状態機械、**owner 限定 `purchase:manage`**=payments_owner RLS と整合、front_staff 遮断）。recordReceipt で受領額+確認者。テスト（遷移/RBAC/検証）。
3. **仕入記録 + 原価配賦永続化**（`2c1cdf2`）: `ProcurementRepository` を purchases/purchase_items/cost_allocations へ拡張（mock/supabase）。`allocatePurchaseCosts` が costAllocation.allocateCost を明細へ適用し cost_allocations を置換（合計保存、method は toDbMethod で amount へ）。contract テスト（配賦合計一致・再配賦置換・論理削除/復元）。

### 重要な前提・残課題
- **I-016 解決**: shipments に status 列を 0008 で追加。
- 残: 陶器個体・経費の repository、利益レポート/会計 export の永続化、**全ドメイン管理UI(ja/zh-tw)**、ダッシュボード。
- 責務分離維持: procurement（仕入・owner）/ fulfillment（配送・member）/ payment（入金・owner）を別 repository に分離（PM-026/027）。

### コマンド / テスト
- typecheck OK / lint OK（warning 0）/ db:validate **9 files**。各 unit/contract test 緑（終了前に full gate 実施）。

### commit hashes
- `68ef272` 配送永続化(0008) / `7718f0d` 入金永続化(0009) / `2c1cdf2` 仕入記録+原価配賦永続化

---

## 2026-06-18 (10) — Claude Code — Phase 2B データ層・状態機械・利益・会計IF

### 目的
Phase 2B を実装順（interface→mock→supabase→service→状態機械→contract test）に沿って、
安全にテストできる範囲で連続実装。管理UI（step 7）の前段となるデータ層・純ロジックを確立。

### 実施内容
1. **仕入先データ層**（`033bf02`）: `ProcurementRepository` 契約 + mock（reset/seed）+ supabase（RLS owner）+ `procurementService`（書込/内部閲覧は `purchase:manage`=owner 限定、front_staff 遮断）。
   - migration **0007**: suppliers に contact/default_currency/country_code/brand_id 追加（追加 migration、RLS は既存 suppliers_owner）。
   - `listPublicSuppliers` は public_level='public' のみ・note/contact を落とした公開投影（非公開を漏らさない）。
   - factory `getProcurementRepository/Service`（既定 mock）。contract runner（mock + skip supabase）+ service RBAC テスト。
2. **入金/配送 状態機械**（`7ac6446`）: `paymentStatus.ts`（DB enum 準拠。not_requested/requested ≈ unbilled/billed）、`shipmentStatus.ts`（preparing→shipped→delivered/returned/reshipped/cancelled）+ `freightDifference`/`kamisumiBorneFreight`（subtractMoney で通貨不一致拒否）。不正遷移拒否テスト 24。
3. **利益計算**（`2356696`）: `profit.ts`（粗利/貢献利益、利益率は整数 bp で決定的丸め、aggregate/groupProfit で商品・ブランド・買付・月次グルーピング）。通貨不一致は add/subtract が拒否。8 テスト。
4. **会計 export interface**（`2356696`）: `accountingExport.ts`（管理会計→外部会計ソフトの入口 interface + 冪等 mock adapter。二重実行は "duplicate"。法定会計/税務帳簿/実キーは持たない）。5 テスト。

### 重要な前提・残課題
- 状態機械・利益・会計 IF は純ロジック。**入金/配送/利益の永続 repository と管理UI（全ドメイン）は未着手**（次の作業単位）。
- `shipments` に status 列がない（**I-016**）。永続化時に追加 migration（0008 以降）が必要。
- 仕入先以外（買付/仕入記録/原価配賦/陶器個体/経費）の repository も未着手。

### コマンド / テスト
- typecheck OK / lint OK（warning 0）/ **test 146 passed・1 skipped** / db:validate **7 files** / build clean。

### commit hashes
- `033bf02` supplier data layer + 0007 / `7ac6446` payment+shipment status machines / `2356696` profit + accounting export interface

---

## 2026-06-18 (9) — Claude Code — Phase 2A 残補修(0006) + Phase 2B 純ロジック着手

### 目的
Phase 2A の `setOrderNotes` を実 DB で恒久化（migration 0006）。続けて Phase 2B のうち
DB/UI 非依存で安全・完全にテストできる純ロジック（原価配賦・抹茶ロット）を実装。単一エージェント継続。

### 実施内容
1. **migration 0006_order_notes.sql**: `provisional_orders` に `customer_note` / `internal_note` / `notes_updated_by` / `notes_updated_at` を追加（追加 migration、0001-0005 不変）。RLS は既存 `is_org_member` が新列に適用。
   - Supabase write repo `setOrderNotes` を監査のみ→列 UPDATE + 読み戻しに変更。`mapOrder` が note 列を反映。
   - mock は既に in-memory 保持済み → 両 repo が同一契約。`writeContractRunner` に setOrderNotes 永続テスト（部分更新の据え置き含む）追加。
2. **Phase 2B-D 原価配賦** `src/lib/commerce/costAllocation.ts`: quantity / purchase_value / weight / volume / manual / none。`money.allocateByRatio` 上に構築し、合計一致・端数保存・整数最小単位・通貨保持・manual の合計/通貨検証。DB の `amount` ↔ ドメインの `purchase_value` を `to/fromDbMethod` で橋渡し。15 テスト。
3. **Phase 2B-E 抹茶ロット** `src/lib/commerce/matchaLot.ts`: `availableCount` / `sortFifo`（fifoSeq→仕入日→賞味期限）/ `allocateFifo`（不足量報告）/ `bestBeforeAlert`（expired/90/60/30/14、しきい値設定可）。12 テスト。

### 重要な前提・残課題
- `matcha_lots` に明示的な on-hand 数量列がない（reserved_count/incoming_count はあり）。純ロジックは数量をドメイン入力で受ける設計。永続供給（inventory_items 連携 or 列追加）は今後（**I-015**）。
- Phase 2B の repository / 管理UI / 入金・配送・利益分析 / 会計 export interface は未着手（純ロジックを先行し安全に積み上げる方針）。

### コマンド / テスト
- typecheck OK / lint OK（warning 0）/ **test 112 passed・1 skipped** / db:validate **6 files** OK / build clean。

### commit hashes
- `d6fa407` feat(phase2a): persist order notes (migration 0006)
- `26f1c71` feat(phase2b): cost allocation module
- `99a1767` feat(phase2b): matcha lot FIFO + best-before alert logic

---

## 2026-06-18 (8) — Claude Code — 並行作業の収束 + Step C 認証切替 + 統合コミット

### 背景
セッション中に**別エージェントが同じ作業ツリーで Phase 2A を並行実装**していることを検知（SSR/Step B repository/docs）。ユーザー指示で全書込を停止し、状況診断 → 単一エージェント方針へ収束。

### 診断（読取のみ）
- 実行中の node/npm/next プロセス: なし。:3000 リッスンなし。直近5分のファイル変更なし（並行ライター停止確認）。
- `.git/index.lock` なし。**OneDrive 競合コピーなし**。**migration 重複なし**（0001-0005）。`git log` 線形・損失なし。
- 並行ライター（Step B: supabase read/write repo, errors.ts, contract 基盤）と私（Step C: 認証）は**ファイル完全分離・衝突なし** → 双方採用。

### 実施内容
1. **Step C: 管理画面認証の mock/Supabase 切替**（`src/lib/admin/auth.ts`）
   - `getAdminAuthMode()`（`ADMIN_AUTH_MODE`、未指定は `DATA_BACKEND` 追従）で mock/supabase を選択。
   - supabase path: `getSupabaseServerAuthClient()` の Cookie セッション → `user_roles`/`profiles` を self-read RLS（0004）で取得。`pickPrimaryRole`（owner 優先）。
   - `getAdminSession()` を async 化し全呼出（admin ページ/layout/actions の ~17 箇所、`actorFromSession`）を await 化。呼出側契約は不変。
   - `tests/adminAuth.test.ts` 拡張（モード解決・ロール優先・mock 動作 = 12 ケース）。`.env.example` に `ADMIN_AUTH_MODE` 追記。
2. **テスト環境修正**: Step B が `server.ts` の `import "server-only"` を間接導入し vitest が解決不可で 2 スイート失敗 → `vitest.config.ts` で `server-only` を no-op スタブ（`tests/stubs/server-only.ts`）に alias。標準対応で本番のサーバー境界意味は不変。
3. **統合コミット**（単一作業者として両系統を採用）。

### 最終ゲート（全て確認済み・緑）
- typecheck OK / lint OK（warning 0）/ **test 84 passed・1 skipped**（supabase 契約は実 DB 必須で skip）/ build clean / db:validate(5) OK。
- 公開 URL・slug 不変（build ルート一覧で確認）。

### commit hashes
- `d468bce` feat(admin): switchable mock/Supabase admin auth (step C)
- `15b01bd` feat(supabase): read/write commerce repositories (step B) + server-only test stub
- （本エントリ含む docs 更新は末尾でコミット）

### KNOWN_ISSUES
- **I-014（並行 worktree）→ Resolved**: 並行ライター停止・単一エージェント方針確立。以後このセッションのみで作業。

---

## 2026-06-18 (7) — Claude Code — Supabase SSR + 実 repository 実装

### 目的
Supabase 接続前にできる実装を完成させる: SSR 認証構成、接続手順書、Supabase read/write repository の実クエリ、エラー変換。実 DB が要る検証は skip 理由と手順を残す。

### 実施内容
1. **@supabase/ssr 0.12.0 導入（SSR 監査）**
   - `client.ts`: `createBrowserClient`（anon, Cookie 共有）へ変更。
   - `server.ts`: `getSupabaseAdminClient()`（service role / RLS バイパス, write 用。旧 `getSupabaseServerClient` は alias 維持）+ `getSupabaseServerAuthClient()`（anon + Cookie, ログインユーザー評価）。
   - `middleware.ts`: `updateSupabaseSession()`（公式トークン更新パターン）。
   - `proxy.ts`: `isSupabaseConfigured()` のときだけ session 更新を呼ぶ（mock mode 完全不変）。
   - すべて関数内で遅延生成（module load で生成しない＝env 未設定でも起動可）。
2. **接続手順書 `docs/SUPABASE_SETUP.md`**: 環境変数一覧 / project 作成 / migration 0001-0005 適用 / seed / 初期 owner / user_roles / Storage bucket / RLS 検証 / contract test 実行 / Phase 2A 完了チェックリスト。`.env.example` に `ADMIN_ENABLED` / `ADMIN_DEV_ROLE` 追記。
3. **エラー変換 `src/lib/supabase/errors.ts`**: Postgres errcode/message → `CommerceError`（P0002→not_found, P0001→message で negative_stock/insufficient_stock/conflict 等, 23505→conflict, 23503/23514/23502/22P02→validation, 未知→null で再throw）。単体テスト `tests/supabaseErrors.test.ts`（DB 不要）。
4. **Supabase write repository 実装** `supabaseCommerceWriteRepository.ts`: 商品/在庫/注文/買付/Journal/監査の全メソッドを 0001-0005 スキーマで実装。在庫は `apply_inventory_movement` RPC（原子・冪等・非負を DB が保証）。複数テーブル更新（注文作成+明細+イベント+監査 等）を順次実行し errcode を変換。
5. **Supabase read repository 実装** `supabaseCommerceRepository.ts`: products/journal/sourcing/faq を PostgREST 埋め込み select で取得し公開型へマッピング（翻訳→LocalizedString, 画像+alt, matcha/ceramic jsonb, 参考価格, 関連）。公開可否はクエリ条件（published / deleted_at is null）。
6. **Supabase 契約テスト（skip）** `tests/writeContract.supabase.test.ts`: 共通ランナー `tests/writeContractRunner.ts` を流用。実 DB 必須のため `RUN_SUPABASE_CONTRACT=1` + env が無ければ `describe.skip`。実行手順をファイル内＋SETUP §9-2 に記録。

### 重要な前提・既知の制約
- **mock/Supabase 切替不変**: factory は既定 mock。`DATA_BACKEND=supabase`+env のときのみ Supabase 実装。
- **read repo は実 DB + 完全 seed が無いと検証不能**: seed は代表商品のみ。public 全ルートの一致確認は接続後。
- **contract test の productId "p1" は Supabase で FK 違反**: 実 DB 実行時は seed 済み実 UUID を使う setup へ拡張が必要（ファイル内 TODO）。
- **provisional_orders に note 列なし**: setOrderNotes は監査記録 + 返り値反映のみ（customer_notes での恒久対応は別 migration）。

### ⚠️ 並行作業の検知（要人間対応）
- 本セッション中、別 worktree が同じ `main` に OneDrive 同期経由でコミット（`9c17760` 等）。私の作業内容は保持され履歴は線形だが、同一ブランチ並行コミットはコミット損失リスク。**並行タスクの停止を推奨**。

### コマンド / テスト
- typecheck OK。lint / test / build / db:validate は分類器の一時停止で再実行待ち（復旧後に確定。変更は型安全・追加中心）。
- 新規単体テスト: `tests/supabaseErrors.test.ts`（DB 不要、常時実行）。

### commit hash
- `d4ff67f` I-009 route group / `9c17760` SSR clients（worktree メッセージ）/ 本実装は末尾でまとめてコミット予定。

---

## 2026-06-18 (6) — Claude Code — admin 専用クローム分離（I-009 解決）

### 目的
管理画面が公開レイアウト（Header/Footer）内にネストしていた問題（I-009）を route group で解消。公開 URL・slug・主要導線は不変。

### 実施内容
1. **route group 導入**: `src/app/[locale]/` 配下に `(public)/` と `(admin)/` を作成（route group は URL に影響しない）。
2. **公開ページ移動**: 全公開ルート（page / about / contact / faq / journal / legal / new-arrivals / order / privacy / products / shipping / shop / sourcing）と `error.tsx` / `loading.tsx` / `not-found.tsx` を `(public)/` へ `git mv`。
3. **公開シェル移設**: 新規 `(public)/layout.tsx` が `site-shell` + skip-link + `Header` / `<main id="main-content">` / `Footer` を担当。
4. **ルートレイアウト最小化**: `[locale]/layout.tsx` は `<html lang>`/`<body>` と `generateStaticParams` / globals.css のみに縮小（Header/Footer を保持しない）。
5. **admin 移動 + 専用クローム**: `admin/` を `(admin)/admin/` へ `git mv`。`(admin)/admin/layout.tsx` は公開 Header/Footer を持たず、自前の `<main className="page-main" id="main-content">` でラップ。
6. **import 修正**: `src/components/admin/*` の `@/app/[locale]/admin/actions` を `@/app/[locale]/(admin)/admin/actions` に更新（route group はパスの一部）。

### 検証ポイント
- 公開ページ: 引き続き Header/Footer 表示。slug ページの `notFound()`（products/[slug], journal/[slug]）は `(public)/not-found.tsx` が公開シェル内で描画。
- 管理画面: 公開 Header/Footer なし。`ADMIN_ENABLED` 既定 OFF で proxy 真404は不変。
- build 出力でルート一覧が Phase 1 と一致（`/[locale]/admin/*` 含め URL 不変、route group はパスから除去）。

### コマンド / テスト
- typecheck OK / lint OK（warning 0）/ test **72 passed** / build clean（`.next` 削除→再ビルドで stale type 解消）。

### KNOWN_ISSUES
- I-009 → **Resolved**

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

## 2026-06-19 (5) — Claude Code — Supabase 実クエリ完成（#2）

### 目的
スケルトンだった Phase 2B 系 Supabase repo を実クエリ実装し、mock と同契約を満たす（実 DB 検証は I-002 で残）。

### 実施・commit
- `0cf02d0` expense/media/ceramic/matcha の Supabase 実装（getSupabaseAdminClient + throwCommerce、列マッピング、論理削除。matcha は products 結合で org 取得、adjustQuantity は read-modify-write+非負ガード）
- `ca37dac` settings の Supabase 実装 + migration 0015（setting_history。site_settings=現在値, owner RLS）

これで settings/matcha/ceramic/expense/media の Supabase 実クエリが全て実装済み。

### テスト
typecheck/lint/test(211,3skip)/db:validate(15)/build/verify:quick（mock 経路）成功。実 DB 検証は未（I-002, I-020）。

### 設計判断
PM-028（matcha_lots は org 列が無いため products 埋め込み結合で organizationId を取得。RLS も products.org 経由）/ PM-029（settings 値は site_settings.value(jsonb) に文字列保持。履歴は setting_history(0015)）。

### 今回の優先リスト（#1-#7）すべて完了
画像管理基盤 / Supabase実クエリ / Media UI / Cart / Checkout / 通知 / SNS下書き+承認。

---

## 2026-06-19 (4) — Claude Code — メディア基盤 + Phase 3 interface（cart/checkout/通知/SNS）

### 目的
画像管理基盤（§9）と Phase 3 の安全な interface・mock・adapter（cart/checkout/通知/SNS下書き）を縦スライスで追加。

### 実施・commit
- `140b6f1` メディア管理基盤 `/admin/media`（migration 0014, MIME/サイズ/寸法検証, パス正規化(トラバーサル防止), private は owner 限定）
- `7b32d78` Phase 3: Cart interface + mock cart / Checkout adapter + 手動振込 mock（pending_payment・冪等・実口座なし, stripe/paypal/tw_provider は sandbox スケルトン）
- `be0c9d1` Phase 3: 通知 interface + mock（宛先マスク・本番送信なし）/ SNS下書き(Threads/Instagram)+人間承認フロー `/admin/sns-drafts`（**承認しても自動公開しない**）

### テスト
test 211 passed(3 skip)、db:validate(14)、build、verify:quick 全✅（管理画面 全14・新画面を smoke に追加）。

### 設計判断
PM-025（Phase 3 は interface+mock+adapter のみ。本番決済/送信/自動投稿はしない。stripe等は sandbox スケルトン）/ PM-026（メディア: private bucket=内部資料は secrets:view=owner 限定。MIME/サイズ/寸法検証・パス正規化でトラバーサル防止）/ PM-027（SNS下書きは承認状態のみ持ち、自動公開経路を作らない。生成は提供フィールドのみで誇大表現を加えない）。

### 残（次優先）
#2 Supabase 実クエリ完成（settings/matcha/ceramic/expense/media）+ 実DB検証。cart/checkout/notification の管理UI（任意）。

---

## 2026-06-19 (3) — Claude Code — Phase 2B 縦スライス連続（抹茶/陶器/経費/利益/ダッシュボード）

### 目的
HANDOFF の次優先を縦スライス（migration→core→repo→mock→supabase→service→test→action→UI→dict→nav→smoke）で連続実装。

### 実施・commit
- `8a43eef` 仕入・買付UI `/admin/purchases`（原価配賦）
- `f43b85d` 抹茶ロット永続化＋UI `/admin/matcha-lots`（migration 0010, FIFO/賞味期限アラート, I-015 解決）
- `859ff90` 陶器個体永続化＋UI `/admin/ceramic-units`（migration 0011, **原価は cost:view=owner のみ表示**）
- `8b2d834` 経費永続化＋UI `/admin/expenses`（migration 0012, owner 限定 RLS）
- `b279c28` 利益分析（読取）`/admin/profit`（profitAnalysis.ts, profit:view=owner）
- `0ca7ca5` 経営ダッシュボード（/admin をロール別指標へ拡張）
- `fb1e6b5` 会計エクスポート `/admin/accounting`（migration 0013, 冪等 exporter, owner 限定。税務/帳簿は自作しない境界を明記）

### 各スライス共通
core型+repository interface+mock(reset/seed)+supabase スケルトン+service(RBAC)+contract/service test+server action(AdminActionForm)+ja/zh-tw 辞書+adminNav+layout ルート+smoke+dev-check。

### テスト
test 192 passed(3 skip)、db:validate(13)、build、verify:quick 全✅（新画面を smoke に追加）。

### 設計判断
PM-022（陶器個体: cost は cost:view 保持者にのみ service が返す=front_staff/inventory に原価非表示）/ PM-023（経費・利益は owner 限定の機微情報）/ PM-024（利益分析は記録済みデータからの概算。為替差損益・注文単位原価対応は未連携、UIに明記）。新規 Supabase repo は全てスケルトン（実装待ち）で mock 既定。

### 残（次優先）
画像管理基盤 / Phase 3 interface・mock・adapter。Supabase 各 repo の実クエリ実装と実DB検証。

---

## 2026-06-19 (2) — Claude Code — Phase 2B 管理UI（設定・仕入先・入金・配送）

### 目的
人間が管理画面から操作できる縦スライス（業務設定・仕入先・入金・配送）を完成させる。

### 実施内容
- 共有: `components/admin/AdminActionForm.tsx`（汎用 client form: useActionState + 確認 + i18n 通知）。
- 業務設定（§8）: `settingsModels`(編集可ホワイトリスト+型別検証)/`settingsRepository`/`mock`+`supabase(skeleton)`/`settingsService`(owner) + `/admin/settings`（グループ別編集・変更履歴・未確定バッジ）+ `settingsService.test.ts`。
- 仕入先: `/admin/suppliers`（作成/公開レベル変更/論理削除/復元、`getProcurementService`）。
- 入金: `/admin/payments`（作成/状態遷移/入金記録、`getPaymentService`、主要→最小単位変換、実口座非保存）。
- 配送: `/admin/shipping`（作成/状態遷移、`getFulfillmentService`、送料表示）。
- adminNav に payments/shipments キー（権限 purchase:manage / order:update_status）、layout 実装ルートに4画面、辞書 ja/zh-tw に4セクション。
- `ADMIN_DEV_LOCALE`（mock 管理 UI 言語切替 ja/zh-tw、dev専用）を auth.ts 追加、`.env.example` 記載。
- `scripts/smoke.mjs` / `devDiagnostics` に新4画面を反映。

### テスト / 確認
- typecheck / lint / test 172(3 skip) / db:validate(9) / build / verify:quick 全✅（新4画面含む）。
- ブラウザ（mock）: owner で4画面 ja/zh-tw 表示・管理クローム（公開Header/Footer無）・front_staff/inventory 権限制限・zh-tw 描画・機微情報非漏洩を確認。

### 設計判断
PM-018（AdminActionForm 汎用化）/ PM-019（設定はホワイトリスト方式で危険キーを構造的に排除）/ PM-020（金額は UI 主要単位入力→service へ渡す前に最小単位整数へ変換）/ PM-021（ADMIN_DEV_LOCALE で mock 管理 UI 言語切替）。

### 残課題（次の優先）
仕入・買付管理UI / 抹茶ロットUI / 陶器個体 repo+UI / 経費 repo+UI / 利益分析 / 経営ダッシュボード / 会計export UI / 画像管理基盤。設定の公開サイト反映・Supabase 設定 repo 実装。

### commit
- `bff4eae` feat(admin): Phase 2B management UIs — settings, suppliers, payments, shipping
- `8a43eef` feat(admin): purchase/sourcing-record management UI（/admin/purchases: 作成・原価配賦・削除/復元。suppliers⇄purchases相互リンク。verify:quick に反映）

---

## 2026-06-19 — Claude Code — 人間向け運用基盤（起動・確認・dev-check）

### 目的
非技術者が PowerShell を使わず、起動・動作確認・mock 初期化を行えるようにする（今回最重要方針 §2-§5, §10-§11, §14）。

### 実施内容
- **ワンクリック起動**: `START_KAMISUMI_{MOCK,OWNER,FRONT_STAFF,INVENTORY,PUBLIC_ONLY}.cmd` / `STOP` / `CHECK` / `RESET_MOCK_DATA` + 共通 `_kamisumi_launch.cmd`。Node 未導入・install 要否を日本語案内、二重起動回避、準備完了後ブラウザ自動起動、PID を `.dev-server.pid`(git 管理外) に保存、エラー時ウィンドウ非クローズ。
- **npm scripts**: `dev:{mock,owner,front,inventory,public}`（cross-env）/ `verify:{public,admin,mock,quick,full}` / `mock:reset` / `stop`。
- **scripts**: `_devutil.mjs`（起動/待機/停止/ポート/色）, `launch.mjs`, `stop.mjs`（PID 限定停止）, `smoke.mjs`（別ポート3100で実起動→主要ルート確認→日本語✅/❌）, `mock-reset.mjs`。
- **dev-check ページ** `/[locale]/admin/dev-check`: 環境・認証・ロール・Supabase接続・env有無・mock件数・migration一覧・実装/未実装・ワンクリック確認リンク・mock リセット。本番 notFound。
- **開発モードバー** DevModeBar（MOCK MODE/backend/auth/role/locale/「再起動で消える」warning、本番非表示）。
- **mock リセット API** `/api/dev/reset`（本番/Supabase/ADMIN無効=404）。
- **安全ガード** `src/config/devtools.ts`（`isDevToolsEnabled`）+ 単体テスト（本番無効・supabase無効）。
- **人間向けガイド** `docs/LOCAL_VERIFICATION_GUIDE.md`。
- cross-env 導入（PM-014）。

### コマンド / テスト
- `npm run verify:quick` 全✅（公開/owner全管理ルート/inventory_staff制限）
- reset API / `npm run mock:reset` 動作（リセット後 商品7・監査0）
- dev-check 200・dev bar 表示・本番ガード単体テスト
- typecheck/lint/test(166, 3 skipped)/db:validate(9) 成功

### 設計判断
PM-014（cross-env）/ PM-015（dev tools 一元ガード）/ PM-016（役割別ランチャーで §6 代替）/ PM-017（PID 限定停止）。

### 残課題
- 編集可能な業務設定（§8）UI、画像管理 UI（§9）、Phase 2B 管理 UI（仕入先→入金→配送→…→ダッシュボード）。
- 在ブラウザのロール切替（cookie ベース）は任意。実 Supabase 接続検証（I-002, I-012）。

### commit
- `0ad382c` ランチャー/verify/reset / `78673e7` dev-check/dev bar /（本コミットで docs + guide）

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
