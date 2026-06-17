-- 0003_procurement.sql
-- Phase 2B: 仕入/買付・原価配賦・為替・入金・配送・抹茶ロット・陶器個体
-- 方針:
--   * 金額は最小通貨単位の整数（*_minor）+ currency。浮動小数点で金額計算しない。
--   * 原価・利益は機微情報（RLS で front_staff から遮断、0004）。
--   * 仕入先の公開レベルを段階管理。実銀行口座番号は保存しない。
--   * 税務申告/総勘定元帳/法定会計は自作しない（export interface のみ Phase 4）。

-- ============ 仕入先 ============
create table suppliers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  name text not null,
  region text,
  public_level text not null default 'private' check (public_level in (
    'public','brand_only','region_only','private')),
  note text,                           -- 内部メモ（公開しない）
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- ============ 為替レート ============
create table exchange_rates (
  id uuid primary key default gen_random_uuid(),
  base_currency char(3) not null,
  quote_currency char(3) not null,
  rate numeric(18,8) not null,         -- 表示/換算用。金額そのものは整数で別管理
  rate_type text not null check (rate_type in ('purchase','pricing','payment','accounting')),
  effective_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- ============ 仕入記録（買付イベント） ============
create table purchases (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  supplier_id uuid references suppliers(id),
  schedule_id uuid references sourcing_schedules(id),
  purchased_on date not null,
  currency char(3) not null,           -- 仕入通貨
  exchange_rate numeric(18,8),         -- 仕入時為替
  -- 付帯費用（最小通貨単位の整数）
  domestic_shipping_minor bigint not null default 0,
  transport_minor bigint not null default 0,
  parking_minor bigint not null default 0,
  highway_minor bigint not null default 0,
  other_expense_minor bigint not null default 0,
  receipt_media_id uuid references media_assets(id),  -- private bucket
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table purchase_items (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references purchases(id) on delete cascade,
  product_id uuid references products(id),
  description text,
  quantity int not null default 1 check (quantity > 0),
  unit_price_minor bigint not null default 0,
  tax_minor bigint not null default 0,
  discount_minor bigint not null default 0,
  created_at timestamptz not null default now()
);

-- 原価配賦（付帯費用を商品/明細へ按分した結果。method を記録）
create table cost_allocations (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references purchases(id) on delete cascade,
  purchase_item_id uuid references purchase_items(id) on delete cascade,
  method text not null check (method in (
    'quantity','amount','weight','volume','manual','none')),
  allocated_currency char(3) not null,
  allocated_amount_minor bigint not null default 0,
  created_at timestamptz not null default now()
);

-- ============ 抹茶ロット ============
create table matcha_lots (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id),
  tea_house text,
  lot_code text,
  weight_grams int,
  purchased_on date,
  best_before date,
  storage_location text,
  purchase_limit text,
  reserved_count int not null default 0,
  incoming_count int not null default 0,
  fifo_seq bigserial,                  -- 先入先出順
  created_at timestamptz not null default now()
);

-- ============ 陶器個体（一点物） ============
create table ceramic_units (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id),
  unit_code text not null,
  cost_currency char(3),
  cost_amount_minor bigint,
  image_media_id uuid references media_assets(id),
  dimensions text,
  weight_grams int,
  glaze text,
  condition text,                      -- 状態/傷
  variation_note text,                 -- 個体差
  box_included boolean,
  inspection_result text,
  created_at timestamptz not null default now(),
  unique (product_id, unit_code)
);

-- ============ 入金 ============
-- 初期は台湾口座振込の手動確認。実口座番号は保存しない。
create table payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  order_id uuid references provisional_orders(id),
  status text not null default 'unbilled' check (status in (
    'unbilled','billed','unpaid','partially_paid','paid','overpaid','underpaid','refunded')),
  currency char(3) not null,
  amount_minor bigint not null default 0,
  exchange_rate numeric(18,8),         -- 入金時為替
  confirmed_at timestamptz,
  confirmed_by uuid references profiles(id),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ 配送 ============
create table shipments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  order_id uuid references provisional_orders(id),
  carrier text,
  method text,
  weight_grams int,
  size_note text,
  actual_cost_minor bigint,
  charged_cost_minor bigint,           -- 顧客請求送料
  kamisumi_bears_minor bigint,         -- KAMISUMI 負担
  cost_currency char(3),
  tracking_number text,
  shipped_on date,
  delivered_on date,
  damaged boolean not null default false,
  returned boolean not null default false,
  reshipped boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_suppliers_updated before update on suppliers
  for each row execute function set_updated_at();
create trigger trg_purchases_updated before update on purchases
  for each row execute function set_updated_at();
create trigger trg_payments_updated before update on payments
  for each row execute function set_updated_at();
create trigger trg_shipments_updated before update on shipments
  for each row execute function set_updated_at();

-- 利益分析は機微ビューとして別途定義する想定（注文別粗利・カテゴリ別など）。
-- 実装は実データ構造確定後（Phase 2B 後半）に追加し、RLS/権限で cost:view / profit:view に限定する。
