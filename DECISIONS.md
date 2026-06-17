# DECISIONS — KAMISUMI Site

最終更新: 2026-06-18 / 更新者: Claude Code

設計判断の記録。「判断 / 採用案 / 採用理由 / 不採用案 / 将来変更時の注意点」。
新しい判断は下に追記する。

---

## D-001 Next.js App Router + CSS Modules（Tailwind不採用）

- **採用**: Next.js App Router / TypeScript strict / CSS Modules + CSS変数トークン。
- **理由**: Figma確定後に視覚を差し替えやすいトークン層が必要。multilingual SSG・SEO・将来のCommerce Core再利用に適する。
- **不採用**: Tailwind（プロジェクト要件がFigma対応トークン層を求めたため）。静的HTML（多言語・SEO・将来拡張に不利）。
- **将来注意**: フレームワーク移行は行わない。視覚差し替えは `globals.css` のトークンと各 `*.module.css` で行う。

## D-002 KAMISUMI固有 と Commerce Core共通 の分離

- **採用**: 共通コア（`src/types/commerce.ts`, `src/repositories/core/*`, Money/Product/Journal/Sourcing等の型）と、KAMISUMI固有（`config/site.ts`, `content/kamisumi/*`, `dictionaries/*`, 公開コピー, 画像）を分離。
- **理由**: 将来 KAGURAKOJI Commerce Core として複数ブランドへ再利用するため。
- **不採用**: 単一ブランド前提のベタ書き。
- **将来注意**: core の型/契約を破壊的に変更しない。新規フィールドは将来連携用ID（`organizationId` `brandId` `storeId` 等）の方針に沿わせる。

## D-003 リポジトリ契約経由のデータ取得

- **採用**: UIは `CommerceRepository` 契約経由のみでデータ取得。実装は `mockCommerceRepository`。`getCommerceRepository()` で取得。
- **理由**: Phase 2で `SupabaseCommerceRepository` を同一契約で差し替え、public UIを安定維持するため。
- **不採用**: コンポーネントから直接データ/外部APIを呼ぶ構成。
- **将来注意**: UIからSupabase/Shopify/DBを直接呼ばない。切替はfactory（`repositories/index.ts`）で行う。

## D-004 多言語設計（zh-tw既定 / ja公開 / en隠しscaffold）

- **採用**: `supportedLocales = [zh-tw, ja, en]`、`visibleLocales = [zh-tw, ja]`、`defaultLocale = zh-tw`。`en` は静的生成・hreflang対象だが言語切替UIには出さない。
- **理由**: 台湾先行。英語は基盤だけ用意し公開タイミングは後判断。
- **不採用**: enを完全削除（将来の英語公開を阻害）/ enを即公開（コピー未確定）。
- **将来注意**: locale追加/変更は `config/site.ts` を単一情報源に。`lib/routes.ts` の `stripLocale` がlocaleを直書きしている点は是正対象（[TODO.md](TODO.md) 中）。slugはlocale非依存を維持。

## D-005 `proxy.ts`（Next.js 16のミドルウェア規約）

- **採用**: `src/proxy.ts` に `export function proxy(...)` を置き、`/`→`/zh-tw` 等のlocaleリダイレクトを実装。
- **理由**: Next.js 16 で `middleware` が `proxy` に改称（`PROXY_FILENAME = "proxy"`）。ビルドで `ƒ Proxy (Middleware)` として認識され、動作確認済み。
- **不採用**: 旧 `middleware.ts`（Next.js 16では非推奨方向）。
- **将来注意**: ファイル名・関数名 `proxy` を変えると無効化される。`.next` 内の古い middleware-manifest が空でも、再ビルドで有効になる。

## D-006 フォームは「保存しないデモ」

- **採用**: `InquiryForm` はクライアント検証のみ。送信内容は保存・外部送信しない。文言で明示。
- **理由**: Phase 1は公開サイトのみ。保存先（DB/メール送信）は未確定。
- **不採用**: 実送信（送信先・個人情報保存方針が未確定なため）。
- **将来注意**: 実送信を実装する際は server action / route handler を追加し、「保存しない」旨の文言（`dictionary.common.notSaved` 等）も同時に更新する。

## D-007 公開モックデータの安全方針

- **採用**: 公開モックに原価・利益・粗利・仕入先内部メモ・銀行口座・顧客データを含めない。
- **理由**: 公開リポジトリ/画面への機微情報流出防止。正規代理店と誤認される表現も避ける。
- **将来注意**: seed/CMS化の際もこの境界を維持（[docs/PHASE2A_IMPLEMENTATION_PLAN.md](docs/PHASE2A_IMPLEMENTATION_PLAN.md) 参照）。

## D-008 引き継ぎ運用（Codex ⇄ Claude Code）

- **採用**: ルートに HANDOFF / CHANGELOG / PROJECT_MAP / TODO / DECISIONS を置き、変更のたびに更新。既存 `docs/*` は消さず保持。
- **理由**: ツール往復で文脈を失わずに引き継ぐため。
- **将来注意**: コード変更時は最低でも CHANGELOG と該当する TODO/PROJECT_MAP を更新する。
