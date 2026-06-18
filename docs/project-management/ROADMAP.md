# ROADMAP

状態: Not Started / In Progress / Blocked / Completed / Deferred
最終更新: 2026-06-19 (session 12)

| 項目 | 状態 | 備考 |
|---|---|---|
| **人間向け運用基盤（起動/確認/dev-check）** | Completed | 役割別 .cmd ランチャー / verify スモーク / dev-check / 開発バー / mock reset / LOCAL_VERIFICATION_GUIDE。本番ガード（PM-015） |
| **Phase 1 公開サイト** | Completed | 全15ルート、SEO/JSON-LD、OG PNG、favicon、soft-404修正 |
| **Phase 2A 販売・運用管理基盤** | Impl Complete / Validation Pending | コード完了（基盤/管理UI CRUD/SSR/read+write repo/認証切替/注文メモ0006）。実 Supabase 接続での検証が残（タグ未付与） |
| ├ データ基盤（migration/seed/RLS/ER/切替） | Completed | 実DB適用は env 待ち |
| ├ ドメインロジック（money/状態/RBAC/受付） | Completed | テスト45件 |
| ├ 管理画面 i18n + ナビ権限マップ | Completed | ルート未実装 |
| ├ 管理画面 scaffold（flag/auth adapter/dashboard/products[読取]） | Completed | `ADMIN_ENABLED` 既定OFF→真の404。mock認証 `ADMIN_DEV_ROLE` |
| ├ 書込レイヤ（interface/service/mock/テスト） | Completed | RBAC+状態遷移+在庫整合性+冪等+監査。test 72 |
| ├ 管理画面 CRUD 接続（書込） | Completed | 商品[status/delete/restore]/在庫[create/move/status]/注文[create/status/notes/reopen]/買付[create/status]/Journal[draft/translation/publish/delete]。I-008(metadata)解決 |
| ├ Supabase クライアント基盤 / SSR | Completed | `@supabase/supabase-js` + `@supabase/ssr`。client(anon)/server(admin+auth)/middleware。proxy は configured 時のみ session 更新 |
| ├ Supabase Auth / セッション保護 | Impl Complete / Validation Pending | `getAdminSession` を `ADMIN_AUTH_MODE` で mock⇄Supabase 切替（user_roles/profiles self-read RLS）。実ログイン疎通は実 DB 接続後 |
| ├ SupabaseCommerceRepository（読取/書込）実装 | Impl Complete / Validation Pending | 実クエリ実装完了（write: RPC/原子/冪等、read: 埋め込み select、エラー変換 + 単体テスト）。**実 DB 検証待ち**（contract test skip, docs/SUPABASE_SETUP.md） |
| ├ 注文メモ恒久化（migration 0006） | Completed | provisional_orders に customer/internal note 列。write repo 列 UPDATE。contract test 追加 |
| **Phase 2B 仕入・原価・在庫・利益** | In Progress | schema(0003)あり。**完了**: 原価配賦/抹茶FIFO・賞味期限/仕入先データ層(repo/mock/supabase/service/contract, 0007)/入金・配送 状態機械+送料差額/利益計算/会計 export interface(冪等mock)。**残**: 買付・仕入記録・陶器個体・経費 repository、入金/配送/利益の永続化、全ドメイン管理UI、ダッシュボード |
| ├ 純ロジック（原価配賦/抹茶FIFO/利益/状態機械） | Completed | costAllocation/matchaLot/profit/payment・shipmentStatus。整数最小単位・通貨不一致拒否・決定的丸め |
| ├ 仕入先データ層 + migration 0007 | Completed | ProcurementRepository(mock/supabase)+service(purchase:manage)+contract。公開投影で非公開を遮断 |
| ├ 会計 export interface | Completed | management-accounting の入口 IF + 冪等 mock。法定会計/税務は対象外（§4） |
| ├ 配送永続化（0008, FulfillmentRepository） | Completed | shipments.status + 履歴 + RLS。状態機械強制（member）。送料差額 |
| ├ 入金永続化（0009, PaymentRepository） | Completed | payment_type/expected/matching/paid_at。状態機械 + owner 限定 |
| ├ 仕入記録+原価配賦 永続化 | Completed | purchases/items/cost_allocations。allocateCost 適用・合計保存 |
| ├ 管理UI: 業務設定/仕入先/入金/配送/仕入記録 | Completed | session 13。AdminActionForm + service 経由 |
| ├ 抹茶ロット(0010)/陶器個体(0011)/経費(0012) 永続化+UI | Completed | session 14。core+repo+mock+supabaseスケルトン+service+test。原価/経費/利益は owner 限定 |
| ├ 利益分析 + 経営ダッシュボード | Completed | session 14。記録済みデータからの概算（profit:view=owner）。ダッシュボードはロール別指標 |
| ├ 会計export永続化+UI | Completed | session 14。冪等 exporter + /admin/accounting（owner）。migration 0013 |
| ├ 画像管理基盤 + Media UI | Completed | session 15。migration 0014。MIME/サイズ/寸法検証・パス正規化・private=owner。Supabase Storage 連携は実装待ち |
| **Phase 3 販売機能拡張** | In Progress | cart/checkout(手動振込mock,sandbox skeleton)/通知(mock)/SNS下書き+承認 完了。本番決済/送信/自動投稿なし。残: 顧客マイページ・複数通貨UI・再入荷通知配線 |
| ├ 各 Supabase repo 実クエリ実装（matcha/ceramic/expense/settings 等） | Not Started | 現状スケルトン。実 DB 接続時に実装＋contract test |
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
