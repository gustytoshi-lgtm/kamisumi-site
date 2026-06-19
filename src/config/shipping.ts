import type { CurrencyCode, Money } from "@/types/commerce";
import { minorUnitsFor } from "@/lib/commerce/money";

/**
 * 配送ゾーン + 表示通貨の設定（Phase 3 公開 UI・参考用）。
 *
 * 重要: ここでの送料・為替は**確定値ではない**。
 * - 送料は自動計算しない（重量/材積/破損性/目的地で個別見積。site の方針どおり）。
 * - 為替は開発用のデモレート（実レートではない）。実際の請求には使わない。
 */
export type ShippingZone = "domestic_tw" | "east_asia" | "north_america" | "rest_of_world";

export type ShippingCountry = {
  code: string;
  /** 表示名（i18n せず単一表記。ゾーン/案内文はロケール別に dictionaries 側で出す）。 */
  name: string;
  zone: ShippingZone;
};

export const shippingCountries: ShippingCountry[] = [
  { code: "TW", name: "台灣 / Taiwan", zone: "domestic_tw" },
  { code: "JP", name: "日本 / Japan", zone: "east_asia" },
  { code: "HK", name: "香港 / Hong Kong", zone: "east_asia" },
  { code: "KR", name: "대한민국 / Korea", zone: "east_asia" },
  { code: "SG", name: "Singapore", zone: "east_asia" },
  { code: "MY", name: "Malaysia", zone: "east_asia" },
  { code: "US", name: "United States", zone: "north_america" },
  { code: "CA", name: "Canada", zone: "north_america" },
  { code: "GB", name: "United Kingdom", zone: "rest_of_world" },
  { code: "AU", name: "Australia", zone: "rest_of_world" },
  { code: "DE", name: "Germany", zone: "rest_of_world" },
  { code: "FR", name: "France", zone: "rest_of_world" },
];

export function zoneForCountry(code: string): ShippingZone | null {
  return shippingCountries.find((c) => c.code === code)?.zone ?? null;
}

/** 店舗が見積もりを出せる表示通貨。 */
export const supportedDisplayCurrencies: CurrencyCode[] = ["TWD", "JPY", "USD"];

export function isSupportedDisplayCurrency(value: string): value is CurrencyCode {
  return (supportedDisplayCurrencies as string[]).includes(value);
}

/**
 * デモ用の参考レート（実レートではない）。各通貨 1 主要単位あたり何 TWD かの概算。
 * 実装簡略化のため TWD を基準にし、source→TWD→target で換算する。
 */
const twdPerMajorUnit: Record<CurrencyCode, number> = {
  TWD: 1,
  JPY: 0.21,
  USD: 32,
};

function toMajor(money: Money): number {
  return money.amountMinor / 10 ** minorUnitsFor(money.currency);
}

/**
 * デモレートでの参考換算。整数最小単位の Money を返す（target 通貨）。
 * **実レート・実請求ではない**。表示専用。
 */
export function convertMoneyDemo(money: Money, target: CurrencyCode): Money {
  if (money.currency === target) return money;
  const twd = toMajor(money) * twdPerMajorUnit[money.currency];
  const targetMajor = twd / twdPerMajorUnit[target];
  const amountMinor = Math.round(targetMajor * 10 ** minorUnitsFor(target));
  return { currency: target, amountMinor };
}
