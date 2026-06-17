# WORK_LOG

過去記録は削除せず追記する。新しい記録を上に追加。

---

## 2026-06-18 — Claude Code — Phase 2A 基盤

### 目的
Phase 1 を壊さず、KAGURAKOJI Commerce Core / Phase 2A の安全な技術基盤（データ・ドメインロジック・権限・i18n・移行）を確定する。

### 実施内容
1. 公開サイト仕上げ（前段）: soft-404 修正、favicon、OG画像PNG化（`/api/og`）、`stripLocale` 整理、`--space-5`。
2. Git ローカル初期化（`main`、baseline）。
3. ドメインロジック（純粋関数 + テスト）: money / orderStatus / inventoryStatus / rbac / sourcingAcceptance / adminNav。
4. データ基盤: `DATA_BACKEND` 切替（既定 mock）、Supabase adapter スタブ、`.env.example`。
5. `supabase/`: migrations 0001-0004（組織/カタログ/運用/仕入/RLS）、seed、ER.md、README、`db:validate` スクリプト。
6. 管理画面 i18n（ja/zh-tw）+ ナビ↔権限マップ（ルートなし）。
7. プロジェクト管理文書 `docs/project-management/*` を作成。

### 変更ファイル（主なもの）
- `src/lib/commerce/{money,orderStatus,inventoryStatus,rbac,sourcingAcceptance,adminNav}.ts`
- `src/config/dataBackend.ts`, `src/repositories/index.ts`, `src/repositories/supabase/supabaseCommerceRepository.ts`
- `src/dictionaries/admin/*`
- `src/app/api/og/route.tsx`, `src/lib/seo.ts`, `src/app/icon.svg`, `src/lib/routes.ts`, `src/styles/globals.css`
- `supabase/**`, `scripts/validate-migrations.mjs`, `.env.example`, `package.json`
- `tests/{money,commerceStatus,rbac,sourcingAcceptance,adminNav}.test.ts`
- `docs/project-management/*`

### migration
- 0001-0004 作成。実DB未適用（Supabase project なし）。`db:validate` OK。

### コマンド / テスト
- `npm run typecheck` 成功 / `npm run lint` 成功 / `npm run test` 45 passed / `npm run build` 79ページ成功 / `npm run db:validate` OK
- `npm run test:e2e` は OneDrive遅延で timeout（未解決・KNOWN_ISSUES I-001）

### 問題 / 解決
- OneDrive が `.next` をロックし `next build` が `EPERM unlink` で失敗 → `.next` 削除後に再ビルドで解消（再発防止は KNOWN_ISSUES I-003）。
- 当初 OG を `/og` に置いたが proxy が `/zh-tw/og` へリダイレクト → `/api/og`（matcher 除外）へ移動して解決。
- `next start` 残存で `EADDRINUSE :3000` → `Get-NetTCPConnection` で PID 特定し停止。

### 残課題
- 管理画面UI / Supabase Auth / 実Supabaseクエリ / 利益ビュー / Phase 2B-4 実装（ROADMAP 参照）。

### commit hash
- `cd3f608` baseline / `fd80f74` git docs / `c77bb8e` OG PNG / `45570a3` phase2a foundation / `fcd791f` admin i18n scaffold
