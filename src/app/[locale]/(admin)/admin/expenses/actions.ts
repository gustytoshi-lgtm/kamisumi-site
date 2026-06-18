"use server";

import { revalidatePath } from "next/cache";
import { isAdminEnabled } from "@/config/features";
import { getAdminSession } from "@/lib/admin/auth";
import { currencyMinorUnits } from "@/lib/commerce/money";
import { getExpenseService } from "@/repositories";
import { isExpenseCategory, type ExpenseCategory } from "@/repositories/core/expenseModels";
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

export async function createExpenseAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await actorFromSession();
  if (!actor) return { ok: false, code: "forbidden" };

  const expenseDate = String(formData.get("expenseDate") ?? "").trim();
  const category = String(formData.get("category") ?? "");
  const currencyRaw = String(formData.get("currency") ?? "TWD");
  const amountRaw = String(formData.get("amount") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim() || undefined;
  const locale = String(formData.get("locale") ?? "zh-tw");

  if (!expenseDate || !isExpenseCategory(category) || !isCurrency(currencyRaw)) {
    return { ok: false, code: "validation" };
  }
  const n = Number(amountRaw);
  if (amountRaw === "" || !Number.isFinite(n) || n < 0) return { ok: false, code: "validation" };
  const amountMinor = Math.round(n * 10 ** currencyMinorUnits[currencyRaw]);

  try {
    await getExpenseService().createExpense(actor, {
      expenseDate,
      category: category as ExpenseCategory,
      currency: currencyRaw,
      amountMinor,
      note,
    });
    revalidatePath(`/${locale}/admin/expenses`);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteExpenseAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await actorFromSession();
  if (!actor) return { ok: false, code: "forbidden" };
  const expenseId = String(formData.get("expenseId") ?? "").trim();
  const locale = String(formData.get("locale") ?? "zh-tw");
  if (!expenseId) return { ok: false, code: "validation" };
  try {
    await getExpenseService().deleteExpense(actor, expenseId);
    revalidatePath(`/${locale}/admin/expenses`);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}
