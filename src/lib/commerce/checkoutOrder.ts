import type { CurrencyCode, Money } from "@/types/commerce";
import { CommerceError, type ActorContext } from "@/repositories/core/writeModels";
import { cartItemCount, cartSubtotal, type Cart, type CartItem } from "./cart";
import type { CheckoutResult } from "./checkout";
import { canTransitionOrder, type OrderStatus } from "./orderStatus";
import { canTransitionPayment, type PaymentStatus } from "./paymentStatus";
import { can, type Permission } from "./rbac";

/**
 * 手動振込の注文台帳（Phase 3 mock）。
 *
 * cart の checkout 時に注文内容をスナップショットして記録し、
 * オーナーが入金確認（手動振込）で支払い状態を前進させる。
 * 既存の orderStatus / paymentStatus 状態機械を再利用する。
 * 本番決済は行わない。実口座番号は保持しない（照合参照のみ）。金額は整数最小単位。
 */
export type ManualTransferOrder = {
  orderId: string;
  reference: string;
  checkoutId: string;
  currency: CurrencyCode;
  items: CartItem[];
  amount: Money;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  customerRef?: string;
  createdAt: string;
  updatedAt: string;
};

// 初期状態: 顧客は振込参照番号を受け取り、入金待ち。
const INITIAL_ORDER_STATUS: OrderStatus = "payment_waiting";
const INITIAL_PAYMENT_STATUS: PaymentStatus = "billed";

// 入金確認は会計・金額の機微情報。paymentService と同じく owner 限定（purchase:manage）。
const ORDER_PAYMENT_PERMISSION: Permission = "purchase:manage";

export interface ManualTransferOrderRepository {
  get(orderId: string): Promise<ManualTransferOrder | null>;
  getByReference(reference: string): Promise<ManualTransferOrder | null>;
  save(order: ManualTransferOrder): Promise<ManualTransferOrder>;
  list(): Promise<ManualTransferOrder[]>;
}

export type MockManualTransferOrderRepository = ManualTransferOrderRepository & { reset(): void };

export function createMockManualTransferOrderRepository(): MockManualTransferOrderRepository {
  let orders = new Map<string, ManualTransferOrder>();
  return {
    reset() {
      orders = new Map();
    },
    async get(orderId) {
      return orders.get(orderId) ?? null;
    },
    async getByReference(reference) {
      return [...orders.values()].find((o) => o.reference === reference) ?? null;
    },
    async save(order) {
      orders.set(order.orderId, order);
      return order;
    },
    async list() {
      return [...orders.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    },
  };
}

function assertCan(ctx: ActorContext, permission: Permission): void {
  if (!can(ctx.role, permission)) {
    throw new CommerceError("forbidden", `role ${ctx.role} lacks ${permission}`, { permission });
  }
}

export type PlaceManualTransferOrderInput = {
  cart: Cart;
  checkout: CheckoutResult;
  customerRef?: string;
};

export function createManualTransferOrderService(
  repo: ManualTransferOrderRepository,
  options?: { now?: () => string },
) {
  const now = options?.now ?? (() => new Date().toISOString());

  return {
    /** checkout 確定時に注文をスナップショット記録する（公開フロー）。reference で冪等。 */
    async placeOrder(input: PlaceManualTransferOrderInput): Promise<ManualTransferOrder> {
      const { cart, checkout } = input;
      if (cartItemCount(cart) === 0) {
        throw new CommerceError("validation", "cannot place an order from an empty cart");
      }
      const existing = await repo.getByReference(checkout.reference);
      if (existing) return existing;

      const amount = cartSubtotal(cart);
      if (
        amount.currency !== checkout.amount.currency ||
        amount.amountMinor !== checkout.amount.amountMinor
      ) {
        throw new CommerceError("validation", "cart subtotal does not match checkout amount");
      }

      const ts = now();
      return repo.save({
        orderId: `mto-${checkout.checkoutId}`,
        reference: checkout.reference,
        checkoutId: checkout.checkoutId,
        currency: cart.currency,
        items: cart.items.map((item) => ({ ...item })),
        amount,
        orderStatus: INITIAL_ORDER_STATUS,
        paymentStatus: INITIAL_PAYMENT_STATUS,
        customerRef: input.customerRef,
        createdAt: ts,
        updatedAt: ts,
      });
    },

    /** owner が手動振込の入金を確認する。支払い・注文状態を前進させる。 */
    async confirmPayment(ctx: ActorContext, orderId: string): Promise<ManualTransferOrder> {
      assertCan(ctx, ORDER_PAYMENT_PERMISSION);
      const order = await repo.get(orderId);
      if (!order) throw new CommerceError("not_found", `order ${orderId} not found`);
      if (!canTransitionPayment(order.paymentStatus, "paid")) {
        throw new CommerceError(
          "invalid_transition",
          `payment ${order.paymentStatus} -> paid not allowed`,
          { from: order.paymentStatus, to: "paid" },
        );
      }
      const orderStatus = canTransitionOrder(order.orderStatus, "paid_in_full")
        ? "paid_in_full"
        : order.orderStatus;
      return repo.save({ ...order, paymentStatus: "paid", orderStatus, updatedAt: now() });
    },

    /** owner が注文を取消す（発送前のみ）。 */
    async cancelOrder(ctx: ActorContext, orderId: string): Promise<ManualTransferOrder> {
      assertCan(ctx, ORDER_PAYMENT_PERMISSION);
      const order = await repo.get(orderId);
      if (!order) throw new CommerceError("not_found", `order ${orderId} not found`);
      if (!canTransitionOrder(order.orderStatus, "cancelled")) {
        throw new CommerceError(
          "invalid_transition",
          `order ${order.orderStatus} -> cancelled not allowed`,
          { from: order.orderStatus, to: "cancelled" },
        );
      }
      return repo.save({ ...order, orderStatus: "cancelled", updatedAt: now() });
    },

    async getOrder(ctx: ActorContext, orderId: string): Promise<ManualTransferOrder | null> {
      assertCan(ctx, ORDER_PAYMENT_PERMISSION);
      return repo.get(orderId);
    },

    async listOrders(ctx: ActorContext): Promise<ManualTransferOrder[]> {
      assertCan(ctx, ORDER_PAYMENT_PERMISSION);
      return repo.list();
    },
  };
}

export type ManualTransferOrderService = ReturnType<typeof createManualTransferOrderService>;
