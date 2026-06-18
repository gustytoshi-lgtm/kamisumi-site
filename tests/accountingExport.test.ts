import { describe, expect, it } from "vitest";
import {
  createMockAccountingExporter,
  type AccountingEntry,
  type ExportBatch,
} from "@/lib/commerce/accountingExport";
import type { Money } from "@/types/commerce";

const twd = (amountMinor: number): Money => ({ currency: "TWD", amountMinor });

function entry(overrides: Partial<AccountingEntry> = {}): AccountingEntry {
  return {
    sourceType: "order",
    sourceId: "o1",
    accountingDate: "2026-06-18",
    amount: twd(1000),
    ...overrides,
  };
}

function batch(key: string, entries: AccountingEntry[] = [entry()]): ExportBatch {
  return { idempotencyKey: key, entries };
}

describe("mock accounting exporter", () => {
  it("exports a batch and records its status", async () => {
    const exporter = createMockAccountingExporter();
    const result = await exporter.exportBatch(batch("k1"));
    expect(result.status).toBe("exported");
    expect(result.entryCount).toBe(1);
    expect(await exporter.getExport("k1")).toMatchObject({ status: "exported" });
  });

  it("prevents double export via idempotency key", async () => {
    const exporter = createMockAccountingExporter();
    await exporter.exportBatch(batch("dup"));
    const second = await exporter.exportBatch(batch("dup"));
    expect(second.status).toBe("duplicate");
  });

  it("returns null for an unknown export", async () => {
    const exporter = createMockAccountingExporter();
    expect(await exporter.getExport("nope")).toBeNull();
  });

  it("rejects an empty batch or missing key", async () => {
    const exporter = createMockAccountingExporter();
    await expect(exporter.exportBatch(batch("k", []))).rejects.toThrow(/at least one entry/);
    await expect(exporter.exportBatch(batch("", [entry()]))).rejects.toThrow(/idempotencyKey/);
  });

  it("rejects non-integer amounts", async () => {
    const exporter = createMockAccountingExporter();
    await expect(
      exporter.exportBatch(batch("k", [entry({ amount: { currency: "TWD", amountMinor: 10.5 } })])),
    ).rejects.toThrow(/integer/);
  });
});
