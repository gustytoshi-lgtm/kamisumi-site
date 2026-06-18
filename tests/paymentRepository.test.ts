import { describe, expect, it } from "vitest";
import { createPaymentService } from "@/lib/commerce/paymentService";
import { createMockPaymentRepository } from "@/repositories/mock/mockPaymentRepository";
import type { ActorContext } from "@/repositories/core/writeModels";

const owner: ActorContext = { userId: "owner", role: "owner" };
const frontStaff: ActorContext = { userId: "fs", role: "front_staff" };

function service() {
  return createPaymentService(createMockPaymentRepository());
}

describe("paymentService", () => {
  it("creates a payment in unbilled status with expected amount", async () => {
    const svc = service();
    const payment = await svc.createPayment(owner, {
      orderId: "o1",
      currency: "TWD",
      expectedAmountMinor: 10000,
    });
    expect(payment.status).toBe("unbilled");
    expect(payment.expectedAmount).toEqual({ currency: "TWD", amountMinor: 10000 });
    expect(payment.amount).toEqual({ currency: "TWD", amountMinor: 0 });
  });

  it("follows the payment state machine and records receipts", async () => {
    const svc = service();
    const payment = await svc.createPayment(owner, { currency: "TWD", expectedAmountMinor: 10000 });
    await svc.changePaymentStatus(owner, payment.id, "billed");
    const received = await svc.recordReceipt(owner, payment.id, {
      amountMinor: 10000,
      matchingNumber: "TX-001",
    });
    expect(received.amount).toEqual({ currency: "TWD", amountMinor: 10000 });
    expect(received.confirmedBy).toBe("owner");
    const paid = await svc.changePaymentStatus(owner, payment.id, "paid");
    expect(paid.status).toBe("paid");
  });

  it("rejects invalid transitions (unbilled -> paid)", async () => {
    const svc = service();
    const payment = await svc.createPayment(owner, { currency: "TWD" });
    await expect(svc.changePaymentStatus(owner, payment.id, "paid")).rejects.toMatchObject({
      code: "invalid_transition",
    });
  });

  it("forbids front_staff from payment/accounting data", async () => {
    const svc = service();
    await expect(svc.createPayment(frontStaff, { currency: "TWD" })).rejects.toMatchObject({
      code: "forbidden",
    });
    await expect(svc.listPayments(frontStaff)).rejects.toMatchObject({ code: "forbidden" });
  });

  it("validates non-negative integer receipts", async () => {
    const svc = service();
    const payment = await svc.createPayment(owner, { currency: "TWD" });
    await expect(svc.recordReceipt(owner, payment.id, { amountMinor: -5 })).rejects.toMatchObject({
      code: "validation",
    });
  });
});
