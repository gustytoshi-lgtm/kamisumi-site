"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { defaultLocale, isLocale, type Locale } from "@/config/site";
import { isCartEnabled } from "@/config/features";
import {
  addItem,
  cartItemCount,
  cartSubtotal,
  clearCart,
  emptyCart,
  MAX_CART_QUANTITY,
  removeItem,
  setItemQuantity,
} from "@/lib/commerce/cart";
import { isSupportedDisplayCurrency, zoneForCountry } from "@/config/shipping";
import { isPurchasableStatus } from "@/lib/status";
import {
  getCartRepository,
  getCheckoutAdapter,
  getCommerceRepository,
  getManualTransferOrderService,
} from "@/repositories";
import type { ActionState } from "@/lib/admin/actionState";
import { CART_COOKIE, CHECKOUT_COOKIE, CURRENCY_COOKIE, DEST_COOKIE } from "./cartCookies";

function ok(): ActionState {
  return { ok: true };
}
function fail(code: string): ActionState {
  return { ok: false, code };
}

async function ensureCartId(): Promise<string> {
  const store = await cookies();
  const existing = store.get(CART_COOKIE)?.value;
  if (existing) return existing;
  const id = `cart-${randomUUID()}`;
  store.set(CART_COOKIE, id, { httpOnly: true, sameSite: "lax", path: "/" });
  return id;
}

async function clearCheckoutCookie(): Promise<void> {
  (await cookies()).delete(CHECKOUT_COOKIE);
}

function parseLocale(formData: FormData): Locale {
  const value = String(formData.get("locale") ?? "").trim();
  return isLocale(value) ? value : defaultLocale;
}

function parseInteger(formData: FormData, name: string, min: number, max: number): number | null {
  const value = Number(String(formData.get(name) ?? "").trim());
  return Number.isInteger(value) && value >= min && value <= max ? value : null;
}

export async function addToCartAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!isCartEnabled()) return fail("forbidden");
  const slug = String(formData.get("slug") ?? "").trim();
  const quantity = parseInteger(formData, "quantity", 1, MAX_CART_QUANTITY);
  if (!slug || quantity === null) return fail("validation");
  const locale = parseLocale(formData);
  const shouldRedirectToCart = String(formData.get("redirectToCart") ?? "") === "true";

  const product = await getCommerceRepository().getProductBySlug(slug);
  if (!product) return fail("not_found");
  if (!isPurchasableStatus(product.publicStatus)) return fail("validation");

  try {
    const cartId = await ensureCartId();
    const repo = getCartRepository();
    const current = (await repo.getCart(cartId)) ?? emptyCart(cartId, product.price.currency);
    if (current.currency !== product.price.currency) return fail("validation");
    await repo.saveCart(
      addItem(current, { productId: product.slug, quantity, unitPrice: product.price }),
    );
    await clearCheckoutCookie();
    revalidatePath(`/${locale}/cart`);
  } catch {
    return fail("error");
  }
  if (shouldRedirectToCart) redirect(`/${locale}/cart`);
  return ok();
}

export async function updateQuantityAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!isCartEnabled()) return fail("forbidden");
  const slug = String(formData.get("slug") ?? "").trim();
  const quantity = parseInteger(formData, "quantity", 0, MAX_CART_QUANTITY);
  if (!slug || quantity === null) return fail("validation");
  const locale = parseLocale(formData);

  const store = await cookies();
  const cartId = store.get(CART_COOKIE)?.value;
  if (!cartId) return fail("not_found");

  try {
    const repo = getCartRepository();
    const current = await repo.getCart(cartId);
    if (!current) return fail("not_found");
    await repo.saveCart(setItemQuantity(current, slug, quantity));
    revalidatePath(`/${locale}/cart`);
    return ok();
  } catch {
    return fail("error");
  }
}

export async function removeItemAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!isCartEnabled()) return fail("forbidden");
  const slug = String(formData.get("slug") ?? "").trim();
  if (!slug) return fail("validation");
  const locale = String(formData.get("locale") ?? "zh-tw");

  const store = await cookies();
  const cartId = store.get(CART_COOKIE)?.value;
  if (!cartId) return fail("not_found");

  try {
    const repo = getCartRepository();
    const current = await repo.getCart(cartId);
    if (!current) return fail("not_found");
    await repo.saveCart(removeItem(current, slug));
    revalidatePath(`/${locale}/cart`);
    return ok();
  } catch {
    return fail("error");
  }
}

export async function clearCartAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!isCartEnabled()) return fail("forbidden");
  const locale = parseLocale(formData);
  const store = await cookies();
  const cartId = store.get(CART_COOKIE)?.value;
  if (!cartId) return ok();

  try {
    const repo = getCartRepository();
    const current = await repo.getCart(cartId);
    if (current) await repo.saveCart(clearCart(current));
    await clearCheckoutCookie();
    revalidatePath(`/${locale}/cart`);
    return ok();
  } catch {
    return fail("error");
  }
}

export async function checkoutAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!isCartEnabled()) return fail("forbidden");
  const locale = parseLocale(formData);
  const store = await cookies();
  const cartId = store.get(CART_COOKIE)?.value;
  if (!cartId) return fail("validation");

  try {
    const repo = getCartRepository();
    const cart = await repo.getCart(cartId);
    if (!cart || cartItemCount(cart) === 0) return fail("validation");

    // idempotencyKey はカート内容に紐づける（同一内容の二重送信を防ぎ、変更後は再 checkout 可）。
    const subtotal = cartSubtotal(cart);
    const idempotencyKey = `${cartId}:${cartItemCount(cart)}:${subtotal.amountMinor}`;
    const result = await getCheckoutAdapter().startCheckout({ cart, idempotencyKey });

    // 注文台帳に記録（reference で冪等）。記録できた後にカートをクリアする。
    await getManualTransferOrderService().placeOrder({ cart, checkout: result });

    // 本番決済はしない。pending_payment の参照番号を cookie に保存し、確認パネルで表示する。
    store.set(CHECKOUT_COOKIE, result.checkoutId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
    await repo.saveCart(clearCart(cart));
    revalidatePath(`/${locale}/cart`);
    return ok();
  } catch {
    return fail("error");
  }
}

export async function setDestinationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!isCartEnabled()) return fail("forbidden");
  const country = String(formData.get("country") ?? "").trim();
  if (!country || !zoneForCountry(country)) return fail("validation");
  const locale = parseLocale(formData);

  (await cookies()).set(DEST_COOKIE, country, { httpOnly: true, sameSite: "lax", path: "/" });
  revalidatePath(`/${locale}/cart`);
  return ok();
}

export async function setDisplayCurrencyAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!isCartEnabled()) return fail("forbidden");
  const currency = String(formData.get("currency") ?? "").trim();
  if (!isSupportedDisplayCurrency(currency)) return fail("validation");
  const locale = parseLocale(formData);

  (await cookies()).set(CURRENCY_COOKIE, currency, { httpOnly: true, sameSite: "lax", path: "/" });
  revalidatePath(`/${locale}/cart`);
  return ok();
}
