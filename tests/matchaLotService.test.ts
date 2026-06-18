import { beforeEach, describe, expect, it } from "vitest";
import { createMatchaLotService } from "@/lib/commerce/matchaLotService";
import {
  createMockMatchaLotRepository,
  type MockMatchaLotRepository,
} from "@/repositories/mock/mockMatchaLotRepository";
import type { ActorContext } from "@/repositories/core/writeModels";

const owner: ActorContext = { userId: "o1", role: "owner" };
const front: ActorContext = { userId: "f1", role: "front_staff" };
const inv: ActorContext = { userId: "i1", role: "inventory_staff" };

let repo: MockMatchaLotRepository;
let service: ReturnType<typeof createMatchaLotService>;

beforeEach(() => {
  repo = createMockMatchaLotRepository();
  repo.seed();
  service = createMatchaLotService(repo);
});

async function expectErr(p: Promise<unknown>, code: string) {
  await expect(p).rejects.toMatchObject({ code });
}

describe("matcha lot service", () => {
  it("owner/inventory_staff create; front_staff cannot write but can read", async () => {
    const lot = await service.createLot(owner, { productId: "p1", lotCode: "L1", quantity: 10 });
    expect(lot.quantity).toBe(10);
    await expect(service.createLot(inv, { productId: "p2", quantity: 5 })).resolves.toBeDefined();
    await expectErr(service.createLot(front, { productId: "p3" }), "forbidden");
    // front_staff read OK
    await expect(service.listLots(front)).resolves.toHaveLength(2);
  });

  it("adjustQuantity keeps quantity non-negative", async () => {
    const lot = await service.createLot(owner, { productId: "p1", quantity: 3 });
    await expect(service.adjustQuantity(owner, lot.id, 2)).resolves.toMatchObject({ quantity: 5 });
    await expectErr(service.adjustQuantity(owner, lot.id, -100), "negative_stock");
    await expectErr(service.adjustQuantity(owner, lot.id, 0), "validation");
  });

  it("rejects invalid create input", async () => {
    await expectErr(service.createLot(owner, { productId: "" }), "validation");
    await expectErr(service.createLot(owner, { productId: "p1", quantity: -1 }), "validation");
  });

  it("soft-deletes and excludes from default list; restores", async () => {
    const lot = await service.createLot(owner, { productId: "p1", quantity: 1 });
    await service.deleteLot(owner, lot.id);
    expect(await service.listLots(owner)).toHaveLength(0);
    expect(await service.listLots(owner, { includeDeleted: true })).toHaveLength(1);
    await service.restoreLot(owner, lot.id);
    expect(await service.listLots(owner)).toHaveLength(1);
  });

  it("reset clears state", async () => {
    await service.createLot(owner, { productId: "p1", quantity: 1 });
    repo.reset();
    expect(await repo.listLots()).toHaveLength(0);
  });
});
