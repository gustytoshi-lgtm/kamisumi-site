import { NextResponse, type NextRequest } from "next/server";
import { isAdminEnabled } from "@/config/features";
import { getAdminSession } from "@/lib/admin/auth";
import { canAny } from "@/lib/commerce/rbac";
import {
  auditEntriesToCsv,
  filterAuditEntries,
  sortAuditEntriesDesc,
  type AuditLogFilter,
} from "@/lib/commerce/auditLog";
import { collectAuditLogs } from "@/repositories";

export const dynamic = "force-dynamic";

/**
 * 操作履歴の CSV エクスポート（owner 限定。audit_log:view）。
 * 画面のフィルタ（actor/action/entityType/q/from/to）と同じ条件で絞り込んだ結果を返す。
 */
export async function GET(request: NextRequest) {
  // route handler には admin layout のガードが効かないため、ここで flag/権限を再確認する。
  if (!isAdminEnabled()) return new NextResponse("Not found", { status: 404 });
  const session = await getAdminSession();
  if (!session || !canAny(session.role, ["audit_log:view"])) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const sp = request.nextUrl.searchParams;
  const filter: AuditLogFilter = {
    actor: sp.get("actor") ?? undefined,
    action: sp.get("action") ?? undefined,
    entityType: sp.get("entityType") ?? undefined,
    query: sp.get("q") ?? undefined,
    from: sp.get("from") ?? undefined,
    to: sp.get("to") ?? undefined,
  };

  const all = sortAuditEntriesDesc(await collectAuditLogs());
  const csv = auditEntriesToCsv(filterAuditEntries(all, filter));
  const filename = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;

  // Excel が UTF-8 を正しく扱えるよう BOM を付与する。
  return new NextResponse(`﻿${csv}`, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
