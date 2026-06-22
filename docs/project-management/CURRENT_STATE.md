# CURRENT_STATE

最終更新: 2026-06-22 (session 30) / 更新者: Claude

> このディレクトリ `docs/project-management/` が正規プロジェクト管理文書。
> ルート直下の旧管理文書と差異が出た場合は、本ディレクトリを優先する。

## 正式な作業パス

`C:\dev\sites\kamisumi-site`

- OneDrive 配下から移設済み。正式フォルダで直接作業する。
- 旧パス `C:\Users\tkats\OneDrive\01_HTML_CSS\kamisumi-site` は重複コピー。参照・編集しない。
- GitHub remote: `origin https://github.com/gustytoshi-lgtm/kamisumi-site.git`。

## 現在のPhase

- Phase 1（公開サイト）: **Completed**。公開 URL / slug / 主要導線は維持対象。
- Phase 2A（販売・運用管理基盤）: **Implementation Complete / Real Supabase Validation Pending**。管理基盤、書込レイヤ、管理 CRUD、mock/Supabase 認証切替、Supabase read/write repository 実クエリ、注文メモ永続化まで実装済み。実 DB 検証が残るため `v0.2.0-phase2a` タグは未付与。
- Phase 2B（仕入・原価・在庫・採算）: **Implementation Complete / Real Supabase Validation Pending**。仕入先、仕入記録、原価配賦、配送、入金、抹茶ロット、陶器個体、経費、利益分析、会計 export、ダッシュボード、操作履歴ビューア（全ドメイン集約 + 検索/絞り込み, session 29）、全ドメイン管理 UI、各 Supabase repo 実クエリを実装済み。残は実 DB 検証。
- Phase 3（販売機能拡張）: **Interface / Foundation In Progress**。cart/checkout interface + 手動振込 mock、通知 mock + 業務サービス配線、SNS 下書き + 人間承認、顧客マイページ基盤（migration 0016 + auth/repo/service）、**顧客マイページ公開 UI（`/[locale]/account`, flag `CUSTOMER_PORTAL_ENABLED` 既定 OFF, session 19）**、**cart/checkout 公開 UI（`/[locale]/cart`, flag `CART_ENABLED` 既定 OFF, 手動振込 mock, session 20）**、**複数通貨/国別配送 参考 UI（cart 内, 配送ゾーン案内 + デモレート参考換算, session 21）**、**商品ページからのカート追加導線（SSG商品ページ + runtime flag gate, session 22）**、**顧客マイページ入力バリデーション堅牢化（service 層に email/国コード/桁数検証, session 23）**、**手動振込 注文台帳 mock（checkout で注文記録 + owner 入金確認、`orderStatus`/`paymentStatus` 機械を再利用, session 24）**、**注文台帳の owner 管理 UI（`/admin/checkout-orders`, owner 限定, 入金確認/取消, session 26）**、**注文台帳の Supabase 永続化（migration 0017 + supabase repo + factory 切替 + mock/Supabase 契約テスト, session 28）** を実装済み。残は実決済 provider / 実ログイン / 実 DB 接続検証。
- Phase 4: **Not Started / Deferred**。本番決済・本番会計 adapter は契約前のため未実装。

## 実装済み内容

- 公開サイト: zh-tw / ja の全15ルート、en 隠し scaffold、SEO/JSON-LD/sitemap/robots、OG PNG（`/api/og`）、favicon、soft-404 対応。
- Commerce Core: `src/lib/commerce/` の money / orderStatus / inventoryStatus / rbac / sourcingAcceptance / adminNav / costAllocation / matchaLot / profit / paymentStatus / shipmentStatus / accountingExport。
- データ切替: `DATA_BACKEND` 未設定時は mock。Supabase は env + `DATA_BACKEND=supabase` の時のみ。
- migration: `supabase/migrations` 0001-0017 作成済み（0017=checkout_orders, owner RLS）。実 Supabase DB には未適用。
- 管理 UI: 全16画面。業務設定、商品、在庫、注文、買付、仕入先、仕入記録、入金、配送、抹茶ロット、陶器個体、経費、利益分析、会計 export、メディア、SNS 下書き、通知ビューア(dev)、操作履歴ビューアを実装済み。
- 管理 UI ガード: `ADMIN_ENABLED` 既定 OFF、公開影響なし。`front_staff` に原価/利益/口座/権限管理/全顧客 CSV/秘密設定を見せない方針を維持。
- dev 専用機能: dev-check、通知ビューア、mock reset、開発バー、役割別ランチャー。本番では `isDevToolsEnabled()` で無効化。
- Supabase repository: Phase 2A read/write と Phase 2B/運用系（procurement/payment/fulfillment/settings/matcha/ceramic/expense/media/customer portal）の実クエリを実装済み。実 DB 接続での確認は未実施。
- 顧客マイページ基盤: `customer_accounts`、本人 RLS、customer portal repository mock/Supabase、customer auth adapter、customer portal service、mock/Supabase contract test 入口を追加済み。公開 UI は未実装（I-021）。

