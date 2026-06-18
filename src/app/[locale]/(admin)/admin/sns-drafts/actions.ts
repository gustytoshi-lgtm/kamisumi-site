"use server";

import { revalidatePath } from "next/cache";
import { isAdminEnabled } from "@/config/features";
import { getAdminSession } from "@/lib/admin/auth";
import { getSnsDraftService } from "@/repositories";
import type { SnsPlatform } from "@/lib/commerce/snsDraft";
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

function isPlatform(v: string): v is SnsPlatform {
  return v === "threads" || v === "instagram";
}

export async function createSnsDraftAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await actorFromSession();
  if (!actor) return { ok: false, code: "forbidden" };

  const platform = String(formData.get("platform") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const shortDescription = String(formData.get("shortDescription") ?? "").trim() || undefined;
  const locale = String(formData.get("locale") ?? "zh-tw");
  if (!isPlatform(platform) || !title) return { ok: false, code: "validation" };

  try {
    await getSnsDraftService().createDraftFromProduct(actor, { platform, title, shortDescription });
    revalidatePath(`/${locale}/admin/sns-drafts`);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

async function transition(formData: FormData, kind: "approve" | "reject" | "delete"): Promise<ActionState> {
  const actor = await actorFromSession();
  if (!actor) return { ok: false, code: "forbidden" };
  const id = String(formData.get("draftId") ?? "").trim();
  const locale = String(formData.get("locale") ?? "zh-tw");
  if (!id) return { ok: false, code: "validation" };
  try {
    const service = getSnsDraftService();
    if (kind === "approve") await service.approveDraft(actor, id);
    else if (kind === "reject") await service.rejectDraft(actor, id);
    else await service.deleteDraft(actor, id);
    revalidatePath(`/${locale}/admin/sns-drafts`);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function approveSnsDraftAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return transition(formData, "approve");
}
export async function rejectSnsDraftAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return transition(formData, "reject");
}
export async function deleteSnsDraftAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return transition(formData, "delete");
}
