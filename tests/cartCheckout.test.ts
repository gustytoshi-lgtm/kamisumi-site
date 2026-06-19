import { describe, expect, it } from "vitest";
import {
  addItem,
  cartItemCount,
  cartSubtotal,
  clearCart,
  createMockCartRepository,
  emptyCart,
  MAX_CART_QUANTITY,
  removeItem,
  setItemQuantity,
} from "@/lib/commerce/cart";
import {
  createMockManualTransferAdapter,
  createSandboxCheckoutAdapter,
} from "@/lib/commerce/checkout";
import type { Money } from "@/types/commerce";

const twd = (amountMinor: number): Money => ({ currency: "TWD", amountMinor });

describe("cart pure operations", () => {
  it("adds, merges quantity, computes subtotal and count", () => {
    let cart = emptyCart("c1", "TWD");
    cart = addItem(cart, { productId: "p1", quantity: 2, unitPrice: twd(10000) });
    cart = addItem(cart, { productId: "p1", quantity: 1, unitPrice: twd(10000) });
    cart = addItem(cart, { productId: "p2", quantity: 1, unitPrice: twd(5000) });
    expect(cartItemCount(cart)).toBe(4);
    expect(cartSubtotal(cart)).toEqual(twd(35000));
  });

  it("rejects cross-currency and non-positive quantity", () => {
    const cart = emptyCart("c1", "TWD");
    expect(() => addItem(cart, { productId: "p", quantity: 1, unitPrice: { currency: "JPY", amountMinor: 1 } })).toThrow();
    expect(() => addItem(cart, { productId: "p", quantity: 0, unitPrice: twd(1) })).toThrow();
  });

  it("rejects quantities above the cart item limit", () => {
    const cart = emptyCart("c1", "TWD");
    expect(() =>
      addItem(cart, { productId: "p", quantity: MAX_CART_QUANTITY + 1, unitPrice: twd(1) }),
    ).toThrow();

    const full = addItem(cart, { productId: "p", quantity: MAX_CART_QUANTITY, unitPrice: twd(1) });
    expect(() => addItem(full, { productId: "p", quantity: 1, unitPrice: twd(1) })).toThrow();
    expect(() => setItemQuantity(full, "p", MAX_CART_QUANTITY + 1)).toThrow();
  });

  it("updates and removes items; setItemQuantity 0 removes", () => {
    let cart = emptyCart("c1", "TWD");
    cart = addItem(cart, { productId: "p1", quantity: 5, unitPrice: twd(100) });
    cart = setItemQuantity(cart, "p1", 2);
    expect(cartSubtotal(cart)).toEqual(twd(200));
    cart = setItemQuantity(cart, "p1", 0);
    expect(cart.items).toHaveLength(0);
    cart = addItem(cart, { productId: "p2", quantity: 1, unitPrice: twd(100) });
    expect(removeItem(cart, "p2").items).toHaveLength(0);
    expect(clearCart(cart).items).toHaveLength(0);
  });
});

describe("mock cart repository", () => {
  it("saves and gets carts; reset clears", async () => {
    const repo = createMockCartRepository();
    await repo.saveCart(emptyCart("c1", "TWD"));
    expect(await repo.getCart("c1")).not.toBeNull();
    repo.reset();
    expect(await repo.getCart("c1")).toBeNull();
  });
});

describe("manual transfer checkout (mock)", () => {
  it("starts a pending_payment checkout and is idempotent", async () => {
    const adapter = createMockManualTransferAdapter();
    let cart = emptyCart("c1", "TWD");
    cart = addItem(cart, { productId: "p1", quantity: 2, unitPrice: twd(10000) });
    const result = await adapter.startCheckout({ cart, idempotencyKey: "k1" });
    expect(result.status).toBe("pending_payment");
    expect(result.method).toBe("manual_bank_transfer");
    expect(result.amount).toEqual(twd(20000));
    const again = await adapter.startCheckout({ cart, idempotencyKey: "k1" });
    expect(again.checkoutId).toBe(result.checkoutId);
    expect(await adapter.getCheckout(result.checkoutId)).not.toBeNull();
  });

  it("rejects empty cart", async () => {
    const adapter = createMockManualTransferAdapter();
    await expect(adapter.startCheckout({ cart: emptyCart("c1", "TWD"), idempotencyKey: "k" })).rejects.toThrow();
  });

  it("sandbox adapters are not implemented (no real payment)", async () => {
    const stripe = createSandboxCheckoutAdapter("stripe");
    await expect(stripe.startCheckout({ cart: emptyCart("c", "TWD"), idempotencyKey: "k" })).rejects.toThrow();
  });
});
