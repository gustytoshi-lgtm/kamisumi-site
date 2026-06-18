"use server";

import { revalidatePath } from "next/cache";
import { isAdminEnabled } from "@/config/features";
import { getAdminSession } from "@/lib/admin/auth";
import { currencyMinorUnits } from "@/lib/commerce/money";
import { isPaymentStatus, type PaymentStatus } from "@/lib/commerce/paymentStatus";
import { getPaymentService } from "@/repositories";
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

/** 人間が入力する主要単位の金額（例 980.50）を最小通貨単位の整数へ変換。負・不正は null。 */
function majorToMinor(major: string, currency: CurrencyCode): number | null {
  const trimmed = major.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return null;
  const digits = currencyMinorUnits[currency];
  return Math.round(n * 10 ** digits);
}

export async function createPaymentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await actorFromSession();
  if (!actor) return { ok: false, code: "forbidden" };

  const orderId = String(formData.get("orderId") ?? "").trim() || undefined;
  const currencyRaw = String(formData.get("currency") ?? "TWD");
  const paymentType = String(formData.get("paymentType") ?? "").trim() || undefined;
  const expectedRaw = String(formData.get("expectedAmount") ?? "").trim();
  const locale = String(formData.get("locale") ?? "zh-tw");

  if (!isCurrency(currencyRaw)) return { ok: false, code: "validation" };
  let expectedAmountMinor: number | undefined;
  if (expectedRaw !== "") {
    const minor = majorToMinor(expectedRaw, currencyRaw);
    if (minor === null) return { ok: false, code: "validation" };
    expectedAmountMinor = minor;
  }

  try {
    await getPaymentService().createPayment(actor, {
      orderId,
      currency: currencyRaw,
      expectedAmountMinor,
      paymentType,
    });
    revalidatePath(`/${locale}/admin/payments`);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function changePaymentStatusAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await actorFromSession();
  if (!actor) return { ok: false, code: "forbidden" };

  const paymentId = String(formData.get("paymentId") ?? "").trim();
  const toStatus = String(formData.get("toStatus") ?? "");
  const note = String(formData.get("note") ?? "").trim() || undefined;
  const locale = String(formData.get("locale") ?? "zh-tw");

  if (!paymentId || !isPaymentStatus(toStatus)) return { ok: false, code: "validation" };

  try {
    await getPaymentService().changePaymentStatus(actor, paymentId, toStatus as PaymentStatus, note);
    revalidatePath(`/${locale}/admin/payments`);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function recordReceiptAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await actorFromSession();
  if (!actor) return { ok: false, code: "forbidden" };

  const paymentId = String(formData.get("paymentId") ?? "").trim();
  const currencyRaw = String(formData.get("currency") ?? "TWD");
  const amountRaw = String(formData.get("amount") ?? "").trim();
  const matchingNumber = String(formData.get("matchingNumber") ?? "").trim() || undefined;
  const locale = String(formData.get("locale") ?? "zh-tw");

  if (!paymentId || !isCurrency(currencyRaw)) return { ok: false, code: "validation" };
  const amountMinor = majorToMinor(amountRaw, currencyRaw);
  if (amountMinor === null) return { ok: false, code: "validation" };

  try {
    await getPaymentService().recordReceipt(actor, paymentId, { amountMinor, matchingNumber });
    revalidatePath(`/${locale}/admin/payments`);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}
