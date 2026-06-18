"use server";

import { revalidatePath } from "next/cache";
import { isAdminEnabled } from "@/config/features";
import { getAdminSession } from "@/lib/admin/auth";
import { can } from "@/lib/commerce/rbac";
import { getCommerceService, getCommerceWriteRepository } from "@/repositories";
import {
  CommerceError,
  type JournalStatus,
  type ProductStatus,
  type SourcingRequestStatus,
} from "@/repositories/core/writeModels";
import type { ActionState } from "@/lib/admin/actionState";
import type { InventoryMovementReason, InventoryStatus } from "@/lib/commerce/inventoryStatus";
import type { OrderStatus } from "@/lib/commerce/orderStatus";

/**
 * 管理画面のサーバーアクション。CommerceError を UI が i18n マッピングできるコードに変換して返す。
 * すべて flag/セッション/権限を再確認する（クライアント側の制御に依存しない）。
 * 注: "use server" ファイルは async 関数のみ export 可。型は actionState.ts に分離。
 */
async function actorFromSession() {
  if (!isAdminEnabled()) return null;
  const session = await getAdminSession();
  if (!session) return null;
  return { userId: session.userId, role: session.role };
}

function handleError(error: unknown): ActionState {
  if (error instanceof CommerceError) return { ok: false, code: error.code };
  return { ok: false, code: "error" };
}

// ============================================================
// 商品
// ============================================================

export async function changeProductStatusAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await actorFromSession();
  if (!actor) return { ok: false, code: "forbidden" };

  const productId = String(formData.get("productId") ?? "");
  const status = String(formData.get("status") ?? "") as ProductStatus;
  const locale = String(formData.get("locale") ?? "zh-tw");

  try {
    await getCommerceService().setProductStatus(actor, productId, status);
    revalidatePath(`/${locale}/admin/products`);
    return { ok: true };
  } catch (error) {
    return handleError(error);
  }
}

export async function softDeleteProductAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await actorFromSession();
  if (!actor) return { ok: false, code: "forbidden" };

  const productId = String(formData.get("productId") ?? "").trim();
  const locale = String(formData.get("locale") ?? "zh-tw");

  if (!productId) return { ok: false, code: "validation" };

  try {
    await getCommerceService().deleteProduct(actor, productId);
    revalidatePath(`/${locale}/admin/products`);
    return { ok: true };
  } catch (error) {
    return handleError(error);
  }
}

export async function restoreProductAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await actorFromSession();
  if (!actor) return { ok: false, code: "forbidden" };

  const productId = String(formData.get("productId") ?? "").trim();
  const locale = String(formData.get("locale") ?? "zh-tw");

  if (!productId) return { ok: false, code: "validation" };

  try {
    await getCommerceService().restoreProduct(actor, productId);
    revalidatePath(`/${locale}/admin/products`);
    return { ok: true };
  } catch (error) {
    return handleError(error);
  }
}

// ============================================================
// 在庫
// ============================================================

export async function createInventoryItemAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await actorFromSession();
  if (!actor) return { ok: false, code: "forbidden" };
  if (!can(actor.role, "inventory:manage")) return { ok: false, code: "forbidden" };

  const productId = String(formData.get("productId") ?? "").trim();
  const locale = String(formData.get("locale") ?? "zh-tw");

  if (!productId) return { ok: false, code: "validation" };

  try {
    await getCommerceWriteRepository().createInventoryItem({ productId }, actor);
    revalidatePath(`/${locale}/admin/inventory`);
    return { ok: true };
  } catch (error) {
    return handleError(error);
  }
}

export async function applyInventoryMovementAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await actorFromSession();
  if (!actor) return { ok: false, code: "forbidden" };

  const itemId = String(formData.get("itemId") ?? "").trim();
  const reason = String(formData.get("reason") ?? "") as InventoryMovementReason;
  const quantityDelta = Number(formData.get("quantityDelta") ?? 0);
  const note = String(formData.get("note") ?? "").trim() || undefined;
  const locale = String(formData.get("locale") ?? "zh-tw");

  if (!itemId || !reason) return { ok: false, code: "validation" };
  if (!Number.isInteger(quantityDelta)) return { ok: false, code: "validation" };

  try {
    await getCommerceWriteRepository().applyInventoryMovement(
      itemId,
      { reason, quantityDelta, note },
      actor,
    );
    revalidatePath(`/${locale}/admin/inventory`);
    return { ok: true };
  } catch (error) {
    return handleError(error);
  }
}

