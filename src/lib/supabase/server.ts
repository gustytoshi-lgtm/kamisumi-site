import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * サーバー専用 Supabase クライアント（service role key）。
 * RLS をバイパスして管理操作・Supabase write repository から呼ぶ。
 * クライアントバンドル・ブラウザへは絶対に露出しない（"server-only" で強制）。
 *
 * 使用箇所: src/repositories/supabase/supabaseCommerceWriteRepository.ts のみ。
 */
export function getSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Supabase server client: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が未設定です。" +
        " .env.local を確認するか DATA_BACKEND=mock で起動してください。",
    );
  }
  return createClient(url, serviceKey, {
    auth: {
      // サーバー側では cookie/session を使わない（service role はステートレス）。
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
