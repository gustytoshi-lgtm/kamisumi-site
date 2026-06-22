import { beforeEach, describe, expect, it } from "vitest";
import { createMockMediaStorage } from "@/lib/commerce/mediaStorage";

let storage: ReturnType<typeof createMockMediaStorage>;

beforeEach(() => {
  storage = createMockMediaStorage();
});

describe("mock media storage", () => {
  it("records uploads and reports presence; remove deletes", async () => {
    expect(storage.has("public", "products/a.png")).toBe(false);
    await storage.upload("public", "products/a.png", new Uint8Array([1, 2, 3]), "image/png");
    expect(storage.has("public", "products/a.png")).toBe(true);
    await storage.remove("public", "products/a.png");
    expect(storage.has("public", "products/a.png")).toBe(false);
  });

  it("namespaces by bucket (same path in public vs private is distinct)", async () => {
    await storage.upload("private", "receipts/r.pdf", new Uint8Array([0]), "application/pdf");
    expect(storage.has("private", "receipts/r.pdf")).toBe(true);
    expect(storage.has("public", "receipts/r.pdf")).toBe(false);
  });

  it("builds public and signed urls", async () => {
    expect(storage.publicUrl("public", "products/a.png")).toBe("mock-storage://public/products/a.png");
    const signed = await storage.signedUrl("private", "receipts/r.pdf", 600);
    expect(signed).toContain("mock-storage://private/receipts/r.pdf");
    expect(signed).toContain("expires=600");
  });
});
