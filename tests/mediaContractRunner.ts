import { describe, expect, it } from "vitest";
import type { MediaRepository } from "@/repositories/core/mediaRepository";
import type { ActorContext } from "@/repositories/core/writeModels";
import { CONTRACT_ORG_ID, uniqueContractSuffix } from "./repositoryContractFixtures";

export function runMediaContract(name: string, makeRepo: () => MediaRepository, ctx: ActorContext) {
  describe(`media repository contract: ${name}`, () => {
    it("creates, reads, lists and updates public media metadata", async () => {
      const repo = makeRepo();
      const path = `products/${uniqueContractSuffix("contract")}.png`;
      const created = await repo.createMedia(
        {
          organizationId: CONTRACT_ORG_ID,
          kind: "product",
          path,
          mimeType: "image/png",
          byteSize: 1000,
          width: 800,
          height: 600,
        },
        ctx,
      );
      expect(created.bucket).toBe("public");
      expect(created.path).toBe(path);
      expect(await repo.getMedia(created.id)).toMatchObject({ path });
      expect((await repo.listMedia({ kind: "product" })).some((m) => m.id === created.id)).toBe(true);

      const updated = await repo.updateMedia(created.id, { altJa: "契約画像", altZh: "契約圖片", sortOrder: 99 }, ctx);
      expect(updated.altJa).toBe("契約画像");
      expect(updated.sortOrder).toBe(99);
    });

    it("creates private media and filters by bucket", async () => {
      const repo = makeRepo();
      const privatePath = `receipts/${uniqueContractSuffix("receipt")}.pdf`;
      const created = await repo.createMedia(
        { organizationId: CONTRACT_ORG_ID, kind: "receipt", path: privatePath, mimeType: "application/pdf" },
        ctx,
      );
      expect(created.bucket).toBe("private");
      expect((await repo.listMedia({ bucket: "private" })).some((m) => m.id === created.id)).toBe(true);
    });

    it("rejects duplicate bucket/path and soft-deletes/restores", async () => {
      const repo = makeRepo();
      const path = `products/${uniqueContractSuffix("duplicate")}.png`;
      const created = await repo.createMedia({ organizationId: CONTRACT_ORG_ID, kind: "product", path, mimeType: "image/png" }, ctx);
      await expect(
        repo.createMedia({ organizationId: CONTRACT_ORG_ID, kind: "product", path, mimeType: "image/png" }, ctx),
      ).rejects.toMatchObject({ code: "conflict" });
      await repo.softDeleteMedia(created.id, ctx);
      expect((await repo.listMedia()).some((m) => m.id === created.id)).toBe(false);
      await repo.restoreMedia(created.id, ctx);
      expect((await repo.listMedia()).some((m) => m.id === created.id)).toBe(true);
    });
  });
}
