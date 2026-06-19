import { describe, expect, it } from "vitest";
import type { MatchaLotRepository } from "@/repositories/core/matchaLotRepository";
import type { ActorContext } from "@/repositories/core/writeModels";
import {
  CONTRACT_MATCHA_PRODUCT_ID,
  CONTRACT_ORG_ID,
  uniqueContractSuffix,
} from "./repositoryContractFixtures";

export function runMatchaLotContract(
  name: string,
  makeRepo: () => MatchaLotRepository,
  ctx: ActorContext,
) {
  describe(`matcha lot repository contract: ${name}`, () => {
    it("creates, reads, lists and updates a lot", async () => {
      const repo = makeRepo();
      const code = uniqueContractSuffix("LOT");
      const created = await repo.createLot(
        {
          organizationId: CONTRACT_ORG_ID,
          productId: CONTRACT_MATCHA_PRODUCT_ID,
          lotCode: code,
          teaHouse: "Contract Tea House",
          quantity: 5,
        },
        ctx,
      );
      expect(created.id).toBeTruthy();
      expect(created.quantity).toBe(5);
      expect(await repo.getLot(created.id)).toMatchObject({ lotCode: code });
      expect((await repo.listLots({ productId: CONTRACT_MATCHA_PRODUCT_ID })).some((l) => l.id === created.id)).toBe(
        true,
      );

      const updated = await repo.updateLot(created.id, { storageLocation: "cold shelf" }, ctx);
      expect(updated.storageLocation).toBe("cold shelf");
      expect(updated.productId).toBe(CONTRACT_MATCHA_PRODUCT_ID);
    });

    it("adjusts quantity and rejects negative on-hand", async () => {
      const repo = makeRepo();
      const lot = await repo.createLot(
        { organizationId: CONTRACT_ORG_ID, productId: CONTRACT_MATCHA_PRODUCT_ID, quantity: 3 },
        ctx,
      );
      await expect(repo.adjustQuantity(lot.id, 2, ctx, "contract increase")).resolves.toMatchObject({ quantity: 5 });
      await expect(repo.adjustQuantity(lot.id, -99, ctx, "contract decrease")).rejects.toMatchObject({
        code: "negative_stock",
      });
    });

    it("soft-deletes and restores a lot", async () => {
      const repo = makeRepo();
      const lot = await repo.createLot(
        { organizationId: CONTRACT_ORG_ID, productId: CONTRACT_MATCHA_PRODUCT_ID, quantity: 1 },
        ctx,
      );
      await repo.softDeleteLot(lot.id, ctx);
      expect((await repo.listLots()).some((l) => l.id === lot.id)).toBe(false);
      expect((await repo.listLots({ includeDeleted: true })).some((l) => l.id === lot.id)).toBe(true);
      await repo.restoreLot(lot.id, ctx);
      expect((await repo.listLots()).some((l) => l.id === lot.id)).toBe(true);
    });
  });
}
