# HANDOFF

最終更新: 2026-06-19 (session 22) / 更新者: Codex

## 目的

次のセッションへ安全に引き継ぐための現状整理。正式パス、Git状態、実装済み範囲、検証結果、次タスクを記録する。

## 正式パス

`C:\dev\sites\kamisumi-site`

- OneDrive 旧フォルダ `C:\Users\tkats\OneDrive\01_HTML_CSS\kamisumi-site` は重複コピー。参照・編集しない。
- コマンド実行時は毎回正式パスへ移動する。
- GitHub remote: `origin https://github.com/gustytoshi-lgtm/kamisumi-site.git`

## Git 状態

- 現在のブランチ: `main`
- 最新コミット: 作業開始時 `389a8e1 docs(pm): update latest-commit pointer (session 21)`。session 22 の commit は `git log -1` を参照。
- tag: なし
- 作業ツリー: session 22 作業中

### `git status --short` 要約

- session 21 開始時は clean。
- session 22 では商品ページカート追加導線、cart action 防御、tests、smoke、docs を変更。

### `git log --oneline -20`

```text
389a8e1 docs(pm): update latest-commit pointer (session 21)
f4b9e34 feat(cart): multi-currency + country shipping reference UI
d775e57 feat(cart): cart/checkout public UI (/[locale]/cart)
c9c130f docs(pm): record customer my-page public UI (session 19, I-021 resolved)
774a34d feat(account): customer my-page public UI (/[locale]/account)
```

### Git 注意

- I-022 は `maomao-desk\tkats` では解決済みと引き継ぎあり。ただし現 Codex 実行ユーザー `maomao-desk\codexsandboxonline` では `git add` が `.git/index.lock: Permission denied` で失敗する。
- `git pull --ff-only origin main` も `.git/FETCH_HEAD` permission denied で失敗する場合がある。作業開始時点で `HEAD` とローカル `origin/main` は `389a8e1` で一致確認済み。
- session 22 の commit/push は未実施。人間側または権限復旧後に `git add` / `commit` / `push` を行う。
- push 前は秘密情報点検を行う。

## 実装済み内容

- Phase 1 公開サイト: zh-tw / ja の全15ルート、SEO/JSON-LD/sitemap/robots、OG PNG、favicon、soft-404 対応。
- Phase 2A: 管理基盤、ドメインロジック、RLS/migration、管理 UI、書込 service、mock/Supabase 認証切替、Supabase read/write repository 実クエリ、注文メモ永続化。
- Phase 2B: 仕入先、仕入記録、原価配賦、配送、入金、抹茶ロット、陶器個体、経費、利益分析、会計 export、ダッシュボード、操作履歴ビューア、全ドメイン管理 UI。
- Phase 3 interface: cart/checkout 手動振込 mock、通知 mock + 業務サービス配線、SNS 下書き + 人間承認。
- 顧客マイページ基盤: migration 0016、`customer_accounts`、本人 RLS、customer portal repository mock/Supabase、customer auth adapter、customer portal service、contract test 入口。
- 顧客マイページ公開 UI: `/[locale]/account`、`CUSTOMER_PORTAL_ENABLED` 既定OFF。
- cart/checkout 公開 UI: `/[locale]/cart`、`CART_ENABLED` 既定OFF、手動振込 mock、複数通貨/国別配送の参考 UI。
- 商品ページからのカート追加導線: SSG商品ページ + runtime flag gate。価格はserver actionが商品マスタから再取得。
- Supabase contract test 基盤: matcha / ceramic / expense / media / settings / customer portal の mock test と `*.supabase.test.ts`（既定 skip）。

## テスト状況

最新確認（2026-06-19）:

- `npm.cmd run verify:full`: session 22 成功
  - typecheck OK
  - lint OK
  - test **250 passed / 9 skipped**
  - `db:validate` **16 files OK**
  - build OK
- `npm.cmd run verify:quick`: session 22 成功
  - public smoke OK
  - `CART_ENABLED` 既定OFFで `/ja/cart` 404
  - owner 全16管理画面 OK
  - inventory 権限制限 OK
- 追加確認:
  - session 22: `npm.cmd run test -- cartCheckout cartActions`: 12 passed
  - session 22: `npm.cmd run typecheck`: OK
  - session 22: `npm.cmd run lint`: OK
  - session 22: `npm.cmd run build`: OK
  - session 22: 手動 smoke（`CART_ENABLED=true`, 既存 Chrome + Playwright）で商品ページから `/ja/cart` への追加遷移を確認

## 既知の未実装 / 未検証

- 実 Supabase project への migration 0001-0016 適用と seed。
- `RUN_SUPABASE_CONTRACT=1` での実 DB contract test。
- Supabase RLS / read 一致 / Storage 実ファイル連携。
- 実決済 provider / 実注文送信 / 実送料計算 / 実FX取得。
- `matcha adjustQuantity` の DB function 原子化。
- 操作履歴の全ドメイン集約・検索/絞り込み。
- Playwright E2E の `C:\dev` 移設後再評価。

## 次に着手すべき候補タスク（優先順位）

1. 実 Supabase 接続検証: migration 0001-0016 適用、seed、RLS、`*.supabase.test.ts` 実行（資格情報待ち）。
2. 操作履歴検索/絞り込み: owner 限定のまま全ドメイン監査ログを横断表示。
3. `matcha adjustQuantity` DB function 原子化。
4. Supabase Storage とメディア実ファイル連携。
5. 本番契約後の決済/通知 adapter 差し替え（契約前は実装しない）。

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
