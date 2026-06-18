"use server";

import { revalidatePath } from "next/cache";
import { isAdminEnabled } from "@/config/features";
import { getAdminSession } from "@/lib/admin/auth";
import { currencyMinorUnits } from "@/lib/commerce/money";
import { getCeramicUnitService } from "@/repositories";
import { isCeramicUnitStatus, type CeramicUnitStatus } from "@/repositories/core/ceramicUnitModels";
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

export async function createCeramicUnitAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await actorFromSession();
  if (!actor) return { ok: false, code: "forbidden" };

  const productId = String(formData.get("productId") ?? "").trim();
  const unitCode = String(formData.get("unitCode") ?? "").trim();
  const dimensions = String(formData.get("dimensions") ?? "").trim() || undefined;
  const glaze = String(formData.get("glaze") ?? "").trim() || undefined;
  const condition = String(formData.get("condition") ?? "").trim() || undefined;
  const inspectionResult = String(formData.get("inspectionResult") ?? "").trim() || undefined;
  const costRaw = String(formData.get("cost") ?? "").trim();
  const currencyRaw = String(formData.get("costCurrency") ?? "TWD");
  const locale = String(formData.get("locale") ?? "zh-tw");

  if (!productId || !unitCode) return { ok: false, code: "validation" };
  if (!isCurrency(currencyRaw)) return { ok: false, code: "validation" };

  let costMinor: number | undefined;
  if (costRaw !== "") {
    const n = Number(costRaw);
    if (!Number.isFinite(n) || n < 0) return { ok: false, code: "validation" };
    costMinor = Math.round(n * 10 ** currencyMinorUnits[currencyRaw]);
  }

  try {
    await getCeramicUnitService().createUnit(actor, {
      productId,
      unitCode,
      costMinor,
      costCurrency: currencyRaw,
      dimensions,
      glaze,
      condition,
      inspectionResult,
    });
    revalidatePath(`/${locale}/admin/ceramic-units`);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function setCeramicUnitStatusAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await actorFromSession();
  if (!actor) return { ok: false, code: "forbidden" };

  const unitId = String(formData.get("unitId") ?? "").trim();
  const status = String(formData.get("status") ?? "");
  const locale = String(formData.get("locale") ?? "zh-tw");
  if (!unitId || !isCeramicUnitStatus(status)) return { ok: false, code: "validation" };

  try {
    await getCeramicUnitService().setStatus(actor, unitId, status as CeramicUnitStatus);
    revalidatePath(`/${locale}/admin/ceramic-units`);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteCeramicUnitAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await actorFromSession();
  if (!actor) return { ok: false, code: "forbidden" };
  const unitId = String(formData.get("unitId") ?? "").trim();
  const locale = String(formData.get("locale") ?? "zh-tw");
  if (!unitId) return { ok: false, code: "validation" };
  try {
    await getCeramicUnitService().deleteUnit(actor, unitId);
    revalidatePath(`/${locale}/admin/ceramic-units`);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}
