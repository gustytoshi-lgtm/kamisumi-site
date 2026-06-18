import type { AccountingEntry, AccountingExporter } from "./accountingExport";
import type { ExpenseRecord } from "@/repositories/core/expenseModels";
import type { PaymentRecord } from "@/repositories/core/paymentModels";
import { CommerceError, type ActorContext } from "@/repositories/core/writeModels";
import { can, type Permission } from "./rbac";

/**
 * 会計 export サービス。owner 限定（purchase:manage）。記録済みデータ（経費・入金）から
 * AccountingEntry を組み立て、冪等 exporter へ渡す。税務会計・帳簿は自作しない（外部責務）。
 */
const PERM: Permission = "purchase:manage";

function assertCan(ctx: ActorContext): void {
  if (!can(ctx.role, PERM)) {
    throw new CommerceError("forbidden", `role ${ctx.role} lacks ${PERM}`);
  }
}

/** 経費・入金から会計エントリを組み立てる（純関数）。 */
export function buildAccountingEntries(sources: {
  expenses: ExpenseRecord[];
  payments: PaymentRecord[];
}): AccountingEntry[] {
  const entries: AccountingEntry[] = [];
  for (const e of sources.expenses) {
    if (e.deletedAt) continue;
    entries.push({
      sourceType: "expense",
      sourceId: e.id,
      accountingDate: e.expenseDate,
      amount: e.amount,
      taxCategory: e.category,
      memo: e.note,
    });
  }
  for (const p of sources.payments) {
    entries.push({
      sourceType: "payment",
      sourceId: p.id,
      accountingDate: (p.paidAt ?? p.createdAt).slice(0, 10),
      amount: p.amount,
      settlementStatus: p.status,
      paymentMethod: p.paymentType,
    });
  }
  return entries;
}

export function createAccountingExportService(exporter: AccountingExporter) {
  return {
    async exportEntries(ctx: ActorContext, idempotencyKey: string, entries: AccountingEntry[]) {
      assertCan(ctx);
      if (!idempotencyKey.trim()) {
        throw new CommerceError("validation", "idempotencyKey is required");
      }
      if (entries.length === 0) {
        throw new CommerceError("validation", "no entries to export");
      }
      return exporter.exportBatch({ idempotencyKey: idempotencyKey.trim(), entries });
    },
    async listExports(ctx: ActorContext) {
      assertCan(ctx);
      return exporter.listExports();
    },
    async getExport(ctx: ActorContext, idempotencyKey: string) {
      assertCan(ctx);
      return exporter.getExport(idempotencyKey);
    },
  };
}

export type AccountingExportService = ReturnType<typeof createAccountingExportService>;
