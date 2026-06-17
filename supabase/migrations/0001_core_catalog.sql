-- 0001_core_catalog.sql
-- KAGURAKOJI Commerce Core: 組織構造 + 商品カタログ + 公開コンテンツ
-- 方針:
--   * 金額は最小通貨単位の整数（*_minor）+ currency_code(char3) で保持し、浮動小数点を使わない。
--   * 多テナント拡張のため organization/brand/store/warehouse/sales_channel を最初から分離。
--   * 翻訳は *_translations（locale 行）に分離し、コードへラベルを直書きしない設計と揃える。
--   * created_at/updated_at と deleted_at（論理削除）を共通付与。
--   * 公開読み取り対象（products/journal/sourcing/faq）。RLS は 0004 で付与。

create extension if not exists pgcrypto;

-- 共通: updated_at 自動更新トリガ
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============ 組織構造 ============
create table organizations (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,           -- 例: kagurakoji
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table business_units (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  code text not null,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organization_id, code)
);

create table brands (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  code text not null,                  -- 例: kamisumi
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organization_id, code)
);

create table warehouses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  code text not null,
  name text not null,
  country_code char(2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organization_id, code)
);

create table stores (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brands(id),
  code text not null,                  -- 例: kamisumi-tw
  name text not null,
  default_locale text not null,        -- zh-tw / ja / en
  default_currency char(3) not null,   -- TWD / JPY / USD
  country_code char(2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (brand_id, code)
);

create table sales_channels (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id),
  code text not null,                  -- 例: web
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (store_id, code)
);

-- ============ 商品カタログ ============
create table products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  brand_id uuid not null references brands(id),
  store_id uuid not null references stores(id),
  warehouse_id uuid references warehouses(id),
  sales_channel_id uuid references sales_channels(id),
  slug text not null,
  sku text not null,
  type text not null check (type in ('matcha','ceramic','tea_tool','gift_set','original')),
  category text not null check (category in ('matcha','ceramics','tea-tools','gift-sets','originals')),
  public_status text not null check (public_status in (
    'in_stock','low_stock','preorder','sourcing_available','awaiting_arrival',
    'reserved','sold_out','restock_request','archive','coming_soon')),
  is_original boolean not null default false,
  is_archive boolean not null default false,
  is_new_arrival boolean not null default false,
  -- 価格（公開・最小通貨単位の整数）
  price_currency char(3) not null,
  price_amount_minor bigint not null default 0,
  region_code char(2),
  external_product_id text,
  external_variant_id text,
  published_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (store_id, slug),
  unique (organization_id, sku)
);

-- 参考価格（JPY/USD 等の複数通貨。表示専用）
create table product_reference_prices (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  currency char(3) not null,
  amount_minor bigint not null,
  created_at timestamptz not null default now()
);

-- 商品翻訳（locale 行）
create table product_translations (
  product_id uuid not null references products(id) on delete cascade,
  locale text not null,                -- zh-tw / ja / en
  title text not null,
  short_description text,
  description text,
  story text,
  brand_name text,
  maker_name text,
  region text,
  shipping_note text,
  estimated_dispatch text,
  primary key (product_id, locale)
);

create table product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  src text not null,
  kind text not null check (kind in ('brand','documentary','detail')),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table product_image_alt (
  image_id uuid not null references product_images(id) on delete cascade,
  locale text not null,
  alt text not null,
  primary key (image_id, locale)
);

-- 抹茶/陶器の詳細は柔軟性のため jsonb（翻訳・配列を含む構造）で保持
create table product_matcha_detail (
  product_id uuid primary key references products(id) on delete cascade,
  data jsonb not null default '{}'::jsonb
);

create table product_ceramic_detail (
  product_id uuid primary key references products(id) on delete cascade,
  data jsonb not null default '{}'::jsonb
);

-- 関連商品/関連記事（slug/id 参照）
create table product_related_products (
  product_id uuid not null references products(id) on delete cascade,
  related_slug text not null,
  primary key (product_id, related_slug)
);

create table product_related_journal (
  product_id uuid not null references products(id) on delete cascade,
  related_journal_id text not null,
  primary key (product_id, related_journal_id)
);

-- ============ 公開コンテンツ: Journal ============
create table journal_posts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  brand_id uuid not null references brands(id),
  legacy_id text unique,               -- mock の journal-* id 互換
  slug text not null unique,
  category text not null check (category in (
    'tea-notes','craft-stories','sourcing-diary','care-and-use','making-kamisumi')),
  cover_image_src text,
  source_thread_url text,
  status text not null default 'published' check (status in ('draft','scheduled','published','unlisted')),
  published_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table journal_translations (
  journal_post_id uuid not null references journal_posts(id) on delete cascade,
  locale text not null,
  title text not null,
  excerpt text,
  cover_image_alt text,
  body jsonb not null default '[]'::jsonb,  -- 段落の配列
  primary key (journal_post_id, locale)
);

create table journal_related_products (
  journal_post_id uuid not null references journal_posts(id) on delete cascade,
  related_slug text not null,
  primary key (journal_post_id, related_slug)
);

-- ============ 公開コンテンツ: 買付予定 ============
create table sourcing_schedules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  brand_id uuid not null references brands(id),
  schedule_date date not null,
  categories text[] not null default '{}',
  application_deadline date,
  status text not null check (status in (
    'before_open','open','limited','closed','sourcing','completed','cancelled')),
  accepts_requests boolean not null default true,
  -- 受付停止条件（設定可能。NULL は無制限）
  max_requests int,
  max_quantity int,
  manually_stopped boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table sourcing_schedule_translations (
  sourcing_schedule_id uuid not null references sourcing_schedules(id) on delete cascade,
  locale text not null,
  region text,
  public_location_name text,
  note text,
  primary key (sourcing_schedule_id, locale)
);

-- ============ 公開コンテンツ: FAQ ============
create table faqs (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brands(id),
  category text not null check (category in ('order','shipping','sourcing','product','legal')),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table faq_translations (
  faq_id uuid not null references faqs(id) on delete cascade,
  locale text not null,
  question text not null,
  answer text not null,
  primary key (faq_id, locale)
);

-- updated_at トリガ
create trigger trg_products_updated before update on products
  for each row execute function set_updated_at();
create trigger trg_journal_updated before update on journal_posts
  for each row execute function set_updated_at();
create trigger trg_sourcing_updated before update on sourcing_schedules
  for each row execute function set_updated_at();
create trigger trg_stores_updated before update on stores
  for each row execute function set_updated_at();
