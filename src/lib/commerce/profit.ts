import type { CurrencyCode, Money } from "@/types/commerce";
import { addMoney, subtractMoney, zeroMoney } from "./money";

/**
 * 利益計算（管理会計）。注文/商品/買付イベント/ブランド/月次の粗利・貢献利益を一元化する。
 *
 * 方針:
 *   - 金額はすべて最小通貨単位の整数（Money.amountMinor）。浮動小数点で金額を持たない。
 *   - 異通貨は addMoney/subtractMoney が拒否する（無断合算しない）。
 *   - 利益率は派生比率のため整数ベーシスポイント（bp, 1%=100bp）で決定的に丸める。
 *   - 法定会計・税務帳簿は対象外（export interface は accountingExport.ts）。
 */
export type ProfitInput = {
  revenue: Money;
  cost: Money; // 原価（仕入 + 配賦付帯費用）
  shippingBorne?: Money; // KAMISUMI 負担送料
  fees?: Money; // 決済手数料等
  fxAdjustment?: Money; // 為替差損益（+ で利益、- で損）
};

export type ProfitResult = {
  currency: CurrencyCode;
  revenue: Money;
  cost: Money;
  /** 粗利益 = revenue - cost。 */
  grossProfit: Money;
  /** 貢献利益 = revenue - cost - shippingBorne - fees + fxAdjustment。 */
  contributionProfit: Money;
  /** 粗利率（ベーシスポイント, 整数, revenue=0 のとき 0）。 */
  grossMarginBasisPoints: number;
};

function orZero(money: Money | undefined, currency: CurrencyCode): Money {
  return money ?? zeroMoney(currency);
}

/** 粗利率を bp（整数）で返す。revenue<=0 のときは 0。決定的に四捨五入。 */
export function marginBasisPoints(profit: Money, revenue: Money): number {
  if (revenue.amountMinor <= 0) return 0;
  return Math.round((profit.amountMinor * 10_000) / revenue.amountMinor);
}

export function computeProfit(input: ProfitInput): ProfitResult {
  const currency = input.revenue.currency;
  const cost = input.cost;
  const grossProfit = subtractMoney(input.revenue, cost);
  // 異通貨は各 add/subtract が throw する。
  let contribution = grossProfit;
  contribution = subtractMoney(contribution, orZero(input.shippingBorne, currency));
  contribution = subtractMoney(contribution, orZero(input.fees, currency));
  contribution = addMoney(contribution, orZero(input.fxAdjustment, currency));
  return {
    currency,
    revenue: input.revenue,
    cost,
    grossProfit,
    contributionProfit: contribution,
    grossMarginBasisPoints: marginBasisPoints(grossProfit, input.revenue),
  };
}

export type ProfitRow = ProfitInput & { key?: string };

/** 複数行の合計（同一通貨前提。空配列は currency 指定で 0）。 */
export function aggregateProfit(rows: ProfitInput[], currency: CurrencyCode): ProfitResult {
  let revenue = zeroMoney(currency);
  let cost = zeroMoney(currency);
  let shipping = zeroMoney(currency);
  let fees = zeroMoney(currency);
  let fx = zeroMoney(currency);
  for (const row of rows) {
    revenue = addMoney(revenue, row.revenue);
    cost = addMoney(cost, row.cost);
    shipping = addMoney(shipping, orZero(row.shippingBorne, currency));
    fees = addMoney(fees, orZero(row.fees, currency));
    fx = addMoney(fx, orZero(row.fxAdjustment, currency));
  }
  return computeProfit({ revenue, cost, shippingBorne: shipping, fees, fxAdjustment: fx });
}

/**
 * key（商品/カテゴリ/ブランド/買付イベント/月など）でグルーピングして利益集計する。
 * 返り値は key 昇順。各行は同一通貨であること。
 */
export function groupProfit(rows: ProfitRow[], currency: CurrencyCode): Array<{ key: string; profit: ProfitResult }> {
  const groups = new Map<string, ProfitInput[]>();
  for (const row of rows) {
    const key = row.key ?? "";
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, list]) => ({ key, profit: aggregateProfit(list, currency) }));
}
