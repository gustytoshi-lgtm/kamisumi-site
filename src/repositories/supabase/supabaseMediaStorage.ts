import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { MediaStorage } from "@/lib/commerce/mediaStorage";

/**
 * Supabase Storage 実装。public バケットは getPublicUrl、private は createSignedUrl。
 * service role でアクセスするため Storage の RLS/policy はバイパスする（アプリ層 RBAC が境界）。
 * バケット（public/private）は事前作成が必要（docs/SUPABASE_SETUP.md §7 / scripts/verify-storage.mjs）。
 */
export const supabaseMediaStorage: MediaStorage = {
  async upload(bucket, path, body, contentType) {
    const client = getSupabaseAdminClient();
    const { error } = await client.storage.from(bucket).upload(path, body, { contentType, upsert: true });
    if (error) throw new Error(`storage upload failed: ${error.message}`);
  },
  async remove(bucket, path) {
    const client = getSupabaseAdminClient();
    const { error } = await client.storage.from(bucket).remove([path]);
    if (error) throw new Error(`storage remove failed: ${error.message}`);
  },
  publicUrl(bucket, path) {
    const client = getSupabaseAdminClient();
    return client.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  },
  async signedUrl(bucket, path, expiresInSeconds) {
    const client = getSupabaseAdminClient();
    const { data, error } = await client.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
    if (error || !data) {
      throw new Error(`storage signed url failed: ${error?.message ?? "unknown"}`);
    }
    return data.signedUrl;
  },
};
