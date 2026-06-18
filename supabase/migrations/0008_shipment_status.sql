-- 0008_shipment_status.sql
-- Phase 2B: 配送状態を恒久保存する。shipments(0003) に status / 状態更新メタを追加し、
-- 状態履歴テーブル shipment_status_events を新設する。
-- 方針:
--   * 0001-0007 は変更しない（追加 migration）。
--   * status は CHECK 制約で不正値を防止（shipmentStatus.ts の SHIPMENT_STATUSES と一致）。
--   * RLS は組織メンバー限定（shipments_member, 0004 と整合）。配送は front_staff も運用する。
--   * 操作履歴: 状態変更はイベント行 + audit_logs（アプリ層）に残す。

alter table shipments
  add column if not exists status text not null default 'preparing'
    check (status in ('preparing','shipped','delivered','returned','reshipped','cancelled')),
  add column if not exists status_updated_at timestamptz,
  add column if not exists status_updated_by uuid references profiles(id);

comment on column shipments.status is '配送状態（shipmentStatus.ts の状態機械で遷移を検証）';
comment on column shipments.status_updated_at is '状態最終更新日時';
comment on column shipments.status_updated_by is '状態最終更新者（profiles.id）';

create table if not exists shipment_status_events (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references shipments(id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_by uuid references profiles(id),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists idx_shipment_status_events_shipment on shipment_status_events(shipment_id);
create index if not exists idx_shipments_status on shipments(status);

alter table shipment_status_events enable row level security;
create policy shipment_status_events_member on shipment_status_events for all
  using (exists (select 1 from shipments s where s.id = shipment_id and is_org_member(s.organization_id)))
  with check (exists (select 1 from shipments s where s.id = shipment_id and is_org_member(s.organization_id)));
