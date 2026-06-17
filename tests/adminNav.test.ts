import { describe, expect, it } from "vitest";
import { ADMIN_NAV_KEYS, ADMIN_NAV_PERMISSIONS, visibleAdminNav } from "@/lib/commerce/adminNav";
import { getAdminDictionary } from "@/dictionaries/admin";

describe("admin navigation + i18n", () => {
  it("owner sees every menu", () => {
    expect(visibleAdminNav("owner").sort()).toEqual([...ADMIN_NAV_KEYS].sort());
  });

  it("front_staff sees customer-facing menus but not purchases/settings/audit", () => {
    const nav = visibleAdminNav("front_staff");
    expect(nav).toContain("inquiries");
    expect(nav).toContain("orders");
    expect(nav).toContain("journal");
    expect(nav).not.toContain("purchases");
    expect(nav).not.toContain("settings");
    expect(nav).not.toContain("auditLogs");
  });

  it("every nav key has at least one required permission", () => {
    for (const key of ADMIN_NAV_KEYS) {
      expect(ADMIN_NAV_PERMISSIONS[key].length).toBeGreaterThan(0);
    }
  });

  it("ja and zh-tw dictionaries label every nav key", () => {
    for (const locale of ["ja", "zh-tw"] as const) {
      const dict = getAdminDictionary(locale);
      for (const key of ADMIN_NAV_KEYS) {
        expect(dict.nav[key]?.length ?? 0).toBeGreaterThan(0);
      }
    }
  });
});
