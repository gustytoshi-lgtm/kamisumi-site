-- 0016_customer_accounts.sql
-- 顧客マイページ基盤: Supabase Auth ユーザーと customers を明示リンクする。
-- 顧客本人には自分の customer / address / order のみを RLS で見せる。内部メモや全顧客 export は対象外。

create table customer_accounts (
  user_id uuid primary key references profiles(id) on delete cascade,
  organization_id uuid not null references organizations(id),
  customer_id uuid not null references customers(id) on delete cascade,
  preferred_locale text not null default 'zh-tw' check (preferred_locale in ('zh-tw','ja','en')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organization_id, customer_id)
);

create trigger trg_customer_accounts_updated before update on customer_accounts
  for each row execute function set_updated_at();

create index customer_accounts_customer_idx on customer_accounts (customer_id);

create or replace function is_customer_self(target_customer uuid)
returns boolean language sql stable as $$
  select exists (
    select 1 from customer_accounts ca
    where ca.customer_id = target_customer
      and ca.user_id = auth.uid()
      and ca.deleted_at is null
  );
$$;

alter table customer_accounts enable row level security;
create policy customer_accounts_self_read on customer_accounts for select
  using (user_id = auth.uid() and deleted_at is null);
create policy customer_accounts_self_update on customer_accounts for update
  using (user_id = auth.uid() and deleted_at is null)
  with check (user_id = auth.uid());
create policy customer_accounts_owner on customer_accounts for all
  using (has_org_role(organization_id, array['owner']))
  with check (has_org_role(organization_id, array['owner']));

create policy customers_self_read on customers for select
  using (is_customer_self(id));
create policy customers_self_update on customers for update
  using (is_customer_self(id))
  with check (is_customer_self(id));

create policy cust_addr_self on customer_addresses for all
  using (is_customer_self(customer_id))
  with check (is_customer_self(customer_id));

create policy orders_customer_self_read on provisional_orders for select
  using (customer_id is not null and is_customer_self(customer_id));
create policy order_items_customer_self_read on provisional_order_items for select
  using (
    exists (
      select 1 from provisional_orders o
      where o.id = order_id and o.customer_id is not null and is_customer_self(o.customer_id)
    )
  );
create policy order_events_customer_self_read on order_status_events for select
  using (
    exists (
      select 1 from provisional_orders o
      where o.id = order_id and o.customer_id is not null and is_customer_self(o.customer_id)
    )
  );

create policy sourcing_req_customer_self_read on sourcing_requests for select
  using (customer_id is not null and is_customer_self(customer_id));
