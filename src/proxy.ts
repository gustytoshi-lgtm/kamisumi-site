import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isAdminEnabled, isCartEnabled, isCustomerPortalEnabled } from "@/config/features";
import { isSupabaseConfigured } from "@/config/dataBackend";
import { defaultLocale, isLocale } from "@/config/site";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/") {
    return NextResponse.redirect(new URL(`/${defaultLocale}`, request.url));
  }

  const segments = pathname.split("/").filter(Boolean);
  const firstSegment = segments[0];
  if (firstSegment && !isLocale(firstSegment)) {
    const url = request.nextUrl.clone();
    url.pathname = `/${defaultLocale}${pathname}`;
    return NextResponse.redirect(url);
  }

  // 管理画面は ADMIN_ENABLED=true のときだけ到達可能。無効時は真の 404 を返す
  // （ページ側 notFound() のソフト404ではなく、ルーティング前で遮断する）。
  if (firstSegment && isLocale(firstSegment) && segments[1] === "admin" && !isAdminEnabled()) {
    return new NextResponse(null, { status: 404 });
  }

  // 顧客マイページも CUSTOMER_PORTAL_ENABLED=true のときだけ到達可能。無効時は真の 404。
  if (
    firstSegment &&
    isLocale(firstSegment) &&
    segments[1] === "account" &&
    !isCustomerPortalEnabled()
  ) {
    return new NextResponse(null, { status: 404 });
  }

  // cart / checkout 公開 UI も CART_ENABLED=true のときだけ到達可能。無効時は真の 404。
  if (firstSegment && isLocale(firstSegment) && segments[1] === "cart" && !isCartEnabled()) {
    return new NextResponse(null, { status: 404 });
  }

  // Supabase 設定済みのときだけ Cookie ベースのセッション更新を行う（公式推奨構成）。
  // env 未設定・mock mode では呼ばれず、公開サイトの挙動は Phase 1 と同一。
  if (isSupabaseConfigured()) {
    const { updateSupabaseSession } = await import("@/lib/supabase/middleware");
    return updateSupabaseSession(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|api|.*\\..*|sitemap.xml|robots.txt).*)"],
};

