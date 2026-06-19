# 本番公開前 セキュリティ確認チェックリスト

最終更新: 2026-06-19 (session 27) / 更新者: Claude

このリストは KAMISUMI / KAGURAKOJI Commerce Core を本番公開する前に確認すべき
セキュリティ・安全境界の項目を、**現状コードで保証されている事項**と
**公開前に人間/資格情報/契約が必要な事項**に分けて整理する。

> 原則: 公開サイトを壊さない / feature flag 既定 OFF / 金額は整数 *_minor + currency /
> 本番決済・本番送信・SNS 自動投稿をしない / 秘密情報を commit しない。

---

## A. コードで保証済み（自動テスト/実装で担保）

| 項目 | 保証内容 | 根拠（テスト / 実装） |
|---|---|---|
| feature flag 既定 OFF | `ADMIN_ENABLED` / `CUSTOMER_PORTAL_ENABLED` / `CART_ENABLED` は未設定で false、`"true"` のみ有効 | `tests/featureFlags.test.ts`、`src/config/features.ts` |
| gated ルートの真 404 | flag OFF で `/[locale]/{admin,account,cart}` は 404、公開ルートは不変 | `tests/proxyGating.test.ts`、`src/proxy.ts` |
| dev 専用ツールの本番無効 | `NODE_ENV=production` で dev-check/通知ビューア/開発バー等は無効。非本番でも admin 有効 + mock backend のときのみ | `tests/featureFlags.test.ts`、`src/config/devtools.ts` |
| 機微情報の権限分離 | `front_staff` 等は原価/利益/口座/権限管理/全顧客 CSV（SENSITIVE_PERMISSIONS）に到達不可 | `tests/rbac.test.ts`、`tests/adminNav.test.ts`、`src/lib/commerce/rbac.ts` |
| 顧客マイページ本人限定 | 未ログイン拒否・account/customerId 不一致拒否（forbidden）。内部メモ等は snapshot に含めない | `tests/customerPortalService.test.ts`、`src/lib/customer/customerPortalService.ts` |
| 顧客入力バリデーション | email 形式 / 国コード 2 文字 / 桁数上限。forbidden チェックを検証より先に実施 | `tests/customerValidation.test.ts`、`src/lib/customer/validation.ts` |
| 本番決済なし | checkout は手動振込 mock のみ。stripe/paypal/tw_provider は sandbox で NotImplemented を投げる | `src/lib/commerce/checkout.ts`、`tests/cartCheckout.test.ts` |
| 注文/入金状態の正当遷移 | 注文台帳の入金確認/取消は状態機械（`canTransitionPayment`/`canTransitionOrder`）+ owner 限定（`purchase:manage`） | `tests/checkoutOrder.test.ts`、`src/lib/commerce/checkoutOrder.ts` |
| 金額の整数最小単位 | 全金額は `{ currency, amountMinor }`。通貨不一致は加算で拒否。浮動小数で金額計算しない | `src/lib/commerce/money.ts`、`tests/*` |
| 為替・送料は確定値でない | cart の換算はデモレート（実レートでない旨を明示）、送料はゾーン定性案内（確定は確認後） | `src/config/shipping.ts`、`tests/shippingConfig.test.ts` |
| 通知・SNS の自動送信なし | 通知は mock notifier（best-effort enqueue のみ）、SNS は下書き + 人間承認 | `src/lib/commerce/notifications.ts`、`snsDraft*` |
| Supabase は明示時のみ | `DATA_BACKEND=supabase` かつ env 揃いのときのみ接続。既定は mock。proxy は configured 時のみ session 更新 | `src/config/dataBackend.ts`、`src/proxy.ts` |
| 秘密情報の非混入 | 追跡対象の鍵/credential は `.env.example`（空プレースホルダ）のみ。SERVICE_ROLE/DB_URL はサーバー専用 | `.env.example`、`docs/SUPABASE_SETUP.md` |

### 公開前に必ず流す検証

```bash
cd "C:/dev/sites/kamisumi-site"
npm run verify:full     # typecheck / lint / test / db:validate / build
npm run verify:quick    # 公開 smoke / 管理画面 / 権限制限 / flag OFF の 404
```

---

## B. 公開前に人間・資格情報・契約が必要（現状ブロック）

| 項目 | 必要なもの | 状態 |
|---|---|---|
| 実 Supabase 接続検証 | 開発 project の URL / anon / service_role / DB_URL（`.env.local`） | 未（資格情報待ち）。migration 0001-0016 適用 + RLS + read 一致 + `*.supabase.test.ts`（`RUN_SUPABASE_CONTRACT=1`）。I-002/I-020 |
| 本番決済 | 決済 provider 契約 | 未（契約後に同 interface の adapter 実装）。I-020b |
| 実メール/通知送信 | 送信基盤の選定・契約 | 未（mock notifier のまま） |
| 法務確認 | 特定商取引法表示・台湾食品輸入・返品/破損規定（専門家） | Blocked |
| 実連絡先/口座/SNS | 正式 inbox・口座・SNS アカウント確定 | 未（`site.ts` の contact は TODO プレースホルダ） |
| 実商品データ | mock → seed の確定 | 未 |
| `npm audit` moderate 2 件 | Next.js 更新時の再監査 | I-004 Open（No fix available） |

> B の項目は推測で値を埋めたり、接続成功を捏造したりしない。資格情報はチャットに貼らず
> `.env.local` に直接設定する。秘密情報は commit しない。

---

## C. 公開直前の手動確認（人間）

- [ ] 本番環境で `ADMIN_ENABLED` / `CUSTOMER_PORTAL_ENABLED` / `CART_ENABLED` が未設定（OFF）であること。
- [ ] 本番 `NODE_ENV=production` で dev ツール（dev-check / 通知ビューア / 開発バー）が表示されないこと。
- [ ] 公開 15 ルート（zh-tw / ja）と SEO/sitemap/robots/OG が従来どおりであること。
- [ ] `git status` clean、`main` と `origin/main` 一致、追跡対象に秘密情報がないこと。
- [ ] 320/390px のモバイル実機目視（I-006）。
