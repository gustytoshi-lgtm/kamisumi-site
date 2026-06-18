"use server";

import { revalidatePath } from "next/cache";
import { isAdminEnabled } from "@/config/features";
import { getAdminSession } from "@/lib/admin/auth";
import { currencyMinorUnits } from "@/lib/commerce/money";
import { isShipmentStatus, type ShipmentStatus } from "@/lib/commerce/shipmentStatus";
import { getFulfillmentService } from "@/repositories";
import { CommerceError } from "@/repositories/core/writeModels";
import type { CurrencyCode } from "@/types/commerce";
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

function isCurrency(value: string): value is CurrencyCode {
  return value === "TWD" || value === "JPY" || value === "USD";
}

function majorToMinor(major: string, currency: CurrencyCode): number | null {
  const trimmed = major.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 10 ** currencyMinorUnits[currency]);
}

export async function createShipmentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await actorFromSession();
  if (!actor) return { ok: false, code: "forbidden" };

  const orderId = String(formData.get("orderId") ?? "").trim() || undefined;
  const carrier = String(formData.get("carrier") ?? "").trim() || undefined;
  const method = String(formData.get("method") ?? "").trim() || undefined;
  const trackingNumber = String(formData.get("trackingNumber") ?? "").trim() || undefined;
  const currencyRaw = String(formData.get("costCurrency") ?? "TWD");
  const actualRaw = String(formData.get("actualCost") ?? "").trim();
  const chargedRaw = String(formData.get("chargedCost") ?? "").trim();
  const locale = String(formData.get("locale") ?? "zh-tw");

  if (!isCurrency(currencyRaw)) return { ok: false, code: "validation" };

  let actualCostMinor: number | undefined;
  let chargedCostMinor: number | undefined;
  if (actualRaw !== "") {
    const v = majorToMinor(actualRaw, currencyRaw);
    if (v === null) return { ok: false, code: "validation" };
    actualCostMinor = v;
  }
  if (chargedRaw !== "") {
    const v = majorToMinor(chargedRaw, currencyRaw);
    if (v === null) return { ok: false, code: "validation" };
    chargedCostMinor = v;
  }

  try {
    await getFulfillmentService().createShipment(actor, {
      orderId,
      carrier,
      method,
      trackingNumber,
      costCurrency: currencyRaw,
      actualCostMinor,
      chargedCostMinor,
    });
    revalidatePath(`/${locale}/admin/shipping`);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function changeShipmentStatusAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await actorFromSession();
  if (!actor) return { ok: false, code: "forbidden" };

  const shipmentId = String(formData.get("shipmentId") ?? "").trim();
  const toStatus = String(formData.get("toStatus") ?? "");
  const note = String(formData.get("note") ?? "").trim() || undefined;
  const locale = String(formData.get("locale") ?? "zh-tw");

  if (!shipmentId || !isShipmentStatus(toStatus)) return { ok: false, code: "validation" };

  try {
    await getFulfillmentService().changeShipmentStatus(actor, shipmentId, toStatus as ShipmentStatus, note);
    revalidatePath(`/${locale}/admin/shipping`);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}
