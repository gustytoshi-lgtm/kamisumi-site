import { createBrowserClient } from "@supabase/ssr";

/**
 * ブラウザ用 Supabase クライアント（anon key, Cookie ベース）。
 *
 * `@supabase/ssr` の `createBrowserClient` を使い、サーバー側（middleware / server client）と
 * 同じ Cookie ストレージでセッションを共有する。RLS が有効な公開読取・認証フローに使用する。
 * service role key はここに渡さない（server.ts 専用）。
 *
 * 呼び出し前に isSupabaseConfigured()（src/config/dataBackend.ts）で env を確認すること。
 * モジュール読込時にはクライアントを生成しない（mock mode / env 未設定でも安全に起動）。
 */
export function getSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase browser client: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY が未設定です。" +
        " .env.local を確認するか DATA_BACKEND=mock で起動してください。",
    );
  }
  return createBrowserClient(url, key);
}
