# ROADMAP

状態: Not Started / In Progress / Blocked / Completed / Deferred
最終更新: 2026-06-18

| 項目 | 状態 | 備考 |
|---|---|---|
| **Phase 1 公開サイト** | Completed | 全15ルート、SEO/JSON-LD、OG PNG、favicon、soft-404修正 |
| **Phase 2A 販売・運用管理基盤** | In Progress | 基盤（型/スキーマ/RLS/repo切替/権限/i18n）完了。管理画面UI・Auth・実クエリ未着手 |
| ├ データ基盤（migration/seed/RLS/ER/切替） | Completed | 実DB適用は env 待ち |
| ├ ドメインロジック（money/状態/RBAC/受付） | Completed | テスト45件 |
| ├ 管理画面 i18n + ナビ権限マップ | Completed | ルート未実装 |
| ├ 管理画面 scaffold（flag/auth adapter/dashboard/products[読取]） | Completed | `ADMIN_ENABLED` 既定OFF→真の404。mock認証 `ADMIN_DEV_ROLE` |
| ├ 書込レイヤ（interface/service/mock/テスト） | Completed | RBAC+状態遷移+在庫整合性+冪等+監査。test 72 |
| ├ 管理画面 CRUD 接続（書込） | Completed | 商品[status/delete/restore]/在庫[create/move/status]/注文[create/status/notes/reopen]/買付[create/status]/Journal[draft/translation/publish/delete]。I-008(metadata)解決 |
| ├ Supabase クライアント基盤 | Completed | `@supabase/supabase-js` 2.108.2 + `src/lib/supabase/{client,server}.ts`（env guard + server-only） |
| ├ Supabase Auth / セッション保護 | Not Started | `getAdminSession` を Supabase Auth session+user_roles へ差替（呼び出し側不変） |
| ├ SupabaseCommerceRepository（読取/書込）実装 | Not Started | スタブ/スケルトンあり。0001-0005 と同契約で実装、contract test 流用（実 DB 環境待ち） |
| **Phase 2B 仕入・原価・在庫・利益** | Not Started | スキーマ(0003)とロードマップのみ。利益ビュー/FIFO/個体UI未 |
| **Phase 3 販売機能拡張** | Not Started | cart/checkout/payment/通知/SNS下書き interface（mock/sandbox） |
| **Phase 4 KAGURAKOJI Commerce Core** | Not Started | 複数ブランド/ストア、accounting export interface |
| 本番公開準備 | Blocked | 連絡先・法務・配送・支払い・実商品 確定が前提 |
| 実データ移行 | Not Started | mock → Supabase seed の完全化 |
| 法務確認 | Blocked | 特定商取引法・台湾食品輸入・返品/破損規定（人間/専門家） |
| 決済接続 | Deferred | 本番契約後。interface/sandbox のみ先行 |
| 運用開始 | Blocked | 上記確定後 |

## 完了タグ候補（Phase 完了時のみローカル付与・push しない）
- Phase 2A: `v0.2.0-phase2a`（管理画面UI/Auth/実クエリ完成後）
- Phase 2B: `v0.3.0-phase2b`
- Phase 3: `v0.4.0-phase3`
- Phase 4: `v0.5.0-commerce-core`

> 現時点では Phase 2A は **基盤のみ**完了のため、`v0.2.0-phase2a` は未付与。
