# Phase 1 Final Review

対象: `C:\dev\sites\kamisumi-site`（作成時は OneDrive 配下。session 17 で移設）

作成日: 2026-06-17

## 実装済み機能

- Next.js App Router / TypeScript strict / CSS Modules 構成。
- 公開locale route: `/zh-tw`, `/ja`。
- 英語scaffold: `/en` は辞書・静的生成・hreflang対象として保持。ただし言語切替UIには表示しない。
- 実装済みページ:
  - Home: `/[locale]`
  - Product listing: `/[locale]/shop`
  - Product detail: `/[locale]/products/[slug]`
  - New arrivals: `/[locale]/new-arrivals`
  - Sourcing schedule: `/[locale]/sourcing/schedule`
  - Sourcing request: `/[locale]/sourcing/request`
  - Journal listing: `/[locale]/journal`
  - Journal detail: `/[locale]/journal/[slug]`
  - About: `/[locale]/about`
  - Order guide: `/[locale]/order`
  - Shipping: `/[locale]/shipping`
  - FAQ: `/[locale]/faq`
  - Contact: `/[locale]/contact`
  - Legal placeholder: `/[locale]/legal`
  - Privacy placeholder: `/[locale]/privacy`
- `/sourcing` は locale 内で `/sourcing/schedule` へリダイレクト。
- 不正なlocaleまたは未知パスは Next.js の not-found へ流す構成。
- HTML `lang` は `zh-TW`, `ja`, `en` を `site.config` から出力。
- title / description / canonical / hreflang / OGP / sitemap / robots を実装。
- Product JSON-LD / Article JSON-LD / Breadcrumb JSON-LD を実装。
- 画像altは mock content の localized alt から出力。
- Mock repository を通じて商品、Journal、買付予定、FAQを取得。
- 空状態、loading skeleton、error page、not-found page を用意。

## 分離状態

KAMISUMI固有:

- `src/config/site.ts`
- `src/content/kamisumi/*`
- `src/dictionaries/*`
- placeholder images
- 公開コピー、商品説明、Journal本文、台湾向け初期設定

KAGURAKOJI Commerce Core共通:

- `src/types/commerce.ts`
- `src/repositories/core/commerceRepository.ts`
- `src/repositories/index.ts`
- Money / Product / Journal / Sourcing / Store / Brand / Warehouse などの共通型
- `organizationId`, `brandId`, `storeId`, `warehouseId`, `salesChannelId`, `externalProductId`, `externalVariantId` など将来連携用フィールド

Phase 2でSupabaseへ差し替える主な箇所:

- `src/repositories/index.ts` の repository factory
- `src/repositories/kamisumi/mockCommerceRepository.ts` と同じ interface を満たす `SupabaseCommerceRepository`
- mock content 配列から DB table / view / RPC への読み替え
- inquiry form は現在保存しないdemo。Phase 2では server action または route handler 経由で保存先を追加する。

## 修正内容

- 繁体字辞書とmock contentに残っていた日本語表現を最小限修正。
- 商品詳細の英語固定ラベルを辞書キー化。
- フッターの見える英語文、ナビゲーション・言語切替・パンくずのアクセシビリティラベルを辞書化。
- 参考掲載・近日公開商品の詳細CTAは、関連Journalがある場合は記事へ遷移するよう修正。
- Product JSON-LD の availability を商品ステータス別に出力。
- loading 表示を固定英語からskeletonへ変更。
- `dev-server*.log` を `.gitignore` へ追加。
- 商品ステータスの購入可能判定テストを全ステータス分へ拡張。

## 未解決事項

- `src/config/site.ts` の `hello@example.com` は公開前に正式連絡先へ差し替えが必要。
- SNS URL は未確定。
- 法務文言、支払い文言、キャンセル規定、食品・茶の台湾配送ルールは未確定。
- 初期の実商品リスト、実画像、在庫数、正式価格は未確定。
- 英語公開タイミングは未確定。現状はscaffoldとして存在する。
- 商品ステータスは全種類サポートしているが、mock dataには `reserved`, `sold_out`, `restock_request` の実例はまだ無い。
- Playwright のブラウザ実行環境は、最終テスト時に利用可否を確認する。

## デザイン・文章の要確認箇所

- KAMISUMI の正式ロゴ、ブランド表記、商標確認。
- 繁体字・日本語コピーのトーン統一。
- CTA文言が実運用の導線と一致しているか。
- 配送・注文・FAQ・法務ページの確定前文言。
- placeholder画像から正式画像へ差し替える範囲。
- 320px / 390px での商品カード、フォーム、Headerの見え方。

## 人間がブラウザで確認すべき箇所

- `/zh-tw` と `/ja` の主要ページを 320px, 390px, tablet, desktop で確認。
- 商品詳細とJournal詳細で言語切替後も同じ slug が維持されるか。
- `/fr`, `/zh-tw/missing-page`, 不明な商品slugの404挙動。
- Header, mobile menu, form, language switcher のキーボード操作。
- focus-visible の見え方。
- prefers-reduced-motion 環境で不要な動きがないか。
- hydration error / console error / layout shift / 画像切れがないか。

## Phase 2へ進めるか

Phase 1のpublic siteとしては Phase 2A の設計作業へ進める状態。ただし、正式公開前には未解決事項のうち連絡先、法務、配送、支払い、実商品情報を人間が確定する必要がある。

## 依存関係の監査結果

実行コマンド: `npm audit --audit-level=low`

結果:

- `postcss`: moderate, GHSA-qx2v-qp2m-jg93
- `next`: vulnerable `postcss` に依存
- 合計: 2 moderate vulnerabilities
- npmの報告上は `No fix available`

対応:

- `npm audit fix --force` は実行していない。
- Phase 2A開始前、またはNext.js更新時に再監査する。
