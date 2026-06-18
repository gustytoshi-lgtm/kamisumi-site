-- 0005_write_support.sql
-- 書込ユースケースの DB 側サポート（mock 書込 repository と同じ不変条件を Postgres でも保証）。
-- 方針:
--   * 在庫は available = quantity - reserved - held。reserved/held 列を追加。
--   * 在庫移動は単一の DB function apply_inventory_movement で「残高更新 + movement + 監査 + 冪等」を
--     1トランザクションで原子的に実行（途中状態を残さない）。アプリは RPC として呼ぶ。
--   * 冪等は idempotency_keys で二重実行を防止（在庫二重減算防止）。

-- 在庫の予約/取り置き列
alter table inventory_items add column if not exists reserved int not null default 0;
alter table inventory_items add column if not exists held int not null default 0;

-- 在庫移動の結果スナップショット列
alter table inventory_movements add column if not exists resulting_reserved int;
alter table inventory_movements add column if not exists resulting_held int;

-- 冪等キー
create table if not exists idempotency_keys (
  key text primary key,
  scope text not null,
  created_at timestamptz not null default now()
);
alter table idempotency_keys enable row level security;
create policy idempotency_member on idempotency_keys for all
  using (auth.uid() is not null) with check (auth.uid() is not null);

-- 原子的な在庫移動 + 監査 + 冪等
create or replace function apply_inventory_movement(
  p_item uuid,
  p_reason text,
  p_quantity_delta int default 0,
  p_reserved_delta int default 0,
  p_held_delta int default 0,
  p_actor uuid default null,
  p_note text default null,
  p_idempotency_key text default null
) returns inventory_items
language plpgsql
as $$
declare
  v_item inventory_items;
  v_q int;
  v_r int;
  v_h int;
begin
  -- 冪等: 既処理なら現在値を返す（再適用しない）
  if p_idempotency_key is not null then
    if exists (select 1 from idempotency_keys where key = p_idempotency_key) then
      select * into v_item from inventory_items where id = p_item;
      return v_item;
    end if;
  end if;

  -- 行ロックで競合を防ぐ
  select * into v_item from inventory_items where id = p_item for update;
  if not found then
    raise exception 'not_found: inventory %', p_item using errcode = 'P0002';
  end if;

  v_q := v_item.quantity + coalesce(p_quantity_delta, 0);
  v_r := coalesce(v_item.reserved, 0) + coalesce(p_reserved_delta, 0);
  v_h := coalesce(v_item.held, 0) + coalesce(p_held_delta, 0);

  if v_q < 0 then
    raise exception 'negative_stock' using errcode = 'P0001';
  end if;
  if v_r < 0 or v_h < 0 then
    raise exception 'conflict: reserved/held negative' using errcode = 'P0001';
  end if;
  if (v_q - v_r - v_h) < 0 then
    raise exception 'insufficient_stock' using errcode = 'P0001';
  end if;

  update inventory_items
    set quantity = v_q, reserved = v_r, held = v_h, updated_at = now()
    where id = p_item
    returning * into v_item;

  insert into inventory_movements (
    inventory_item_id, reason, quantity_delta, resulting_quantity, resulting_reserved, resulting_held, changed_by, note)
  values (p_item, p_reason, coalesce(p_quantity_delta, 0), v_q, v_r, v_h, p_actor, p_note);

  insert into audit_logs (organization_id, actor_id, action, entity_type, entity_id, summary)
  values (v_item.organization_id, p_actor, 'inventory_movement', 'inventory_item', p_item::text, p_reason);

  if p_idempotency_key is not null then
    insert into idempotency_keys (key, scope) values (p_idempotency_key, 'inventory_movement');
  end if;

  return v_item;
end;
$$;
