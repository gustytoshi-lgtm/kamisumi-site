import type { ProcurementRepository } from "@/repositories/core/procurementRepository";
import {
  purchaseAncillaryTotalMinor,
  purchaseItemNetMinor,
  toPublicSupplier,
  type CostAllocationRecord,
  type PurchaseItemRecord,
  type PurchaseRecord,
  type SupplierPublicLevel,
  type SupplierRecord,
} from "@/repositories/core/procurementModels";
import { CommerceError, type ActorContext } from "@/repositories/core/writeModels";
import type { CurrencyCode } from "@/types/commerce";
import { allocateCost, toDbMethod, type AllocationBasis } from "@/lib/commerce/costAllocation";
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
  entityType = "supplier",
): Promise<void> {
  const { error } = await client.from("audit_logs").insert({
    organization_id: organizationId,
    actor_id: ctx.userId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    summary,
  });
  if (error) throwCommerce(error);
}

function mapPurchaseItem(row: Record<string, unknown>): PurchaseItemRecord {
  return {
    id: row.id as string,
    purchaseId: row.purchase_id as string,
    productId: (row.product_id as string | null) ?? undefined,
    description: (row.description as string | null) ?? undefined,
    quantity: (row.quantity as number) ?? 1,
    unitPriceMinor: Number(row.unit_price_minor ?? 0),
    taxMinor: Number(row.tax_minor ?? 0),
    discountMinor: Number(row.discount_minor ?? 0),
  };
}

function mapAllocation(row: Record<string, unknown>): CostAllocationRecord {
  return {
    id: row.id as string,
    purchaseId: row.purchase_id as string,
    purchaseItemId: (row.purchase_item_id as string | null) ?? undefined,
    method: row.method as string,
    allocatedCurrency: row.allocated_currency as CurrencyCode,
    allocatedAmountMinor: Number(row.allocated_amount_minor ?? 0),
  };
}

