import { afterEach, describe, expect, it, vi } from "vitest";
import { isAdminEnabled } from "@/config/features";
import {
  getAdminAuthMode,
  getAdminSession,
  pickPrimaryRole,
  resolveAdminLocale,
} from "@/lib/admin/auth";

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

describe("getAdminAuthMode", () => {
  it("defaults to mock when DATA_BACKEND is not supabase", () => {
    vi.stubEnv("ADMIN_AUTH_MODE", "");
    vi.stubEnv("DATA_BACKEND", "");
    expect(getAdminAuthMode()).toBe("mock");
  });

  it("follows the supabase data backend by default", () => {
    vi.stubEnv("ADMIN_AUTH_MODE", "");
    vi.stubEnv("DATA_BACKEND", "supabase");
    expect(getAdminAuthMode()).toBe("supabase");
  });

  it("honours an explicit ADMIN_AUTH_MODE override", () => {
    vi.stubEnv("DATA_BACKEND", "supabase");
    vi.stubEnv("ADMIN_AUTH_MODE", "mock");
    expect(getAdminAuthMode()).toBe("mock");
    vi.stubEnv("DATA_BACKEND", "");
    vi.stubEnv("ADMIN_AUTH_MODE", "supabase");
    expect(getAdminAuthMode()).toBe("supabase");
  });
});

describe("admin auth adapter (mock)", () => {
  it("returns null when no ADMIN_DEV_ROLE", async () => {
    vi.stubEnv("ADMIN_AUTH_MODE", "mock");
    vi.stubEnv("ADMIN_DEV_ROLE", "");
    expect(await getAdminSession()).toBeNull();
  });

  it("returns a session for a valid dev role", async () => {
    vi.stubEnv("ADMIN_AUTH_MODE", "mock");
    vi.stubEnv("ADMIN_DEV_ROLE", "owner");
    expect(await getAdminSession()).toEqual({
      userId: "dev-user",
      role: "owner",
      adminLocale: "ja",
    });
  });

  it("ignores invalid roles", async () => {
    vi.stubEnv("ADMIN_AUTH_MODE", "mock");
    vi.stubEnv("ADMIN_DEV_ROLE", "superuser");
    expect(await getAdminSession()).toBeNull();
  });
});

describe("pickPrimaryRole", () => {
  it("prefers the most privileged role (owner) among several", () => {
    expect(pickPrimaryRole(["editor", "owner", "front_staff"])).toBe("owner");
  });

  it("returns the single valid role and ignores unknown values", () => {
    expect(pickPrimaryRole(["inventory_staff", "superuser"])).toBe("inventory_staff");
  });

  it("returns null when no valid role is present", () => {
    expect(pickPrimaryRole([])).toBeNull();
    expect(pickPrimaryRole(["nope"])).toBeNull();
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
