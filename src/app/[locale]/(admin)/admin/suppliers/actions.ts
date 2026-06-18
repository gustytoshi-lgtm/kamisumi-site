"use server";

import { revalidatePath } from "next/cache";
import { isAdminEnabled } from "@/config/features";
import { getAdminSession } from "@/lib/admin/auth";
import { getProcurementService } from "@/repositories";
import {
  isSupplierPublicLevel,
  type SupplierPublicLevel,
} from "@/repositories/core/procurementModels";
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

function revalidate(locale: string) {
  revalidatePath(`/${locale}/admin/suppliers`);
}

export async function createSupplierAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await actorFromSession();
  if (!actor) return { ok: false, code: "forbidden" };

  const name = String(formData.get("name") ?? "").trim();
  const region = String(formData.get("region") ?? "").trim() || undefined;
  const countryCode = String(formData.get("countryCode") ?? "").trim() || undefined;
  const note = String(formData.get("note") ?? "").trim() || undefined;
  const contact = String(formData.get("contact") ?? "").trim() || undefined;
  const publicLevelRaw = String(formData.get("publicLevel") ?? "private");
  const locale = String(formData.get("locale") ?? "zh-tw");

  if (!name) return { ok: false, code: "validation" };
  const publicLevel: SupplierPublicLevel = isSupplierPublicLevel(publicLevelRaw)
    ? publicLevelRaw
    : "private";

  try {
    await getProcurementService().createSupplier(actor, {
      name,
      region,
      countryCode,
      note,
      contact,
      publicLevel,
    });
    revalidate(locale);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function changeSupplierLevelAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await actorFromSession();
  if (!actor) return { ok: false, code: "forbidden" };

  const supplierId = String(formData.get("supplierId") ?? "").trim();
  const publicLevelRaw = String(formData.get("publicLevel") ?? "");
  const locale = String(formData.get("locale") ?? "zh-tw");

  if (!supplierId || !isSupplierPublicLevel(publicLevelRaw)) {
    return { ok: false, code: "validation" };
  }

  try {
    await getProcurementService().updateSupplier(actor, supplierId, {
      publicLevel: publicLevelRaw,
    });
    revalidate(locale);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteSupplierAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await actorFromSession();
  if (!actor) return { ok: false, code: "forbidden" };

  const supplierId = String(formData.get("supplierId") ?? "").trim();
  const locale = String(formData.get("locale") ?? "zh-tw");
  if (!supplierId) return { ok: false, code: "validation" };

  try {
    await getProcurementService().deleteSupplier(actor, supplierId);
    revalidate(locale);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function restoreSupplierAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await actorFromSession();
  if (!actor) return { ok: false, code: "forbidden" };

  const supplierId = String(formData.get("supplierId") ?? "").trim();
  const locale = String(formData.get("locale") ?? "zh-tw");
  if (!supplierId) return { ok: false, code: "validation" };

  try {
    await getProcurementService().restoreSupplier(actor, supplierId);
    revalidate(locale);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}
