import { afterEach, describe, expect, it } from "vitest";
import { getCustomerAuthMode, resolveCustomerLocale } from "@/lib/customer/auth";

const OLD_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...OLD_ENV };
});

describe("customer auth adapter", () => {
  it("defaults to mock mode unless explicitly set", () => {
    delete process.env.CUSTOMER_AUTH_MODE;
    delete process.env.DATA_BACKEND;
    expect(getCustomerAuthMode()).toBe("mock");
  });

  it("uses explicit CUSTOMER_AUTH_MODE and follows DATA_BACKEND otherwise", () => {
    process.env.CUSTOMER_AUTH_MODE = "supabase";
    expect(getCustomerAuthMode()).toBe("supabase");
    delete process.env.CUSTOMER_AUTH_MODE;
    process.env.DATA_BACKEND = "supabase";
    expect(getCustomerAuthMode()).toBe("supabase");
  });

  it("resolves locale from session first, then public locale", () => {
    expect(resolveCustomerLocale("ja", null)).toBe("ja");
    expect(resolveCustomerLocale("bogus", null)).toBe("zh-tw");
    expect(resolveCustomerLocale("ja", {
      userId: "u",
      customerId: "c",
      organizationId: "o",
      preferredLocale: "en",
    })).toBe("en");
  });
});
