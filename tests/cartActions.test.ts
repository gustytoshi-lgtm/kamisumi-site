import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Cart, CartRepository } from "@/lib/commerce/cart";
import type { Product } from "@/types/commerce";

const mocks = vi.hoisted(() => {
  const cookieValues = new Map<string, string>();
  const savedCarts = new Map<string, Cart>();
  return {
    cookieValues,
    savedCarts,
    isCartEnabled: vi.fn(() => true),
    revalidatePath: vi.fn(),
    redirect: vi.fn((path: string) => {
      throw Object.assign(new Error("NEXT_REDIRECT"), { path });
    }),
    getProductBySlug: vi.fn(),
  };
});

vi.mock("@/config/features", () => ({
  isCartEnabled: mocks.isCartEnabled,
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      const value = mocks.cookieValues.get(name);
      return value ? { name, value } : undefined;
    },
    set: (name: string, value: string) => {
      mocks.cookieValues.set(name, value);
    },
    delete: (name: string) => {
      mocks.cookieValues.delete(name);
    },
  }),
}));

const cartRepo: CartRepository = {
  async getCart(id) {
    return mocks.savedCarts.get(id) ?? null;
  },
  async saveCart(cart) {
    mocks.savedCarts.set(cart.id, cart);
    return cart;
  },
  async deleteCart(id) {
    mocks.savedCarts.delete(id);
  },
};

vi.mock("@/repositories", () => ({
  getCartRepository: () => cartRepo,
  getCommerceRepository: () => ({
    getProductBySlug: mocks.getProductBySlug,
  }),
  getCheckoutAdapter: () => ({
    startCheckout: vi.fn(),
    getCheckout: vi.fn(),
  }),
}));

function product(overrides: Partial<Product> = {}): Product {
  return {
    slug: "kyoto-usucha-midori",
    publicStatus: "in_stock",
    price: { currency: "TWD", amountMinor: 120000 },
    ...overrides,
  } as Product;
}

function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
}

describe("cart server actions", () => {
  beforeEach(() => {
    mocks.cookieValues.clear();
    mocks.savedCarts.clear();
    mocks.isCartEnabled.mockReturnValue(true);
    mocks.revalidatePath.mockClear();
    mocks.redirect.mockClear();
    mocks.getProductBySlug.mockReset();
  });

  it("rejects add-to-cart when the cart feature is disabled", async () => {
    mocks.isCartEnabled.mockReturnValue(false);
    const { addToCartAction } = await import("@/app/[locale]/(public)/cart/actions");

    await expect(
      addToCartAction({ ok: false }, form({ locale: "ja", slug: "kyoto-usucha-midori", quantity: "1" })),
    ).resolves.toEqual({ ok: false, code: "forbidden" });
    expect(mocks.savedCarts.size).toBe(0);
  });

  it("rejects unknown products and invalid quantities", async () => {
    mocks.getProductBySlug.mockResolvedValue(null);
    const { addToCartAction } = await import("@/app/[locale]/(public)/cart/actions");

    await expect(
      addToCartAction({ ok: false }, form({ locale: "ja", slug: "missing", quantity: "1" })),
    ).resolves.toEqual({ ok: false, code: "not_found" });

    await expect(
      addToCartAction({ ok: false }, form({ locale: "ja", slug: "kyoto-usucha-midori", quantity: "100" })),
    ).resolves.toEqual({ ok: false, code: "validation" });
  });

  it("rejects non-purchasable product statuses", async () => {
    mocks.getProductBySlug.mockResolvedValue(product({ publicStatus: "coming_soon" }));
    const { addToCartAction } = await import("@/app/[locale]/(public)/cart/actions");

    await expect(
      addToCartAction({ ok: false }, form({ locale: "ja", slug: "kyoto-usucha-midori", quantity: "1" })),
    ).resolves.toEqual({ ok: false, code: "validation" });
  });

  it("uses master product price and can redirect to the localized cart", async () => {
    mocks.getProductBySlug.mockResolvedValue(product());
    const { addToCartAction } = await import("@/app/[locale]/(public)/cart/actions");

    await expect(
      addToCartAction(
        { ok: false },
        form({
          locale: "ja",
          slug: "kyoto-usucha-midori",
          quantity: "2",
          forgedPriceMinor: "1",
          redirectToCart: "true",
        }),
      ),
    ).rejects.toMatchObject({ path: "/ja/cart" });

    const saved = [...mocks.savedCarts.values()][0];
    expect(saved.items).toEqual([
      {
        productId: "kyoto-usucha-midori",
        quantity: 2,
        unitPrice: { currency: "TWD", amountMinor: 120000 },
      },
    ]);
  });
});
