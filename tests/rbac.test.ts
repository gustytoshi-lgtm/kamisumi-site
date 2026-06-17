import { describe, expect, it } from "vitest";
import {
  ROLES,
  SENSITIVE_PERMISSIONS,
  can,
  canAny,
  isRole,
} from "@/lib/commerce/rbac";

describe("rbac role/permission matrix", () => {
  it("grants owner everything", () => {
    expect(can("owner", "cost:view")).toBe(true);
    expect(can("owner", "user:manage")).toBe(true);
    expect(can("owner", "settings:bank")).toBe(true);
  });

  it("lets front_staff handle customer-facing work", () => {
    expect(can("front_staff", "inquiry:manage")).toBe(true);
    expect(can("front_staff", "order:update_status")).toBe(true);
    expect(can("front_staff", "product:edit_translation")).toBe(true);
    expect(can("front_staff", "journal:manage")).toBe(true);
    expect(can("front_staff", "inventory:view_public")).toBe(true);
  });

  it("never exposes sensitive permissions to non-owner roles", () => {
    for (const role of ROLES.filter((r) => r !== "owner")) {
      for (const permission of SENSITIVE_PERMISSIONS) {
        expect(can(role, permission)).toBe(false);
      }
    }
  });

  it("front_staff cannot view cost, profit, or export all customers", () => {
    expect(can("front_staff", "cost:view")).toBe(false);
    expect(can("front_staff", "profit:view")).toBe(false);
    expect(can("front_staff", "customer:export_all")).toBe(false);
    expect(can("front_staff", "user:manage")).toBe(false);
  });

  it("canAny returns true when at least one permission is granted", () => {
    expect(canAny("editor", ["cost:view", "journal:manage"])).toBe(true);
    expect(canAny("editor", ["cost:view", "user:manage"])).toBe(false);
  });

  it("validates role strings", () => {
    expect(isRole("owner")).toBe(true);
    expect(isRole("superuser")).toBe(false);
  });
});
