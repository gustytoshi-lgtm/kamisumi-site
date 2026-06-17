import { describe, expect, it } from "vitest";
import { localizePath, replaceLocaleInPath, stripLocale } from "@/lib/routes";

describe("locale route helpers", () => {
  it("prefixes locale paths", () => {
    expect(localizePath("zh-tw", "/shop")).toBe("/zh-tw/shop");
    expect(localizePath("ja")).toBe("/ja");
  });

  it("switches locale while preserving the rest of the path", () => {
    expect(replaceLocaleInPath("/zh-tw/products/kyoto-usucha-midori", "ja")).toBe(
      "/ja/products/kyoto-usucha-midori",
    );
  });

  it("strips the locale segment", () => {
    expect(stripLocale("/zh-tw/journal/kyoto-sourcing-note")).toBe(
      "/journal/kyoto-sourcing-note",
    );
  });
});