export async function setInventoryStatusAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await actorFromSession();
  if (!actor) return { ok: false, code: "forbidden" };

  const itemId = String(formData.get("itemId") ?? "").trim();
  const status = String(formData.get("status") ?? "") as InventoryStatus;
  const locale = String(formData.get("locale") ?? "zh-tw");

  if (!itemId || !status) return { ok: false, code: "validation" };

  try {
    await getCommerceService().setInventoryStatus(actor, itemId, status);
    revalidatePath(`/${locale}/admin/inventory`);
    return { ok: true };
  } catch (error) {
    return handleError(error);
  }
}

// ============================================================
// 注文
// ============================================================

export async function createOrderAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await actorFromSession();
  if (!actor) return { ok: false, code: "forbidden" };

  const brandId = String(formData.get("brandId") ?? "").trim();
  const storeId = String(formData.get("storeId") ?? "").trim();
  const locale = String(formData.get("locale") ?? "zh-tw");

  if (!brandId || !storeId) return { ok: false, code: "validation" };

  try {
    await getCommerceService().createOrder(actor, { brandId, storeId, currency: "TWD" });
    revalidatePath(`/${locale}/admin/orders`);
    return { ok: true };
  } catch (error) {
    return handleError(error);
  }
}

export async function changeOrderStatusAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await actorFromSession();
  if (!actor) return { ok: false, code: "forbidden" };

  const orderId = String(formData.get("orderId") ?? "").trim();
  const toStatus = String(formData.get("toStatus") ?? "") as OrderStatus;
  const note = String(formData.get("note") ?? "").trim() || undefined;
  const locale = String(formData.get("locale") ?? "zh-tw");

  if (!orderId || !toStatus) return { ok: false, code: "validation" };

  try {
    await getCommerceService().changeOrderStatus(actor, orderId, toStatus, note);
    revalidatePath(`/${locale}/admin/orders`);
    return { ok: true };
  } catch (error) {
    return handleError(error);
  }
}

export async function reopenOrderAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await actorFromSession();
  if (!actor) return { ok: false, code: "forbidden" };

  const orderId = String(formData.get("orderId") ?? "").trim();
  const locale = String(formData.get("locale") ?? "zh-tw");

  if (!orderId) return { ok: false, code: "validation" };

  try {
    await getCommerceService().reopenOrder(actor, orderId);
    revalidatePath(`/${locale}/admin/orders`);
    return { ok: true };
  } catch (error) {
    return handleError(error);
  }
}

export async function setOrderNotesAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await actorFromSession();
  if (!actor) return { ok: false, code: "forbidden" };

  const orderId = String(formData.get("orderId") ?? "").trim();
  const customerNote = String(formData.get("customerNote") ?? "").trim() || undefined;
  const internalNote = String(formData.get("internalNote") ?? "").trim() || undefined;
  const locale = String(formData.get("locale") ?? "zh-tw");

  if (!orderId) return { ok: false, code: "validation" };

  try {
    await getCommerceService().setOrderNotes(actor, orderId, { customerNote, internalNote });
    revalidatePath(`/${locale}/admin/orders`);
    return { ok: true };
  } catch (error) {
    return handleError(error);
  }
}

// ============================================================
// 買付依頼
// ============================================================

