"use server";

import { revalidatePath } from "next/cache";
import { isAdminEnabled } from "@/config/features";
import { getAdminSession } from "@/lib/admin/auth";
import { getMatchaLotService } from "@/repositories";
import { CommerceError } from "@/repositories/core/writeModels";
import type { ActionState } from "@/lib/admin/actionState";

async function actorFromSession() {
  if (!isAdminEnabled()) return null;
  const session = await getAdminSession();
  if (!session) return null;
  return { userId: session.userId, role: session.role };
}

function fail(error: unknown): ActionState {
  if (error instanceof CommerceError) return { ok: false, code: error.code };
  return { ok: false, code: "error" };
}

export async function createMatchaLotAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await actorFromSession();
  if (!actor) return { ok: false, code: "forbidden" };

  const productId = String(formData.get("productId") ?? "").trim();
  const lotCode = String(formData.get("lotCode") ?? "").trim() || undefined;
  const teaHouse = String(formData.get("teaHouse") ?? "").trim() || undefined;
  const bestBefore = String(formData.get("bestBefore") ?? "").trim() || undefined;
  const purchasedOn = String(formData.get("purchasedOn") ?? "").trim() || undefined;
  const storageLocation = String(formData.get("storageLocation") ?? "").trim() || undefined;
  const qtyRaw = String(formData.get("quantity") ?? "").trim();
  const locale = String(formData.get("locale") ?? "zh-tw");

  if (!productId) return { ok: false, code: "validation" };
  let quantity: number | undefined;
  if (qtyRaw !== "") {
    quantity = Number(qtyRaw);
    if (!Number.isInteger(quantity) || quantity < 0) return { ok: false, code: "validation" };
  }

  try {
    await getMatchaLotService().createLot(actor, {
      productId,
      lotCode,
      teaHouse,
      bestBefore,
      purchasedOn,
      storageLocation,
      quantity,
    });
    revalidatePath(`/${locale}/admin/matcha-lots`);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function adjustMatchaLotAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await actorFromSession();
  if (!actor) return { ok: false, code: "forbidden" };

  const lotId = String(formData.get("lotId") ?? "").trim();
  const delta = Number(formData.get("delta") ?? 0);
  const locale = String(formData.get("locale") ?? "zh-tw");
  if (!lotId || !Number.isInteger(delta) || delta === 0) return { ok: false, code: "validation" };

  try {
    await getMatchaLotService().adjustQuantity(actor, lotId, delta);
    revalidatePath(`/${locale}/admin/matcha-lots`);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteMatchaLotAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await actorFromSession();
  if (!actor) return { ok: false, code: "forbidden" };
  const lotId = String(formData.get("lotId") ?? "").trim();
  const locale = String(formData.get("locale") ?? "zh-tw");
  if (!lotId) return { ok: false, code: "validation" };
  try {
    await getMatchaLotService().deleteLot(actor, lotId);
    revalidatePath(`/${locale}/admin/matcha-lots`);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}
