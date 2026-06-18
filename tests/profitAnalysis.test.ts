import { describe, expect, it } from "vitest";
import { buildProfitSnapshot } from "@/lib/commerce/profitAnalysis";
import type { PaymentRecord } from "@/repositories/core/paymentModels";
import type { PurchaseRecord } from "@/repositories/core/procurementModels";
import type { ShipmentRecord } from "@/repositories/core/fulfillmentModels";
import type { ExpenseRecord } from "@/repositories/core/expenseModels";

const payment = (amountMinor: number, currency = "TWD"): PaymentRecord =>
  ({
    id: "p",
    organizationId: "o",
    status: "paid",
    currency: currency as PaymentRecord["currency"],
    amount: { currency: currency as PaymentRecord["currency"], amountMinor },
    createdAt: "",
    updatedAt: "",
  }) as PaymentRecord;

const purchase = (itemNetEach: number, qty: number, ancillary: number): PurchaseRecord =>
  ({
    id: "pu",
    organizationId: "o",
    purchasedOn: "2026-06-01",
    currency: "TWD",
    domesticShippingMinor: ancillary,
    transportMinor: 0,
    parkingMinor: 0,
    highwayMinor: 0,
    otherExpenseMinor: 0,
    items: [{ id: "i", purchaseId: "pu", quantity: qty, unitPriceMinor: itemNetEach, taxMinor: 0, discountMinor: 0 }],
    allocations: [],
    createdAt: "",
    updatedAt: "",
  }) as PurchaseRecord;

const shipment = (kamisumiBearsMinor: number): ShipmentRecord =>
  ({
    id: "s",
    organizationId: "o",
    status: "delivered",
    damaged: false,
    returned: false,
    reshipped: false,
    kamisumiBears: { currency: "TWD", amountMinor: kamisumiBearsMinor },
    createdAt: "",
    updatedAt: "",
  }) as ShipmentRecord;

const expense = (amountMinor: number): ExpenseRecord =>
  ({
    id: "e",
    organizationId: "o",
    expenseDate: "2026-06-01",
    category: "fees",
    amount: { currency: "TWD", amountMinor },
    createdAt: "",
    updatedAt: "",
  }) as ExpenseRecord;

describe("buildProfitSnapshot", () => {
  it("computes gross/contribution from recorded data (TWD)", () => {
    const result = buildProfitSnapshot({
      currency: "TWD",
      payments: [payment(100000), payment(50000)], // revenue 150000
      purchases: [purchase(20000, 4, 5000)], // cost = 80000 + 5000 = 85000
      shipments: [shipment(3000)], // shippingBorne 3000
      expenses: [expense(2000)], // fees 2000
    });
    expect(result.revenue.amountMinor).toBe(150000);
    expect(result.cost.amountMinor).toBe(85000);
    expect(result.grossProfit.amountMinor).toBe(65000);
    // contribution = 65000 - 3000(shipping) - 2000(fees) = 60000
    expect(result.contributionProfit.amountMinor).toBe(60000);
  });

  it("ignores other currencies (no silent cross-currency sum)", () => {
    const result = buildProfitSnapshot({
      currency: "TWD",
      payments: [payment(100000, "TWD"), payment(99999, "JPY")],
      purchases: [],
      shipments: [],
      expenses: [],
    });
    expect(result.revenue.amountMinor).toBe(100000);
  });

  it("is zero when no data", () => {
    const result = buildProfitSnapshot({ currency: "TWD", payments: [], purchases: [], shipments: [], expenses: [] });
    expect(result.grossProfit.amountMinor).toBe(0);
    expect(result.grossMarginBasisPoints).toBe(0);
  });
});
