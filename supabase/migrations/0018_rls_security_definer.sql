-- 0018_rls_security_definer.sql
-- RLS ヘルパー関数を security definer 化し、関数内部の user_roles / customer_accounts への
-- SELECT に RLS を再適用させない。
--
-- 背景（実 DB RLS 検証で発覚, session 33）:
--   has_org_role / is_org_member / is_customer_self は language sql stable のみで、
--   呼び出し元（authenticated）の権限で実行されるため内部 SELECT に RLS が適用される。
--   user_roles の policy `user_roles_owner_manage` が has_org_role を呼ぶため、
--   has_org_role -> user_roles(RLS) -> has_org_role ... と無限再帰し、PostgREST が 500 を返す
--   （customer_accounts_owner -> has_org_role / customers_self_read -> is_customer_self も同様）。
--   その結果、member/owner 系の全テーブルが authenticated ロールから読めない（RLS が機能しない）。
--
-- 対処: 3 関数を security definer + 固定 search_path で再定義し、内部 SELECT を所有者権限
--       （RLS バイパス）で評価する。適用済み 0004/0016 は書き換えず、本番号で再定義する。

create or replace function has_org_role(target_org uuid, roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from user_roles ur
    where ur.user_id = auth.uid()
      and ur.organization_id = target_org
      and ur.role = any(roles)
  );
$$;

create or replace function is_org_member(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from user_roles ur
    where ur.user_id = auth.uid() and ur.organization_id = target_org
  );
$$;

create or replace function is_customer_self(target_customer uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from customer_accounts ca
    where ca.customer_id = target_customer
      and ca.user_id = auth.uid()
      and ca.deleted_at is null
  );
$$;
