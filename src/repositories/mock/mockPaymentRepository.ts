import { siteConfig } from "@/config/site";
import type { PaymentRepository } from "@/repositories/core/paymentRepository";
import type { PaymentRecord } from "@/repositories/core/paymentModels";
import { CommerceError, type ActorContext, type AuditEntry } from "@/repositories/core/writeModels";
import type { PaymentStatus } from "@/lib/commerce/paymentStatus";
import type { CurrencyCode, Money } from "@/types/commerce";

const ORG = siteConfig.organization.id;

export type MockPaymentRepository = PaymentRepository & {
  reset(): void;
  listAuditLogs(): AuditEntry[];
};

type Store = { payments: Map<string, PaymentRecord>; audit: AuditEntry[]; counter: number };
function emptyStore(): Store {
  return { payments: new Map(), audit: [], counter: 0 };
}

function money(currency: CurrencyCode, minor: number): Money {
  return { currency, amountMinor: minor };
}

export function createMockPaymentRepository(): MockPaymentRepository {
  let store = emptyStore();
  const now = () => new Date().toISOString();
  const id = (prefix: string) => `${prefix}-${++store.counter}`;
  const audit = (ctx: ActorContext, action: string, entityId: string, summary?: string): void => {
    store.audit.push({
      id: `audit-${store.audit.length + 1}`,
      actorId: ctx.userId,
      action,
      entityType: "payment",
      entityId,
      summary,
      createdAt: now(),
    });
  };
  function requirePayment(paymentId: string): PaymentRecord {
    const payment = store.payments.get(paymentId);
    if (!payment) throw new CommerceError("not_found", `payment ${paymentId} not found`);
    return payment;
  }

  return {
    reset() {
      store = emptyStore();
    },
    listAuditLogs() {
      return store.audit.slice();
    },

    async createPayment(input, ctx) {
      const ts = now();
      const record: PaymentRecord = {
        id: id("payment"),
        organizationId: input.organizationId || ORG,
        orderId: input.orderId,
        status: "unbilled",
        currency: input.currency,
        amount: money(input.currency, 0),
        expectedAmount:
          input.expectedAmountMinor !== undefined
            ? money(input.currency, input.expectedAmountMinor)
            : undefined,
        paymentType: input.paymentType,
        note: input.note,
        createdAt: ts,
        updatedAt: ts,
      };
      store.payments.set(record.id, record);
      audit(ctx, "create", record.id, input.orderId);
      return record;
    },

    async updatePayment(paymentId, patch, ctx) {
      const payment = requirePayment(paymentId);
      const next: PaymentRecord = {
        ...payment,
        paymentType: patch.paymentType ?? payment.paymentType,
        matchingNumber: patch.matchingNumber ?? payment.matchingNumber,
        note: patch.note ?? payment.note,
        expectedAmount:
          patch.expectedAmountMinor !== undefined
            ? money(payment.currency, patch.expectedAmountMinor)
            : payment.expectedAmount,
        updatedAt: now(),
      };
      store.payments.set(paymentId, next);
      audit(ctx, "update", paymentId);
      return next;
    },

    async changePaymentStatus(paymentId, toStatus: PaymentStatus, ctx, note) {
      const payment = requirePayment(paymentId);
      const next = { ...payment, status: toStatus, updatedAt: now() };
      store.payments.set(paymentId, next);
      audit(ctx, "status_change", paymentId, `${payment.status}->${toStatus}${note ? ` (${note})` : ""}`);
      return next;
    },

    async recordReceipt(paymentId, receipt, ctx) {
      const payment = requirePayment(paymentId);
      const ts = now();
      const next: PaymentRecord = {
        ...payment,
        amount: money(payment.currency, receipt.amountMinor),
        paidAt: receipt.paidAt ?? ts.slice(0, 10),
        matchingNumber: receipt.matchingNumber ?? payment.matchingNumber,
        confirmedAt: ts,
        confirmedBy: ctx.userId,
        updatedAt: ts,
      };
      store.payments.set(paymentId, next);
      audit(ctx, "receipt", paymentId, String(receipt.amountMinor));
      return next;
    },

    async getPayment(paymentId) {
      return store.payments.get(paymentId) ?? null;
    },

    async listPayments(options) {
      const all = [...store.payments.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      return options?.orderId ? all.filter((p) => p.orderId === options.orderId) : all;
    },
  };
}

export const mockPaymentRepository: MockPaymentRepository = createMockPaymentRepository();
