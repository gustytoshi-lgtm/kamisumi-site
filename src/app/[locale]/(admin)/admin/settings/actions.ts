"use server";

import { revalidatePath } from "next/cache";
import { isAdminEnabled } from "@/config/features";
import { getAdminSession } from "@/lib/admin/auth";
import { getSettingsService } from "@/repositories";
import { CommerceError } from "@/repositories/core/writeModels";
import type { ActionState } from "@/lib/admin/actionState";

async function actorFromSession() {
  if (!isAdminEnabled()) return null;
  const session = await getAdminSession();
  if (!session) return null;
  return { userId: session.userId, role: session.role };
}

export async function updateSettingAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await actorFromSession();
  if (!actor) return { ok: false, code: "forbidden" };

  const key = String(formData.get("key") ?? "").trim();
  const value = String(formData.get("value") ?? "");
  const locale = String(formData.get("locale") ?? "zh-tw");
  if (!key) return { ok: false, code: "validation" };

  try {
    await getSettingsService().updateSetting(actor, key, value);
    revalidatePath(`/${locale}/admin/settings`);
    return { ok: true };
  } catch (error) {
    if (error instanceof CommerceError) return { ok: false, code: error.code };
    return { ok: false, code: "error" };
  }
}
