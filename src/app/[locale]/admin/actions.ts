"use server";

import { revalidatePath } from "next/cache";
import { isAdminEnabled } from "@/config/features";
import { getAdminSession } from "@/lib/admin/auth";
import { getCommerceService } from "@/repositories";
import { CommerceError, type ProductStatus } from "@/repositories/core/writeModels";
import type { ActionState } from "@/lib/admin/actionState";

/**
 * 管理画面のサーバーアクション。CommerceError を UI が i18n マッピングできるコードに変換して返す。
 * すべて flag/セッション/権限を再確認する（クライアント側の制御に依存しない）。
 * 注: "use server" ファイルは async 関数のみ export 可。型は actionState.ts に分離。
 */
function actorFromSession() {
  if (!isAdminEnabled()) return null;
  const session = getAdminSession();
  if (!session) return null;
  return { userId: session.userId, role: session.role };
}

export async function changeProductStatusAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = actorFromSession();
  if (!actor) return { ok: false, code: "forbidden" };

  const productId = String(formData.get("productId") ?? "");
  const status = String(formData.get("status") ?? "") as ProductStatus;
  const locale = String(formData.get("locale") ?? "zh-tw");

  try {
    await getCommerceService().setProductStatus(actor, productId, status);
    revalidatePath(`/${locale}/admin/products`);
    return { ok: true };
  } catch (error) {
    if (error instanceof CommerceError) return { ok: false, code: error.code };
    return { ok: false, code: "error" };
  }
}
