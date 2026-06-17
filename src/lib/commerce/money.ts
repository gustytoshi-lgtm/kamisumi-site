import type { CurrencyCode, Money } from "@/types/commerce";

/**
 * 金額は浮動小数点で計算せず、必ず「最小通貨単位の整数（amountMinor）」で扱う。
 * 通貨ごとの小数桁は currencyMinorUnits を単一情報源とする。
 * Phase 2B 以降の原価・利益計算もこのモジュールを経由すること。
 */
export const currencyMinorUnits: Record<CurrencyCode, number> = {
  TWD: 2,
  JPY: 0,
  USD: 2,
};

export function minorUnitsFor(currency: CurrencyCode): number {
  return currencyMinorUnits[currency];
}

export function zeroMoney(currency: CurrencyCode): Money {
  return { currency, amountMinor: 0 };
}

function assertInteger(amountMinor: number): void {
  if (!Number.isInteger(amountMinor)) {
    throw new Error(`amountMinor must be an integer (got ${amountMinor})`);
  }
}

function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new Error(`currency mismatch: ${a.currency} vs ${b.currency}`);
  }
}

export function addMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return { currency: a.currency, amountMinor: a.amountMinor + b.amountMinor };
}

export function subtractMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return { currency: a.currency, amountMinor: a.amountMinor - b.amountMinor };
}

/** 整数の数量を掛ける。小数係数は使わない（端数処理が必要なら allocateByRatio を使う）。 */
export function multiplyMoney(money: Money, quantity: number): Money {
  assertInteger(quantity);
  return { currency: money.currency, amountMinor: money.amountMinor * quantity };
}

export function sumMoney(items: Money[], currency: CurrencyCode): Money {
  return items.reduce((acc, item) => addMoney(acc, item), zeroMoney(currency));
}

export function isZeroMoney(money: Money): boolean {
  return money.amountMinor === 0;
}

export function compareMoney(a: Money, b: Money): number {
  assertSameCurrency(a, b);
  return a.amountMinor - b.amountMinor;
}

/**
 * 合計金額を weights の比率で按分する（原価配賦の基礎）。
 * 整数最小単位を保ったまま配分し、丸め誤差は最大比率の要素へ寄せて合計を保存する。
 * weights が全て 0、または空配列の場合は均等配分する。
 */
export function allocateByRatio(total: Money, weights: number[]): Money[] {
  if (weights.length === 0) return [];
  if (weights.some((w) => w < 0)) {
    throw new Error("weights must be non-negative");
  }
  assertInteger(total.amountMinor);

  const weightSum = weights.reduce((acc, w) => acc + w, 0);
  const effectiveWeights = weightSum === 0 ? weights.map(() => 1) : weights;
  const effectiveSum = weightSum === 0 ? weights.length : weightSum;

  const raw = effectiveWeights.map((w) => (total.amountMinor * w) / effectiveSum);
  const floored = raw.map((value) => Math.floor(value));
  let remainder = total.amountMinor - floored.reduce((acc, v) => acc + v, 0);

  // 端数（remainder 個分）を小数部が大きい要素から順に +1 して合計を保存する。
  const order = raw
    .map((value, index) => ({ index, frac: value - Math.floor(value) }))
    .sort((a, b) => b.frac - a.frac);

  const result = floored.slice();
  let cursor = 0;
  while (remainder > 0 && order.length > 0) {
    result[order[cursor % order.length].index] += 1;
    remainder -= 1;
    cursor += 1;
  }

  return result.map((amountMinor) => ({ currency: total.currency, amountMinor }));
}
