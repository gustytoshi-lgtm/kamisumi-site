/**
 * データバックエンドの切替設定。
 * 既定は "mock"。公開サイトは環境変数を設定しない限り常に mock で動作する（＝Phase 1 と同じ挙動）。
 * Supabase 本番情報が揃ったら DATA_BACKEND=supabase を設定して切り替える。
 */
export type DataBackend = "mock" | "supabase";

export function getDataBackend(): DataBackend {
  return process.env.DATA_BACKEND === "supabase" ? "supabase" : "mock";
}

/** Supabase 接続に必要な環境変数が揃っているか（鍵の値そのものはここで扱わない）。 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
