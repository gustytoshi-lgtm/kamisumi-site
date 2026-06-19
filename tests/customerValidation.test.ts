import { describe, expect, it } from "vitest";
import {
  CUSTOMER_FIELD_LIMITS,
  isValidCountryCode,
  isValidEmail,
  isValidPhone,
  validateAddressInput,
  validateProfilePatch,
} from "@/lib/customer/validation";

describe("customer validation — primitives", () => {
  it("accepts well-formed emails and rejects malformed ones", () => {
    expect(isValidEmail("guest@example.com")).toBe(true);
    expect(isValidEmail("a.b+c@sub.example.co.jp")).toBe(true);
    expect(isValidEmail("no-at-sign")).toBe(false);
    expect(isValidEmail("spaces in@example.com")).toBe(false);
    expect(isValidEmail("missing@domain")).toBe(false);
    expect(isValidEmail(`${"a".repeat(250)}@example.com`)).toBe(false); // over length
  });

  it("accepts 2-letter country codes only", () => {
    expect(isValidCountryCode("TW")).toBe(true);
    expect(isValidCountryCode("jp")).toBe(true);
    expect(isValidCountryCode("USA")).toBe(false);
    expect(isValidCountryCode("T")).toBe(false);
    expect(isValidCountryCode("1W")).toBe(false);
  });

  it("accepts phone-like strings and rejects letters", () => {
    expect(isValidPhone("+886 2-1234-5678")).toBe(true);
    expect(isValidPhone("0312345678")).toBe(true);
    expect(isValidPhone("call me")).toBe(false);
    expect(isValidPhone("1".repeat(CUSTOMER_FIELD_LIMITS.phone + 1))).toBe(false);
  });
});

describe("validateProfilePatch", () => {
  it("passes valid patches (including empty optional fields)", () => {
    expect(() => validateProfilePatch({})).not.toThrow();
    expect(() =>
      validateProfilePatch({ name: "Tea Guest", email: "guest@example.com", countryCode: "TW" }),
    ).not.toThrow();
    // 空文字の任意項目は検証で弾かない（actions 側で undefined に正規化される前提だが安全側）。
    expect(() => validateProfilePatch({ email: "", countryCode: "", phone: "" })).not.toThrow();
  });

  it("rejects blank name", () => {
    expect(() => validateProfilePatch({ name: "   " })).toThrowError(/name is required/);
  });

  it("rejects oversized name", () => {
    expect(() =>
      validateProfilePatch({ name: "x".repeat(CUSTOMER_FIELD_LIMITS.name + 1) }),
    ).toThrowError(/name exceeds/);
  });

  it("rejects malformed email and country code", () => {
    expect(() => validateProfilePatch({ email: "bad" })).toThrowError(/invalid email/);
    expect(() => validateProfilePatch({ countryCode: "Taiwan" })).toThrowError(/invalid country code/);
  });

  it("throws CommerceError with code 'validation'", () => {
    expect.assertions(1);
    try {
      validateProfilePatch({ email: "bad" });
    } catch (error) {
      expect((error as { code?: string }).code).toBe("validation");
    }
  });
});

describe("validateAddressInput", () => {
  it("passes valid addresses", () => {
    expect(() =>
      validateAddressInput({ recipientName: "Tea Guest", countryCode: "TW", line1: "Taipei" }),
    ).not.toThrow();
  });

  it("rejects oversized line and invalid country code", () => {
    expect(() =>
      validateAddressInput({ line1: "x".repeat(CUSTOMER_FIELD_LIMITS.line1 + 1) }),
    ).toThrowError(/line1 exceeds/);
    expect(() => validateAddressInput({ countryCode: "TWN" })).toThrowError(/invalid country code/);
  });
});
