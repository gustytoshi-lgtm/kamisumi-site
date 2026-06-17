# TODO — KAMISUMI Site

最終更新: 2026-06-18 / 更新者: Claude Code

優先度別の残課題。各項目に「対象ファイル / 問題 / 推奨対応 / 完了条件」。
チェック済み（[x]）は適用済み。詳細は [CHANGELOG.md](CHANGELOG.md)。

---

## 最優先（公開前に必須・人間の判断が必要）

- [ ] **正式連絡先メール**
  - 対象: `src/config/site.ts`（`contact.email = "hello@example.com"`）
  - 問題: プレースホルダのまま。問い合わせ導線が機能しない。
  - 対応: 正式inbox確定後に差し替え。
  - 完了条件: 実在のメールアドレスが設定され、フォーム/フッターの導線が正しい宛先を指す。

- [ ] **法務・支払い・配送・キャンセル文言の確定**
  - 対象: `src/dictionaries/*`（legal / privacy / shipping / order / faq）, `src/content/kamisumi/faqs.ts`
  - 問題: 仮文言。特定商取引法・台湾向け食品/茶の輸入ルール・破損対応が未確定。
  - 対応: 専門家確認後に確定文言へ差し替え。
  - 完了条件: 公開可能な確定文言になっている。

- [ ] **実商品データ（価格・在庫・画像・ロゴ・商標確認）**
  - 対象: `src/content/kamisumi/products.ts`, `public/images/placeholders/*`, `src/config/site.ts`
  - 問題: 全てモック。価格はTWD最小単位（例 `98000`=980.00）の仮値、画像はSVGプレースホルダ。
  - 完了条件: 実データ・実画像・確定ロゴに置換、商標確認済み。

## 高（コードで対応可能・SEO/品質に直結）

- [x] **ソフト404の解消**（2026-06-18 適用）
  - 対象: `src/app/[locale]/products/[slug]/page.tsx`, `src/app/[locale]/journal/[slug]/page.tsx`
  - 対応: `export const dynamicParams = false;` を追加。
  - 確認: `/zh-tw/products/nope`・`/zh-tw/journal/nope` が 404 を返すことを確認済み。

- [x] **favicon / アイコン追加**（2026-06-18 適用）
  - 対象: `src/app/icon.svg`（新規, Next.js規約で自動配信）
  - 対応: ブランドマークのSVGを追加。
  - 確認: `/icon.svg` が 200、`<link rel="icon">` がhead注入されることを確認済み。
  - 残: 正式ロゴ確定後にデザインを差し替え。必要なら `apple-icon` / OG用PNGも追加。

- [x] **OG画像をPNG/JPG化（サイト既定）**（2026-06-18 適用）
  - 対象: `src/app/api/og/route.tsx`（新規, `next/og` の `ImageResponse` で1200×630 PNGを生成）, `src/lib/seo.ts`（既定画像を `/api/og` に変更）
  - 対応: 既定OGP画像をSVG→動的生成PNGに変更。`/api/og` 配下にしたのは `proxy.ts` のlocaleリダイレクト対象外（matcherが `api` を除外）にするため。
  - 確認: `/api/og` が 200 / image/png（約49KB）、`og:image` がPNGを指す。画像描画も目視確認済み。
  - 残: **商品ページのOG画像は商品個別のプレースホルダSVGのまま**（`products.ts` の `images[].src`）。実商品写真への差し替え時にPNG/JPG化される（下記「実商品データ」項目に含む）。`og-default.svg` は現在未使用（削除可だが保持）。

- [ ] **hero画像の軽量化**
  - 対象: `public/images/placeholders/hero-tea-table.png`（約2.1MB）, `src/components/ui/UI.module.css`
  - 問題: 重くLCP・通信量に悪影響。
  - 推奨対応: 圧縮 / WebP化、表示幅に合わせたリサイズ。
  - 完了条件: 画質を保ちつつ大幅に軽量化（目安 < 300KB）。

## 中

- [x] **`stripLocale` のlocale直書き解消**（2026-06-18 適用）
  - 対象: `src/lib/routes.ts`
  - 対応: 直書き条件を `isLocale(parts[0])` に統一。
  - 確認: `tests/routes.test.ts` 含む単体テスト pass、typecheck/lint クリーン。

- [ ] **連絡先導線の最終確認（SNS含む）**
  - 対象: `src/config/site.ts`（`socials.threads / instagram` が空文字）
  - 完了条件: 公開するSNSのURLが設定され、Footer等のリンクが正しく出る／出さない判断が反映。

## 低

- [x] **`--space-5` トークンの整理**（2026-06-18 適用）
  - 対象: `src/styles/globals.css`
  - 対応: `--space-5: 20px;`（フォールバックと同値）を定義。見た目不変。

- [ ] **不要ログファイルの整理**
  - 対象: `dev-server.err.log` / `dev-server.out.log`（空・gitignore済）
  - 完了条件: 不要なら削除（OneDrive同期負荷の軽減）。

- [ ] **320 / 390px の実機目視記録**
  - 対象: 商品カード・フォーム・Header（`*.module.css`）
  - 完了条件: 主要ページのモバイル表示崩れがないことを確認し記録。

## 将来対応（Phase 2A 以降・設計のみ）

- [ ] Supabase接続 / 管理画面 `/admin` / 認証・RLS / 在庫 / 仮注文 / 買付管理 / Journal CMS / audit log
  - 対象: [docs/PHASE2A_IMPLEMENTATION_PLAN.md](docs/PHASE2A_IMPLEMENTATION_PLAN.md) に設計済み・未着手。
  - 方針: public UI を保ったまま `SupabaseCommerceRepository` を同一契約で追加し、factoryで切替。
- [ ] `en`（英語版）の公開タイミング判断。
- [ ] `npm audit` moderate 2件（postcss経由 / `No fix available`）の再監査。
- [x] **Git初期化**（2026-06-18 完了。`main` ブランチでローカル初期化＋ベースラインコミット）。
  - 残: 必要に応じてリモート（GitHub等）の設定と運用ルール（ブランチ戦略・コミット規約）の確定。
