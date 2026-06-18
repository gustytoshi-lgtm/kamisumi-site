import { beforeEach, describe, expect, it } from "vitest";
import { createCeramicUnitService } from "@/lib/commerce/ceramicUnitService";
import {
  createMockCeramicUnitRepository,
  type MockCeramicUnitRepository,
} from "@/repositories/mock/mockCeramicUnitRepository";
import type { ActorContext } from "@/repositories/core/writeModels";

const owner: ActorContext = { userId: "o1", role: "owner" };
const front: ActorContext = { userId: "f1", role: "front_staff" };
const inv: ActorContext = { userId: "i1", role: "inventory_staff" };

let repo: MockCeramicUnitRepository;
let service: ReturnType<typeof createCeramicUnitService>;

beforeEach(() => {
  repo = createMockCeramicUnitRepository();
  repo.seed();
  service = createCeramicUnitService(repo);
});

async function expectErr(p: Promise<unknown>, code: string) {
  await expect(p).rejects.toMatchObject({ code });
}

describe("ceramic unit service", () => {
  it("owner sees cost; front_staff/inventory_staff do NOT", async () => {
    await service.createUnit(owner, { productId: "p1", unitCode: "U1", costMinor: 168000, costCurrency: "TWD" });
    const ownerView = await service.listUnits(owner);
    expect(ownerView[0]?.cost?.amountMinor).toBe(168000);
    const frontView = await service.listUnits(front);
    expect(frontView[0]?.cost).toBeUndefined();
    const invView = await service.listUnits(inv);
    expect(invView[0]?.cost).toBeUndefined();
  });

  it("non-cost-viewer cannot set cost on create", async () => {
    await expectErr(service.createUnit(inv, { productId: "p1", unitCode: "U2", costMinor: 100 }), "forbidden");
    // but can create without cost
    await expect(service.createUnit(inv, { productId: "p1", unitCode: "U3" })).resolves.toBeDefined();
  });

  it("front_staff cannot write (manage) but can read", async () => {
    await expectErr(service.createUnit(front, { productId: "p1", unitCode: "U4" }), "forbidden");
    await expect(service.listUnits(front)).resolves.toBeDefined();
  });

  it("status transitions and soft delete / restore", async () => {
    const u = await service.createUnit(owner, { productId: "p1", unitCode: "U5" });
    await expect(service.setStatus(owner, u.id, "sold")).resolves.toMatchObject({ status: "sold" });
    await expectErr(service.setStatus(owner, u.id, "bogus" as never), "validation");
    await service.deleteUnit(owner, u.id);
    expect(await service.listUnits(owner)).toHaveLength(0);
    await service.restoreUnit(owner, u.id);
    expect(await service.listUnits(owner)).toHaveLength(1);
  });

  it("validates required fields", async () => {
    await expectErr(service.createUnit(owner, { productId: "", unitCode: "U6" }), "validation");
  });
});
