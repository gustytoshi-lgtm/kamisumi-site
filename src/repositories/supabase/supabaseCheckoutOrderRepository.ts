import type { CartItem } from "@/lib/commerce/cart";
import type {
  ManualTransferOrder,
  ManualTransferOrderRepository,
} from "@/lib/commerce/checkoutOrder";
import type { OrderStatus } from "@/lib/commerce/orderStatus";
import type { PaymentStatus } from "@/lib/commerce/paymentStatus";
import type { CurrencyCode } from "@/types/commerce";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { throwCommerce } from "@/lib/supabase/errors";

/**
 * Supabase 手動振込 注文台帳 repository（service role / RLS バイパス）。契約は mock と同一。
 * 業務ルール（状態遷移・owner 限定・冪等・検証）は service 層（checkoutOrder.ts）が持つ。
 * ここは純粋な永続化のみ。列は 0017_checkout_orders。RLS は checkout_orders_owner（owner 限定）。
 * 実 DB 検証は contract test（既定 skip, docs/SUPABASE_SETUP.md）。
 */
type Db = ReturnType<typeof getSupabaseAdminClient>;
function db(): Db {
  return getSupabaseAdminClient();
}

function mapOrder(row: Record<string, unknown>): ManualTransferOrder {
  const currency = (row.currency as CurrencyCode) ?? "TWD";
  const items = Array.isArray(row.items) ? (row.items as CartItem[]) : [];
  return {
    orderId: row.order_id as string,
    reference: row.reference as string,
    checkoutId: row.checkout_id as string,
    currency,
    items,
    amount: { currency, amountMinor: Number(row.amount_minor ?? 0) },
    orderStatus: row.order_status as OrderStatus,
    paymentStatus: row.payment_status as PaymentStatus,
    customerRef: (row.customer_ref as string | null) ?? undefined,
    createdAt: (row.created_at as string) ?? "",
    updatedAt: (row.updated_at as string) ?? "",
  };
}

export const supabaseCheckoutOrderRepository: ManualTransferOrderRepository = {
  async get(orderId) {
    const client = db();
    const { data, error } = await client
      .from("checkout_orders")
      .select("*")
      .eq("order_id", orderId)
      .maybeSingle();
    if (error) throwCommerce(error);
    return data ? mapOrder(data as Record<string, unknown>) : null;
  },

  async getByReference(reference) {
    const client = db();
    const { data, error } = await client
      .from("checkout_orders")
      .select("*")
      .eq("reference", reference)
      .maybeSingle();
    if (error) throwCommerce(error);
    return data ? mapOrder(data as Record<string, unknown>) : null;
  },

  async save(order) {
    const client = db();
    // 作成/更新の両方で呼ばれる。createdAt/updatedAt は service が確定するためそのまま保存（mock と同挙動）。
    const { data, error } = await client
      .from("checkout_orders")
      .upsert(
        {
          order_id: order.orderId,
          reference: order.reference,
          checkout_id: order.checkoutId,
          currency: order.currency,
          amount_minor: order.amount.amountMinor,
          order_status: order.orderStatus,
          payment_status: order.paymentStatus,
          items: order.items,
          customer_ref: order.customerRef ?? null,
          created_at: order.createdAt,
          updated_at: order.updatedAt,
        },
        { onConflict: "order_id" },
      )
      .select("*")
      .single();
    if (error) throwCommerce(error);
    return mapOrder(data as Record<string, unknown>);
  },

  async list() {
    const client = db();
    const { data, error } = await client
      .from("checkout_orders")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) throwCommerce(error);
    return (data ?? []).map((row) => mapOrder(row as Record<string, unknown>));
  },
};
