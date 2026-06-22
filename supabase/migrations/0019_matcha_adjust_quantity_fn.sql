-- 0019_matcha_adjust_quantity_fn.sql
-- matcha_lots の on-hand 数量増減を原子化する DB function。
--
-- 背景: supabaseMatchaLotRepository.adjustQuantity は read-modify-write（非原子）で、
--   同時更新時にロスト・アップデートの恐れがあった。apply_inventory_movement と同様に
--   FOR UPDATE 行ロック + 明示ガードを 1 関数に閉じ込めて原子化する。
--
-- エラーは呼び出し側（repo）が CommerceError へマップできるよう、認識可能なメッセージで raise する:
--   matcha_lot_not_found / matcha_lot_negative_stock / matcha_lot_insufficient_stock
-- 適用後 quantity>=0 かつ quantity-reserved_count>=0 を保証する。

create or replace function adjust_matcha_lot_quantity(p_lot_id uuid, p_delta int)
returns setof matcha_lots
language plpgsql
as $$
declare
  v_quantity int;
  v_reserved int;
begin
  select quantity, reserved_count into v_quantity, v_reserved
    from matcha_lots
    where id = p_lot_id
    for update;

  if not found then
    raise exception 'matcha_lot_not_found' using errcode = 'P0002';
  end if;
  if v_quantity + p_delta < 0 then
    raise exception 'matcha_lot_negative_stock' using errcode = 'P0001';
  end if;
  if (v_quantity + p_delta) - v_reserved < 0 then
    raise exception 'matcha_lot_insufficient_stock' using errcode = 'P0001';
  end if;

  return query
    update matcha_lots
      set quantity = quantity + p_delta
      where id = p_lot_id
      returning *;
end;
$$;
