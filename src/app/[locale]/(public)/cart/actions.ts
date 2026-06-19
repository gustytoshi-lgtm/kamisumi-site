"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { isCartEnabled } from "@/config/features";
import {
  addItem,
  cartItemCount,
  cartSubtotal,
  clearCart,
  emptyCart,
  removeItem,
  setItemQuantity,
} from "@/lib/commerce/cart";
import { getCartRepository, getCheckoutAdapter, getCommerceRepository } from "@/repositories";
import type { ActionState } from "@/lib/admin/actionState";
import { CART_COOKIE, CHECKOUT_COOKIE } from "./cartCookies";

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

function parseInteger(formData: FormData, name: string, min: number): number | null {
  const value = Number(String(formData.get(name) ?? "").trim());
  return Number.isInteger(value) && value >= min ? value : null;
}

export async function addToCartAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!isCartEnabled()) return fail("forbidden");
  const slug = String(formData.get("slug") ?? "").trim();
  const quantity = parseInteger(formData, "quantity", 1);
  if (!slug || quantity === null) return fail("validation");
  const locale = String(formData.get("locale") ?? "zh-tw");

  const product = await getCommerceRepository().getProductBySlug(slug);
  if (!product) return fail("not_found");

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
    return ok();
  } catch {
    return fail("error");
  }
}

export async function updateQuantityAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!isCartEnabled()) return fail("forbidden");
  const slug = String(formData.get("slug") ?? "").trim();
  const quantity = parseInteger(formData, "quantity", 0);
  if (!slug || quantity === null) return fail("validation");
  const locale = String(formData.get("locale") ?? "zh-tw");

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
  const locale = String(formData.get("locale") ?? "zh-tw");
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
  const locale = String(formData.get("locale") ?? "zh-tw");
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
