-- 0011_ceramic_unit_lifecycle.sql
-- 陶器個体（一点物）の更新日時・論理削除サポート。既存列は改変せず追加のみ。
-- 状態（status）も追加: available / reserved / sold / archived（公開可否や在庫状態の粗い区分）。
-- RLS は 0004 の ceramic_units_member ポリシーが適用済み（追加ポリシー不要）。

alter table ceramic_units add column if not exists status text not null default 'available'
  check (status in ('available','reserved','sold','archived'));
alter table ceramic_units add column if not exists updated_at timestamptz not null default now();
alter table ceramic_units add column if not exists deleted_at timestamptz;

create trigger trg_ceramic_units_updated before update on ceramic_units
  for each row execute function set_updated_at();
