-- 0012_expenses.sql
-- 経費（営業経費）の記録。仕入の付帯費用(purchases.*)とは別の一般経費。
-- 金額は最小通貨単位の整数。機微（原価/採算）情報のため owner 限定（RLS）。

create table expenses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  expense_date date not null,
  category text not null check (category in (
    'shipping_supplies','transport','fees','rent','utilities','marketing','other')),
  currency char(3) not null,
  amount_minor bigint not null default 0,
  note text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create trigger trg_expenses_updated before update on expenses
  for each row execute function set_updated_at();

alter table expenses enable row level security;
-- 経費は原価/採算に直結する機微情報 → owner のみ（front_staff へ出さない）。
create policy expenses_owner on expenses for all
  using (has_org_role(organization_id, array['owner']))
  with check (has_org_role(organization_id, array['owner']));
