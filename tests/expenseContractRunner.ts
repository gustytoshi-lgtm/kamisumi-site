import { describe, expect, it } from "vitest";
import type { ExpenseRepository } from "@/repositories/core/expenseRepository";
import type { ActorContext } from "@/repositories/core/writeModels";
import { CONTRACT_ORG_ID } from "./repositoryContractFixtures";

export function runExpenseContract(
  name: string,
  makeRepo: () => ExpenseRepository,
  ctx: ActorContext,
) {
  describe(`expense repository contract: ${name}`, () => {
    it("creates, reads, lists and updates an expense", async () => {
      const repo = makeRepo();
      const created = await repo.createExpense(
        {
          organizationId: CONTRACT_ORG_ID,
          expenseDate: "2026-06-19",
          category: "fees",
          currency: "TWD",
          amountMinor: 1234,
          note: "contract",
        },
        ctx,
      );
      expect(created.amount).toEqual({ currency: "TWD", amountMinor: 1234 });
      expect(await repo.getExpense(created.id)).toMatchObject({ category: "fees" });
      expect((await repo.listExpenses()).some((e) => e.id === created.id)).toBe(true);

      const updated = await repo.updateExpense(created.id, { amountMinor: 4321, category: "transport" }, ctx);
      expect(updated.amount).toEqual({ currency: "TWD", amountMinor: 4321 });
      expect(updated.category).toBe("transport");
    });

    it("soft-deletes and restores an expense", async () => {
      const repo = makeRepo();
      const expense = await repo.createExpense(
        { organizationId: CONTRACT_ORG_ID, expenseDate: "2026-06-20", category: "other", currency: "TWD", amountMinor: 1 },
        ctx,
      );
      await repo.softDeleteExpense(expense.id, ctx);
      expect((await repo.listExpenses()).some((e) => e.id === expense.id)).toBe(false);
      expect((await repo.listExpenses({ includeDeleted: true })).some((e) => e.id === expense.id)).toBe(true);
      await repo.restoreExpense(expense.id, ctx);
      expect((await repo.listExpenses()).some((e) => e.id === expense.id)).toBe(true);
    });
  });
}
