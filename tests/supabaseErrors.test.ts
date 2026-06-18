import { describe, expect, it } from "vitest";
import { toCommerceError, throwCommerce } from "@/lib/supabase/errors";
import { CommerceError } from "@/repositories/core/writeModels";

describe("supabase error mapping", () => {
  it("maps P0002 to not_found", () => {
    expect(toCommerceError({ code: "P0002", message: "not_found: inventory x" })?.code).toBe(
      "not_found",
    );
  });

  it("maps P0001 by message to specific business codes", () => {
    expect(toCommerceError({ code: "P0001", message: "negative_stock" })?.code).toBe(
      "negative_stock",
    );
    expect(toCommerceError({ code: "P0001", message: "insufficient_stock" })?.code).toBe(
      "insufficient_stock",
    );
    expect(toCommerceError({ code: "P0001", message: "conflict: reserved/held negative" })?.code).toBe(
      "conflict",
    );
  });

  it("maps common SQLSTATE codes", () => {
    expect(toCommerceError({ code: "23505", message: "dup" })?.code).toBe("conflict");
    expect(toCommerceError({ code: "23503", message: "fk" })?.code).toBe("validation");
    expect(toCommerceError({ code: "23514", message: "check" })?.code).toBe("validation");
    expect(toCommerceError({ code: "22P02", message: "bad uuid" })?.code).toBe("validation");
  });

  it("returns the same CommerceError instance when given one", () => {
    const e = new CommerceError("forbidden", "no");
    expect(toCommerceError(e)).toBe(e);
  });

  it("returns null for unknown errors", () => {
    expect(toCommerceError({ code: "99999", message: "?" })).toBeNull();
    expect(toCommerceError(new Error("plain"))).toBeNull();
    expect(toCommerceError("string error")).toBeNull();
  });

  it("throwCommerce throws mapped error for known, rethrows unknown", () => {
    expect(() => throwCommerce({ code: "P0001", message: "negative_stock" })).toThrowError(
      CommerceError,
    );
    const plain = new Error("boom");
    expect(() => throwCommerce(plain)).toThrow(plain);
  });
});