export async function createSourcingRequestAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await actorFromSession();
  if (!actor) return { ok: false, code: "forbidden" };

  const brandId = String(formData.get("brandId") ?? "").trim();
  const desiredItem = String(formData.get("desiredItem") ?? "").trim() || undefined;
  const message = String(formData.get("message") ?? "").trim() || undefined;
  const quantityRaw = formData.get("quantity");
  const quantity =
    quantityRaw !== null && quantityRaw !== "" ? Number(quantityRaw) : undefined;
  const locale = String(formData.get("locale") ?? "zh-tw");

  if (!brandId) return { ok: false, code: "validation" };
  if (quantity !== undefined && (!Number.isInteger(quantity) || quantity <= 0)) {
    return { ok: false, code: "validation" };
  }

  try {
    await getCommerceService().createSourcingRequest(actor, {
      brandId,
      desiredItem,
      message,
      quantity,
    });
    revalidatePath(`/${locale}/admin/sourcing`);
    return { ok: true };
  } catch (error) {
    return handleError(error);
  }
}

export async function setSourcingRequestStatusAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await actorFromSession();
  if (!actor) return { ok: false, code: "forbidden" };

  const requestId = String(formData.get("requestId") ?? "").trim();
  const status = String(formData.get("status") ?? "") as SourcingRequestStatus;
  const locale = String(formData.get("locale") ?? "zh-tw");

  if (!requestId || !status) return { ok: false, code: "validation" };

  try {
    await getCommerceService().updateSourcingRequestStatus(actor, requestId, status);
    revalidatePath(`/${locale}/admin/sourcing`);
    return { ok: true };
  } catch (error) {
    return handleError(error);
  }
}

// ============================================================
// Journal
// ============================================================

export async function createJournalDraftAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await actorFromSession();
  if (!actor) return { ok: false, code: "forbidden" };

  const brandId = String(formData.get("brandId") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const locale = String(formData.get("locale") ?? "zh-tw");

  if (!brandId || !slug || !category) return { ok: false, code: "validation" };
  if (!/^[a-z0-9-]+$/.test(slug)) return { ok: false, code: "validation" };

  try {
    await getCommerceService().createJournalDraft(actor, { brandId, slug, category });
    revalidatePath(`/${locale}/admin/journal`);
    return { ok: true };
  } catch (error) {
    return handleError(error);
  }
}

export async function upsertJournalTranslationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await actorFromSession();
  if (!actor) return { ok: false, code: "forbidden" };

  const journalId = String(formData.get("journalId") ?? "").trim();
  const targetLocale = String(formData.get("targetLocale") ?? "ja") as "ja" | "zh-tw";
  const title = String(formData.get("title") ?? "").trim();
  const excerpt = String(formData.get("excerpt") ?? "").trim() || undefined;
  const locale = String(formData.get("locale") ?? "zh-tw");

  if (!journalId || !title) return { ok: false, code: "validation" };
  if (targetLocale !== "ja" && targetLocale !== "zh-tw") {
    return { ok: false, code: "validation" };
  }

  try {
    await getCommerceService().updateJournalTranslation(actor, journalId, targetLocale, {
      title,
      excerpt,
    });
    revalidatePath(`/${locale}/admin/journal`);
    return { ok: true };
  } catch (error) {
    return handleError(error);
  }
}

export async function setJournalStatusAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await actorFromSession();
  if (!actor) return { ok: false, code: "forbidden" };

  const journalId = String(formData.get("journalId") ?? "").trim();
  const status = String(formData.get("status") ?? "") as JournalStatus;
  const locale = String(formData.get("locale") ?? "zh-tw");

  if (!journalId || !status) return { ok: false, code: "validation" };

  try {
    if (status === "published") {
      await getCommerceService().publishJournal(actor, journalId);
    } else if (status === "unlisted") {
      await getCommerceService().unpublishJournal(actor, journalId);
    } else {
      return { ok: false, code: "validation" };
    }
    revalidatePath(`/${locale}/admin/journal`);
    return { ok: true };
  } catch (error) {
    return handleError(error);
  }
}

export async function softDeleteJournalAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await actorFromSession();
  if (!actor) return { ok: false, code: "forbidden" };

  const journalId = String(formData.get("journalId") ?? "").trim();
  const locale = String(formData.get("locale") ?? "zh-tw");

  if (!journalId) return { ok: false, code: "validation" };

  try {
    await getCommerceService().deleteJournal(actor, journalId);
    revalidatePath(`/${locale}/admin/journal`);
    return { ok: true };
  } catch (error) {
    return handleError(error);
  }
}
