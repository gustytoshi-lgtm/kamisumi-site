-- 0014_media_assets_meta.sql
-- メディア管理の付加メタ。既存列は改変せず追加のみ。
--   * alt_ja / alt_zh: 代替テキスト（日本語/繁體中文）。公開画像のアクセシビリティ用。
--   * sort_order: 並び替え。
--   * updated_at / deleted_at: 更新日時・論理削除（参照整合のため物理削除しない）。
-- RLS は 0004（media_public_read / media_member_write）が適用済み。private bucket の
-- 内部資料（レシート等）の閲覧制限はアプリ側 service（owner 限定）でも二重に行う。

alter table media_assets add column if not exists alt_ja text;
alter table media_assets add column if not exists alt_zh text;
alter table media_assets add column if not exists sort_order int not null default 0;
alter table media_assets add column if not exists updated_at timestamptz not null default now();
alter table media_assets add column if not exists deleted_at timestamptz;

create trigger trg_media_assets_updated before update on media_assets
  for each row execute function set_updated_at();
