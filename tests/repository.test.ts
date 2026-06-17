import { describe, expect, it } from "vitest";
import { getCommerceRepository } from "@/repositories";

describe("mock commerce repository", () => {
  it("lists archived products when explicitly included", async () => {
    const repository = getCommerceRepository();
    const products = await repository.listProducts({ includeArchive: true });

    expect(products.some((product) => product.publicStatus === "archive")).toBe(true);
  });

  it("filters new arrivals without archive items", async () => {
    const repository = getCommerceRepository();
    const products = await repository.listProducts({ newOnly: true, includeArchive: false });

    expect(products.length).toBeGreaterThan(0);
    expect(products.every((product) => product.isNewArrival && !product.isArchive)).toBe(true);
  });

  it("returns detail records by slug", async () => {
    const repository = getCommerceRepository();
    const product = await repository.getProductBySlug("kyoto-usucha-midori");

    expect(product?.sku).toBe("KMS-MAT-001");
    expect(product?.matchaDetail?.suitableForUsucha).toBe(true);
  });
});

