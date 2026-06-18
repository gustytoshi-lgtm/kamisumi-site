import type { CurrencyCode, Money } from "@/types/commerce";
import { addMoney, multiplyMoney, zeroMoney } from "./money";

/**
 * Cart interface + 純粋操作 + mock cart（Phase 3 基盤）。
 *
 * 本番決済・在庫引当はここでは行わない（adapter / service の責務）。
 * 金額は最小通貨単位の整数（Money）。通貨混在は addMoney が拒否する。
 * mock cart は in-memory（dev・再起動で消える）。
 */
export type CartItem = {
  productId: string;
  quantity: number;
  unitPrice: Money;
};

export type Cart = {
  id: string;
  currency: CurrencyCode;
  items: CartItem[];
};

export function emptyCart(id: string, currency: CurrencyCode): Cart {
  return { id, currency, items: [] };
}

function assertPositiveInt(quantity: number): void {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error(`quantity must be a positive integer (got ${quantity})`);
  }
}

/** 同一 productId は数量を合算（unitPrice は最新で上書き）。新しい Cart を返す（不変）。 */
export function addItem(cart: Cart, item: CartItem): Cart {
  assertPositiveInt(item.quantity);
  if (item.unitPrice.currency !== cart.currency) {
    throw new Error(`item currency ${item.unitPrice.currency} != cart ${cart.currency}`);
  }
  const existing = cart.items.find((i) => i.productId === item.productId);
  const items = existing
    ? cart.items.map((i) =>
        i.productId === item.productId
          ? { ...i, quantity: i.quantity + item.quantity, unitPrice: item.unitPrice }
          : i,
      )
    : [...cart.items, item];
  return { ...cart, items };
}

export function setItemQuantity(cart: Cart, productId: string, quantity: number): Cart {
  if (quantity === 0) return removeItem(cart, productId);
  assertPositiveInt(quantity);
  return {
    ...cart,
    items: cart.items.map((i) => (i.productId === productId ? { ...i, quantity } : i)),
  };
}

export function removeItem(cart: Cart, productId: string): Cart {
  return { ...cart, items: cart.items.filter((i) => i.productId !== productId) };
}

export function clearCart(cart: Cart): Cart {
  return { ...cart, items: [] };
}

export function cartItemCount(cart: Cart): number {
  return cart.items.reduce((acc, i) => acc + i.quantity, 0);
}

/** 小計（最小通貨単位の整数 Money）。空なら 0。 */
export function cartSubtotal(cart: Cart): Money {
  return cart.items.reduce(
    (acc, i) => addMoney(acc, multiplyMoney(i.unitPrice, i.quantity)),
    zeroMoney(cart.currency),
  );
}

// ---- Cart repository（mock）----

export interface CartRepository {
  getCart(id: string): Promise<Cart | null>;
  saveCart(cart: Cart): Promise<Cart>;
  deleteCart(id: string): Promise<void>;
}

export type MockCartRepository = CartRepository & { reset(): void };

export function createMockCartRepository(): MockCartRepository {
  let carts = new Map<string, Cart>();
  return {
    reset() {
      carts = new Map();
    },
    async getCart(id) {
      return carts.get(id) ?? null;
    },
    async saveCart(cart) {
      carts.set(cart.id, cart);
      return cart;
    },
    async deleteCart(id) {
      carts.delete(id);
    },
  };
}
