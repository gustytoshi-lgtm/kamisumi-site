import { describe, expect, it } from "vitest";
import { addItem, emptyCart, type Cart } from "@/lib/commerce/cart";
import type { CheckoutResult } from "@/lib/commerce/checkout";
import {
  createManualTransferOrderService,
  type ManualTransferOrderRepository,
} from "@/lib/commerce/checkoutOrder";
import { cartSubtotal } from "@/lib/commerce/cart";
import type { ActorContext } from "@/repositories/core/writeModels";
import { uniqueContractSuffix } from "./repositoryContractFixtures";

const frontStaff: ActorContext = { userId: "u-front", role: "front_staff" };

function twdCart(): Cart {
  return addItem(emptyCart("cart-1", "TWD"), {
    productId: "kyoto-usucha-midori",
    quantity: 2,
    unitPrice: { currency: "TWD", amountMinor: 120000 },
  });
}

function checkoutFor(cart: Cart, suffix: string): CheckoutResult {
  const checkoutId = `co-${suffix}`;
  return {
    checkoutId,
    method: "manual_bank_transfer",
    status: "pending_payment",
    amount: cartSubtotal(cart),
    reference: `KMS-${checkoutId.toUpperCase()}`,
    instructions: "demo",
  };
}

async function expectErr(p: Promise<unknown>, code: string) {
  await expect(p).rejects.toMatchObject({ code });
}

/**
 * 手動振込 注文台帳の repository 契約。mock / Supabase で同一挙動を保証する。
 * 業務ルール（owner 限定・状態遷移・冪等・検証）は service 経由で検証する（mock/supabase 共通）。
 * Supabase は実 DB に書き込むため、各ケースは reference を一意化して衝突を避ける。
 */
export function runManualTransferOrderContract(
  name: string,
  makeRepo: () => ManualTransferOrderRepository,
  makeActor: () => ActorContext,
) {
  describe(`manual transfer order contract: ${name}`, () => {
    const owner = makeActor();

    it("places an order awaiting payment and snapshots the cart", async () => {
      const service = createManualTransferOrderService(makeRepo());
      const cart = twdCart();
      const order = await service.placeOrder({ cart, checkout: checkoutFor(cart, uniqueContractSuffix("place")) });
      expect(order.orderStatus).toBe("payment_waiting");
      expect(order.paymentStatus).toBe("billed");
      expect(order.amount).toEqual({ currency: "TWD", amountMinor: 240000 });
      expect(order.items).toHaveLength(1);
      expect(order.items[0]).toMatchObject({ productId: "kyoto-usucha-midori", quantity: 2 });
    });

    it("re-fetches a persisted order by id and by reference with identical data", async () => {
      const repo = makeRepo();
      const service = createManualTransferOrderService(repo);
      const cart = twdCart();
      const checkout = checkoutFor(cart, uniqueContractSuffix("fetch"));
      const order = await service.placeOrder({ cart, checkout });

      const byId = await repo.get(order.orderId);
      const byRef = await repo.getByReference(checkout.reference);
      expect(byId).toMatchObject({
        orderId: order.orderId,
        reference: checkout.reference,
        orderStatus: "payment_waiting",
        paymentStatus: "billed",
      });
      expect(byId?.amount).toEqual({ currency: "TWD", amountMinor: 240000 });
      expect(byId?.items).toHaveLength(1);
      expect(byRef?.orderId).toBe(order.orderId);
    });

    it("is idempotent by checkout reference", async () => {
      const repo = makeRepo();
      const service = createManualTransferOrderService(repo);
      const cart = twdCart();
      const checkout = checkoutFor(cart, uniqueContractSuffix("idem"));
      const first = await service.placeOrder({ cart, checkout });
      const second = await service.placeOrder({ cart, checkout });
      expect(second.orderId).toBe(first.orderId);
      const all = await service.listOrders(owner);
      expect(all.filter((o) => o.reference === checkout.reference)).toHaveLength(1);
    });

    it("owner confirms payment; state persists after re-fetch", async () => {
      const repo = makeRepo();
      const service = createManualTransferOrderService(repo);
      const cart = twdCart();
      const order = await service.placeOrder({ cart, checkout: checkoutFor(cart, uniqueContractSuffix("pay")) });

      const confirmed = await service.confirmPayment(owner, order.orderId);
      expect(confirmed.paymentStatus).toBe("paid");
      expect(confirmed.orderStatus).toBe("paid_in_full");

      const refetched = await repo.get(order.orderId);
      expect(refetched).toMatchObject({ paymentStatus: "paid", orderStatus: "paid_in_full" });
    });

    it("rejects double payment confirmation as an invalid transition", async () => {
      const service = createManualTransferOrderService(makeRepo());
      const cart = twdCart();
      const order = await service.placeOrder({ cart, checkout: checkoutFor(cart, uniqueContractSuffix("dbl")) });
      await service.confirmPayment(owner, order.orderId);
      await expectErr(service.confirmPayment(owner, order.orderId), "invalid_transition");
    });

    it("owner cancels an order before shipping; state persists", async () => {
      const repo = makeRepo();
      const service = createManualTransferOrderService(repo);
      const cart = twdCart();
      const order = await service.placeOrder({ cart, checkout: checkoutFor(cart, uniqueContractSuffix("cxl")) });
      const cancelled = await service.cancelOrder(owner, order.orderId);
      expect(cancelled.orderStatus).toBe("cancelled");
      expect((await repo.get(order.orderId))?.orderStatus).toBe("cancelled");
    });

    it("denies non-owner roles (confirm / cancel / list / get)", async () => {
      const service = createManualTransferOrderService(makeRepo());
      const cart = twdCart();
      const order = await service.placeOrder({ cart, checkout: checkoutFor(cart, uniqueContractSuffix("rbac")) });
      await expectErr(service.confirmPayment(frontStaff, order.orderId), "forbidden");
      await expectErr(service.cancelOrder(frontStaff, order.orderId), "forbidden");
      await expectErr(service.listOrders(frontStaff), "forbidden");
      await expectErr(service.getOrder(frontStaff, order.orderId), "forbidden");
    });

    it("rejects empty cart and checkout-amount mismatch (validation)", async () => {
      const service = createManualTransferOrderService(makeRepo());
      const empty = emptyCart("cart-empty", "TWD");
      await expectErr(
        service.placeOrder({ cart: empty, checkout: checkoutFor(twdCart(), uniqueContractSuffix("empty")) }),
        "validation",
      );
      const cart = twdCart();
      const bad: CheckoutResult = {
        ...checkoutFor(cart, uniqueContractSuffix("mismatch")),
        amount: { currency: "TWD", amountMinor: 1 },
      };
      await expectErr(service.placeOrder({ cart, checkout: bad }), "validation");
    });

    it("returns null for unknown order/reference and not_found on owner action", async () => {
      const repo = makeRepo();
      const service = createManualTransferOrderService(repo);
      expect(await repo.get(`mto-missing-${uniqueContractSuffix("x")}`)).toBeNull();
      expect(await repo.getByReference(`KMS-MISSING-${uniqueContractSuffix("x")}`)).toBeNull();
      await expectErr(service.confirmPayment(owner, `mto-missing-${uniqueContractSuffix("y")}`), "not_found");
    });
  });
}
