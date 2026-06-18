import { describe, expect, it } from "vitest";
import {
  PAYMENT_STATUSES,
  canTransitionPayment,
  isPaymentStatus,
  isTerminalPaymentStatus,
  nextPaymentStatuses,
} from "@/lib/commerce/paymentStatus";

describe("payment status machine", () => {
  it("requires billing before any payment is recorded", () => {
    expect(canTransitionPayment("unbilled", "billed")).toBe(true);
    expect(canTransitionPayment("unbilled", "paid")).toBe(false);
    expect(canTransitionPayment("unbilled", "partially_paid")).toBe(false);
  });

  it("allows billed to move into the paid family", () => {
    for (const to of ["unpaid", "partially_paid", "paid", "overpaid", "underpaid"] as const) {
      expect(canTransitionPayment("billed", to)).toBe(true);
    }
  });

  it("allows refunds only from states with money received or cancellation", () => {
    expect(canTransitionPayment("paid", "refunded")).toBe(true);
    expect(canTransitionPayment("partially_paid", "refunded")).toBe(true);
    expect(canTransitionPayment("billed", "refunded")).toBe(false);
  });

  it("treats refunded as terminal and rejects self-transition", () => {
    expect(isTerminalPaymentStatus("refunded")).toBe(true);
    expect(nextPaymentStatuses("refunded")).toEqual([]);
    expect(canTransitionPayment("paid", "paid")).toBe(false);
  });

  it("recognises valid status strings", () => {
    expect(isPaymentStatus("paid")).toBe(true);
    expect(isPaymentStatus("not_a_status")).toBe(false);
    expect(PAYMENT_STATUSES).toContain("overpaid");
  });
});
