import type { CurrencyCode, Money } from "@/types/commerce";
import { allocateByRatio, zeroMoney } from "./money";

/**
 * 原価配賦（buy 付帯費用 → 商品/明細への按分）の単一情報源。
 *
 * 不変条件（テストで保証）:
 *   - 配賦額の合計は入力 total と一致する（method='none' を除く。none は明示的に未配賦）。
 *   - 端数は最小通貨単位の整数のまま処理する（allocateByRatio が remainder を保存）。
 *   - currency を保持し、跨ぎ通貨を拒否する（manual で異通貨を渡すと throw）。
 *   - JavaScript 浮動小数点で金額を直接持たない（amountMinor は整数）。
 *
 * method 名はドメイン語彙（spec §3.D）に合わせる。DB（0003 cost_allocations.method）は
 * 'purchase_value' を 'amount' として保持するため、永続層で双方向マッピングする（DECISIONS PM-019）。
 */
export type AllocationMethod =
  | "quantity"
  | "purchase_value"
  | "weight"
  | "volume"
  | "manual"
  | "none";

/** DB enum（cost_allocations.method）。'purchase_value' ↔ 'amount' のみ名称が異なる。 */
export type AllocationMethodDb = "quantity" | "amount" | "weight" | "volume" | "manual" | "none";

export function toDbMethod(method: AllocationMethod): AllocationMethodDb {
  return method === "purchase_value" ? "amount" : method;
}

export function fromDbMethod(method: AllocationMethodDb): AllocationMethod {
  return method === "amount" ? "purchase_value" : method;
}

/** 各明細の按分基礎量。method に対応するフィールドのみ使われる。 */
export type AllocationBasis = {
  quantity?: number;
  purchaseValueMinor?: number;
  weight?: number;
  volume?: number;
  /** method='manual' のときの明示配賦額（total と同一通貨・整数）。 */
  manual?: Money;
};

function basisWeights(method: AllocationMethod, lines: AllocationBasis[]): number[] {
  switch (method) {
    case "quantity":
      return lines.map((l) => l.quantity ?? 0);
    case "purchase_value":
      return lines.map((l) => l.purchaseValueMinor ?? 0);
    case "weight":
      return lines.map((l) => l.weight ?? 0);
    case "volume":
      return lines.map((l) => l.volume ?? 0);
    default:
      return [];
  }
}

/**
 * total を method に従って lines へ配賦する。返り値は lines と同順の Money 配列。
 * 不正入力（非整数 total、負値、manual の通貨不一致・合計不一致）は Error を投げる。
 */
export function allocateCost(
  total: Money,
  method: AllocationMethod,
  lines: AllocationBasis[],
): Money[] {
  if (!Number.isInteger(total.amountMinor)) {
    throw new Error(`cost allocation total must be an integer minor amount (got ${total.amountMinor})`);
  }
  if (total.amountMinor < 0) {
    throw new Error("cost allocation total must be non-negative");
  }
  if (lines.length === 0) return [];

  if (method === "none") {
    // 明示的に未配賦（合計は total と一致しない）。付帯費用を商品原価へ載せないケース。
    return lines.map(() => zeroMoney(total.currency));
  }

  if (method === "manual") {
    const amounts = lines.map((line, index) => {
      const m = line.manual;
      if (!m) throw new Error(`manual allocation requires an amount for line ${index}`);
      if (m.currency !== total.currency) {
        throw new Error(`currency mismatch in manual allocation: ${m.currency} vs ${total.currency}`);
      }
      if (!Number.isInteger(m.amountMinor) || m.amountMinor < 0) {
        throw new Error(`manual amount must be a non-negative integer for line ${index}`);
      }
      return m.amountMinor;
    });
    const sum = amounts.reduce((acc, v) => acc + v, 0);
    if (sum !== total.amountMinor) {
      throw new Error(`manual allocation must sum to total (${sum} != ${total.amountMinor})`);
    }
    return amounts.map((amountMinor) => ({ currency: total.currency, amountMinor }));
  }

  return allocateByRatio(total, basisWeights(method, lines));
}

/**
 * 配賦結果の合計が total と一致するか（呼び出し側の保険）。
 * 異通貨が混ざっていれば throw する。method='none' の結果は false になる（未配賦のため）。
 */
export function allocationBalances(total: Money, allocated: Money[]): boolean {
  const sum = allocated.reduce((acc, money) => {
    if (money.currency !== total.currency) {
      throw new Error(`currency mismatch in allocation result: ${money.currency} vs ${total.currency}`);
    }
    return acc + money.amountMinor;
  }, 0);
  return sum === total.amountMinor;
}

/** total と同一通貨のゼロ配賦（none の補助）。 */
export function zeroAllocation(currency: CurrencyCode, count: number): Money[] {
  return Array.from({ length: count }, () => zeroMoney(currency));
}
