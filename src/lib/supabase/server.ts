import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

/**
 * サーバー専用 Supabase クライアント群（このファイルは "server-only"）。
 *
 * 2 種類を提供する。用途を取り違えないこと。
 *
 * 1. getSupabaseAdminClient(): service role key。RLS をバイパスする管理操作・
 *    Supabase write repository 専用。ユーザーセッションは持たない（ステートレス）。
 *    ブラウザへ絶対に露出しない。
 *
 * 2. getSupabaseServerAuthClient(): anon key + Cookie。ログイン中ユーザーの
 *    セッションを Cookie から復元し、RLS をユーザー権限で評価する。
 *    Server Component / Server Action / Route Handler で「誰がログインしているか」を
 *    判定するために使う（getAdminSession の Supabase 実装で利用予定）。
 *
 * いずれもモジュール読込時にはクライアントを生成しない（mock mode / env 未設定でも安全に起動）。
 */

function requireUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error(
      "Supabase server client: NEXT_PUBLIC_SUPABASE_URL が未設定です。" +
        " .env.local を確認するか DATA_BACKEND=mock で起動してください。",
    );
  }
  return url;
}

/** service role（RLS バイパス）。write repository / 管理バッチ専用。 */
export function getSupabaseAdminClient() {
  const url = requireUrl();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error(
      "Supabase admin client: SUPABASE_SERVICE_ROLE_KEY が未設定です。" +
        " .env.local を確認するか DATA_BACKEND=mock で起動してください。",
    );
  }
  return createClient(url, serviceKey, {
    auth: {
      // service role はステートレス。Cookie/session を使わない。
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * @deprecated 名称を getSupabaseAdminClient() に統一。後方互換のため残置。
 */
export const getSupabaseServerClient = getSupabaseAdminClient;

/**
 * anon key + Cookie ベースのサーバークライアント。ログイン中ユーザーのセッションを評価する。
 *
 * Cookie の書き込み（setAll）は Server Action / Route Handler では成功するが、
 * Server Component のレンダリング中は Next.js が許可しないため try/catch で握りつぶす。
 * その場合のセッション更新は middleware（src/proxy.ts）側で行う想定（公式推奨構成）。
 */
export async function getSupabaseServerAuthClient() {
  const url = requireUrl();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) {
    throw new Error(
      "Supabase server auth client: NEXT_PUBLIC_SUPABASE_ANON_KEY が未設定です。" +
        " .env.local を確認するか DATA_BACKEND=mock で起動してください。",
    );
  }
  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Component レンダリング中は書込不可。middleware でセッション更新する。
        }
      },
    },
  });
}
