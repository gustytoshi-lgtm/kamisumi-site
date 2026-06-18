import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Cookie ベースのセッション更新（公式推奨構成）。
 *
 * Supabase Auth のアクセストークンは短命なため、middleware（src/proxy.ts）で毎リクエスト
 * `auth.getUser()` を呼んでトークンを更新し、更新後の Cookie をレスポンスに載せ直す。
 * Server Component はレンダリング中に Cookie を書けないので、更新はここ（middleware）で行うのが
 * 公式推奨パターン。
 *
 * 重要: この関数は Supabase が設定済みのときだけ proxy から呼ぶこと（呼び出し側でガード）。
 * env 未設定・mock mode では一切呼ばれず、公開サイトの挙動は Phase 1 と同一。
 *
 * @returns セッション Cookie を反映した NextResponse。呼び出し側はこれを返す（または継続）。
 */
export async function updateSupabaseSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // ガード済みのはずだが二重に防御（未設定なら素通し）。
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // トークン更新のトリガ。戻り値は使わず、Cookie の再設定が目的。
  await supabase.auth.getUser();

  return response;
}
