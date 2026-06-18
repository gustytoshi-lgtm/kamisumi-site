import type {
  SnsDraftRepository,
  SnsDraftStatus,
  SnsPlatform,
} from "./snsDraft";
import { generateSnsDraftBody } from "./snsDraft";
import { CommerceError, type ActorContext } from "@/repositories/core/writeModels";
import { can, type Permission } from "./rbac";

/**
 * SNS 下書きサービス。作成・承認・却下は journal:manage（front_staff/editor/owner）。
 * 承認しても自動公開はしない（投稿は人間が別途実施。本番 SNS API 連携は未実装）。
 */
const PERM: Permission = "journal:manage";

function assertCan(ctx: ActorContext): void {
  if (!can(ctx.role, PERM)) {
    throw new CommerceError("forbidden", `role ${ctx.role} lacks ${PERM}`);
  }
}

export function createSnsDraftService(repo: SnsDraftRepository) {
  return {
    async listDrafts(ctx: ActorContext, options?: { status?: SnsDraftStatus }) {
      assertCan(ctx);
      return repo.listDrafts(options);
    },
    async createDraftFromProduct(
      ctx: ActorContext,
      input: { platform: SnsPlatform; title: string; shortDescription?: string; region?: string; sourceProductId?: string },
    ) {
      assertCan(ctx);
      if (!input.title?.trim()) throw new CommerceError("validation", "title is required");
      const body = generateSnsDraftBody(input);
      return repo.createDraft({
        platform: input.platform,
        body,
        sourceProductId: input.sourceProductId,
        createdBy: ctx.userId,
      });
    },
    async createDraft(
      ctx: ActorContext,
      input: { platform: SnsPlatform; body: string; sourceProductId?: string },
    ) {
      assertCan(ctx);
      if (!input.body?.trim()) throw new CommerceError("validation", "body is required");
      return repo.createDraft({ ...input, createdBy: ctx.userId });
    },
    async approveDraft(ctx: ActorContext, id: string) {
      assertCan(ctx);
      const draft = await repo.getDraft(id);
      if (!draft) throw new CommerceError("not_found", `sns draft ${id} not found`);
      if (draft.status !== "pending") {
        throw new CommerceError("invalid_transition", "only pending drafts can be approved");
      }
      return repo.setStatus(id, "approved", ctx.userId);
    },
    async rejectDraft(ctx: ActorContext, id: string) {
      assertCan(ctx);
      const draft = await repo.getDraft(id);
      if (!draft) throw new CommerceError("not_found", `sns draft ${id} not found`);
      if (draft.status !== "pending") {
        throw new CommerceError("invalid_transition", "only pending drafts can be rejected");
      }
      return repo.setStatus(id, "rejected");
    },
    async deleteDraft(ctx: ActorContext, id: string) {
      assertCan(ctx);
      return repo.softDeleteDraft(id);
    },
  };
}

export type SnsDraftService = ReturnType<typeof createSnsDraftService>;
