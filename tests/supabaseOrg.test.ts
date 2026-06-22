import { afterEach, describe, expect, it } from "vitest";
import { isUuid, resolveOrgId, resetDefaultOrgIdCache } from "@/lib/supabase/org";

type OrgClient = Parameters<typeof resolveOrgId>[0];

const ORG_UUID = "00000000-0000-0000-0000-0000000000a1";

/** organizations.code -> { id } を返す最小フェイク（.from().select().eq().maybeSingle()）。 */
function fakeClient(orgId: string | null): OrgClient {
  return {
    from() {
      return {
        select() {
          return {
            eq() {
              return {
                maybeSingle: async () => ({ data: orgId ? { id: orgId } : null, error: null }),
              };
            },
          };
        },
      };
    },
  } as unknown as OrgClient;
}

/** 呼ばれたら失敗する＝DB を引かないことの証明用。 */
const throwingClient = {
  from() {
    throw new Error("resolveOrgId should not query the DB for a real uuid");
  },
} as unknown as OrgClient;

afterEach(() => resetDefaultOrgIdCache());

describe("isUuid", () => {
  it("accepts canonical uuids and rejects slugs/empty/undefined", () => {
    expect(isUuid(ORG_UUID)).toBe(true);
    expect(isUuid("org-kagurakoji")).toBe(false);
    expect(isUuid("")).toBe(false);
    expect(isUuid(undefined)).toBe(false);
    expect(isUuid(null)).toBe(false);
  });
});

describe("resolveOrgId", () => {
  it("passes a real uuid through without touching the DB", async () => {
    expect(await resolveOrgId(throwingClient, ORG_UUID)).toBe(ORG_UUID);
  });

  it("resolves the default org uuid for the mock slug", async () => {
    expect(await resolveOrgId(fakeClient(ORG_UUID), "org-kagurakoji")).toBe(ORG_UUID);
  });

  it("resolves the default org uuid when org is undefined", async () => {
    expect(await resolveOrgId(fakeClient(ORG_UUID), undefined)).toBe(ORG_UUID);
  });
});
