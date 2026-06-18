import { siteConfig } from "@/config/site";
import type { MediaRepository } from "@/repositories/core/mediaRepository";
import {
  bucketForKind,
  isMediaKind,
  type MediaBucket,
  type MediaCreateInput,
  type MediaKind,
  type MediaUpdateInput,
} from "@/repositories/core/mediaModels";
import { CommerceError, type ActorContext } from "@/repositories/core/writeModels";
import { can, type Permission } from "./rbac";

/**
 * メディアサービス。公開メディア（product/journal/brand）の管理は media:manage（owner/editor）。
 * private bucket（レシート/仕入証明/顧客関連/内部資料）は機微のため secrets:view（owner）限定で
 * 読取・作成する。private を公開 bucket へ入れない。
 */
const MANAGE: Permission = "media:manage";

function assertCan(ctx: ActorContext, permission: Permission): void {
  if (!can(ctx.role, permission)) {
    throw new CommerceError("forbidden", `role ${ctx.role} lacks ${permission}`, { permission });
  }
}

export function createMediaService(repo: MediaRepository) {
  return {
    async listMedia(
      ctx: ActorContext,
      options?: { bucket?: MediaBucket; kind?: MediaKind; includeDeleted?: boolean },
    ) {
      assertCan(ctx, MANAGE);
      const all = await repo.listMedia(options);
      // private（内部資料）は owner のみ。それ以外には返さない。
      if (can(ctx.role, "secrets:view")) return all;
      return all.filter((m) => m.bucket === "public");
    },
    async getMedia(ctx: ActorContext, id: string) {
      assertCan(ctx, MANAGE);
      const media = await repo.getMedia(id);
      if (!media) return null;
      if (media.bucket === "private" && !can(ctx.role, "secrets:view")) {
        throw new CommerceError("forbidden", "private media requires secrets:view");
      }
      return media;
    },
    async createMedia(
      ctx: ActorContext,
      input: Omit<MediaCreateInput, "organizationId"> & { organizationId?: string },
    ) {
      assertCan(ctx, MANAGE);
      if (!isMediaKind(input.kind)) {
        throw new CommerceError("validation", `invalid media kind: ${input.kind}`);
      }
      const bucket = input.bucket ?? bucketForKind(input.kind);
      if (bucket === "private" && !can(ctx.role, "secrets:view")) {
        throw new CommerceError("forbidden", "creating private media requires secrets:view");
      }
      return repo.createMedia(
        { ...input, bucket, organizationId: input.organizationId ?? siteConfig.organization.id },
        ctx,
      );
    },
    async updateMedia(ctx: ActorContext, id: string, patch: MediaUpdateInput) {
      assertCan(ctx, MANAGE);
      const media = await repo.getMedia(id);
      if (!media) throw new CommerceError("not_found", `media ${id} not found`);
      if (media.bucket === "private" && !can(ctx.role, "secrets:view")) {
        throw new CommerceError("forbidden", "private media requires secrets:view");
      }
      return repo.updateMedia(id, patch, ctx);
    },
    async deleteMedia(ctx: ActorContext, id: string) {
      assertCan(ctx, MANAGE);
      const media = await repo.getMedia(id);
      if (!media) throw new CommerceError("not_found", `media ${id} not found`);
      if (media.bucket === "private" && !can(ctx.role, "secrets:view")) {
        throw new CommerceError("forbidden", "private media requires secrets:view");
      }
      return repo.softDeleteMedia(id, ctx);
    },
    async restoreMedia(ctx: ActorContext, id: string) {
      assertCan(ctx, MANAGE);
      return repo.restoreMedia(id, ctx);
    },
  };
}

export type MediaService = ReturnType<typeof createMediaService>;
