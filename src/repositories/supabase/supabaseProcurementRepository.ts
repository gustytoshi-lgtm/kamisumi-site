import type { ProcurementRepository } from "@/repositories/core/procurementRepository";
import {
  toPublicSupplier,
  type SupplierPublicLevel,
  type SupplierRecord,
} from "@/repositories/core/procurementModels";
import { CommerceError, type ActorContext } from "@/repositories/core/writeModels";
import type { CurrencyCode } from "@/types/commerce";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { throwCommerce } from "@/lib/supabase/errors";

/**
 * Supabase 調達 repository（service role / RLS バイパス）。契約は mock と同一。
 * suppliers 列は 0003 + 0007（contact/default_currency/country_code/brand_id）。
 * RLS は suppliers_owner（0004）が owner に限定する。実 DB 検証は contract test（既定 skip）。
 */
type Db = ReturnType<typeof getSupabaseAdminClient>;
function db(): Db {
  return getSupabaseAdminClient();
}
function nowIso(): string {
  return new Date().toISOString();
}

async function writeAudit(
  client: Db,
  ctx: ActorContext,
  organizationId: string,
  action: string,
  entityId: string,
  summary?: string,
): Promise<void> {
  const { error } = await client.from("audit_logs").insert({
    organization_id: organizationId,
    actor_id: ctx.userId,
    action,
    entity_type: "supplier",
    entity_id: entityId,
    summary,
  });
  if (error) throwCommerce(error);
}

function mapSupplier(row: Record<string, unknown>): SupplierRecord {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    name: row.name as string,
    region: (row.region as string | null) ?? undefined,
    publicLevel: (row.public_level as SupplierPublicLevel) ?? "private",
    note: (row.note as string | null) ?? undefined,
    contact: (row.contact as string | null) ?? undefined,
    defaultCurrency: (row.default_currency as CurrencyCode | null) ?? undefined,
    countryCode: (row.country_code as string | null) ?? undefined,
    brandId: (row.brand_id as string | null) ?? undefined,
    createdAt: (row.created_at as string) ?? nowIso(),
    updatedAt: (row.updated_at as string) ?? nowIso(),
    deletedAt: (row.deleted_at as string | null) ?? undefined,
  };
}

export const supabaseProcurementRepository: ProcurementRepository = {
  async createSupplier(input, ctx) {
    const client = db();
    const { data, error } = await client
      .from("suppliers")
      .insert({
        organization_id: input.organizationId,
        name: input.name,
        region: input.region,
        public_level: input.publicLevel ?? "private",
        note: input.note,
        contact: input.contact,
        default_currency: input.defaultCurrency,
        country_code: input.countryCode,
        brand_id: input.brandId,
      })
      .select("*")
      .single();
    if (error) throwCommerce(error);
    const record = mapSupplier(data as Record<string, unknown>);
    await writeAudit(client, ctx, record.organizationId, "create", record.id, record.name);
    return record;
  },

  async updateSupplier(id, patch, ctx) {
    const client = db();
    const update: Record<string, unknown> = {};
    if (patch.name !== undefined) update.name = patch.name;
    if (patch.region !== undefined) update.region = patch.region;
    if (patch.publicLevel !== undefined) update.public_level = patch.publicLevel;
    if (patch.note !== undefined) update.note = patch.note;
    if (patch.contact !== undefined) update.contact = patch.contact;
    if (patch.defaultCurrency !== undefined) update.default_currency = patch.defaultCurrency;
    if (patch.countryCode !== undefined) update.country_code = patch.countryCode;
    if (patch.brandId !== undefined) update.brand_id = patch.brandId;
    const { data, error } = await client
      .from("suppliers")
      .update(update)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) throwCommerce(error);
    if (!data) throw new CommerceError("not_found", `supplier ${id} not found`);
    const record = mapSupplier(data as Record<string, unknown>);
    await writeAudit(client, ctx, record.organizationId, "update", id);
    return record;
  },

  async softDeleteSupplier(id, ctx) {
    const client = db();
    const { data, error } = await client
      .from("suppliers")
      .update({ deleted_at: nowIso() })
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) throwCommerce(error);
    if (!data) throw new CommerceError("not_found", `supplier ${id} not found`);
    const record = mapSupplier(data as Record<string, unknown>);
    await writeAudit(client, ctx, record.organizationId, "delete", id);
    return record;
  },

  async restoreSupplier(id, ctx) {
    const client = db();
    const { data, error } = await client
      .from("suppliers")
      .update({ deleted_at: null })
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) throwCommerce(error);
    if (!data) throw new CommerceError("not_found", `supplier ${id} not found`);
    const record = mapSupplier(data as Record<string, unknown>);
    await writeAudit(client, ctx, record.organizationId, "restore", id);
    return record;
  },

  async getSupplier(id) {
    const client = db();
    const { data, error } = await client.from("suppliers").select("*").eq("id", id).maybeSingle();
    if (error) throwCommerce(error);
    if (!data) return null;
    return mapSupplier(data as Record<string, unknown>);
  },

  async listSuppliers(options) {
    const client = db();
    let query = client.from("suppliers").select("*").order("created_at", { ascending: true });
    if (!options?.includeDeleted) query = query.is("deleted_at", null);
    const { data, error } = await query;
    if (error) throwCommerce(error);
    return (data ?? []).map((row) => mapSupplier(row as Record<string, unknown>));
  },

  async listPublicSuppliers() {
    const client = db();
    const { data, error } = await client
      .from("suppliers")
      .select("*")
      .is("deleted_at", null)
      .eq("public_level", "public")
      .order("name", { ascending: true });
    if (error) throwCommerce(error);
    return (data ?? []).map((row) => toPublicSupplier(mapSupplier(row as Record<string, unknown>)));
  },
};