function mapPurchase(
  row: Record<string, unknown>,
  items: Record<string, unknown>[],
  allocations: Record<string, unknown>[],
): PurchaseRecord {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    supplierId: (row.supplier_id as string | null) ?? undefined,
    scheduleId: (row.schedule_id as string | null) ?? undefined,
    purchasedOn: row.purchased_on as string,
    currency: row.currency as CurrencyCode,
    exchangeRate: (row.exchange_rate as number | null) ?? undefined,
    domesticShippingMinor: Number(row.domestic_shipping_minor ?? 0),
    transportMinor: Number(row.transport_minor ?? 0),
    parkingMinor: Number(row.parking_minor ?? 0),
    highwayMinor: Number(row.highway_minor ?? 0),
    otherExpenseMinor: Number(row.other_expense_minor ?? 0),
    note: (row.note as string | null) ?? undefined,
    items: items.map(mapPurchaseItem),
    allocations: allocations.map(mapAllocation),
    createdAt: (row.created_at as string) ?? nowIso(),
    updatedAt: (row.updated_at as string) ?? nowIso(),
    deletedAt: (row.deleted_at as string | null) ?? undefined,
  };
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

  async createPurchase(input, ctx) {
    const client = db();
    const { data, error } = await client
      .from("purchases")
      .insert({
        organization_id: input.organizationId,
        supplier_id: input.supplierId,
        schedule_id: input.scheduleId,
        purchased_on: input.purchasedOn,
        currency: input.currency,
        exchange_rate: input.exchangeRate,
        domestic_shipping_minor: input.domesticShippingMinor ?? 0,
        transport_minor: input.transportMinor ?? 0,
        parking_minor: input.parkingMinor ?? 0,
        highway_minor: input.highwayMinor ?? 0,
        other_expense_minor: input.otherExpenseMinor ?? 0,
        note: input.note,
      })
      .select("id")
      .single();
    if (error) throwCommerce(error);
    const purchaseId = (data as { id: string }).id;

    if (input.items && input.items.length > 0) {
      const { error: itemsError } = await client.from("purchase_items").insert(
        input.items.map((item) => ({
          purchase_id: purchaseId,
          product_id: item.productId,
          description: item.description,
          quantity: item.quantity,
          unit_price_minor: item.unitPriceMinor,
          tax_minor: item.taxMinor ?? 0,
          discount_minor: item.discountMinor ?? 0,
        })),
      );
      if (itemsError) throwCommerce(itemsError);
    }

    await writeAudit(client, ctx, input.organizationId as string, "create", purchaseId, input.supplierId, "purchase");
    const created = await this.getPurchase(purchaseId);
    if (!created) throw new CommerceError("not_found", `purchase ${purchaseId} not found after create`);
    return created;
  },

  async getPurchase(id) {
    const client = db();
    const { data, error } = await client.from("purchases").select("*").eq("id", id).maybeSingle();
    if (error) throwCommerce(error);
    if (!data) return null;
    const [{ data: items, error: itemsError }, { data: allocs, error: allocError }] = await Promise.all([
      client.from("purchase_items").select("*").eq("purchase_id", id),
      client.from("cost_allocations").select("*").eq("purchase_id", id),
    ]);
    if (itemsError) throwCommerce(itemsError);
    if (allocError) throwCommerce(allocError);
    return mapPurchase(
      data as Record<string, unknown>,
      (items ?? []) as Record<string, unknown>[],
      (allocs ?? []) as Record<string, unknown>[],
    );
  },

  async listPurchases(options) {
    const client = db();
    let query = client.from("purchases").select("*").order("created_at", { ascending: true });
    if (!options?.includeDeleted) query = query.is("deleted_at", null);
    const { data, error } = await query;
    if (error) throwCommerce(error);
    const purchases = await Promise.all(
      (data ?? []).map((row) => this.getPurchase((row as { id: string }).id)),
    );
    return purchases.filter((p): p is PurchaseRecord => p !== null);
  },

  async softDeletePurchase(id, ctx) {
    const client = db();
    const { data, error } = await client
      .from("purchases")
      .update({ deleted_at: nowIso() })
      .eq("id", id)
      .select("organization_id")
      .maybeSingle();
    if (error) throwCommerce(error);
    if (!data) throw new CommerceError("not_found", `purchase ${id} not found`);
    await writeAudit(client, ctx, data.organization_id as string, "delete", id, undefined, "purchase");
    const purchase = await this.getPurchase(id);
    if (!purchase) throw new CommerceError("not_found", `purchase ${id} not found`);
    return purchase;
  },

  async restorePurchase(id, ctx) {
    const client = db();
    const { data, error } = await client
      .from("purchases")
      .update({ deleted_at: null })
      .eq("id", id)
      .select("organization_id")
      .maybeSingle();
    if (error) throwCommerce(error);
    if (!data) throw new CommerceError("not_found", `purchase ${id} not found`);
    await writeAudit(client, ctx, data.organization_id as string, "restore", id, undefined, "purchase");
    const purchase = await this.getPurchase(id);
    if (!purchase) throw new CommerceError("not_found", `purchase ${id} not found`);
    return purchase;
  },

  async allocatePurchaseCosts(id, method, ctx) {
    const client = db();
    const purchase = await this.getPurchase(id);
    if (!purchase) throw new CommerceError("not_found", `purchase ${id} not found`);
    const total = { currency: purchase.currency, amountMinor: purchaseAncillaryTotalMinor(purchase) };
    const lines: AllocationBasis[] = purchase.items.map((item) => ({
      quantity: item.quantity,
      purchaseValueMinor: purchaseItemNetMinor(item),
    }));
    const allocated = allocateCost(total, method, lines);

    // 付帯費用の再配賦は既存の配賦行を置き換える（原子的でないため idempotency は purchase 単位）。
    const { error: delError } = await client.from("cost_allocations").delete().eq("purchase_id", id);
    if (delError) throwCommerce(delError);
    const rows = allocated.map((amount, index) => ({
      purchase_id: id,
      purchase_item_id: purchase.items[index]?.id,
      method: toDbMethod(method),
      allocated_currency: amount.currency,
      allocated_amount_minor: amount.amountMinor,
    }));
    if (rows.length > 0) {
      const { error: insError } = await client.from("cost_allocations").insert(rows);
      if (insError) throwCommerce(insError);
    }
    await writeAudit(client, ctx, purchase.organizationId, "cost_allocation", id, method, "purchase");
    const refreshed = await this.getPurchase(id);
    return refreshed?.allocations ?? [];
  },
};
