import type { MatchaLotRepository } from "@/repositories/core/matchaLotRepository";
import type {
  MatchaLotCreateInput,
  MatchaLotRecord,
  MatchaLotUpdateInput,
} from "@/repositories/core/matchaLotModels";
import { CommerceError, type ActorContext } from "@/repositories/core/writeModels";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { throwCommerce } from "@/lib/supabase/errors";

/**
 * Supabase 抹茶ロット repository（matcha_lots, 0001 + 0010）。
 * matcha_lots に organization_id 列はないため、organizationId は products との埋め込み結合で取得する
 * （RLS も products.organization_id 経由, 0004）。
 * 注: adjustQuantity は DB function `adjust_matcha_lot_quantity`（migration 0019）経由で原子化済み
 * （FOR UPDATE 行ロック + 非負/予約ガード）。同時更新でもロスト・アップデートしない。
 */
type Db = ReturnType<typeof getSupabaseAdminClient>;
function db(): Db {
  return getSupabaseAdminClient();
}

const SELECT = "*, products(organization_id)";

function mapLot(row: Record<string, unknown>): MatchaLotRecord {
  const product = row.products as { organization_id?: string } | null;
  return {
    id: row.id as string,
    organizationId: product?.organization_id ?? "",
    productId: row.product_id as string,
    lotCode: (row.lot_code as string | null) ?? undefined,
    teaHouse: (row.tea_house as string | null) ?? undefined,
    bestBefore: (row.best_before as string | null) ?? undefined,
    purchasedOn: (row.purchased_on as string | null) ?? undefined,
    storageLocation: (row.storage_location as string | null) ?? undefined,
    quantity: Number(row.quantity ?? 0),
    reserved: Number(row.reserved_count ?? 0),
    incoming: Number(row.incoming_count ?? 0),
    fifoSeq: Number(row.fifo_seq ?? 0),
    createdAt: (row.created_at as string) ?? "",
    updatedAt: (row.updated_at as string) ?? "",
    deletedAt: (row.deleted_at as string | null) ?? undefined,
  };
}

async function getOrThrow(id: string): Promise<MatchaLotRecord> {
  const client = db();
  const { data, error } = await client.from("matcha_lots").select(SELECT).eq("id", id).maybeSingle();
  if (error) throwCommerce(error);
  if (!data) throw new CommerceError("not_found", `matcha lot ${id} not found`);
  return mapLot(data as Record<string, unknown>);
}

export const supabaseMatchaLotRepository: MatchaLotRepository = {
  async listLots(options) {
    const client = db();
    let query = client.from("matcha_lots").select(SELECT).order("fifo_seq", { ascending: true });
    if (options?.productId) query = query.eq("product_id", options.productId);
    if (!options?.includeDeleted) query = query.is("deleted_at", null);
    const { data, error } = await query;
    if (error) throwCommerce(error);
    return (data ?? []).map((r) => mapLot(r as Record<string, unknown>));
  },
  async getLot(id) {
    const client = db();
    const { data, error } = await client.from("matcha_lots").select(SELECT).eq("id", id).maybeSingle();
    if (error) throwCommerce(error);
    return data ? mapLot(data as Record<string, unknown>) : null;
  },
  async createLot(input: MatchaLotCreateInput, _ctx: ActorContext) {
    void _ctx;
    const client = db();
    const { data, error } = await client
      .from("matcha_lots")
      .insert({
        product_id: input.productId,
        lot_code: input.lotCode,
        tea_house: input.teaHouse,
        best_before: input.bestBefore || null,
        purchased_on: input.purchasedOn || null,
        storage_location: input.storageLocation,
        quantity: input.quantity ?? 0,
      })
      .select("id")
      .single();
    if (error) throwCommerce(error);
    return getOrThrow((data as { id: string }).id);
  },
  async updateLot(id, patch: MatchaLotUpdateInput, _ctx) {
    void _ctx;
    const client = db();
    const update: Record<string, unknown> = {};
    if (patch.lotCode !== undefined) update.lot_code = patch.lotCode;
    if (patch.teaHouse !== undefined) update.tea_house = patch.teaHouse;
    if (patch.bestBefore !== undefined) update.best_before = patch.bestBefore || null;
    if (patch.purchasedOn !== undefined) update.purchased_on = patch.purchasedOn || null;
    if (patch.storageLocation !== undefined) update.storage_location = patch.storageLocation;
    if (Object.keys(update).length > 0) {
      const { error } = await client.from("matcha_lots").update(update).eq("id", id);
      if (error) throwCommerce(error);
    }
    return getOrThrow(id);
  },
  async adjustQuantity(id, delta, _ctx) {
    void _ctx;
    // 原子的に増減（FOR UPDATE 行ロック + 非負ガードを DB function に閉じ込める。migration 0019）。
    const client = db();
    const { error } = await client.rpc("adjust_matcha_lot_quantity", { p_lot_id: id, p_delta: delta });
    if (error) {
      const message = error.message ?? "";
      if (message.includes("matcha_lot_not_found")) {
        throw new CommerceError("not_found", `matcha lot ${id} not found`, { id });
      }
      if (message.includes("matcha_lot_negative_stock")) {
        throw new CommerceError("negative_stock", "lot quantity would go negative", { id });
      }
      if (message.includes("matcha_lot_insufficient_stock")) {
        throw new CommerceError("insufficient_stock", "lot available would go negative", { id });
      }
      throwCommerce(error);
    }
    return getOrThrow(id);
  },
  async softDeleteLot(id, _ctx) {
    void _ctx;
    const client = db();
    const { error } = await client
      .from("matcha_lots")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throwCommerce(error);
    return getOrThrow(id);
  },
  async restoreLot(id, _ctx) {
    void _ctx;
    const client = db();
    const { error } = await client.from("matcha_lots").update({ deleted_at: null }).eq("id", id);
    if (error) throwCommerce(error);
    return getOrThrow(id);
  },
};
