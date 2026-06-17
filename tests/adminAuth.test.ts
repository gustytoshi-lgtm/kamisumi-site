import { afterEach, describe, expect, it, vi } from "vitest";
import { isAdminEnabled } from "@/config/features";
import { getAdminSession, resolveAdminLocale } from "@/lib/admin/auth";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("admin feature flag", () => {
  it("is off by default and on only when ADMIN_ENABLED=true", () => {
    vi.stubEnv("ADMIN_ENABLED", "");
    expect(isAdminEnabled()).toBe(false);
    vi.stubEnv("ADMIN_ENABLED", "true");
    expect(isAdminEnabled()).toBe(true);
  });
});

describe("admin auth adapter (mock)", () => {
  it("returns null when no ADMIN_DEV_ROLE", () => {
    vi.stubEnv("ADMIN_DEV_ROLE", "");
    expect(getAdminSession()).toBeNull();
  });

  it("returns a session for a valid dev role", () => {
    vi.stubEnv("ADMIN_DEV_ROLE", "owner");
    expect(getAdminSession()).toEqual({ userId: "dev-user", role: "owner", adminLocale: "ja" });
  });

  it("ignores invalid roles", () => {
    vi.stubEnv("ADMIN_DEV_ROLE", "superuser");
    expect(getAdminSession()).toBeNull();
  });
});

describe("resolveAdminLocale", () => {
  it("uses the session admin locale when signed in", () => {
    const session = { userId: "u", role: "owner", adminLocale: "zh-tw" } as const;
    expect(resolveAdminLocale("ja", session)).toBe("zh-tw");
  });

  it("falls back from public locale when signed out", () => {
    expect(resolveAdminLocale("zh-tw", null)).toBe("zh-tw");
    expect(resolveAdminLocale("ja", null)).toBe("ja");
    expect(resolveAdminLocale("en", null)).toBe("ja");
  });
});
