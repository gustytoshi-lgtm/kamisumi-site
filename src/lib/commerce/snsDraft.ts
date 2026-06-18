/**
 * SNS 投稿下書き（Threads / Instagram）と人間承認フロー（Phase 3 基盤）。
 *
 * 重要:
 *   - 自動投稿・本番 SNS API 連携は行わない（adapter は将来）。
 *   - 生成は「下書き案」のみ。実在しない事実・受賞・提携・効能を作らない（入力フィールドのみ使用）。
 *   - 承認状態（pending→approved/rejected）を持つが、approved でも自動公開しない（投稿は人間が別途）。
 */
export type SnsPlatform = "threads" | "instagram";
export type SnsDraftStatus = "pending" | "approved" | "rejected";

export type SnsDraft = {
  id: string;
  platform: SnsPlatform;
  body: string;
  status: SnsDraftStatus;
  sourceProductId?: string;
  createdBy?: string;
  approvedBy?: string;
  createdAt: string;
  updatedAt: string;
};

/** 商品情報から下書き本文を生成（提供フィールドのみ使用。誇大表現を加えない）。 */
export function generateSnsDraftBody(input: {
  platform: SnsPlatform;
  title: string;
  shortDescription?: string;
  region?: string;
}): string {
  const lines = [input.title];
  if (input.region) lines.push(`産地: ${input.region}`);
  if (input.shortDescription) lines.push(input.shortDescription);
  lines.push("#KAMISUMI #日本茶 #台灣");
  return lines.join("\n");
}

/** Threads 投稿テキストから Journal 下書き案（タイトル+本文）を生成。事実は追加しない。 */
export function generateJournalDraftFromThread(threadText: string): { title: string; body: string } {
  const trimmed = threadText.trim();
  const firstLine = trimmed.split("\n")[0]?.slice(0, 60) ?? "";
  return {
    title: firstLine || "（下書き）",
    body: trimmed,
  };
}

export interface SnsDraftRepository {
  listDrafts(options?: { status?: SnsDraftStatus; includeDeleted?: boolean }): Promise<SnsDraft[]>;
  getDraft(id: string): Promise<SnsDraft | null>;
  createDraft(input: { platform: SnsPlatform; body: string; sourceProductId?: string; createdBy?: string }): Promise<SnsDraft>;
  setStatus(id: string, status: SnsDraftStatus, approvedBy?: string): Promise<SnsDraft>;
  softDeleteDraft(id: string): Promise<SnsDraft>;
}

export type MockSnsDraftRepository = SnsDraftRepository & { reset(): void };

export function createMockSnsDraftRepository(): MockSnsDraftRepository {
  let drafts = new Map<string, SnsDraft & { deletedAt?: string }>();
  let counter = 0;
  const now = () => new Date().toISOString();

  function req(id: string): SnsDraft & { deletedAt?: string } {
    const dft = drafts.get(id);
    if (!dft) throw new Error(`sns draft ${id} not found`);
    return dft;
  }

  return {
    reset() {
      drafts = new Map();
      counter = 0;
    },
    async listDrafts(options) {
      let all = [...drafts.values()];
      if (!options?.includeDeleted) all = all.filter((dft) => !dft.deletedAt);
      if (options?.status) all = all.filter((dft) => dft.status === options.status);
      return all.map(({ deletedAt: _deletedAt, ...rest }) => {
        void _deletedAt;
        return rest;
      });
    },
    async getDraft(id) {
      const dft = drafts.get(id);
      if (!dft || dft.deletedAt) return null;
      const { deletedAt: _deletedAt, ...rest } = dft;
      void _deletedAt;
      return rest;
    },
    async createDraft(input) {
      const id = `sns-${++counter}`;
      const draft: SnsDraft = {
        id,
        platform: input.platform,
        body: input.body,
        status: "pending",
        sourceProductId: input.sourceProductId,
        createdBy: input.createdBy,
        createdAt: now(),
        updatedAt: now(),
      };
      drafts.set(id, draft);
      return draft;
    },
    async setStatus(id, status, approvedBy) {
      const dft = req(id);
      const updated = { ...dft, status, approvedBy: status === "approved" ? approvedBy : dft.approvedBy, updatedAt: now() };
      drafts.set(id, updated);
      const { deletedAt: _deletedAt, ...rest } = updated;
      void _deletedAt;
      return rest;
    },
    async softDeleteDraft(id) {
      const dft = req(id);
      const updated = { ...dft, deletedAt: now() };
      drafts.set(id, updated);
      const { deletedAt: _deletedAt, ...rest } = updated;
      void _deletedAt;
      return rest;
    },
  };
}

/** アプリ既定の mock SNS 下書き repository（dev・in-memory）。 */
export const mockSnsDraftRepository = createMockSnsDraftRepository();
