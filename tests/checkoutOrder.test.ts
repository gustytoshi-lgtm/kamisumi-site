import { beforeEach, describe, expect, it } from "vitest";
import { addItem, emptyCart, type Cart } from "@/lib/commerce/cart";
import type { CheckoutResult } from "@/lib/commerce/checkout";
import {
  createManualTransferOrderService,
  createMockManualTransferOrderRepository,
  type MockManualTransferOrderRepository,
} from "@/lib/commerce/checkoutOrder";
import { cartSubtotal } from "@/lib/commerce/cart";
import type { ActorContext } from "@/repositories/core/writeModels";

const owner: ActorContext = { userId: "u-owner", role: "owner" };
const frontStaff: ActorContext = { userId: "u-front", role: "front_staff" };

function twdCart(): Cart {
  const cart = emptyCart("cart-1", "TWD");
  return addItem(cart, {
    productId: "kyoto-usucha-midori",
    quantity: 2,
    unitPrice: { currency: "TWD", amountMinor: 120000 },
  });
}

function checkoutFor(cart: Cart, ref = "KMS-CO-1"): CheckoutResult {
  return {
    checkoutId: "co-1",
    method: "manual_bank_transfer",
    status: "pending_payment",
    amount: cartSubtotal(cart),
    reference: ref,
    instructions: "demo",
  };
}

let repo: MockManualTransferOrderRepository;
let service: ReturnType<typeof createManualTransferOrderService>;
let clock: number;

beforeEach(() => {
  repo = createMockManualTransferOrderRepository();
  clock = 0;
  service = createManualTransferOrderService(repo, {
    now: () => new Date(1_700_000_000_000 + clock++ * 1000).toISOString(),
  });
});

async function expectErr(p: Promise<unknown>, code: string) {
  await expect(p).rejects.toMatchObject({ code });
}

describe("manual transfer order — placeOrder", () => {
  it("snapshots the cart into an order awaiting payment", async () => {
    const cart = twdCart();
    const order = await service.placeOrder({ cart, checkout: checkoutFor(cart) });
    expect(order.orderStatus).toBe("payment_waiting");
    expect(order.paymentStatus).toBe("billed");
    expect(order.amount).toEqual({ currency: "TWD", amountMinor: 240000 });
    expect(order.items).toHaveLength(1);
    expect(order.reference).toBe("KMS-CO-1");
  });

  it("is idempotent by checkout reference", async () => {
    const cart = twdCart();
    const first = await service.placeOrder({ cart, checkout: checkoutFor(cart) });
    const second = await service.placeOrder({ cart, checkout: checkoutFor(cart) });
    expect(second.orderId).toBe(first.orderId);
    expect(await repo.list()).toHaveLength(1);
  });

  it("rejects an empty cart", async () => {
    const cart = emptyCart("cart-empty", "TWD");
    await expectErr(service.placeOrder({ cart, checkout: checkoutFor(cart) }), "validation");
  });

  it("rejects a checkout amount that does not match the cart subtotal", async () => {
    const cart = twdCart();
    const bad = { ...checkoutFor(cart), amount: { currency: "TWD" as const, amountMinor: 1 } };
    await expectErr(service.placeOrder({ cart, checkout: bad }), "validation");
  });
});

describe("manual transfer order — owner actions", () => {
  it("confirms payment and advances order + payment status (owner only)", async () => {
    const cart = twdCart();
    const order = await service.placeOrder({ cart, checkout: checkoutFor(cart) });

    await expectErr(service.confirmPayment(frontStaff, order.orderId), "forbidden");

    const confirmed = await service.confirmPayment(owner, order.orderId);
    expect(confirmed.paymentStatus).toBe("paid");
    expect(confirmed.orderStatus).toBe("paid_in_full");
  });

  it("rejects double payment confirmation as an invalid transition", async () => {
    const cart = twdCart();
    const order = await service.placeOrder({ cart, checkout: checkoutFor(cart) });
    await service.confirmPayment(owner, order.orderId);
    await expectErr(service.confirmPayment(owner, order.orderId), "invalid_transition");
  });

  it("cancels an order before shipping (owner only)", async () => {
    const cart = twdCart();
    const order = await service.placeOrder({ cart, checkout: checkoutFor(cart) });
    await expectErr(service.cancelOrder(frontStaff, order.orderId), "forbidden");
    const cancelled = await service.cancelOrder(owner, order.orderId);
    expect(cancelled.orderStatus).toBe("cancelled");
  });

  it("restricts get/list to owner", async () => {
    const cart = twdCart();
    const order = await service.placeOrder({ cart, checkout: checkoutFor(cart) });
    await expectErr(service.listOrders(frontStaff), "forbidden");
    await expectErr(service.getOrder(frontStaff, order.orderId), "forbidden");
    expect(await service.listOrders(owner)).toHaveLength(1);
    expect(await service.getOrder(owner, order.orderId)).toMatchObject({ orderId: order.orderId });
  });

  it("returns not_found for unknown orders", async () => {
    await expectErr(service.confirmPayment(owner, "missing"), "not_found");
  });
});
