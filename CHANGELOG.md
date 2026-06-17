# CHANGELOG — KAMISUMI Site

時系列の変更記録。新しい項目を上に追記する。各エントリは「日付 / 変更ファイル / 変更内容 / 理由 / 影響範囲 / 確認結果」。

---

## 2026-06-18 — Claude Code（Codexからの一時引き継ぎ）

### 現状分析と動作検証（コード変更なし）

- **変更ファイル**: なし（読み取り・実行のみ）
- **内容**: プロジェクト全体を確認し、`npm run typecheck / lint / test / build / start` を実行して動作を検証。
- **理由**: 引き継ぎにあたり現状を正確に把握するため。
- **影響範囲**: ソースコードへの影響なし（`.next` 等のビルド成果物のみ再生成）。
- **確認結果**:
  - typecheck: 成功（エラーなし）
  - lint: 成功（警告・エラーなし）
  - 単体テスト: 4ファイル / 10件すべて pass
  - build: 成功。`ƒ Proxy (Middleware)` を確認（`proxy.ts` が有効）
  - 起動確認: `/`→`/zh-tw`(307)、`/shop`→`/zh-tw/shop`(307)、`/zh-tw`・`/ja`(200)、`/zh-tw/zzz`(404 正常)
  - 既知問題を検出: 未知slug `/products/nope`・`/journal/nope` が **HTTP 200 のソフト404**、`/favicon.ico` 404、hero PNG 約2.1MB、OG画像がSVG

### 引き継ぎ文書の新規作成

- **変更ファイル**: `HANDOFF.md`, `CHANGELOG.md`, `PROJECT_MAP.md`, `TODO.md`, `DECISIONS.md`（いずれも新規）
- **内容**: Codex ⇄ Claude Code 間の引き継ぎ用ドキュメントを作成。
- **理由**: 実装だけでなく作業履歴・設計判断・残課題を引き継げるようにするため。
- **影響範囲**: ドキュメントのみ。アプリ動作への影響なし。
- **確認結果**: 既存の `docs/PHASE1_FINAL_REVIEW.md` / `docs/PHASE2A_IMPLEMENTATION_PLAN.md` は削除・改変せず保持。

### 低リスク修正（4件適用）

1. **ソフト404の解消**
   - 変更ファイル: `src/app/[locale]/products/[slug]/page.tsx`, `src/app/[locale]/journal/[slug]/page.tsx`
   - 内容: 各ページに `export const dynamicParams = false;` を追加。
   - 理由: 未知slug（`/products/nope` 等）が not-found 本文を HTTP 200 で返す soft-404 だったため。全slugは `generateStaticParams`（モックデータ由来）で網羅されており安全。
   - 影響範囲: 既知slugは従来通り200。未知slugのみ挙動変化（200→404）。
   - 確認結果: `/zh-tw/products/nope`・`/zh-tw/journal/nope` が **404**、正常slugは200を維持。

2. **favicon / アイコン追加**
   - 変更ファイル: `src/app/icon.svg`（新規）
   - 内容: ブランドカラー（深抹茶/和紙/クレイ）の抹茶碗マークを追加。Next.jsのmetadataファイル規約で自動配信。
   - 理由: `/favicon.ico` が404だったため。
   - 影響範囲: 追加のみ。既存に影響なし。
   - 確認結果: `/icon.svg` が **200 (image/svg+xml)**、`<link rel="icon" ... type="image/svg+xml">` がhead に注入されることを確認。

3. **`stripLocale` のlocale直書き解消**
   - 変更ファイル: `src/lib/routes.ts`
   - 内容: `parts[0] === "ja" || parts[0] === "en"` の直書きを `isLocale(parts[0])` に統一（import を `defaultLocale` → `isLocale` に変更）。
   - 理由: locale定義の二重管理（`supportedLocales` との不整合リスク）を解消。
   - 影響範囲: 挙動は同一。locale追加時の保守性向上。
   - 確認結果: `tests/routes.test.ts` を含む単体テスト10件 pass、typecheck/lint クリーン。

4. **`--space-5` トークン定義**
   - 変更ファイル: `src/styles/globals.css`
   - 内容: `--space-5: 20px;` を追加。
   - 理由: 使用箇所が `var(--space-5, 20px)` のフォールバック頼みだったため定義を明示。
   - 影響範囲: フォールバック値と同値のため見た目は不変。
   - 確認結果: build成功、表示不変。

### 注記（環境）

- `next build` 実行時に OneDrive のファイルロックで `EPERM unlink .next/static/...` が一度発生。`.next` を削除して再ビルドし解消（OneDrive同期競合。ソースには無関係）。
- 検証用に起動したサーバーが Windows 上で残存し `EADDRINUSE :3000` を起こすことがある。`Get-NetTCPConnection -LocalPort 3000` でPIDを特定し `Stop-Process` で終了する運用とした（`pkill -f next` はGit Bashからは効かない場合あり）。

<!--
以降、コード修正を適用したらこの下（このコメントの直前）に新しい日付セクションを追記する。
テンプレート:

## YYYY-MM-DD — 担当

### <修正タイトル>
- 変更ファイル:
- 内容:
- 理由:
- 影響範囲:
- 確認結果:
-->
