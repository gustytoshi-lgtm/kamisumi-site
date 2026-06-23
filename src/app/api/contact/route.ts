import { NextResponse } from "next/server";
import { getPublicSettings, isPublicUrl } from "@/lib/settings/publicSettings";

export const dynamic = "force-dynamic";

/**
 * 公開向けの連絡導線（Threads DM 等）を返す runtime API。
 * 商品ページは SSG のままにし、DM ボタンはこの API をクライアントから読んで表示する
 * （/api/features/cart と同じ方式）。owner が設定で social_threads を変えると即反映される。
 */
export async function GET() {
  const settings = await getPublicSettings();
  const threads = isPublicUrl(settings.socialThreads) ? settings.socialThreads : "";
  return NextResponse.json(
    { threads },
    { headers: { "Cache-Control": "no-store" } },
  );
}
