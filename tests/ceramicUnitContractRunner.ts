import { describe, expect, it } from "vitest";
import type { CeramicUnitRepository } from "@/repositories/core/ceramicUnitRepository";
import type { ActorContext } from "@/repositories/core/writeModels";
import {
  CONTRACT_CERAMIC_PRODUCT_ID,
  uniqueContractSuffix,
} from "./repositoryContractFixtures";

export function runCeramicUnitContract(
  name: string,
  makeRepo: () => CeramicUnitRepository,
  ctx: ActorContext,
) {
  describe(`ceramic unit repository contract: ${name}`, () => {
    it("creates, reads, lists and updates a unit with integer cost", async () => {
      const repo = makeRepo();
      const unitCode = uniqueContractSuffix("UNIT");
      const created = await repo.createUnit(
        {
          productId: CONTRACT_CERAMIC_PRODUCT_ID,
          unitCode,
          costMinor: 168000,
          costCurrency: "TWD",
          dimensions: "8 x 8 x 9 cm",
        },
        ctx,
      );
      expect(created.id).toBeTruthy();
      expect(created.cost).toEqual({ currency: "TWD", amountMinor: 168000 });
      expect(await repo.getUnit(created.id)).toMatchObject({ unitCode });
      expect((await repo.listUnits({ productId: CONTRACT_CERAMIC_PRODUCT_ID })).some((u) => u.id === created.id)).toBe(
        true,
      );

      const updated = await repo.updateUnit(created.id, { condition: "checked" }, ctx);
      expect(updated.condition).toBe("checked");
      expect(updated.productId).toBe(CONTRACT_CERAMIC_PRODUCT_ID);
    });

    it("sets status and soft-deletes/restores a unit", async () => {
      const repo = makeRepo();
      const unit = await repo.createUnit(
        { productId: CONTRACT_CERAMIC_PRODUCT_ID, unitCode: uniqueContractSuffix("STATUS") },
        ctx,
      );
      await expect(repo.setStatus(unit.id, "reserved", ctx)).resolves.toMatchObject({ status: "reserved" });
      await repo.softDeleteUnit(unit.id, ctx);
      expect((await repo.listUnits()).some((u) => u.id === unit.id)).toBe(false);
      expect((await repo.listUnits({ includeDeleted: true })).some((u) => u.id === unit.id)).toBe(true);
      await repo.restoreUnit(unit.id, ctx);
      expect((await repo.listUnits()).some((u) => u.id === unit.id)).toBe(true);
    });

    it("rejects an unknown unit id", async () => {
      const repo = makeRepo();
      await expect(repo.updateUnit("00000000-0000-0000-0000-000000000000", { glaze: "x" }, ctx)).rejects.toMatchObject({
        code: "not_found",
      });
    });
  });
}
