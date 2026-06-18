"use server";

import { revalidatePath } from "next/cache";
import { isAdminEnabled } from "@/config/features";
import { getAdminSession } from "@/lib/admin/auth";
import { buildAccountingEntries } from "@/lib/commerce/accountingExportService";
import { getAccountingExportService, getExpenseService, getPaymentService } from "@/repositories";
import { CommerceError } from "@/repositories/core/writeModels";
import type { ActionState } from "@/lib/admin/actionState";

async function actorFromSession() {
  if (!isAdminEnabled()) return null;
  const session = await getAdminSession();
  if (!session) return null;
  return { userId: session.userId, role: session.role };
}

export async function runAccountingExportAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await actorFromSession();
  if (!actor) return { ok: false, code: "forbidden" };

  const idempotencyKey = String(formData.get("idempotencyKey") ?? "").trim();
  const locale = String(formData.get("locale") ?? "zh-tw");
  if (!idempotencyKey) return { ok: false, code: "validation" };

  try {
    const [expenses, payments] = await Promise.all([
      getExpenseService().listExpenses(actor),
      getPaymentService().listPayments(actor),
    ]);
    const entries = buildAccountingEntries({ expenses, payments });
    await getAccountingExportService().exportEntries(actor, idempotencyKey, entries);
    revalidatePath(`/${locale}/admin/accounting`);
    return { ok: true };
  } catch (error) {
    if (error instanceof CommerceError) return { ok: false, code: error.code };
    return { ok: false, code: "error" };
  }
}
