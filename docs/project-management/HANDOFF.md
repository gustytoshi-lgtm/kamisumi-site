# HANDOFF

最終更新: 2026-06-19 (handoff prep) / 更新者: Codex

## 目的

次の Claude Code セッションへ安全に引き継ぐための現状整理。実装は行わず、確認済みの Git 状態、実装状況、検証結果、未完了タスクを記録する。

## 正式パス

`C:\dev\sites\kamisumi-site`

- OneDrive 旧フォルダ `C:\Users\tkats\OneDrive\01_HTML_CSS\kamisumi-site` は重複コピー。参照・編集しない。
- コマンド実行時は毎回正式パスへ移動する。
- GitHub remote: `origin https://github.com/gustytoshi-lgtm/kamisumi-site.git`

## Git 状態

- 現在のブランチ: `main`
- 最新コミット: `f3c4571 docs(pm): finalize HANDOFF for Codex (session 17 state)`
- tag: なし
- 作業ツリー: 未コミット変更あり

### `git status --short` 要約

- 変更あり:
  - `.env.example`
  - `docs/LOCAL_VERIFICATION_GUIDE.md`
  - `docs/SUPABASE_SETUP.md`
  - `docs/project-management/CURRENT_STATE.md`
  - `docs/project-management/DECISIONS.md`
  - `docs/project-management/HANDOFF.md`
  - `docs/project-management/KNOWN_ISSUES.md`
  - `docs/project-management/ROADMAP.md`
  - `docs/project-management/WORK_LOG.md`
  - `next-env.d.ts`
  - `scripts/_devutil.mjs`
  - `scripts/smoke.mjs`
  - `src/repositories/index.ts`
- 未追跡:
  - `src/lib/customer/`
  - `src/repositories/core/customerModels.ts`
  - `src/repositories/core/customerRepository.ts`
  - `src/repositories/mock/mockCustomerPortalRepository.ts`
  - `src/repositories/supabase/supabaseCustomerPortalRepository.ts`
  - `supabase/migrations/0016_customer_accounts.sql`
  - `tests/*Contract*.test.ts`
  - `tests/*ContractRunner.ts`
  - `tests/customerAuth.test.ts`
  - `tests/customerPortalService.test.ts`
  - `tests/repositoryContractFixtures.ts`

### `git log --oneline -20`

```text
f3c4571 docs(pm): finalize HANDOFF for Codex (session 17 state)
71b8179 docs(pm): record notification viewer + audit log viewer (session 17)
d1022bf feat(admin): audit log viewer (/admin/audit-logs, owner)
62dbb58 feat(dev): mock notification viewer (/admin/notifications) + dev bar link
81f362e docs(pm): record GitHub remote + notification wiring (session 17)
cc073b6 feat(phase3): wire notifications into order/payment/shipment services
2ea4d15 docs(pm): relocate canonical path to C:\dev\sites\kamisumi-site (out of OneDrive)
14bb392 docs(pm): record Supabase real-query completion (session 16)
ca37dac feat(supabase): settings repository (real queries) + setting_history (0015)
0cf02d0 feat(supabase): real queries for expense/media/ceramic/matcha repositories
2402c8e docs(pm): record media foundation + Phase 3 interfaces (session 15)
be0c9d1 feat(phase3): notification interface + mock, SNS draft + human approval flow
7b32d78 feat(phase3): cart interface + mock cart, checkout adapter + manual-transfer mock
140b6f1 feat(admin): media management foundation (mock) + UI
8d19f16 docs(pm): record accounting export slice + session 14 final state
fb1e6b5 feat(admin): accounting export persistence + UI (idempotent)
10fdc4a docs(pm): record session 14 slices (matcha/ceramic/expense/profit/dashboard)
0ca7ca5 feat(admin): management dashboard with role-aware metrics
b279c28 feat(admin): profit analysis (read-only) from recorded data
8b2d834 feat(admin): expense persistence + management UI
```

### Git 注意

- `git add` は現環境で失敗確認済み: `.git/index.lock: Permission denied`。
- `.git` に明示的な DENY ACL があり、コミット/ push には権限復旧が必要。
- 秘密情報点検では、追跡対象の env/鍵/credential は `.env.example` のみ確認済み。

## 実装済み内容

- Phase 1 公開サイト: zh-tw / ja の全15ルート、SEO/JSON-LD/sitemap/robots、OG PNG、favicon、soft-404 対応。
- Phase 2A: 管理基盤、ドメインロジック、RLS/migration、管理 UI、書込 service、mock/Supabase 認証切替、Supabase read/write repository 実クエリ、注文メモ永続化。
- Phase 2B: 仕入先、仕入記録、原価配賦、配送、入金、抹茶ロット、陶器個体、経費、利益分析、会計 export、ダッシュボード、操作履歴ビューア、全ドメイン管理 UI。
- Phase 3 interface: cart/checkout 手動振込 mock、通知 mock + 業務サービス配線、SNS 下書き + 人間承認。
- 顧客マイページ基盤: migration 0016、`customer_accounts`、本人 RLS、customer portal repository mock/Supabase、customer auth adapter、customer portal service、contract test 入口。
- Supabase contract test 基盤: matcha / ceramic / expense / media / settings / customer portal の mock test と `*.supabase.test.ts`（既定 skip）。
- smoke script: Windows での dev server 連続起動を安定化するため、public / owner / inventory を独立プロセスで確認する構成へ変更済み。

