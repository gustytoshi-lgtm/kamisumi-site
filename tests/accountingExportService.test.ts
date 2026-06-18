import { describe, expect, it } from "vitest";
import {
  buildAccountingEntries,
  createAccountingExportService,
} from "@/lib/commerce/accountingExportService";
import { createMockAccountingExporter } from "@/lib/commerce/accountingExport";
import type { ExpenseRecord } from "@/repositories/core/expenseModels";
import type { PaymentRecord } from "@/repositories/core/paymentModels";
import type { ActorContext } from "@/repositories/core/writeModels";

const owner: ActorContext = { userId: "o1", role: "owner" };
const front: ActorContext = { userId: "f1", role: "front_staff" };

const expense: ExpenseRecord = {
  id: "e1",
  organizationId: "o",
  expenseDate: "2026-06-01",
  category: "fees",
  amount: { currency: "TWD", amountMinor: 1000 },
  createdAt: "2026-06-01T00:00:00Z",
  updatedAt: "2026-06-01T00:00:00Z",
};
const payment = {
  id: "p1",
  organizationId: "o",
  status: "paid",
  currency: "TWD",
  amount: { currency: "TWD", amountMinor: 5000 },
  createdAt: "2026-06-02T00:00:00Z",
  updatedAt: "2026-06-02T00:00:00Z",
} as PaymentRecord;

describe("accounting export service", () => {
  it("builds entries from expenses and payments (skips deleted)", () => {
    const entries = buildAccountingEntries({
      expenses: [expense, { ...expense, id: "e2", deletedAt: "x" }],
      payments: [payment],
    });
    expect(entries).toHaveLength(2);
    expect(entries.find((e) => e.sourceType === "payment")?.sourceId).toBe("p1");
  });

  it("front_staff cannot export (owner only)", async () => {
    const service = createAccountingExportService(createMockAccountingExporter());
    await expect(service.exportEntries(front, "k1", buildAccountingEntries({ expenses: [expense], payments: [] }))).rejects.toMatchObject({ code: "forbidden" });
  });

  it("exports and is idempotent (re-export = duplicate)", async () => {
    const service = createAccountingExportService(createMockAccountingExporter());
    const entries = buildAccountingEntries({ expenses: [expense], payments: [payment] });
    const first = await service.exportEntries(owner, "batch-1", entries);
    expect(first.status).toBe("exported");
    expect(first.entryCount).toBe(2);
    const second = await service.exportEntries(owner, "batch-1", entries);
    expect(second.status).toBe("duplicate");
    expect(await service.listExports(owner)).toHaveLength(1);
  });

  it("rejects empty batch", async () => {
    const service = createAccountingExportService(createMockAccountingExporter());
    await expect(service.exportEntries(owner, "k", [])).rejects.toMatchObject({ code: "validation" });
  });
});
