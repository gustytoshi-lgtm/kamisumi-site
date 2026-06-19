-- 0017_checkout_orders.sql
-- 手動振込の注文台帳（公開 cart の checkout 由来）。
-- スタッフ運用の provisional_orders とは別物。本番決済はせず、照合参照のみを保持する。
-- 業務ルール（状態遷移・owner 限定・冪等）はアプリの service 層（checkoutOrder.ts）で強制し、
-- ここでは整合性（一意・CHECK・FK）と owner 限定 RLS を担保する。

create table checkout_orders (
  order_id text primary key,
  reference text not null unique,
  checkout_id text not null,
  organization_id uuid not null default '00000000-0000-0000-0000-0000000000a1' references organizations(id),
  currency text not null check (currency in ('TWD', 'JPY', 'USD')),
  amount_minor bigint not null check (amount_minor >= 0),
  order_status text not null check (order_status in (
    'inquiry_received', 'quote_preparing', 'quote_sent', 'payment_waiting',
    'partially_paid', 'deposit_paid', 'sourcing_scheduled', 'sourcing_in_progress',
    'purchased', 'awaiting_arrival', 'inspection_pending', 'shipping_quote_sent',
    'balance_waiting', 'paid_in_full', 'packing', 'shipped', 'delivered',
    'completed', 'cancelled', 'refunded'
  )),
  payment_status text not null check (payment_status in (
    'unbilled', 'billed', 'unpaid', 'partially_paid', 'paid', 'overpaid', 'underpaid', 'refunded'
  )),
  items jsonb not null default '[]'::jsonb,
  customer_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index checkout_orders_org_created_idx on checkout_orders (organization_id, created_at);
create index checkout_orders_payment_status_idx on checkout_orders (payment_status);

-- owner 限定。anon / 非 owner authenticated は到達不可。アプリは service role でアクセスし RLS をバイパスする。
alter table checkout_orders enable row level security;
create policy checkout_orders_owner on checkout_orders for all
  using (has_org_role(organization_id, array['owner']))
  with check (has_org_role(organization_id, array['owner']));
