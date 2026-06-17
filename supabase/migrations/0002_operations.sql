-- 0002_operations.sql
-- 管理運用ドメイン: 認証プロファイル/ロール、顧客、問い合わせ、仮注文、在庫、買付依頼、メディア、設定、操作履歴
-- 方針:
--   * 個人情報は必要最小限。住所は注文確定段階で取得（customer_addresses 分離）。
--   * 在庫数は inventory_movements に履歴を残す（単純上書きにしない）。
--   * RLS は 0004。ここではテーブルと制約・既定値のみ。

-- ============ 認証/ロール ============
-- profiles は Supabase auth.users と 1:1（id = auth.uid()）。
create table profiles (
  id uuid primary key,                 -- = auth.users.id
  display_name text,
  admin_locale text not null default 'ja' check (admin_locale in ('ja','zh-tw')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table user_roles (
  user_id uuid not null references profiles(id) on delete cascade,
  organization_id uuid not null references organizations(id),
  role text not null check (role in ('owner','front_staff','inventory_staff','editor')),
  brand_id uuid references brands(id),   -- 将来のブランド別権限用（NULL は組織全体）
  store_id uuid references stores(id),
  created_at timestamptz not null default now(),
  primary key (user_id, organization_id, role)
);

-- ============ 顧客 ============
create table customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  name text not null,
  email text,
  contact_handle text,                 -- LINE / Threads / Instagram 等
  country_code char(2),
  phone text,
  consented_at timestamptz,            -- 同意日時
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- 住所は必要になった段階で取得する構造（注文時配送先）
create table customer_addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  recipient_name text,
  country_code char(2),
  postal_code text,
  line1 text,
  line2 text,
  city text,
  region text,
  phone text,
  created_at timestamptz not null default now()
);

create table customer_notes (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  author_id uuid references profiles(id),
  body text not null,
  created_at timestamptz not null default now()
);

-- ============ 問い合わせ ============
create table inquiries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  customer_id uuid references customers(id),
  mode text not null check (mode in ('contact','sourcing')),
  name text,
  email text,
  contact_handle text,
  country_code char(2),
  message text,
  payload jsonb not null default '{}'::jsonb,  -- フォーム生データ（個人情報はログに出さない）
  status text not null default 'received' check (status in ('received','in_progress','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ 仮注文 / 注文 ============
create table provisional_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  brand_id uuid not null references brands(id),
  store_id uuid not null references stores(id),
  customer_id uuid references customers(id),
  status text not null default 'inquiry_received' check (status in (
    'inquiry_received','quote_preparing','quote_sent','payment_waiting','partially_paid',
    'deposit_paid','sourcing_scheduled','sourcing_in_progress','purchased','awaiting_arrival',
    'inspection_pending','shipping_quote_sent','balance_waiting','paid_in_full','packing',
    'shipped','delivered','completed','cancelled','refunded')),
  currency char(3) not null,
  -- 会計連携用（Phase 4。本番値は人間確定後）
  accounting_date date,
  tax_category text,
  tax_rate numeric(5,2),
  payment_method text,
  settlement_status text,
  invoice_number text,
  external_accounting_id text,
  journal_export_status text not null default 'not_exported'
    check (journal_export_status in ('not_exported','exported','error')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table provisional_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references provisional_orders(id) on delete cascade,
  product_id uuid references products(id),
  description text,                    -- 買付希望など商品未登録の場合
  quantity int not null default 1 check (quantity > 0),
  unit_price_currency char(3),
  unit_price_amount_minor bigint,
  created_at timestamptz not null default now()
);

create table order_status_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references provisional_orders(id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_by uuid references profiles(id),
  note text,
  created_at timestamptz not null default now()
);

-- ============ 在庫 ============
create table inventory_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  product_id uuid not null references products(id),
  warehouse_id uuid references warehouses(id),
  status text not null default 'available' check (status in (
    'available','reserved','held','awaiting_arrival','inspection_pending','packing','damaged','unavailable')),
  quantity int not null default 0,
  hold_expires_at timestamptz,         -- 取り置き期限（既定 48h。予約金入金済みは対象外）
  deposit_paid boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, warehouse_id)
);

create table inventory_movements (
  id uuid primary key default gen_random_uuid(),
  inventory_item_id uuid not null references inventory_items(id) on delete cascade,
  reason text not null check (reason in (
    'purchase_in','manual_adjust','reserve','release_reservation','hold','release_hold',
    'ship_out','mark_damaged','return_in','inspection')),
  quantity_delta int not null,
  resulting_quantity int not null,
  changed_by uuid references profiles(id),
  note text,
  created_at timestamptz not null default now()
);

-- ============ 買付依頼 ============
create table sourcing_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  brand_id uuid not null references brands(id),
  customer_id uuid references customers(id),
  schedule_id uuid references sourcing_schedules(id),
  desired_item text,
  item_url text,
  quantity int,
  budget_currency char(3),
  budget_amount_minor bigint,
  deadline text,
  allow_alternatives boolean,
  message text,
  status text not null default 'received' check (status in (
    'received','reviewing','accepted','declined','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table sourcing_request_status_events (
  id uuid primary key default gen_random_uuid(),
  sourcing_request_id uuid not null references sourcing_requests(id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_by uuid references profiles(id),
  note text,
  created_at timestamptz not null default now()
);

-- ============ メディア ============
-- bucket: public（商品/Journal/ブランド画像）, private（レシート/仕入証明/顧客関連/内部資料）
create table media_assets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  bucket text not null check (bucket in ('public','private')),
  path text not null,
  kind text not null,                  -- product / journal / brand / receipt / sourcing_proof / customer / internal
  mime_type text,
  byte_size bigint,
  width int,
  height int,
  uploaded_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  unique (bucket, path)
);

-- ============ 設定 ============
create table site_settings (
  organization_id uuid not null references organizations(id),
  key text not null,
  value jsonb not null default '{}'::jsonb,
  is_secret boolean not null default false,  -- 機微設定（front_staff 閲覧不可）
  updated_by uuid references profiles(id),
  updated_at timestamptz not null default now(),
  primary key (organization_id, key)
);

-- ============ 操作履歴 ============
create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  actor_id uuid references profiles(id),
  action text not null,                -- create / update / delete / status_change / export ...
  entity_type text not null,
  entity_id text,
  summary text,                        -- 個人情報そのものは入れない（要約のみ）
  diff jsonb,
  created_at timestamptz not null default now()
);

-- updated_at トリガ
create trigger trg_customers_updated before update on customers
  for each row execute function set_updated_at();
create trigger trg_orders_updated before update on provisional_orders
  for each row execute function set_updated_at();
create trigger trg_inventory_updated before update on inventory_items
  for each row execute function set_updated_at();
create trigger trg_sourcing_req_updated before update on sourcing_requests
  for each row execute function set_updated_at();
create trigger trg_inquiries_updated before update on inquiries
  for each row execute function set_updated_at();
