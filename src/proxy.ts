import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isAdminEnabled } from "@/config/features";
import { defaultLocale, isLocale } from "@/config/site";

export function proxy(request: NextRequest) {
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

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|api|.*\\..*|sitemap.xml|robots.txt).*)"],
};

