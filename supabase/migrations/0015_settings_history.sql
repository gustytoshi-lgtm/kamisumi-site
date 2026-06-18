-- 0015_settings_history.sql
-- 業務設定の変更履歴（変更前後・操作者・日時）。site_settings（0002）は現在値、本表は履歴。
-- 機微設定も含むため owner 限定（RLS）。site_settings に updated_by/updated_at は既存。

create table setting_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  key text not null,
  old_value text,
  new_value text not null,
  changed_by uuid references profiles(id),
  changed_at timestamptz not null default now()
);

create index setting_history_key_idx on setting_history (organization_id, key, changed_at desc);

alter table setting_history enable row level security;
create policy setting_history_owner on setting_history for all
  using (has_org_role(organization_id, array['owner']))
  with check (has_org_role(organization_id, array['owner']));
