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
| ├ Supabase Auth / セッション保護 | Not Started | `@supabase/supabase-js` 導入 + middleware/server layout |
| ├ SupabaseCommerceRepository 実装 | Not Started | スタブあり。スキーマと同契約で実装 |
| ├ 管理画面ルート/CRUD UI | Not Started | `/[locale]/admin/*`、feature flag で無効既定 |
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
