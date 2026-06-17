import type { Locale } from "@/config/site";
import type { Money } from "@/types/commerce";

const currencyMinorUnits: Record<Money["currency"], number> = {
  TWD: 2,
  JPY: 0,
  USD: 2,
};

function toMajorString(amountMinor: number, minorUnit: number): string {
  if (minorUnit === 0) return `${amountMinor}`;

  const sign = amountMinor < 0 ? "-" : "";
  const absolute = Math.abs(amountMinor);
  const scale = 10 ** minorUnit;
  const whole = Math.trunc(absolute / scale);
  const fraction = `${absolute % scale}`.padStart(minorUnit, "0");

  return `${sign}${whole}.${fraction}`;
}

export function moneyToMajorString(money: Money): string {
  return toMajorString(money.amountMinor, currencyMinorUnits[money.currency]);
}

export function formatMoney(money: Money, locale: Locale): string {
  if (money.amountMinor === 0) return "TBD";

  const numberLocale = locale === "zh-tw" ? "zh-TW" : locale;
  const minorUnit = currencyMinorUnits[money.currency];
  const numericValue = Number(moneyToMajorString(money));

  return new Intl.NumberFormat(numberLocale, {
    style: "currency",
    currency: money.currency,
    minimumFractionDigits: money.currency === "USD" ? minorUnit : 0,
    maximumFractionDigits: money.currency === "USD" ? minorUnit : 0,
  }).format(numericValue);
}