## テスト状況

最新確認（2026-06-19）:

- `npm.cmd run verify:full`: 成功
  - typecheck OK
  - lint OK
  - test **237 passed / 9 skipped**
  - `db:validate` **16 files OK**
  - build OK
- `npm.cmd run verify:quick`: 成功
  - public smoke OK
  - owner 全16管理画面 OK
  - inventory 権限制限 OK
- 追加確認:
  - `npm.cmd run test -- customerPortalService customerAuth`: 8 passed
  - `npm.cmd run test -- customerPortal`: 6 passed / 1 skipped
  - `npm.cmd run db:validate`: 16 files OK
  - `npm.cmd run typecheck`: OK

## 既知の未実装 / 未検証

- 実 Supabase project への migration 0001-0016 適用と seed。
- `RUN_SUPABASE_CONTRACT=1` での実 DB contract test。
- Supabase RLS / read 一致 / Storage 実ファイル連携。
- 顧客マイページ公開 UI。
- 複数通貨 / 国別配送 UI。
- cart/checkout 公開 UI。
- `matcha adjustQuantity` の DB function 原子化。
- 操作履歴の全ドメイン集約・検索/絞り込み。
- Playwright E2E の `C:\dev` 移設後再評価。
- `.git` ACL による stage/commit/push ブロック。

## 次に着手すべき候補タスク（優先順位）

1. `.git` ACL 復旧後、未コミット変更を確認して機能単位で commit/push。
2. 実 Supabase 接続検証: migration 0001-0016 適用、seed、RLS、`*.supabase.test.ts` 実行。
3. 顧客マイページ公開 UI: `/[locale]/account`、ログイン状態表示、プロフィール/住所編集。
4. cart/checkout 公開 UI: 本番決済なし、手動振込 mock / sandbox 境界を維持。
5. 複数通貨 / 国別配送 UI: 既存の整数金額・currency 方針を維持。
6. 操作履歴検索/絞り込み: owner 限定のまま全ドメイン監査ログを横断表示。
7. `matcha adjustQuantity` DB function 原子化。

## 注意事項

- 公開サイトの URL・slug・主要導線・Phase 1 デザインを壊さない。
- 適用済み migration は書き換えず、新番号で追加する。
- 金額は整数 `*_minor` + `currency`。浮動小数点で金額計算しない。
- `front_staff` に原価/利益/口座/権限管理/全顧客 CSV/秘密設定を見せない。
- 本番決済、本番メール送信、SNS 自動投稿はしない。
- 実銀行口座番号、実 API キー、顧客個人情報を保存/ログ/commit しない。
- dev 専用機能は production で無効。production で mock fallback しない。
- Supabase は env + `DATA_BACKEND=supabase` の時のみ。既定は mock。

## 再開用コマンド

```bash
cd "C:/dev/sites/kamisumi-site"
git status --short
git log --oneline -20
npm run verify:full
npm run verify:quick
```

## Claude Code 推奨プロンプト

```text
KAMISUMI / KAGURAKOJI Commerce Core を C:\dev\sites\kamisumi-site で継続してください。
最初に docs/project-management/CURRENT_STATE.md / HANDOFF.md / ROADMAP.md / WORK_LOG.md / KNOWN_ISSUES.md を読み、git status と git log --oneline -20 を確認してください。

現状: Phase 1 公開サイト、Phase 2A 管理基盤、Phase 2B 仕入・原価・在庫・採算、Phase 3 interface、顧客マイページ基盤まで実装済み。Supabase repo 実クエリと contract test 入口はあるが、実 DB 接続検証は未実施です。最新検証は verify:full 成功（test 237 passed / 9 skipped、db:validate 16 files）と verify:quick 成功です。

注意: 現在 .git ACL のため git add が index.lock permission denied で失敗します。まず権限を復旧し、未コミット変更を確認してから機能単位で commit/push してください。OneDrive 旧フォルダは参照・編集禁止です。

優先タスクは、(1) Git stage/commit 可能化と未コミット変更の整理、(2) 実 Supabase 接続検証、(3) 顧客マイページ公開 UI、(4) cart/checkout 公開 UI、(5) 複数通貨/国別配送 UI です。

ルール: 公開サイトを壊さない、適用済み migration は書き換えない、金額は整数 *_minor + currency、front_staff に原価/利益/口座/権限/全顧客 CSV を見せない、本番決済/送信/SNS 自動投稿をしない、秘密情報を commit/push しない。
```
