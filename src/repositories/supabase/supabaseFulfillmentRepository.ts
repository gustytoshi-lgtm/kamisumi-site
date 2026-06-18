import type { FulfillmentRepository } from "@/repositories/core/fulfillmentRepository";
import type {
  ShipmentRecord,
  ShipmentStatusEvent,
} from "@/repositories/core/fulfillmentModels";
import { CommerceError, type ActorContext } from "@/repositories/core/writeModels";
import { kamisumiBorneFreight, type ShipmentStatus } from "@/lib/commerce/shipmentStatus";
import type { CurrencyCode, Money } from "@/types/commerce";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { throwCommerce } from "@/lib/supabase/errors";

/**
 * Supabase フルフィルメント repository（service role / RLS バイパス）。契約は mock と同一。
 * shipments 列は 0003 + 0008（status/status_updated_at/status_updated_by）。
 * 状態履歴は shipment_status_events（0008）。RLS は shipments_member（0004）。
 * 実 DB 検証は contract test（既定 skip）。
 */
type Db = ReturnType<typeof getSupabaseAdminClient>;
function db(): Db {
  return getSupabaseAdminClient();
}
function nowIso(): string {
  return new Date().toISOString();
}

function money(currency: CurrencyCode | undefined, minor: number | null | undefined): Money | undefined {
  if (!currency || minor === null || minor === undefined) return undefined;
  return { currency, amountMinor: Number(minor) };
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
    entity_type: "shipment",
    entity_id: entityId,
    summary,
  });
  if (error) throwCommerce(error);
}

function mapShipment(row: Record<string, unknown>): ShipmentRecord {
  const currency = (row.cost_currency as CurrencyCode | null) ?? undefined;
  const actualCost = money(currency, row.actual_cost_minor as number | null);
  const chargedCost = money(currency, row.charged_cost_minor as number | null);
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    orderId: (row.order_id as string | null) ?? undefined,
    carrier: (row.carrier as string | null) ?? undefined,
    method: (row.method as string | null) ?? undefined,
    weightGrams: (row.weight_grams as number | null) ?? undefined,
    sizeNote: (row.size_note as string | null) ?? undefined,
    costCurrency: currency,
    actualCost,
    chargedCost,
    kamisumiBears: actualCost && chargedCost ? kamisumiBorneFreight(actualCost, chargedCost) : undefined,
    trackingNumber: (row.tracking_number as string | null) ?? undefined,
    shippedOn: (row.shipped_on as string | null) ?? undefined,
    deliveredOn: (row.delivered_on as string | null) ?? undefined,
    status: ((row.status as string | null) ?? "preparing") as ShipmentStatus,
    damaged: Boolean(row.damaged),
    returned: Boolean(row.returned),
    reshipped: Boolean(row.reshipped),
    statusUpdatedAt: (row.status_updated_at as string | null) ?? undefined,
    statusUpdatedBy: (row.status_updated_by as string | null) ?? undefined,
    createdAt: (row.created_at as string) ?? nowIso(),
    updatedAt: (row.updated_at as string) ?? nowIso(),
  };
}

