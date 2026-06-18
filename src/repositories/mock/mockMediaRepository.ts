import { siteConfig } from "@/config/site";
import type { MediaRepository } from "@/repositories/core/mediaRepository";
import {
  bucketForKind,
  normalizeMediaPath,
  validateMedia,
  type MediaAsset,
  type MediaCreateInput,
  type MediaUpdateInput,
} from "@/repositories/core/mediaModels";
import { CommerceError } from "@/repositories/core/writeModels";

/** 開発・テスト用 in-memory メディア repository（reset/seed, fixture 非破壊・実アップロードなし）。 */
export type MockMediaRepository = MediaRepository & { reset(): void; seed(): void };

const ORG = siteConfig.organization.id;

export function createMockMediaRepository(): MockMediaRepository {
  let items = new Map<string, MediaAsset>();
  let counter = 0;
  const now = () => new Date().toISOString();

  function req(id: string): MediaAsset {
    const m = items.get(id);
    if (!m) throw new CommerceError("not_found", `media ${id} not found`);
    return m;
  }

  const repo: MockMediaRepository = {
    reset() {
      items = new Map();
      counter = 0;
    },
    seed() {
      items = new Map();
      counter = 0;
    },
    async listMedia(options) {
      let all = [...items.values()];
      if (options?.bucket) all = all.filter((m) => m.bucket === options.bucket);
      if (options?.kind) all = all.filter((m) => m.kind === options.kind);
      if (!options?.includeDeleted) all = all.filter((m) => !m.deletedAt);
      return all.sort((a, b) => a.sortOrder - b.sortOrder);
    },
    async getMedia(id) {
      return items.get(id) ?? null;
    },
    async createMedia(input: MediaCreateInput, ctx) {
      const bucket = input.bucket ?? bucketForKind(input.kind);
      const path = normalizeMediaPath(input.path);
      const error = validateMedia({ ...input, bucket, path });
      if (error) throw new CommerceError("validation", error, { reason: error });
      // bucket+path の一意制約（DB unique(bucket,path) に対応）
      if ([...items.values()].some((m) => m.bucket === bucket && m.path === path && !m.deletedAt)) {
        throw new CommerceError("conflict", "media path already exists in bucket", { bucket, path });
      }
      const id = `media-${++counter}`;
      const record: MediaAsset = {
        id,
        organizationId: input.organizationId ?? ORG,
        bucket,
        path,
        kind: input.kind,
        mimeType: input.mimeType,
        byteSize: input.byteSize,
        width: input.width,
        height: input.height,
        altJa: input.altJa,
        altZh: input.altZh,
        sortOrder: counter,
        uploadedBy: ctx.userId,
        createdAt: now(),
        updatedAt: now(),
      };
      items.set(id, record);
      return record;
    },
    async updateMedia(id, patch: MediaUpdateInput, _ctx) {
      void _ctx;
      const m = req(id);
      const updated: MediaAsset = {
        ...m,
        altJa: patch.altJa ?? m.altJa,
        altZh: patch.altZh ?? m.altZh,
        sortOrder: patch.sortOrder ?? m.sortOrder,
        updatedAt: now(),
      };
      items.set(id, updated);
      return updated;
    },
    async softDeleteMedia(id, _ctx) {
      void _ctx;
      const m = req(id);
      const updated = { ...m, deletedAt: now() };
      items.set(id, updated);
      return updated;
    },
    async restoreMedia(id, _ctx) {
      void _ctx;
      const m = req(id);
      const updated = { ...m };
      delete updated.deletedAt;
      items.set(id, updated);
      return updated;
    },
  };

  return repo;
}

export const mockMediaRepository = createMockMediaRepository();
mockMediaRepository.seed();
