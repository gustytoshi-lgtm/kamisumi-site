"use server";

import { revalidatePath } from "next/cache";
import { isAdminEnabled } from "@/config/features";
import { getAdminSession } from "@/lib/admin/auth";
import { currencyMinorUnits } from "@/lib/commerce/money";
import type { AllocationMethod } from "@/lib/commerce/costAllocation";
import { getProcurementService } from "@/repositories";
import type { PurchaseItemInput } from "@/repositories/core/procurementModels";
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

/** 主要単位（"980.50"）→最小通貨単位整数。空欄は 0。不正は null。 */
function majorToMinor(major: string, currency: CurrencyCode): number | null {
  const t = major.trim();
  if (t === "") return 0;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 10 ** currencyMinorUnits[currency]);
}

export async function createPurchaseAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await actorFromSession();
  if (!actor) return { ok: false, code: "forbidden" };

  const purchasedOn = String(formData.get("purchasedOn") ?? "").trim();
  const currencyRaw = String(formData.get("currency") ?? "TWD");
  const supplierId = String(formData.get("supplierId") ?? "").trim() || undefined;
  const note = String(formData.get("note") ?? "").trim() || undefined;
  const locale = String(formData.get("locale") ?? "zh-tw");

  if (!purchasedOn || !isCurrency(currencyRaw)) return { ok: false, code: "validation" };

  const domestic = majorToMinor(String(formData.get("domesticShipping") ?? ""), currencyRaw);
  const transport = majorToMinor(String(formData.get("transport") ?? ""), currencyRaw);
  const other = majorToMinor(String(formData.get("otherExpense") ?? ""), currencyRaw);
  if (domestic === null || transport === null || other === null) {
    return { ok: false, code: "validation" };
  }

  // 任意の単一明細（数量があるときのみ）
  const itemDesc = String(formData.get("itemDescription") ?? "").trim();
  const itemQtyRaw = String(formData.get("itemQuantity") ?? "").trim();
  const items: PurchaseItemInput[] = [];
  if (itemQtyRaw !== "") {
    const quantity = Number(itemQtyRaw);
    if (!Number.isInteger(quantity) || quantity <= 0) return { ok: false, code: "validation" };
    const unitPriceMinor = majorToMinor(String(formData.get("itemUnitPrice") ?? ""), currencyRaw);
    if (unitPriceMinor === null) return { ok: false, code: "validation" };
    items.push({ description: itemDesc || undefined, quantity, unitPriceMinor });
  }

  try {
    await getProcurementService().createPurchase(actor, {
      purchasedOn,
      currency: currencyRaw,
      supplierId,
      domesticShippingMinor: domestic,
      transportMinor: transport,
      otherExpenseMinor: other,
      note,
      items,
    });
    revalidatePath(`/${locale}/admin/purchases`);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function allocatePurchaseCostsAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await actorFromSession();
  if (!actor) return { ok: false, code: "forbidden" };

  const purchaseId = String(formData.get("purchaseId") ?? "").trim();
  const method = String(formData.get("method") ?? "") as AllocationMethod;
  const locale = String(formData.get("locale") ?? "zh-tw");
  const allowed: AllocationMethod[] = ["quantity", "purchase_value", "none"];
  if (!purchaseId || !allowed.includes(method)) return { ok: false, code: "validation" };

  try {
    await getProcurementService().allocatePurchaseCosts(actor, purchaseId, method);
    revalidatePath(`/${locale}/admin/purchases`);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function deletePurchaseAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await actorFromSession();
  if (!actor) return { ok: false, code: "forbidden" };
  const purchaseId = String(formData.get("purchaseId") ?? "").trim();
  const locale = String(formData.get("locale") ?? "zh-tw");
  if (!purchaseId) return { ok: false, code: "validation" };
  try {
    await getProcurementService().deletePurchase(actor, purchaseId);
    revalidatePath(`/${locale}/admin/purchases`);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function restorePurchaseAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await actorFromSession();
  if (!actor) return { ok: false, code: "forbidden" };
  const purchaseId = String(formData.get("purchaseId") ?? "").trim();
  const locale = String(formData.get("locale") ?? "zh-tw");
  if (!purchaseId) return { ok: false, code: "validation" };
  try {
    await getProcurementService().restorePurchase(actor, purchaseId);
    revalidatePath(`/${locale}/admin/purchases`);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}
