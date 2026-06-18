-- 0007_supplier_details.sql
-- Phase 2B: 仕入先（suppliers, 0003）に連絡先 / 既定通貨 / 国 / 主要ブランド関連を追加する。
-- 方針:
--   * 0001-0006 は変更しない（追加 migration）。
--   * RLS は suppliers_owner（0004）が新列にもそのまま適用（owner 限定）。front_staff からは遮断。
--   * 内部メモ note（0003）と同じく contact は公開しない（公開投影 PublicSupplier から除外）。
--   * 実銀行口座番号・実 API キーは保存しない。

alter table suppliers
  add column if not exists contact text,
  add column if not exists default_currency char(3),
  add column if not exists country_code char(2),
  add column if not exists brand_id uuid references brands(id);

comment on column suppliers.contact is '連絡先（内部のみ。公開しない）';
comment on column suppliers.default_currency is '既定の仕入通貨（TWD/JPY/USD 等）';
comment on column suppliers.country_code is '国コード（ISO-3166-1 alpha-2）';
comment on column suppliers.brand_id is '主要ブランド/作家/窯元との関連（任意, brands.id）';
