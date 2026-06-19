"use server";

import { revalidatePath } from "next/cache";
import { isCustomerPortalEnabled } from "@/config/features";
import { isLocale } from "@/config/site";
import { getCustomerSession, type CustomerSession } from "@/lib/customer/auth";
import { getCustomerPortalService } from "@/repositories";
import { CommerceError } from "@/repositories/core/writeModels";
import type {
  CustomerAddressInput,
  CustomerProfileUpdateInput,
} from "@/repositories/core/customerModels";
import type { ActionState } from "@/lib/admin/actionState";

/**
 * 顧客マイページのサーバーアクション。flag/セッション/本人一致を必ず再確認する
 * （クライアント側の制御に依存しない）。service 側でも本人一致を再検証する。
 */
async function sessionOrNull(): Promise<CustomerSession | null> {
  if (!isCustomerPortalEnabled()) return null;
  return getCustomerSession();
}

function handleError(error: unknown): ActionState {
  if (error instanceof CommerceError) return { ok: false, code: error.code };
  return { ok: false, code: "error" };
}

/** trim 済みの値を返す。空文字は undefined（既存値を空で上書きしないため）。 */
function field(formData: FormData, name: string): string | undefined {
  const value = String(formData.get(name) ?? "").trim();
  return value === "" ? undefined : value;
}

function localeField(formData: FormData, name: string) {
  const value = field(formData, name);
  return value && isLocale(value) ? value : undefined;
}

export async function updateProfileAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await sessionOrNull();
  if (!session) return { ok: false, code: "forbidden" };

  const locale = String(formData.get("locale") ?? "zh-tw");
  const patch: CustomerProfileUpdateInput = {};
  const name = field(formData, "name");
  if (name !== undefined) patch.name = name;
  const email = field(formData, "email");
  if (email !== undefined) patch.email = email;
  const contactHandle = field(formData, "contactHandle");
  if (contactHandle !== undefined) patch.contactHandle = contactHandle;
  const countryCode = field(formData, "countryCode");
  if (countryCode !== undefined) patch.countryCode = countryCode;
  const phone = field(formData, "phone");
  if (phone !== undefined) patch.phone = phone;
  const preferredLocale = localeField(formData, "preferredLocale");
  if (preferredLocale !== undefined) patch.preferredLocale = preferredLocale;

  try {
    await getCustomerPortalService().updateProfile(session, patch);
    revalidatePath(`/${locale}/account`);
    return { ok: true };
  } catch (error) {
    return handleError(error);
  }
}

function readAddress(formData: FormData): CustomerAddressInput {
  const input: CustomerAddressInput = {};
  const recipientName = field(formData, "recipientName");
  if (recipientName !== undefined) input.recipientName = recipientName;
  const countryCode = field(formData, "countryCode");
  if (countryCode !== undefined) input.countryCode = countryCode;
  const postalCode = field(formData, "postalCode");
  if (postalCode !== undefined) input.postalCode = postalCode;
  const line1 = field(formData, "line1");
  if (line1 !== undefined) input.line1 = line1;
  const line2 = field(formData, "line2");
  if (line2 !== undefined) input.line2 = line2;
  const city = field(formData, "city");
  if (city !== undefined) input.city = city;
  const region = field(formData, "region");
  if (region !== undefined) input.region = region;
  const phone = field(formData, "phone");
  if (phone !== undefined) input.phone = phone;
  return input;
}

export async function createAddressAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await sessionOrNull();
  if (!session) return { ok: false, code: "forbidden" };

  const locale = String(formData.get("locale") ?? "zh-tw");
  try {
    await getCustomerPortalService().createAddress(session, readAddress(formData));
    revalidatePath(`/${locale}/account`);
    return { ok: true };
  } catch (error) {
    return handleError(error);
  }
}

export async function updateAddressAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await sessionOrNull();
  if (!session) return { ok: false, code: "forbidden" };

  const locale = String(formData.get("locale") ?? "zh-tw");
  const addressId = String(formData.get("addressId") ?? "").trim();
  if (!addressId) return { ok: false, code: "validation" };

  try {
    await getCustomerPortalService().updateAddress(session, addressId, readAddress(formData));
    revalidatePath(`/${locale}/account`);
    return { ok: true };
  } catch (error) {
    return handleError(error);
  }
}
