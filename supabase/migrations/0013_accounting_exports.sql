-- 0013_accounting_exports.sql
-- 会計 export のバッチ記録（冪等キーで二重計上防止）。外部会計ソフトへの「入口」のみ。
-- 税務会計・総勘定元帳・申告は自作しない（外部ソフト責務）。実 API キー・口座は保持しない。owner 限定。

create table accounting_exports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  idempotency_key text not null,
  status text not null check (status in ('exported','duplicate','error')),
  entry_count int not null default 0,
  exported_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (organization_id, idempotency_key)
);

alter table accounting_exports enable row level security;
create policy accounting_exports_owner on accounting_exports for all
  using (has_org_role(organization_id, array['owner']))
  with check (has_org_role(organization_id, array['owner']));
