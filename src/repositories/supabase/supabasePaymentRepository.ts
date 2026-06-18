import type { PaymentRepository } from "@/repositories/core/paymentRepository";
import type { PaymentRecord } from "@/repositories/core/paymentModels";
import { CommerceError, type ActorContext } from "@/repositories/core/writeModels";
import type { PaymentStatus } from "@/lib/commerce/paymentStatus";
import type { CurrencyCode } from "@/types/commerce";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { throwCommerce } from "@/lib/supabase/errors";

/**
 * Supabase 入金 repository（service role / RLS バイパス）。契約は mock と同一。
 * payments 列は 0003 + 0009（payment_type/expected_amount_minor/matching_number/paid_at）。
 * RLS は payments_owner（0004, owner 限定）。実 DB 検証は contract test（既定 skip）。
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
    entity_type: "payment",
    entity_id: entityId,
    summary,
  });
  if (error) throwCommerce(error);
}

function mapPayment(row: Record<string, unknown>): PaymentRecord {
  const currency = (row.currency as CurrencyCode) ?? "TWD";
  const expectedMinor = row.expected_amount_minor as number | null;
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    orderId: (row.order_id as string | null) ?? undefined,
    status: ((row.status as string | null) ?? "unbilled") as PaymentStatus,
    currency,
    amount: { currency, amountMinor: Number(row.amount_minor ?? 0) },
    expectedAmount:
      expectedMinor !== null && expectedMinor !== undefined
        ? { currency, amountMinor: Number(expectedMinor) }
        : undefined,
    paymentType: (row.payment_type as string | null) ?? undefined,
    matchingNumber: (row.matching_number as string | null) ?? undefined,
    exchangeRate: (row.exchange_rate as number | null) ?? undefined,
    paidAt: (row.paid_at as string | null) ?? undefined,
    confirmedAt: (row.confirmed_at as string | null) ?? undefined,
    confirmedBy: (row.confirmed_by as string | null) ?? undefined,
    note: (row.note as string | null) ?? undefined,
    createdAt: (row.created_at as string) ?? nowIso(),
    updatedAt: (row.updated_at as string) ?? nowIso(),
  };
}

export const supabasePaymentRepository: PaymentRepository = {
  async createPayment(input, ctx) {
    const client = db();
    const { data, error } = await client
      .from("payments")
      .insert({
        organization_id: input.organizationId,
        order_id: input.orderId,
        status: "unbilled",
        currency: input.currency,
        amount_minor: 0,
        expected_amount_minor: input.expectedAmountMinor,
        payment_type: input.paymentType,
        note: input.note,
      })
      .select("*")
      .single();
    if (error) throwCommerce(error);
    const record = mapPayment(data as Record<string, unknown>);
    await writeAudit(client, ctx, record.organizationId, "create", record.id, input.orderId);
    return record;
  },

  async updatePayment(id, patch, ctx) {
    const client = db();
    const update: Record<string, unknown> = {};
    if (patch.paymentType !== undefined) update.payment_type = patch.paymentType;
    if (patch.matchingNumber !== undefined) update.matching_number = patch.matchingNumber;
    if (patch.expectedAmountMinor !== undefined) update.expected_amount_minor = patch.expectedAmountMinor;
    if (patch.note !== undefined) update.note = patch.note;
    const { data, error } = await client
      .from("payments")
      .update(update)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) throwCommerce(error);
    if (!data) throw new CommerceError("not_found", `payment ${id} not found`);
    const record = mapPayment(data as Record<string, unknown>);
    await writeAudit(client, ctx, record.organizationId, "update", id);
    return record;
  },

  async changePaymentStatus(id, toStatus: PaymentStatus, ctx, note) {
    const client = db();
    const { data, error } = await client
      .from("payments")
      .update({ status: toStatus })
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) throwCommerce(error);
    if (!data) throw new CommerceError("not_found", `payment ${id} not found`);
    const record = mapPayment(data as Record<string, unknown>);
    await writeAudit(client, ctx, record.organizationId, "status_change", id, `->${toStatus}${note ? ` (${note})` : ""}`);
    return record;
  },

  async recordReceipt(id, receipt, ctx) {
    const client = db();
    const update: Record<string, unknown> = {
      amount_minor: receipt.amountMinor,
      paid_at: receipt.paidAt ?? nowIso().slice(0, 10),
      confirmed_at: nowIso(),
      confirmed_by: ctx.userId,
    };
    if (receipt.matchingNumber !== undefined) update.matching_number = receipt.matchingNumber;
    const { data, error } = await client
      .from("payments")
      .update(update)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) throwCommerce(error);
    if (!data) throw new CommerceError("not_found", `payment ${id} not found`);
    const record = mapPayment(data as Record<string, unknown>);
    await writeAudit(client, ctx, record.organizationId, "receipt", id, String(receipt.amountMinor));
    return record;
  },

  async getPayment(id) {
    const client = db();
    const { data, error } = await client.from("payments").select("*").eq("id", id).maybeSingle();
    if (error) throwCommerce(error);
    if (!data) return null;
    return mapPayment(data as Record<string, unknown>);
  },

  async listPayments(options) {
    const client = db();
    let query = client.from("payments").select("*").order("created_at", { ascending: true });
    if (options?.orderId) query = query.eq("order_id", options.orderId);
    const { data, error } = await query;
    if (error) throwCommerce(error);
    return (data ?? []).map((row) => mapPayment(row as Record<string, unknown>));
  },
};
