-- 0010_matcha_lot_quantity.sql
-- 抹茶ロットの永続化サポート（I-015）。既存列は改変せず、追加のみ。
--   * quantity: ロット単位の on-hand 数量（FIFO 引当の基礎。inventory_items とは別にロット粒度で保持）。
--   * updated_at / deleted_at: 更新日時・論理削除。
-- RLS は 0004 の matcha_lots_member ポリシーが既に適用済み（追加ポリシー不要）。

alter table matcha_lots add column if not exists quantity int not null default 0;
alter table matcha_lots add column if not exists updated_at timestamptz not null default now();
alter table matcha_lots add column if not exists deleted_at timestamptz;

create trigger trg_matcha_lots_updated before update on matcha_lots
  for each row execute function set_updated_at();
