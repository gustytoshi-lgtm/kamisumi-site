"use server";

import { revalidatePath } from "next/cache";
import { isAdminEnabled } from "@/config/features";
import { getAdminSession } from "@/lib/admin/auth";
import { getManualTransferOrderService } from "@/repositories";
import { CommerceError, type ActorContext } from "@/repositories/core/writeModels";
import type { ActionState } from "@/lib/admin/actionState";

/**
 * カート注文台帳（手動振込）の owner 操作。flag/セッション/権限は server 側で必ず再確認する。
 * 権限は service 側でも `purchase:manage`（owner 限定）で再検証される。
 */
async function actorFromSession(): Promise<ActorContext | null> {
  if (!isAdminEnabled()) return null;
  const session = await getAdminSession();
  if (!session) return null;
  return { userId: session.userId, role: session.role };
}

function handleError(error: unknown): ActionState {
  if (error instanceof CommerceError) return { ok: false, code: error.code };
  return { ok: false, code: "error" };
}

export async function confirmCheckoutPaymentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await actorFromSession();
  if (!actor) return { ok: false, code: "forbidden" };
  const orderId = String(formData.get("orderId") ?? "").trim();
  const locale = String(formData.get("locale") ?? "ja");
  if (!orderId) return { ok: false, code: "validation" };

  try {
    await getManualTransferOrderService().confirmPayment(actor, orderId);
    revalidatePath(`/${locale}/admin/checkout-orders`);
    return { ok: true };
  } catch (error) {
    return handleError(error);
  }
}

export async function cancelCheckoutOrderAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await actorFromSession();
  if (!actor) return { ok: false, code: "forbidden" };
  const orderId = String(formData.get("orderId") ?? "").trim();
  const locale = String(formData.get("locale") ?? "ja");
  if (!orderId) return { ok: false, code: "validation" };

  try {
    await getManualTransferOrderService().cancelOrder(actor, orderId);
    revalidatePath(`/${locale}/admin/checkout-orders`);
    return { ok: true };
  } catch (error) {
    return handleError(error);
  }
}
