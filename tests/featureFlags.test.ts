import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isAdminEnabled, isCartEnabled, isCustomerPortalEnabled } from "@/config/features";
import { isDevToolsEnabled, isProductionRuntime } from "@/config/devtools";

/**
 * 公開サイト不変・feature flag 既定 OFF の回帰ガード。
 * 半完成機能（admin / customer portal / cart）は明示的に "true" のときだけ有効になること、
 * dev 専用ツールが本番で必ず無効になることを固定する。
 */

const FLAG_ENV = [
  "ADMIN_ENABLED",
  "CUSTOMER_PORTAL_ENABLED",
  "CART_ENABLED",
  "DATA_BACKEND",
  "NODE_ENV",
] as const;

const original: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of FLAG_ENV) original[key] = process.env[key];
});

afterEach(() => {
  const env = process.env as Record<string, string | undefined>;
  for (const key of FLAG_ENV) {
    if (original[key] === undefined) delete env[key];
    else env[key] = original[key];
  }
});

function clearFlags() {
  delete process.env.ADMIN_ENABLED;
  delete process.env.CUSTOMER_PORTAL_ENABLED;
  delete process.env.CART_ENABLED;
}

// NODE_ENV は型上 read-only のため、テストでの上書きは index 経由で行う。
function setNodeEnv(value: string) {
  (process.env as Record<string, string | undefined>).NODE_ENV = value;
}

describe("feature flags default OFF", () => {
  it("are all false when unset (public site unchanged)", () => {
    clearFlags();
    expect(isAdminEnabled()).toBe(false);
    expect(isCustomerPortalEnabled()).toBe(false);
    expect(isCartEnabled()).toBe(false);
  });

  it("only the exact string 'true' enables a flag", () => {
    for (const value of ["false", "1", "yes", "TRUE", "", "on"]) {
      process.env.ADMIN_ENABLED = value;
      process.env.CUSTOMER_PORTAL_ENABLED = value;
      process.env.CART_ENABLED = value;
      expect(isAdminEnabled(), `ADMIN_ENABLED=${value}`).toBe(false);
      expect(isCustomerPortalEnabled(), `CUSTOMER_PORTAL_ENABLED=${value}`).toBe(false);
      expect(isCartEnabled(), `CART_ENABLED=${value}`).toBe(false);
    }
  });

  it("enables flags when set to 'true'", () => {
    process.env.ADMIN_ENABLED = "true";
    process.env.CUSTOMER_PORTAL_ENABLED = "true";
    process.env.CART_ENABLED = "true";
    expect(isAdminEnabled()).toBe(true);
    expect(isCustomerPortalEnabled()).toBe(true);
    expect(isCartEnabled()).toBe(true);
  });
});

describe("dev tools gating", () => {
  it("are disabled in production runtime regardless of other flags", () => {
    setNodeEnv("production");
    process.env.ADMIN_ENABLED = "true";
    delete process.env.DATA_BACKEND; // mock
    expect(isProductionRuntime()).toBe(true);
    expect(isDevToolsEnabled()).toBe(false);
  });

  it("require admin enabled AND mock backend in non-production", () => {
    setNodeEnv("development");
    delete process.env.DATA_BACKEND; // mock

    process.env.ADMIN_ENABLED = "false";
    expect(isDevToolsEnabled()).toBe(false);

    process.env.ADMIN_ENABLED = "true";
    expect(isDevToolsEnabled()).toBe(true);

    process.env.DATA_BACKEND = "supabase";
    expect(isDevToolsEnabled()).toBe(false);
  });
});
