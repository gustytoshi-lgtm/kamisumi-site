import { NextResponse } from "next/server";
import { isDevToolsEnabled } from "@/config/devtools";
import { mockCommerceWriteRepository } from "@/repositories/mock/mockCommerceWriteRepository";

// 開発専用: mock 書込ストアを初期 seed へ戻す。本番/Supabase/ADMIN無効では 404（安全側）。
export const dynamic = "force-dynamic";

export async function POST() {
  if (!isDevToolsEnabled()) {
    return new NextResponse(null, { status: 404 });
  }
  mockCommerceWriteRepository.reset();
  mockCommerceWriteRepository.seed();
  const products = await mockCommerceWriteRepository.listManagedProducts();
  const audit = await mockCommerceWriteRepository.listAuditLogs();
  return NextResponse.json({
    ok: true,
    message: "mock data reset to initial seed",
    counts: { products: products.length, auditLogs: audit.length },
  });
}
