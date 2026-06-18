import { beforeEach, describe, expect, it } from "vitest";
import { createMediaService } from "@/lib/commerce/mediaService";
import {
  createMockMediaRepository,
  type MockMediaRepository,
} from "@/repositories/mock/mockMediaRepository";
import { normalizeMediaPath } from "@/repositories/core/mediaModels";
import type { ActorContext } from "@/repositories/core/writeModels";

const owner: ActorContext = { userId: "o1", role: "owner" };
const editor: ActorContext = { userId: "e1", role: "editor" };
const front: ActorContext = { userId: "f1", role: "front_staff" };

let repo: MockMediaRepository;
let service: ReturnType<typeof createMediaService>;

beforeEach(() => {
  repo = createMockMediaRepository();
  repo.seed();
  service = createMediaService(repo);
});

async function expectErr(p: Promise<unknown>, code: string) {
  await expect(p).rejects.toMatchObject({ code });
}

describe("normalizeMediaPath", () => {
  it("normalizes and strips traversal", () => {
    expect(normalizeMediaPath("Products/My Photo .PNG")).toBe("products/my-photo-.png");
    expect(normalizeMediaPath("../../etc/passwd")).toBe("etc/passwd");
  });
});

describe("media service", () => {
  it("editor can manage public media; front_staff cannot", async () => {
    await expect(
      service.createMedia(editor, { kind: "product", path: "products/a.png", mimeType: "image/png" }),
    ).resolves.toMatchObject({ bucket: "public" });
    await expectErr(service.createMedia(front, { kind: "product", path: "p.png" }), "forbidden");
  });

  it("private media (receipt) requires owner (secrets:view)", async () => {
    await expectErr(
      service.createMedia(editor, { kind: "receipt", path: "r.pdf", mimeType: "application/pdf" }),
      "forbidden",
    );
    await expect(
      service.createMedia(owner, { kind: "receipt", path: "r.pdf", mimeType: "application/pdf" }),
    ).resolves.toMatchObject({ bucket: "private" });
  });

  it("editor list excludes private media; owner sees it", async () => {
    await service.createMedia(owner, { kind: "product", path: "a.png", mimeType: "image/png" });
    await service.createMedia(owner, { kind: "receipt", path: "r.pdf", mimeType: "application/pdf" });
    expect(await service.listMedia(editor)).toHaveLength(1); // public only
    expect(await service.listMedia(owner)).toHaveLength(2);
  });

  it("validates mime, size, dimensions, duplicate path", async () => {
    await expectErr(
      service.createMedia(owner, { kind: "product", path: "x.gif", mimeType: "image/gif" }),
      "validation",
    );
    await expectErr(
      service.createMedia(owner, { kind: "product", path: "big.png", mimeType: "image/png", byteSize: 99 * 1024 * 1024 }),
      "validation",
    );
    await expectErr(
      service.createMedia(owner, { kind: "product", path: "huge.png", mimeType: "image/png", width: 99999 }),
      "validation",
    );
    await service.createMedia(owner, { kind: "product", path: "dup.png", mimeType: "image/png" });
    await expectErr(
      service.createMedia(owner, { kind: "product", path: "dup.png", mimeType: "image/png" }),
      "conflict",
    );
  });

  it("updates alt and soft-deletes", async () => {
    const m = await service.createMedia(owner, { kind: "product", path: "a.png", mimeType: "image/png" });
    const updated = await service.updateMedia(owner, m.id, { altJa: "茶碗", altZh: "茶碗" });
    expect(updated.altJa).toBe("茶碗");
    await service.deleteMedia(owner, m.id);
    expect(await service.listMedia(owner)).toHaveLength(0);
  });
});