## 未実装 / 未検証

- 実 Supabase project への migration 0001-0017 適用、seed、RLS、read 一致、contract test 実行（注文台帳 0017 含む。資格情報待ち）。
- 実ログイン導線（Supabase Auth）の公開接続。マイページ公開 UI 自体は実装済み（`/[locale]/account`, flag 既定 OFF, mock セッション）。
- 複数通貨 / 国別配送 UI: 参考実装済み（cart 内, 配送ゾーン案内 + デモレート換算, session 21）。実 FX レート・実送料の確定値接続は未（本番方針確定後）。
- cart/checkout の公開 UI: 実装済み（`/[locale]/cart`, flag 既定 OFF, 手動振込 mock, session 20）。本番決済は対象外（契約後 adapter 差し替え）。商品ページからの「カートに追加」導線も実装済み（session 22）。商品ページはSSGのまま、runtime APIで `CART_ENABLED` を確認してON時のみフォームを表示。
- `matcha adjustQuantity` の DB function 原子化。
- 操作履歴: 全ドメイン集約 + 検索/絞り込みは実装済み（session 29）。残は監査 export（CSV）。
- Supabase Storage とメディア実ファイル連携。
- Playwright E2E の `C:\dev` 移設後再評価。

## Git

- branch: `main`
- 最新 commit: session 30 で業務設定の公開反映（I-017, `8140b8b`）。session 29 は操作履歴の集約+検索/絞り込み（`7c880ac`）。実 hash は `git log --oneline -20` を参照。
- remote: `origin https://github.com/gustytoshi-lgtm/kamisumi-site.git`。`main` と `origin/main` は同期済み。
- tag: なし。
- 作業ツリー: クリーン（session 23-30 の実装・テスト・文書を機能単位で commit/push 済み）。
- I-022（`.git` ACL）: `maomao-desk\tkats`（オーナー）では git add/commit/push 正常。Codex サンドボックスユーザー `codexsandboxonline` のみ環境制約で書込不可（repo 側問題ではない）。KNOWN_ISSUES 参照。

## テスト状態

最新確認（2026-06-22, session 30）:

- `npm.cmd run verify:full`: 成功。
  - typecheck OK
  - lint OK
  - test **301 passed / 10 files skipped**（session 30: publicSettings +6。session 29: 操作履歴フィルタ +14。Supabase 契約は skip、計 17 migrations）
  - `db:validate` **17 files OK**
  - build OK（153 static、contact のみ dynamic）
- `npm.cmd run verify:quick`: 成功。
  - public smoke OK
  - `CART_ENABLED` 既定OFFで `/ja/cart` 404
  - owner 全16管理画面 OK
  - inventory 権限制限 OK
- 個別確認:
  - `npm.cmd run test -- cartCheckout cartActions`: 12 passed
  - 手動 smoke（`CART_ENABLED=true`, 既存 Chrome + Playwright）: 商品ページから数量2を追加し `/ja/cart` へ遷移、明細表示を確認
  - `npm.cmd run db:validate`: 16 files OK
  - `npm.cmd run typecheck`: OK

## 再開コマンド

```bash
cd "C:/dev/sites/kamisumi-site"
npm run verify:full
npm run verify:quick
git status --short
git log --oneline -20
```

人間向け起動:

- `START_KAMISUMI_MOCK.cmd`
- `START_KAMISUMI_OWNER.cmd`
- `START_KAMISUMI_FRONT_STAFF.cmd`
- `START_KAMISUMI_INVENTORY.cmd`
- `STOP_KAMISUMI.cmd`
- `CHECK_KAMISUMI.cmd`
- `RESET_MOCK_DATA.cmd`
