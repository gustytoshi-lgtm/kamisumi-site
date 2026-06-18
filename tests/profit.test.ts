import { describe, expect, it } from "vitest";
import {
  aggregateProfit,
  computeProfit,
  groupProfit,
  marginBasisPoints,
  type ProfitRow,
} from "@/lib/commerce/profit";
import type { Money } from "@/types/commerce";

const twd = (amountMinor: number): Money => ({ currency: "TWD", amountMinor });

describe("computeProfit", () => {
  it("computes gross and contribution profit", () => {
    const result = computeProfit({
      revenue: twd(10000),
      cost: twd(6000),
      shippingBorne: twd(500),
      fees: twd(300),
      fxAdjustment: twd(100),
    });
    expect(result.grossProfit).toEqual(twd(4000));
    // 4000 - 500 - 300 + 100 = 3300
    expect(result.contributionProfit).toEqual(twd(3300));
    expect(result.grossMarginBasisPoints).toBe(4000); // 40.00%
  });

  it("returns zero margin when revenue is zero", () => {
    expect(computeProfit({ revenue: twd(0), cost: twd(0) }).grossMarginBasisPoints).toBe(0);
  });

  it("handles negative profit (loss)", () => {
    const result = computeProfit({ revenue: twd(1000), cost: twd(1500) });
    expect(result.grossProfit).toEqual(twd(-500));
    expect(result.grossMarginBasisPoints).toBe(-5000);
  });

  it("rejects mixing currencies", () => {
    expect(() => computeProfit({ revenue: twd(1000), cost: { currency: "JPY", amountMinor: 500 } })).toThrow(
      /currency mismatch/,
    );
  });
});

describe("marginBasisPoints", () => {
  it("rounds deterministically", () => {
    expect(marginBasisPoints(twd(1), twd(3))).toBe(Math.round((1 * 10000) / 3)); // 3333
  });
});

describe("aggregateProfit", () => {
  it("sums rows and recomputes totals", () => {
    const total = aggregateProfit(
      [
        { revenue: twd(1000), cost: twd(600) },
        { revenue: twd(2000), cost: twd(900), shippingBorne: twd(100) },
      ],
      "TWD",
    );
    expect(total.revenue).toEqual(twd(3000));
    expect(total.cost).toEqual(twd(1500));
    expect(total.grossProfit).toEqual(twd(1500));
    expect(total.contributionProfit).toEqual(twd(1400)); // 1500 - 100
  });

  it("returns zeros for an empty set", () => {
    const total = aggregateProfit([], "TWD");
    expect(total.grossProfit).toEqual(twd(0));
    expect(total.grossMarginBasisPoints).toBe(0);
  });
});

describe("groupProfit", () => {
  it("groups by key (product/brand/event/month) and sorts by key", () => {
    const rows: ProfitRow[] = [
      { key: "brand-b", revenue: twd(1000), cost: twd(500) },
      { key: "brand-a", revenue: twd(2000), cost: twd(800) },
      { key: "brand-a", revenue: twd(1000), cost: twd(200) },
    ];
    const grouped = groupProfit(rows, "TWD");
    expect(grouped.map((g) => g.key)).toEqual(["brand-a", "brand-b"]);
    expect(grouped[0].profit.grossProfit).toEqual(twd(2000)); // (2000-800)+(1000-200)
    expect(grouped[1].profit.grossProfit).toEqual(twd(500));
  });
});
