import { describe, expect, it } from "vitest";
import {
  allocateFifo,
  availableCount,
  bestBeforeAlert,
  daysUntil,
  sortFifo,
  type MatchaLot,
} from "@/lib/commerce/matchaLot";

function lot(partial: Partial<MatchaLot> & { id: string; fifoSeq: number }): MatchaLot {
  return {
    productId: "matcha-1",
    quantity: 0,
    reserved: 0,
    incoming: 0,
    ...partial,
  };
}

describe("availableCount", () => {
  it("is quantity minus reserved, never negative", () => {
    expect(availableCount(lot({ id: "a", fifoSeq: 1, quantity: 10, reserved: 3 }))).toBe(7);
    expect(availableCount(lot({ id: "b", fifoSeq: 1, quantity: 2, reserved: 5 }))).toBe(0);
  });
});

describe("sortFifo", () => {
  it("orders by fifoSeq ascending without mutating input", () => {
    const input = [lot({ id: "c", fifoSeq: 3 }), lot({ id: "a", fifoSeq: 1 }), lot({ id: "b", fifoSeq: 2 })];
    const sorted = sortFifo(input);
    expect(sorted.map((l) => l.id)).toEqual(["a", "b", "c"]);
    expect(input.map((l) => l.id)).toEqual(["c", "a", "b"]);
  });

  it("falls back to purchasedOn then bestBefore when seq ties", () => {
    const sorted = sortFifo([
      lot({ id: "late", fifoSeq: 1, purchasedOn: "2026-02-01" }),
      lot({ id: "early", fifoSeq: 1, purchasedOn: "2026-01-01" }),
    ]);
    expect(sorted.map((l) => l.id)).toEqual(["early", "late"]);
  });
});

describe("allocateFifo", () => {
  const lots = [
    lot({ id: "l1", fifoSeq: 1, quantity: 5, reserved: 1 }), // available 4
    lot({ id: "l2", fifoSeq: 2, quantity: 3 }), // available 3
  ];

  it("consumes earliest lots first and reports no shortfall when satisfiable", () => {
    const result = allocateFifo(lots, 6);
    expect(result.allocations).toEqual([
      { lotId: "l1", take: 4 },
      { lotId: "l2", take: 2 },
    ]);
    expect(result.shortfall).toBe(0);
  });

  it("reports shortfall when demand exceeds availability", () => {
    const result = allocateFifo(lots, 10);
    expect(result.shortfall).toBe(3);
    expect(result.allocations.reduce((s, a) => s + a.take, 0)).toBe(7);
  });

  it("returns nothing for zero demand", () => {
    expect(allocateFifo(lots, 0)).toEqual({ allocations: [], shortfall: 0 });
  });

  it("rejects negative or non-integer demand", () => {
    expect(() => allocateFifo(lots, -1)).toThrow(/non-negative integer/);
    expect(() => allocateFifo(lots, 1.5)).toThrow(/non-negative integer/);
  });
});

describe("daysUntil", () => {
  it("computes whole-day differences and is negative when expired", () => {
    expect(daysUntil("2026-06-30", "2026-06-18")).toBe(12);
    expect(daysUntil("2026-06-10", "2026-06-18")).toBe(-8);
    expect(daysUntil("2026-06-18", "2026-06-18")).toBe(0);
  });
});

describe("bestBeforeAlert", () => {
  const today = "2026-06-18";

  it("flags expired lots", () => {
    expect(bestBeforeAlert("2026-06-01", today)).toEqual({ kind: "expired", daysUntil: -17 });
  });

  it("returns the smallest matching threshold bucket", () => {
    expect(bestBeforeAlert("2026-06-25", today)).toMatchObject({ kind: "approaching", thresholdDays: 14 }); // 7 days
    expect(bestBeforeAlert("2026-07-10", today)).toMatchObject({ kind: "approaching", thresholdDays: 30 }); // 22 days
    expect(bestBeforeAlert("2026-08-01", today)).toMatchObject({ kind: "approaching", thresholdDays: 60 }); // 44 days
    expect(bestBeforeAlert("2026-09-10", today)).toMatchObject({ kind: "approaching", thresholdDays: 90 }); // 84 days
  });

  it("returns ok beyond the largest threshold", () => {
    expect(bestBeforeAlert("2026-12-31", today)).toMatchObject({ kind: "ok" });
  });

  it("honours configurable thresholds", () => {
    expect(bestBeforeAlert("2026-06-25", today, [7])).toMatchObject({ kind: "approaching", thresholdDays: 7 }); // 7 days <= 7
    expect(bestBeforeAlert("2026-06-25", today, [3])).toMatchObject({ kind: "ok" }); // 7 > 3
  });
});
