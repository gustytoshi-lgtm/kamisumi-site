import { siteConfig } from "@/config/site";
import type { ExpenseRepository } from "@/repositories/core/expenseRepository";
import type {
  ExpenseCreateInput,
  ExpenseRecord,
  ExpenseUpdateInput,
} from "@/repositories/core/expenseModels";
import { CommerceError } from "@/repositories/core/writeModels";

/** 開発・テスト用 in-memory 経費 repository（reset/seed, fixture 非破壊）。 */
export type MockExpenseRepository = ExpenseRepository & { reset(): void; seed(): void };

const ORG = siteConfig.organization.id;

export function createMockExpenseRepository(): MockExpenseRepository {
  let items = new Map<string, ExpenseRecord>();
  let counter = 0;
  const now = () => new Date().toISOString();

  function req(id: string): ExpenseRecord {
    const e = items.get(id);
    if (!e) throw new CommerceError("not_found", `expense ${id} not found`);
    return e;
  }

  const repo: MockExpenseRepository = {
    reset() {
      items = new Map();
      counter = 0;
    },
    seed() {
      items = new Map();
      counter = 0;
    },
    async listExpenses(options) {
      const all = [...items.values()];
      return options?.includeDeleted ? all : all.filter((e) => !e.deletedAt);
    },
    async getExpense(id) {
      return items.get(id) ?? null;
    },
    async createExpense(input: ExpenseCreateInput, ctx) {
      if (!input.expenseDate) throw new CommerceError("validation", "expenseDate is required");
      if (!Number.isInteger(input.amountMinor) || input.amountMinor < 0) {
        throw new CommerceError("validation", "amountMinor must be a non-negative integer");
      }
      const id = `exp-${++counter}`;
      const record: ExpenseRecord = {
        id,
        organizationId: input.organizationId ?? ORG,
        expenseDate: input.expenseDate,
        category: input.category,
        amount: { currency: input.currency, amountMinor: input.amountMinor },
        note: input.note,
        createdBy: ctx.userId,
        createdAt: now(),
        updatedAt: now(),
      };
      items.set(id, record);
      return record;
    },
    async updateExpense(id, patch: ExpenseUpdateInput, _ctx) {
      void _ctx;
      const e = req(id);
      const updated: ExpenseRecord = {
        ...e,
        expenseDate: patch.expenseDate ?? e.expenseDate,
        category: patch.category ?? e.category,
        amount:
          patch.amountMinor !== undefined
            ? { currency: e.amount.currency, amountMinor: patch.amountMinor }
            : e.amount,
        note: patch.note ?? e.note,
        updatedAt: now(),
      };
      items.set(id, updated);
      return updated;
    },
    async softDeleteExpense(id, _ctx) {
      void _ctx;
      const e = req(id);
      const updated = { ...e, deletedAt: now() };
      items.set(id, updated);
      return updated;
    },
    async restoreExpense(id, _ctx) {
      void _ctx;
      const e = req(id);
      const updated = { ...e };
      delete updated.deletedAt;
      items.set(id, updated);
      return updated;
    },
  };

  return repo;
}

export const mockExpenseRepository = createMockExpenseRepository();
mockExpenseRepository.seed();
