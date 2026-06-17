import { describe, expect, it } from "vitest";
import { getDictionary } from "@/dictionaries";
import { getProductStatusPresentation, isPurchasableStatus } from "@/lib/status";
import type { ProductStatus } from "@/types/commerce";

describe("product status presentation", () => {
  it("maps low stock to the locale-specific CTA", () => {
    const zh = getDictionary("zh-tw");
    const ja = getDictionary("ja");

    expect(getProductStatusPresentation(zh, "low_stock").cta).toBe("確認庫存");
    expect(getProductStatusPresentation(ja, "low_stock").cta).toBe("在庫を確認する");
  });

  it("keeps only inquiry-ready statuses in purchasable states", () => {
    const expectations: Record<ProductStatus, boolean> = {
      in_stock: true,
      low_stock: true,
      preorder: true,
      sourcing_available: true,
      awaiting_arrival: false,
      reserved: false,
      sold_out: false,
      restock_request: false,
      archive: false,
      coming_soon: false,
    };

    for (const [status, purchasable] of Object.entries(expectations) as [
      ProductStatus,
      boolean,
    ][]) {
      expect(isPurchasableStatus(status)).toBe(purchasable);
    }
  });
});
