import { NextResponse } from "next/server";
import { isCartEnabled } from "@/config/features";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    { enabled: isCartEnabled() },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
