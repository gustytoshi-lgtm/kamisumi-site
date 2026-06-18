import type { CurrencyCode } from "@/types/commerce";
import type { PaymentRecord } from "@/repositories/core/paymentModels";
import type { ShipmentRecord } from "@/repositories/core/fulfillmentModels";
import type { ExpenseRecord } from "@/repositories/core/expenseModels";
import type { PurchaseRecord } from "@/repositories/core/procurementModels";
import {
  purchaseAncillaryTotalMinor,
  purchaseItemNetMinor,
} from "@/repositories/core/procurementModels";
import { computeProfit, type ProfitResult } from "./profit";

/**
 * 記録済みデータ（入金・仕入・配送・経費）から組織レベルの利益スナップショットを純関数で組み立てる。
 *
 * 前提（実在しない業務ルールを作らないための明示的な近似。UI でも注記する）:
 *   - revenue = 入金済み金額（payments.amount）の合計（指定通貨のみ）。
 *   - cost = 仕入（明細の正味額 + 付帯費用合計）の合計（指定通貨のみ）。
 *   - shippingBorne = 配送の KAMISUMI 負担送料（kamisumiBears）の合計。
 *   - fees = 経費（expenses）の合計。為替差損益は未連携のため 0。
 *   - 通貨混在は合算しない（指定通貨のみ集計）。
 */
export type ProfitSnapshotSources = {
  currency: CurrencyCode;
  payments: PaymentRecord[];
  purchases: PurchaseRecord[];
  shipments: ShipmentRecord[];
  expenses: ExpenseRecord[];
};

function sumPaymentsMinor(payments: PaymentRecord[], currency: CurrencyCode): number {
  return payments
    .filter((p) => p.amount.currency === currency)
    .reduce((acc, p) => acc + p.amount.amountMinor, 0);
}

function sumPurchaseCostMinor(purchases: PurchaseRecord[], currency: CurrencyCode): number {
  return purchases
    .filter((p) => p.currency === currency && !p.deletedAt)
    .reduce((acc, p) => {
      const items = p.items.reduce((s, it) => s + purchaseItemNetMinor(it), 0);
      return acc + items + purchaseAncillaryTotalMinor(p);
    }, 0);
}

function sumShippingBorneMinor(shipments: ShipmentRecord[], currency: CurrencyCode): number {
  return shipments.reduce((acc, s) => {
    if (s.kamisumiBears && s.kamisumiBears.currency === currency) {
      return acc + s.kamisumiBears.amountMinor;
    }
    return acc;
  }, 0);
}

function sumExpensesMinor(expenses: ExpenseRecord[], currency: CurrencyCode): number {
  return expenses
    .filter((e) => e.amount.currency === currency && !e.deletedAt)
    .reduce((acc, e) => acc + e.amount.amountMinor, 0);
}

export function buildProfitSnapshot(sources: ProfitSnapshotSources): ProfitResult {
  const c = sources.currency;
  return computeProfit({
    revenue: { currency: c, amountMinor: sumPaymentsMinor(sources.payments, c) },
    cost: { currency: c, amountMinor: sumPurchaseCostMinor(sources.purchases, c) },
    shippingBorne: { currency: c, amountMinor: sumShippingBorneMinor(sources.shipments, c) },
    fees: { currency: c, amountMinor: sumExpensesMinor(sources.expenses, c) },
  });
}
