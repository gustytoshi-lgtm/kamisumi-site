import type { CommerceRepository } from "@/repositories/core/commerceRepository";

/**
 * Supabase 実装のスタブ（Phase 2A 基盤）。
 *
 * interface / adapter / 切替の構造を確定させるためのプレースホルダで、
 * 実際の Supabase クエリは本番 project と環境変数（NEXT_PUBLIC_SUPABASE_URL / ANON_KEY 等）が
 * 用意できた段階で実装する。supabase/migrations のスキーマと同じ契約（CommerceRepository）を満たす。
 *
 * このスタブは DATA_BACKEND=supabase かつ Supabase 設定済みのときのみ factory から返される。
 * 公開サイトの既定（mock）では到達しないため、未実装メソッドは明示的に例外を投げる。
 */
function notImplemented(method: string): never {
  throw new Error(
    `SupabaseCommerceRepository.${method} is not implemented yet. ` +
      `Provide Supabase env and implement queries, or unset DATA_BACKEND to use mock.`,
  );
}

export const supabaseCommerceRepository: CommerceRepository = {
  async listProducts() {
    return notImplemented("listProducts");
  },
  async getProductBySlug() {
    return notImplemented("getProductBySlug");
  },
  async listJournalPosts() {
    return notImplemented("listJournalPosts");
  },
  async getJournalPostBySlug() {
    return notImplemented("getJournalPostBySlug");
  },
  async listSourcingSchedules() {
    return notImplemented("listSourcingSchedules");
  },
  async listFaqs() {
    return notImplemented("listFaqs");
  },
};
