-- seed.sql
-- 開発用の公開可能サンプルのみ。顧客情報・実注文・銀行口座・原価・内部仕入先メモは投入しない。
-- Phase 1 mock data（src/content/kamisumi/*）の代表サンプルを最小限で再現する。
-- 全 mock データの完全 seed 化は follow-up（WORK_LOG / ROADMAP 参照）。

-- 固定 UUID（seed の参照を簡単にするため）
-- org/brand/store/warehouse/channel
insert into organizations (id, code, name) values
  ('00000000-0000-0000-0000-0000000000a1', 'kagurakoji', 'KAGURAKOJI')
  on conflict (code) do nothing;

insert into brands (id, organization_id, code, name) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1', 'kamisumi', 'KAMISUMI')
  on conflict (organization_id, code) do nothing;

insert into warehouses (id, organization_id, code, name, country_code) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', 'japan-home', 'Japan Home Base', 'JP')
  on conflict (organization_id, code) do nothing;

insert into stores (id, brand_id, code, name, default_locale, default_currency, country_code) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000b1', 'kamisumi-tw', 'KAMISUMI Taiwan', 'zh-tw', 'TWD', 'TW')
  on conflict (brand_id, code) do nothing;

insert into sales_channels (id, store_id, code, name) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000d1', 'web', 'Web')
  on conflict (store_id, code) do nothing;

-- 代表商品 1: 京都薄茶抹茶 Midori（low_stock）
insert into products (id, organization_id, brand_id, store_id, warehouse_id, sales_channel_id,
  slug, sku, type, category, public_status, is_new_arrival, price_currency, price_amount_minor, region_code, published_at)
values ('00000000-0000-0000-0000-000000010001',
  '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b1',
  '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000e1',
  'kyoto-usucha-midori', 'KMS-MAT-001', 'matcha', 'matcha', 'low_stock', true, 'TWD', 98000, 'JP', '2026-06-12')
  on conflict (store_id, slug) do nothing;

insert into product_translations (product_id, locale, title, short_description) values
  ('00000000-0000-0000-0000-000000010001', 'zh-tw', '京都薄茶抹茶 Midori', '香氣柔和，適合日常薄茶與牛奶飲品的少量現貨。'),
  ('00000000-0000-0000-0000-000000010001', 'ja', '京都薄茶抹茶 Midori', '香りが穏やかで、日常の薄茶やミルクに合わせやすい少量在庫です。'),
  ('00000000-0000-0000-0000-000000010001', 'en', 'Kyoto Usucha Matcha Midori', 'A soft, daily usucha matcha suited to whisked tea and milk drinks.')
  on conflict (product_id, locale) do nothing;

-- 代表商品 2: 美濃灰釉湯呑 Ash（in_stock）
insert into products (id, organization_id, brand_id, store_id, warehouse_id, sales_channel_id,
  slug, sku, type, category, public_status, price_currency, price_amount_minor, region_code, published_at)
values ('00000000-0000-0000-0000-000000010002',
  '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b1',
  '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000e1',
  'mino-yunomi-ash', 'KMS-CER-002', 'ceramic', 'ceramics', 'in_stock', 'TWD', 76000, 'JP', '2026-05-28')
  on conflict (store_id, slug) do nothing;

insert into product_translations (product_id, locale, title, short_description) values
  ('00000000-0000-0000-0000-000000010002', 'zh-tw', '美濃灰釉湯呑 Ash', '手感溫和的日常湯呑，適合日本茶與日常使用。'),
  ('00000000-0000-0000-0000-000000010002', 'ja', '美濃灰釉湯呑 Ash', '手になじむ日常使いの湯呑。日本茶に合わせやすい器です。'),
  ('00000000-0000-0000-0000-000000010002', 'en', 'Mino Ash Glaze Yunomi', 'A gentle everyday yunomi for Japanese tea.')
  on conflict (product_id, locale) do nothing;

-- 代表 Journal 1
insert into journal_posts (id, organization_id, brand_id, legacy_id, slug, category, status, published_at) values
  ('00000000-0000-0000-0000-000000020001', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b1',
   'journal-matcha-storage', 'matcha-storage-after-opening', 'care-and-use', 'published', '2026-06-05')
  on conflict (slug) do nothing;

insert into journal_translations (journal_post_id, locale, title, excerpt) values
  ('00000000-0000-0000-0000-000000020001', 'ja', '開封後の抹茶の保存', '開封後の抹茶を風味よく保つための基本。'),
  ('00000000-0000-0000-0000-000000020001', 'zh-tw', '開封後的抹茶保存', '開封後保持抹茶風味的基本方法。'),
  ('00000000-0000-0000-0000-000000020001', 'en', 'Storing Matcha After Opening', 'Basics for keeping opened matcha fresh.')
  on conflict (journal_post_id, locale) do nothing;

-- 代表 買付予定 1
insert into sourcing_schedules (id, organization_id, brand_id, schedule_date, categories, application_deadline, status, accepts_requests) values
  ('00000000-0000-0000-0000-000000030001', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b1',
   '2026-07-10', array['matcha','ceramics'], '2026-07-01', 'open', true)
  on conflict do nothing;

insert into sourcing_schedule_translations (sourcing_schedule_id, locale, region, public_location_name, note) values
  ('00000000-0000-0000-0000-000000030001', 'ja', '京都', '京都エリア', '抹茶と陶器の買付を予定しています。'),
  ('00000000-0000-0000-0000-000000030001', 'zh-tw', '京都', '京都地區', '預計採買抹茶與陶器。')
  on conflict (sourcing_schedule_id, locale) do nothing;

-- 代表 FAQ 1
insert into faqs (id, brand_id, category, sort_order) values
  ('00000000-0000-0000-0000-000000040001', '00000000-0000-0000-0000-0000000000b1', 'order', 0)
  on conflict do nothing;

insert into faq_translations (faq_id, locale, question, answer) values
  ('00000000-0000-0000-0000-000000040001', 'ja', '支払い方法は？', '在庫・送料確認後に正式な支払い方法を個別案内します。'),
  ('00000000-0000-0000-0000-000000040001', 'zh-tw', '付款方式為何？', '確認庫存與運費後，將個別說明正式付款方式。')
  on conflict (faq_id, locale) do nothing;
