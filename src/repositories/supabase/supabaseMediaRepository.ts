import type { MediaRepository } from "@/repositories/core/mediaRepository";

/**
 * Supabase メディア repository のスケルトン。
 * media_assets（0002 + 0014）と Supabase Storage（public/private バケット）への実装は実 DB/Storage 接続時に行う。
 * service_role key はサーバー専用。private bucket は署名付き URL でのみ配信し、公開しない。
 * 未接続では factory が mock を返すため到達しない。
 */
function notImplemented(method: string): never {
  throw new Error(
    `SupabaseMediaRepository.${method} is not implemented yet. Use mock mode (unset DATA_BACKEND).`,
  );
}

export const supabaseMediaRepository: MediaRepository = {
  async listMedia() {
    return notImplemented("listMedia");
  },
  async getMedia() {
    return notImplemented("getMedia");
  },
  async createMedia() {
    return notImplemented("createMedia");
  },
  async updateMedia() {
    return notImplemented("updateMedia");
  },
  async softDeleteMedia() {
    return notImplemented("softDeleteMedia");
  },
  async restoreMedia() {
    return notImplemented("restoreMedia");
  },
};
