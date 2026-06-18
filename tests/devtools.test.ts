import { afterEach, describe, expect, it, vi } from "vitest";
import { isDevToolsEnabled, isProductionRuntime } from "@/config/devtools";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("dev tools safety guard", () => {
  it("is enabled only in non-production mock admin", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("ADMIN_ENABLED", "true");
    vi.stubEnv("DATA_BACKEND", "");
    expect(isDevToolsEnabled()).toBe(true);
  });

  it("is disabled in production even with admin enabled (no mock fallback)", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ADMIN_ENABLED", "true");
    vi.stubEnv("DATA_BACKEND", "");
    expect(isProductionRuntime()).toBe(true);
    expect(isDevToolsEnabled()).toBe(false);
  });

  it("is disabled when admin is off", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("ADMIN_ENABLED", "");
    expect(isDevToolsEnabled()).toBe(false);
  });

  it("is disabled under supabase backend (dev tools target mock only)", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("ADMIN_ENABLED", "true");
    vi.stubEnv("DATA_BACKEND", "supabase");
    expect(isDevToolsEnabled()).toBe(false);
  });
});
