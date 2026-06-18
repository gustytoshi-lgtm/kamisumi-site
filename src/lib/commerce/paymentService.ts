import type { PaymentRepository } from "@/repositories/core/paymentRepository";
import type {
  PaymentCreateInput,
  PaymentReceiptInput,
  PaymentUpdateInput,
} from "@/repositories/core/paymentModels";
import { CommerceError, type ActorContext } from "@/repositories/core/writeModels";
import { canTransitionPayment, isPaymentStatus, type PaymentStatus } from "./paymentStatus";
import { can, type Permission } from "./rbac";
import type { Notifier } from "./notifications";
import { notifyBestEffort } from "./notify";

/**
 * 入金業務サービス。RBAC（owner 限定）と入金状態機械を強制する。
 * 入金は会計・金額の機微情報。payments_owner RLS（0004）に合わせ purchase:manage（owner のみ保持）で限定し、
 * front_staff へ入金・会計情報を出さない。
 */
const PAYMENT_PERMISSION: Permission = "purchase:manage";

function assertCan(ctx: ActorContext, permission: Permission): void {
  if (!can(ctx.role, permission)) {
    throw new CommerceError("forbidden", `role ${ctx.role} lacks ${permission}`, { permission });
  }
}

export function createPaymentService(repo: PaymentRepository, notifier?: Notifier) {
  return {
    async createPayment(ctx: ActorContext, input: PaymentCreateInput) {
      assertCan(ctx, PAYMENT_PERMISSION);
      return repo.createPayment(input, ctx);
    },

    async updatePayment(ctx: ActorContext, id: string, patch: PaymentUpdateInput) {
      assertCan(ctx, PAYMENT_PERMISSION);
      return repo.updatePayment(id, patch, ctx);
    },

    async changePaymentStatus(ctx: ActorContext, id: string, toStatus: PaymentStatus, note?: string) {
      assertCan(ctx, PAYMENT_PERMISSION);
      if (!isPaymentStatus(toStatus)) {
        throw new CommerceError("validation", `invalid payment status: ${toStatus}`);
      }
      const payment = await repo.getPayment(id);
      if (!payment) throw new CommerceError("not_found", `payment ${id} not found`);
      if (!canTransitionPayment(payment.status, toStatus)) {
        throw new CommerceError(
          "invalid_transition",
          `payment ${payment.status} -> ${toStatus} not allowed`,
          { from: payment.status, to: toStatus },
        );
      }
      return repo.changePaymentStatus(id, toStatus, ctx, note);
    },

    async recordReceipt(ctx: ActorContext, id: string, receipt: PaymentReceiptInput) {
      assertCan(ctx, PAYMENT_PERMISSION);
      if (!Number.isInteger(receipt.amountMinor) || receipt.amountMinor < 0) {
        throw new CommerceError("validation", "receipt amount must be a non-negative integer");
      }
      const updated = await repo.recordReceipt(id, receipt, ctx);
      await notifyBestEffort(notifier, {
        channel: "in_app",
        kind: "payment_received",
        to: updated.orderId ?? `payment:${updated.id}`,
        body: `payment ${updated.id} receipt recorded: ${updated.amount.currency} ${updated.amount.amountMinor}`,
      });
      return updated;
    },

    async getPayment(ctx: ActorContext, id: string) {
      assertCan(ctx, PAYMENT_PERMISSION);
      return repo.getPayment(id);
    },

    async listPayments(ctx: ActorContext, options?: { orderId?: string }) {
      assertCan(ctx, PAYMENT_PERMISSION);
      return repo.listPayments(options);
    },
  };
}

export type PaymentService = ReturnType<typeof createPaymentService>;
