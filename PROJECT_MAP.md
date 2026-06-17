# PROJECT_MAP — KAMISUMI Site

最終更新: 2026-06-18 / 更新者: Claude Code

このサイトの構造・依存関係・命名規約のリファレンス。コードを変更したらこの地図も更新すること。

---

## スタック

- Next.js 16.2.9（App Router）
- React / TypeScript（strict）
- CSS Modules + `src/styles/globals.css` のデザイントークン（CSS変数）
- Vitest（単体）/ Playwright（E2E smoke）
- データは全てモック（DB/外部APIなし）

## ディレクトリ構成

```
kamisumi-site/
├ src/
│  ├ app/
│  │  ├ [locale]/
│  │  │  ├ layout.tsx              # html/body, Header/Footer, skip-link, locale lang
│  │  │  ├ page.tsx                # Home
│  │  │  ├ loading.tsx             # skeleton
│  │  │  ├ error.tsx               # エラーページ（client）
│  │  │  ├ not-found.tsx           # 404
│  │  │  ├ shop/page.tsx           # 商品一覧（?category= / ?status= で絞り込み, 動的ƒ）
│  │  │  ├ products/[slug]/page.tsx# 商品詳細（SSG, generateStaticParams）
│  │  │  ├ new-arrivals/page.tsx
│  │  │  ├ sourcing/page.tsx       # /sourcing/schedule へリダイレクト
│  │  │  ├ sourcing/schedule/page.tsx
│  │  │  ├ sourcing/request/page.tsx  # 買付依頼フォーム
│  │  │  ├ journal/page.tsx        # 記事一覧
│  │  │  ├ journal/[slug]/page.tsx # 記事詳細（SSG）
│  │  │  ├ about / order / shipping / faq / contact / legal / privacy / page.tsx
│  │  ├ sitemap.ts                 # /sitemap.xml
│  │  └ robots.ts                  # /robots.txt
│  ├ proxy.ts                      # Next.js 16 ミドルウェア（locale リダイレクト）
│  ├ components/
│  │  ├ layout/   Header(.module.css) / Footer(.module.css) / LanguageSwitcher / MobileMenu
│  │  ├ product/  ProductCard / ProductGrid / ProductGallery / PriceDisplay / ProductStatusBadge / Product.module.css
│  │  ├ journal/  ArticleCard / ArticleGrid / Article.module.css
│  │  ├ sourcing/ ScheduleCard / ScheduleList / Schedule.module.css
│  │  ├ forms/    InquiryForm(client) / Form.module.css
│  │  ├ seo/      JsonLd
│  │  └ ui/       Hero / SectionHeading / PageIntro / Breadcrumb / ButtonLink / EmptyState / Notice / UI.module.css
│  ├ config/site.ts               # ★単一情報源: locale / brand / store / warehouse / contact / socials
│  ├ content/kamisumi/            # モックデータ: products / journal / sourcing / faqs / scope
│  ├ dictionaries/                # ja / zh-tw / en / types(型) / index(getDictionary)
│  ├ lib/                         # format / localization / params / routes / seo / status
│  ├ repositories/
│  │  ├ core/commerceRepository.ts  # ★契約（interface）
│  │  ├ kamisumi/mockCommerceRepository.ts  # モック実装
│  │  └ index.ts                  # getCommerceRepository()（factory）
│  ├ types/commerce.ts            # ★共通エンティティ・Money型
│  └ styles/globals.css           # デザイントークン + 共通レイアウトクラス
├ public/images/placeholders/     # SVG×7 + hero-tea-table.png(約2.1MB)
├ docs/                           # PHASE1_FINAL_REVIEW / PHASE2A_IMPLEMENTATION_PLAN
├ tests/                          # form / repository / routes / status（単体）+ e2e/smoke.spec.ts
└ 設定: package.json / tsconfig / eslint.config.mjs / .prettierrc / next.config.ts
        / vitest.config.ts / playwright.config.ts
```

## 依存関係・読み込み関係

- `app/[locale]/layout.tsx` → `getDictionary(locale)` → `Header` / `Footer` を描画、`globals.css` を読み込み。
- 各 `page.tsx` → `getCommerceRepository()`（= `repositories/index.ts` がモック実装を返す）→ `content/kamisumi/*` のデータ。
- `lib/seo.ts` → `config/site.ts`（siteUrl, brand）+ `lib/localization` + `lib/format` を使って metadata / JSON-LD を生成。
- `lib/routes.ts`（`localizePath` / `productPath` / `journalPath` / `replaceLocaleInPath` / `stripLocale`）が全リンク生成の基盤。
- `proxy.ts` → `config/site.ts` の `defaultLocale` / `isLocale`。matcher は `_next` / api / 拡張子付き / sitemap / robots を除外。
- `dictionaries/types.ts` が辞書の型契約。`ja` / `zh-tw` / `en` はこの型を満たす。

## 主要な class / id（globals.css 由来）

- レイアウト: `.site-shell` `.page-main` `.content-shell`（`min(100% - 32px, 1120px)`）`.page-section`（`.compact`）
- 帯: `.band-matcha`（深抹茶背景）`.band-ivory`
- グリッド: `.responsive-grid`（`auto-fit minmax(240px,1fr)`）`.two-column`（760px以下で1列）`.stack`
- 詳細表示: `.detailList` / `<details><summary>`（FAQ）
- 補助: `.kicker` `.muted` `.loading-blocks` `.skip-link`
- アクセシビリティ id: `#main-content`（skip-link 対象）
- コンポーネント固有スタイルは各 `*.module.css`（ローカルスコープ）。

## CSS デザイントークン（globals.css `:root`）

- 色: `--color-washi-white / warm-ivory / sumi / deep-matcha / tea-leaf / clay / muted-gold / soft-ash / paper / ink-muted / focus`
- 余白: `--space-1/2/3/4/6/8/12/16/24`（注: `--space-5` は未定義。使用箇所は `var(--space-5, 20px)` でフォールバック）
- その他: `--radius-sm/md` `--shadow-soft` `--container(1120px)`

## レスポンシブ対応箇所

- `globals.css` `@media (max-width: 760px)`: content-shell 余白縮小、page-section余白縮小、two-column→1列。
- `@media (prefers-reduced-motion: reduce)`: アニメーション/スクロール抑制。
- 各 `*.module.css`（Header / Product / Form 等）にコンポーネント別のブレークポイントあり（320 / 390px の最終目視は未完了 → TODO）。

## ルーティング規約

- パスは必ず locale 接頭辞付き（`/zh-tw/...`）。生成は `lib/routes.ts` を経由する。
- slug は **locale 非依存**（言語を切り替えても同一slug）。`LanguageSwitcher` は `usePathname()` の先頭セグメントだけを差し替える。
- 商品・記事詳細は `generateStaticParams` で全slugを静的生成（モックデータ由来）。
