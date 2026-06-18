import { beforeEach, describe, expect, it } from "vitest";
import { createExpenseService } from "@/lib/commerce/expenseService";
import {
  createMockExpenseRepository,
  type MockExpenseRepository,
} from "@/repositories/mock/mockExpenseRepository";
import { sumExpensesMinor } from "@/repositories/core/expenseModels";
import type { ActorContext } from "@/repositories/core/writeModels";

const owner: ActorContext = { userId: "o1", role: "owner" };
const front: ActorContext = { userId: "f1", role: "front_staff" };
const inv: ActorContext = { userId: "i1", role: "inventory_staff" };

let repo: MockExpenseRepository;
let service: ReturnType<typeof createExpenseService>;

beforeEach(() => {
  repo = createMockExpenseRepository();
  repo.seed();
  service = createExpenseService(repo);
});

async function expectErr(p: Promise<unknown>, code: string) {
  await expect(p).rejects.toMatchObject({ code });
}

describe("expense service (owner-only)", () => {
  it("only owner can read/write; front_staff & inventory_staff are forbidden", async () => {
    await expectErr(service.listExpenses(front), "forbidden");
    await expectErr(service.listExpenses(inv), "forbidden");
    await expectErr(
      service.createExpense(front, { expenseDate: "2026-06-01", category: "fees", currency: "TWD", amountMinor: 100 }),
      "forbidden",
    );
    await expect(service.listExpenses(owner)).resolves.toBeDefined();
  });

  it("creates valid expense and rejects invalid input", async () => {
    const e = await service.createExpense(owner, {
      expenseDate: "2026-06-01",
      category: "transport",
      currency: "TWD",
      amountMinor: 12000,
    });
    expect(e.amount.amountMinor).toBe(12000);
    await expectErr(
      service.createExpense(owner, { expenseDate: "", category: "fees", currency: "TWD", amountMinor: 1 }),
      "validation",
    );
    await expectErr(
      service.createExpense(owner, { expenseDate: "2026-06-01", category: "bogus" as never, currency: "TWD", amountMinor: 1 }),
      "validation",
    );
    await expectErr(
      service.createExpense(owner, { expenseDate: "2026-06-01", category: "fees", currency: "TWD", amountMinor: -1 }),
      "validation",
    );
  });

  it("soft-deletes/restores and sums by currency", async () => {
    await service.createExpense(owner, { expenseDate: "2026-06-01", category: "fees", currency: "TWD", amountMinor: 1000 });
    const e2 = await service.createExpense(owner, { expenseDate: "2026-06-02", category: "transport", currency: "TWD", amountMinor: 2000 });
    expect(sumExpensesMinor(await service.listExpenses(owner), "TWD")).toBe(3000);
    await service.deleteExpense(owner, e2.id);
    expect(await service.listExpenses(owner)).toHaveLength(1);
    await service.restoreExpense(owner, e2.id);
    expect(await service.listExpenses(owner)).toHaveLength(2);
  });
});
