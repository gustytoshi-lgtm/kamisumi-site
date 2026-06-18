"use server";

import { revalidatePath } from "next/cache";
import { isAdminEnabled } from "@/config/features";
import { getAdminSession } from "@/lib/admin/auth";
import { getMediaService } from "@/repositories";
import { isMediaKind, type MediaKind } from "@/repositories/core/mediaModels";
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

export async function createMediaAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await actorFromSession();
  if (!actor) return { ok: false, code: "forbidden" };

  const kind = String(formData.get("kind") ?? "");
  const path = String(formData.get("path") ?? "").trim();
  const mimeType = String(formData.get("mimeType") ?? "").trim() || undefined;
  const altJa = String(formData.get("altJa") ?? "").trim() || undefined;
  const altZh = String(formData.get("altZh") ?? "").trim() || undefined;
  const byteSizeRaw = String(formData.get("byteSize") ?? "").trim();
  const locale = String(formData.get("locale") ?? "zh-tw");

  if (!isMediaKind(kind) || !path) return { ok: false, code: "validation" };
  let byteSize: number | undefined;
  if (byteSizeRaw !== "") {
    byteSize = Number(byteSizeRaw);
    if (!Number.isInteger(byteSize) || byteSize < 0) return { ok: false, code: "validation" };
  }

  try {
    await getMediaService().createMedia(actor, {
      kind: kind as MediaKind,
      path,
      mimeType,
      byteSize,
      altJa,
      altZh,
    });
    revalidatePath(`/${locale}/admin/media`);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function updateMediaAltAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await actorFromSession();
  if (!actor) return { ok: false, code: "forbidden" };

  const mediaId = String(formData.get("mediaId") ?? "").trim();
  const altJa = String(formData.get("altJa") ?? "").trim() || undefined;
  const altZh = String(formData.get("altZh") ?? "").trim() || undefined;
  const locale = String(formData.get("locale") ?? "zh-tw");
  if (!mediaId) return { ok: false, code: "validation" };

  try {
    await getMediaService().updateMedia(actor, mediaId, { altJa, altZh });
    revalidatePath(`/${locale}/admin/media`);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteMediaAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await actorFromSession();
  if (!actor) return { ok: false, code: "forbidden" };
  const mediaId = String(formData.get("mediaId") ?? "").trim();
  const locale = String(formData.get("locale") ?? "zh-tw");
  if (!mediaId) return { ok: false, code: "validation" };
  try {
    await getMediaService().deleteMedia(actor, mediaId);
    revalidatePath(`/${locale}/admin/media`);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}
