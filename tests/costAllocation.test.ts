import { describe, expect, it } from "vitest";
import {
  allocateCost,
  allocationBalances,
  fromDbMethod,
  toDbMethod,
  type AllocationBasis,
} from "@/lib/commerce/costAllocation";
import type { Money } from "@/types/commerce";

const twd = (amountMinor: number): Money => ({ currency: "TWD", amountMinor });

describe("allocateCost - ratio methods", () => {
  it("allocates by quantity and preserves the total exactly", () => {
    const lines: AllocationBasis[] = [{ quantity: 1 }, { quantity: 1 }, { quantity: 2 }];
    const result = allocateCost(twd(1000), "quantity", lines);
    expect(result.map((m) => m.amountMinor)).toEqual([250, 250, 500]);
    expect(allocationBalances(twd(1000), result)).toBe(true);
  });

  it("pushes the rounding remainder to the largest fractional parts", () => {
    // 10000 / 3 = 3333.33 → 端数1を最大小数部へ寄せ、合計を保存する。
    const result = allocateCost(twd(10000), "quantity", [{ quantity: 1 }, { quantity: 1 }, { quantity: 1 }]);
    const amounts = result.map((m) => m.amountMinor);
    expect(amounts.reduce((a, b) => a + b, 0)).toBe(10000);
    expect(amounts.sort((a, b) => a - b)).toEqual([3333, 3333, 3334]);
  });

  it("allocates by purchase value", () => {
    const result = allocateCost(twd(900), "purchase_value", [
      { purchaseValueMinor: 100 },
      { purchaseValueMinor: 200 },
    ]);
    expect(result.map((m) => m.amountMinor)).toEqual([300, 600]);
  });

  it("allocates by weight and volume", () => {
    expect(allocateCost(twd(600), "weight", [{ weight: 1 }, { weight: 2 }]).map((m) => m.amountMinor)).toEqual([200, 400]);
    expect(allocateCost(twd(600), "volume", [{ volume: 3 }, { volume: 1 }]).map((m) => m.amountMinor)).toEqual([450, 150]);
  });

  it("falls back to an equal split when all weights are zero", () => {
    const result = allocateCost(twd(100), "quantity", [{ quantity: 0 }, { quantity: 0 }]);
    expect(result.map((m) => m.amountMinor)).toEqual([50, 50]);
  });

  it("keeps the currency of the total", () => {
    const result = allocateCost({ currency: "JPY", amountMinor: 1000 }, "quantity", [{ quantity: 1 }]);
    expect(result[0]).toEqual({ currency: "JPY", amountMinor: 1000 });
  });
});

describe("allocateCost - manual", () => {
  it("accepts manual amounts that sum to the total", () => {
    const result = allocateCost(twd(1000), "manual", [
      { manual: twd(400) },
      { manual: twd(600) },
    ]);
    expect(result.map((m) => m.amountMinor)).toEqual([400, 600]);
    expect(allocationBalances(twd(1000), result)).toBe(true);
  });

  it("rejects manual amounts that do not sum to the total", () => {
    expect(() => allocateCost(twd(1000), "manual", [{ manual: twd(400) }, { manual: twd(500) }])).toThrow(/sum to total/);
  });

  it("rejects a currency mismatch in manual amounts", () => {
    expect(() =>
      allocateCost(twd(1000), "manual", [{ manual: { currency: "JPY", amountMinor: 1000 } }]),
    ).toThrow(/currency mismatch/);
  });

  it("rejects a missing manual amount", () => {
    expect(() => allocateCost(twd(1000), "manual", [{ manual: twd(1000) }, {}])).toThrow(/requires an amount/);
  });
});

describe("allocateCost - none and validation", () => {
  it("returns zero allocations for method none (explicitly unallocated)", () => {
    const result = allocateCost(twd(1000), "none", [{ quantity: 1 }, { quantity: 1 }]);
    expect(result.map((m) => m.amountMinor)).toEqual([0, 0]);
    expect(allocationBalances(twd(1000), result)).toBe(false);
  });

  it("returns an empty array for no lines", () => {
    expect(allocateCost(twd(1000), "quantity", [])).toEqual([]);
  });

  it("rejects a non-integer total", () => {
    expect(() => allocateCost({ currency: "TWD", amountMinor: 10.5 }, "quantity", [{ quantity: 1 }])).toThrow(/integer/);
  });

  it("rejects a negative total", () => {
    expect(() => allocateCost(twd(-1), "quantity", [{ quantity: 1 }])).toThrow(/non-negative/);
  });
});

describe("DB method mapping", () => {
  it("maps purchase_value <-> amount and leaves others unchanged", () => {
    expect(toDbMethod("purchase_value")).toBe("amount");
    expect(fromDbMethod("amount")).toBe("purchase_value");
    expect(toDbMethod("quantity")).toBe("quantity");
    expect(fromDbMethod("none")).toBe("none");
  });
});
