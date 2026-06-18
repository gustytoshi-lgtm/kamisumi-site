import type { CeramicUnitRepository } from "@/repositories/core/ceramicUnitRepository";
import type {
  CeramicUnitCreateInput,
  CeramicUnitRecord,
  CeramicUnitStatus,
  CeramicUnitUpdateInput,
} from "@/repositories/core/ceramicUnitModels";
import type { CurrencyCode } from "@/types/commerce";
import { CommerceError, type ActorContext } from "@/repositories/core/writeModels";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { throwCommerce } from "@/lib/supabase/errors";

/**
 * Supabase 陶器個体 repository（ceramic_units, 0003 + 0011）。
 * 契約は mock と同一。cost の表示制御・RBAC は ceramicUnitService が担う（repository は cost を保持）。
 */
type Db = ReturnType<typeof getSupabaseAdminClient>;
function db(): Db {
  return getSupabaseAdminClient();
}

function mapUnit(row: Record<string, unknown>): CeramicUnitRecord {
  const costMinor = row.cost_amount_minor;
  return {
    id: row.id as string,
    productId: row.product_id as string,
    unitCode: row.unit_code as string,
    status: (row.status as CeramicUnitStatus) ?? "available",
    cost:
      costMinor != null
        ? { currency: (row.cost_currency as CurrencyCode) ?? "TWD", amountMinor: Number(costMinor) }
        : undefined,
    dimensions: (row.dimensions as string | null) ?? undefined,
    weightGrams: row.weight_grams != null ? Number(row.weight_grams) : undefined,
    glaze: (row.glaze as string | null) ?? undefined,
    condition: (row.condition as string | null) ?? undefined,
    variationNote: (row.variation_note as string | null) ?? undefined,
    boxIncluded: row.box_included != null ? Boolean(row.box_included) : undefined,
    inspectionResult: (row.inspection_result as string | null) ?? undefined,
    imageMediaId: (row.image_media_id as string | null) ?? undefined,
    createdAt: (row.created_at as string) ?? "",
    updatedAt: (row.updated_at as string) ?? "",
    deletedAt: (row.deleted_at as string | null) ?? undefined,
  };
}

async function getOrThrow(id: string): Promise<CeramicUnitRecord> {
  const client = db();
  const { data, error } = await client.from("ceramic_units").select("*").eq("id", id).maybeSingle();
  if (error) throwCommerce(error);
  if (!data) throw new CommerceError("not_found", `ceramic unit ${id} not found`);
  return mapUnit(data as Record<string, unknown>);
}

export const supabaseCeramicUnitRepository: CeramicUnitRepository = {
  async listUnits(options) {
    const client = db();
    let query = client.from("ceramic_units").select("*").order("unit_code", { ascending: true });
    if (options?.productId) query = query.eq("product_id", options.productId);
    if (!options?.includeDeleted) query = query.is("deleted_at", null);
    const { data, error } = await query;
    if (error) throwCommerce(error);
    return (data ?? []).map((r) => mapUnit(r as Record<string, unknown>));
  },
  async getUnit(id) {
    const client = db();
    const { data, error } = await client.from("ceramic_units").select("*").eq("id", id).maybeSingle();
    if (error) throwCommerce(error);
    return data ? mapUnit(data as Record<string, unknown>) : null;
  },
  async createUnit(input: CeramicUnitCreateInput, _ctx: ActorContext) {
    void _ctx;
    const client = db();
    const { data, error } = await client
      .from("ceramic_units")
      .insert({
        product_id: input.productId,
        unit_code: input.unitCode,
        cost_currency: input.costCurrency,
        cost_amount_minor: input.costMinor,
        dimensions: input.dimensions,
        weight_grams: input.weightGrams,
        glaze: input.glaze,
        condition: input.condition,
        variation_note: input.variationNote,
        box_included: input.boxIncluded,
        inspection_result: input.inspectionResult,
      })
      .select("*")
      .single();
    if (error) throwCommerce(error);
    return mapUnit(data as Record<string, unknown>);
  },
  async updateUnit(id, patch: CeramicUnitUpdateInput, _ctx) {
    void _ctx;
    const client = db();
    const update: Record<string, unknown> = {};
    if (patch.dimensions !== undefined) update.dimensions = patch.dimensions;
    if (patch.weightGrams !== undefined) update.weight_grams = patch.weightGrams;
    if (patch.glaze !== undefined) update.glaze = patch.glaze;
    if (patch.condition !== undefined) update.condition = patch.condition;
    if (patch.variationNote !== undefined) update.variation_note = patch.variationNote;
    if (patch.boxIncluded !== undefined) update.box_included = patch.boxIncluded;
    if (patch.inspectionResult !== undefined) update.inspection_result = patch.inspectionResult;
    if (Object.keys(update).length > 0) {
      const { error } = await client.from("ceramic_units").update(update).eq("id", id);
      if (error) throwCommerce(error);
    }
    return getOrThrow(id);
  },
  async setStatus(id, status: CeramicUnitStatus, _ctx) {
    void _ctx;
    const client = db();
    const { error } = await client.from("ceramic_units").update({ status }).eq("id", id);
    if (error) throwCommerce(error);
    return getOrThrow(id);
  },
  async softDeleteUnit(id, _ctx) {
    void _ctx;
    const client = db();
    const { error } = await client
      .from("ceramic_units")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throwCommerce(error);
    return getOrThrow(id);
  },
  async restoreUnit(id, _ctx) {
    void _ctx;
    const client = db();
    const { error } = await client.from("ceramic_units").update({ deleted_at: null }).eq("id", id);
    if (error) throwCommerce(error);
    return getOrThrow(id);
  },
};
