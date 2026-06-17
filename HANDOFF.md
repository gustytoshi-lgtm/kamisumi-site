# HANDOFF — KAMISUMI Site

最終更新: 2026-06-18 / 更新者: Claude Code（Codexからの一時引き継ぎ）

このファイルは、Codex ⇄ Claude Code 間で作業を引き継ぐための要約です。
詳細は [PROJECT_MAP.md](PROJECT_MAP.md) / [TODO.md](TODO.md) / [DECISIONS.md](DECISIONS.md) / [CHANGELOG.md](CHANGELOG.md) を参照。

---

## 1. プロジェクト概要

- **名称**: KAMISUMI Site Phase 1（運営: KAGURAKOJI / 神楽小路）
- **目的**: 日本茶・工藝のセレクト公開サイト（台湾向け / TWD基準）。将来 KAGURAKOJI Commerce Core として再利用できる構造。
- **重要**: これは静的HTMLサイトではなく **Next.js 16.2.9（App Router）+ TypeScript strict + CSS Modules** のアプリケーション。`index.html` は存在しない。
- **公開locale**: `zh-tw`（既定）, `ja`。`en` は静的生成・hreflang対象だが言語切替UIには出さない「隠しscaffold」。
- **データ**: すべてモック（`src/content/kamisumi/*`）。DB・外部API・決済・認証は未接続（設計のみ）。

## 2. 実装済み機能

- 全15ルート（Home / shop / products/[slug] / new-arrivals / sourcing / sourcing/schedule / sourcing/request / journal / journal/[slug] / about / order / shipping / faq / contact / legal / privacy）+ loading / error / not-found。
- `proxy.ts`（Next.js 16の新ミドルウェア規約）で `/` → `/zh-tw`、locale接頭辞なしパスの補完。**動作確認済み**。
- 多言語辞書（ja / zh-tw / en）、UI文言・ステータス・CTAをすべて辞書化。
- SEO: title / description / canonical / hreflang / OGP / sitemap / robots / JSON-LD（Product / Article / Breadcrumb）。
- リポジトリ契約（`CommerceRepository`）経由のデータ取得。現状はモック実装。
- 問い合わせ/買付フォーム（クライアント検証あり、**送信内容は保存しないデモ**）。
- アクセシビリティ: skip-link, aria-label辞書化, focus-visible, prefers-reduced-motion対応。

## 3. 今回の変更（2026-06-18 / Claude Code）

- コード変更前に全体分析と動作検証を実施（typecheck/lint/test/build/起動すべて成功）。
- 引き継ぎ文書を新規作成: HANDOFF / CHANGELOG / PROJECT_MAP / TODO / DECISIONS。
- 低リスク修正（詳細は CHANGELOG.md を参照。適用済みのもののみ記載）。

## 4. 維持すべき仕様（壊してはいけない）

- ファイル名・画像名・パス・slug を変更しない（slugはlocale非依存で言語切替時も同一を維持）。
- `zh-tw` を既定locale、`en` は隠しscaffoldのまま。
- UI は必ず repository 契約経由でデータ取得（Supabase等を直接呼ばない）。
- KAMISUMI固有コードと Commerce Core 共通コードの分離（[DECISIONS.md](DECISIONS.md) 参照）。
- フォームは「保存しないデモ」表記を維持（実送信を実装する場合は文言も更新）。
- 公開モックデータに原価・利益・仕入先内部情報・銀行口座・顧客データを入れない。

## 5. 変更禁止 / 要注意箇所

- `src/types/commerce.ts`, `src/repositories/core/*`: Commerce Core共通。将来Supabase実装と契約を共有するため、安易な破壊的変更は不可。
- `src/config/site.ts`: 単一情報源。locale・store・brandの定義はここを基準に参照すること。
- `src/proxy.ts`: Next.js 16の `proxy` 規約（旧 `middleware.ts`）。ファイル名・関数名 `proxy` を変えると無効化される。

## 6. 既知の問題

- **ソフト404**: 未知slug（例 `/zh-tw/products/nope`, `/zh-tw/journal/nope`）が not-found 本文を **HTTP 200** で返す（SEO上問題）。→ [TODO.md](TODO.md)
- **favicon未設定**: `/favicon.ico` が404。
- **OG画像がSVG**: 多くのSNSがOGP用SVGを描画しない。PNG/JPG化が必要。
- **hero画像が約2.1MB**: `public/images/placeholders/hero-tea-table.png` が重くLCPに影響。
- `stripLocale`（`src/lib/routes.ts`）がlocaleを直書きしており `supportedLocales` と二重管理。
- `npm audit`: postcss経由のmoderate 2件（`No fix available`、docs記載）。
- **Git未初期化**: このフォルダは `.git` を持たない。変更履歴が残らない。

## 7. 未完了作業 / 8. 次の作業

[TODO.md](TODO.md) に優先度別（最優先/高/中/低/将来）で記載。要点:
- ソフト404の解消、favicon、OG画像PNG化、hero画像軽量化。
- 連絡先メール・SNS URL・法務/支払い/配送文言・実商品データの確定（人間の判断が必要）。
- Phase 2A（Supabase / 管理画面 / 在庫 / 仮注文）は [docs/PHASE2A_IMPLEMENTATION_PLAN.md](docs/PHASE2A_IMPLEMENTATION_PLAN.md) に設計済み・未着手。

## 9. 動作確認方法

```bash
# 依存関係（node_modules が無い場合のみ）
npm install

# 静的チェック
npm run typecheck   # tsc --noEmit
npm run lint        # eslint .
npm run test        # vitest run（単体）

# ビルド & 起動
npm run build
npm run start       # http://localhost:3000

# E2E（ブラウザ実行環境が利用可能な場合）
npm run test:e2e    # playwright
```

確認観点:
- `/` が `/zh-tw` へリダイレクトされる。
- `/zh-tw` `/ja` の主要ページが 200。320 / 390 / タブレット / デスクトップで目視。
- 言語切替後も同一slugが維持される。
- 未知パス・未知slugの404挙動。
- console error / hydration error / 画像切れ / layout shift が無いか。

> Windows + PowerShell 環境では `npm.ps1` がブロックされる場合あり。その際は `npm.cmd ...` を使用。