export const supabaseFulfillmentRepository: FulfillmentRepository = {
  async createShipment(input, ctx) {
    const client = db();
    const { data, error } = await client
      .from("shipments")
      .insert({
        organization_id: input.organizationId,
        order_id: input.orderId,
        carrier: input.carrier,
        method: input.method,
        weight_grams: input.weightGrams,
        size_note: input.sizeNote,
        cost_currency: input.costCurrency,
        actual_cost_minor: input.actualCostMinor,
        charged_cost_minor: input.chargedCostMinor,
        tracking_number: input.trackingNumber,
        status: "preparing",
      })
      .select("*")
      .single();
    if (error) throwCommerce(error);
    const record = mapShipment(data as Record<string, unknown>);
    await writeAudit(client, ctx, record.organizationId, "create", record.id, input.orderId);
    return record;
  },

  async updateShipment(id, patch, ctx) {
    const client = db();
    const update: Record<string, unknown> = {};
    if (patch.carrier !== undefined) update.carrier = patch.carrier;
    if (patch.method !== undefined) update.method = patch.method;
    if (patch.weightGrams !== undefined) update.weight_grams = patch.weightGrams;
    if (patch.sizeNote !== undefined) update.size_note = patch.sizeNote;
    if (patch.costCurrency !== undefined) update.cost_currency = patch.costCurrency;
    if (patch.actualCostMinor !== undefined) update.actual_cost_minor = patch.actualCostMinor;
    if (patch.chargedCostMinor !== undefined) update.charged_cost_minor = patch.chargedCostMinor;
    if (patch.trackingNumber !== undefined) update.tracking_number = patch.trackingNumber;
    if (patch.shippedOn !== undefined) update.shipped_on = patch.shippedOn;
    if (patch.deliveredOn !== undefined) update.delivered_on = patch.deliveredOn;
    if (patch.damaged !== undefined) update.damaged = patch.damaged;
    if (patch.returned !== undefined) update.returned = patch.returned;
    if (patch.reshipped !== undefined) update.reshipped = patch.reshipped;
    const { data, error } = await client
      .from("shipments")
      .update(update)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) throwCommerce(error);
    if (!data) throw new CommerceError("not_found", `shipment ${id} not found`);
    const record = mapShipment(data as Record<string, unknown>);
    await writeAudit(client, ctx, record.organizationId, "update", id);
    return record;
  },

  async changeShipmentStatus(id, toStatus: ShipmentStatus, ctx, note) {
    const client = db();
    const { data: existing, error: getError } = await client
      .from("shipments")
      .select("status, organization_id")
      .eq("id", id)
      .maybeSingle();
    if (getError) throwCommerce(getError);
    if (!existing) throw new CommerceError("not_found", `shipment ${id} not found`);
    const fromStatus = existing.status as string;

    const update: Record<string, unknown> = {
      status: toStatus,
      status_updated_at: nowIso(),
      status_updated_by: ctx.userId,
    };
    if (toStatus === "returned") update.returned = true;
    if (toStatus === "reshipped") update.reshipped = true;
    if (toStatus === "shipped") update.shipped_on = nowIso().slice(0, 10);
    if (toStatus === "delivered") update.delivered_on = nowIso().slice(0, 10);

    const { error } = await client.from("shipments").update(update).eq("id", id);
    if (error) throwCommerce(error);

    await client.from("shipment_status_events").insert({
      shipment_id: id,
      from_status: fromStatus,
      to_status: toStatus,
      changed_by: ctx.userId,
      note,
    });
    await writeAudit(
      client,
      ctx,
      existing.organization_id as string,
      "status_change",
      id,
      `${fromStatus}->${toStatus}`,
    );
    const shipment = await this.getShipment(id);
    if (!shipment) throw new CommerceError("not_found", `shipment ${id} not found`);
    return shipment;
  },

  async getShipment(id) {
    const client = db();
    const { data, error } = await client.from("shipments").select("*").eq("id", id).maybeSingle();
    if (error) throwCommerce(error);
    if (!data) return null;
    return mapShipment(data as Record<string, unknown>);
  },

  async listShipments(options) {
    const client = db();
    let query = client.from("shipments").select("*").order("created_at", { ascending: true });
    if (options?.orderId) query = query.eq("order_id", options.orderId);
    const { data, error } = await query;
    if (error) throwCommerce(error);
    return (data ?? []).map((row) => mapShipment(row as Record<string, unknown>));
  },

  async listShipmentStatusEvents(shipmentId) {
    const client = db();
    const { data, error } = await client
      .from("shipment_status_events")
      .select("*")
      .eq("shipment_id", shipmentId)
      .order("created_at", { ascending: true });
    if (error) throwCommerce(error);
    return (data ?? []).map(
      (row): ShipmentStatusEvent => ({
        id: row.id as string,
        shipmentId: row.shipment_id as string,
        fromStatus: (row.from_status as ShipmentStatus | null) ?? null,
        toStatus: row.to_status as ShipmentStatus,
        changedBy: (row.changed_by as string | null) ?? "",
        note: (row.note as string | null) ?? undefined,
        createdAt: (row.created_at as string) ?? nowIso(),
      }),
    );
  },
};
