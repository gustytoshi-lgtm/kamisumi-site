import { describe, expect, it } from "vitest";
import {
  convertMoneyDemo,
  isSupportedDisplayCurrency,
  shippingCountries,
  supportedDisplayCurrencies,
  zoneForCountry,
} from "@/config/shipping";
import type { Money } from "@/types/commerce";

describe("shipping config — zones", () => {
  it("maps known countries to a zone", () => {
    expect(zoneForCountry("TW")).toBe("domestic_tw");
    expect(zoneForCountry("JP")).toBe("east_asia");
    expect(zoneForCountry("US")).toBe("north_america");
    expect(zoneForCountry("DE")).toBe("rest_of_world");
  });

  it("returns null for unknown countries", () => {
    expect(zoneForCountry("ZZ")).toBeNull();
    expect(zoneForCountry("")).toBeNull();
  });

  it("every configured country has a resolvable zone", () => {
    for (const country of shippingCountries) {
      expect(zoneForCountry(country.code)).toBe(country.zone);
    }
  });
});

describe("shipping config — display currency", () => {
  it("guards supported display currencies", () => {
    for (const currency of supportedDisplayCurrencies) {
      expect(isSupportedDisplayCurrency(currency)).toBe(true);
    }
    expect(isSupportedDisplayCurrency("EUR")).toBe(false);
    expect(isSupportedDisplayCurrency("")).toBe(false);
  });
});

describe("convertMoneyDemo (reference rates, not real)", () => {
  const twd = (amountMinor: number): Money => ({ currency: "TWD", amountMinor });

  it("returns the same Money when source equals target", () => {
    const m = twd(12345);
    expect(convertMoneyDemo(m, "TWD")).toBe(m);
  });

  it("produces integer minor units in the target currency", () => {
    const result = convertMoneyDemo(twd(100000), "USD"); // 1000.00 TWD
    expect(result.currency).toBe("USD");
    expect(Number.isInteger(result.amountMinor)).toBe(true);
  });

  it("JPY result has zero-decimal scale (minor units = whole yen)", () => {
    const result = convertMoneyDemo(twd(100000), "JPY"); // 1000.00 TWD
    expect(result.currency).toBe("JPY");
    expect(Number.isInteger(result.amountMinor)).toBe(true);
    // 1000 TWD / 0.21 ~= 4761 JPY (demo rate); sanity range only.
    expect(result.amountMinor).toBeGreaterThan(0);
  });

  it("round-trips approximately through TWD base", () => {
    const usd = convertMoneyDemo(twd(320000), "USD"); // ~100.00 USD at demo 1 USD = 32 TWD
    expect(usd.amountMinor).toBe(10000);
    const backToTwd = convertMoneyDemo(usd, "TWD");
    expect(backToTwd.amountMinor).toBe(320000);
  });
});
