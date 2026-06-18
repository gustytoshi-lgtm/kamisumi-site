import type { Money } from "@/types/commerce";
import { cartSubtotal, type Cart } from "./cart";

/**
 * Checkout adapter interface + mock（Phase 3 基盤）。
 *
 * 重要: 本番決済は行わない。実口座番号・実 API キーは保持しない。
 * 初期フローは台湾口座振込の手動確認（pending_payment → 人間が入金確認）。
 * 将来の Shopify / Stripe / PayPal / 台湾決済 provider は同 interface の adapter で差し替える。
 */
export type CheckoutMethod = "manual_bank_transfer" | "stripe" | "paypal" | "tw_provider";

export type CheckoutStatus = "pending_payment" | "awaiting_confirmation" | "cancelled";

export type CheckoutRequest = {
  cart: Cart;
  customerRef?: string;
  idempotencyKey: string;
};

export type CheckoutResult = {
  checkoutId: string;
  method: CheckoutMethod;
  status: CheckoutStatus;
  amount: Money;
  /** 振込照合用の参照（実口座番号ではない）。 */
  reference: string;
  /** 人間向けの案内文（実口座は管理画面/設定で別途）。 */
  instructions: string;
};

export interface CheckoutAdapter {
  readonly method: CheckoutMethod;
  startCheckout(request: CheckoutRequest): Promise<CheckoutResult>;
  getCheckout(checkoutId: string): Promise<CheckoutResult | null>;
}

function validate(request: CheckoutRequest): void {
  if (!request.idempotencyKey.trim()) throw new Error("checkout requires idempotencyKey");
  if (request.cart.items.length === 0) throw new Error("cart is empty");
}

/**
 * 手動振込の mock adapter。実送金はせず pending_payment を返す（人間が入金確認する前提）。
 * idempotencyKey で二重 checkout を防止する。
 */
export function createMockManualTransferAdapter(): CheckoutAdapter {
  const byKey = new Map<string, CheckoutResult>();
  const byId = new Map<string, CheckoutResult>();
  let counter = 0;

  return {
    method: "manual_bank_transfer",
    async startCheckout(request) {
      validate(request);
      const existing = byKey.get(request.idempotencyKey);
      if (existing) return existing;
      const amount = cartSubtotal(request.cart);
      const checkoutId = `co-${++counter}`;
      const result: CheckoutResult = {
        checkoutId,
        method: "manual_bank_transfer",
        status: "pending_payment",
        amount,
        reference: `KMS-${checkoutId.toUpperCase()}`,
        instructions:
          "在庫・送料の確認後にご案内する口座へお振込みください。入金確認後に発送手配します。",
      };
      byKey.set(request.idempotencyKey, result);
      byId.set(checkoutId, result);
      return result;
    },
    async getCheckout(checkoutId) {
      return byId.get(checkoutId) ?? null;
    },
  };
}

/**
 * 本番 provider（stripe/paypal/tw_provider）の sandbox スケルトン。
 * interface のみ確定。実 API は本番契約後に実装（呼ぶと NotImplemented）。
 */
export function createSandboxCheckoutAdapter(method: Exclude<CheckoutMethod, "manual_bank_transfer">): CheckoutAdapter {
  const notImplemented = (): never => {
    throw new Error(`${method} checkout adapter is sandbox-only / not implemented (Phase 3+).`);
  };
  return {
    method,
    async startCheckout() {
      return notImplemented();
    },
    async getCheckout() {
      return notImplemented();
    },
  };
}
