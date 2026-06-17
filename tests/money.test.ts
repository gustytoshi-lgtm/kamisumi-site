import { describe, expect, it } from "vitest";
import {
  addMoney,
  allocateByRatio,
  multiplyMoney,
  subtractMoney,
  sumMoney,
  zeroMoney,
} from "@/lib/commerce/money";
import type { Money } from "@/types/commerce";

const twd = (amountMinor: number): Money => ({ currency: "TWD", amountMinor });

describe("money integer arithmetic", () => {
  it("adds and subtracts within the same currency", () => {
    expect(addMoney(twd(98000), twd(2000))).toEqual(twd(100000));
    expect(subtractMoney(twd(100000), twd(1)).amountMinor).toBe(99999);
  });

  it("rejects currency mismatch", () => {
    expect(() => addMoney(twd(1), { currency: "JPY", amountMinor: 1 })).toThrow();
  });

  it("multiplies by an integer quantity only", () => {
    expect(multiplyMoney(twd(76000), 3)).toEqual(twd(228000));
    expect(() => multiplyMoney(twd(76000), 1.5)).toThrow();
  });

  it("sums a list starting from zero", () => {
    expect(sumMoney([twd(100), twd(200), twd(300)], "TWD")).toEqual(twd(600));
    expect(sumMoney([], "JPY")).toEqual(zeroMoney("JPY"));
  });
});

describe("allocateByRatio (cost allocation foundation)", () => {
  it("preserves the total with remainder distribution", () => {
    const parts = allocateByRatio(twd(1000), [1, 1, 1]);
    expect(parts.map((p) => p.amountMinor)).toEqual([334, 333, 333]);
    expect(parts.reduce((acc, p) => acc + p.amountMinor, 0)).toBe(1000);
  });

  it("allocates proportionally to weights", () => {
    const parts = allocateByRatio(twd(1000), [3, 1]);
    expect(parts.map((p) => p.amountMinor)).toEqual([750, 250]);
  });

  it("falls back to equal split when all weights are zero", () => {
    const parts = allocateByRatio(twd(100), [0, 0, 0, 0]);
    expect(parts.map((p) => p.amountMinor)).toEqual([25, 25, 25, 25]);
  });

  it("rejects negative weights", () => {
    expect(() => allocateByRatio(twd(100), [1, -1])).toThrow();
  });
});
