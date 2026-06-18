import type { Metadata } from "next";
import { getAdminDictionary } from "@/dictionaries/admin";
import { getAdminSession, resolveAdminLocale } from "@/lib/admin/auth";
import { canAny } from "@/lib/commerce/rbac";
import { getLocaleFromParams, type LocaleParams } from "@/lib/params";
import { getCommerceWriteRepository } from "@/repositories";
import styles from "@/components/admin/Admin.module.css";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const locale = await getLocaleFromParams(params);
  const session = await getAdminSession();
  const d = getAdminDictionary(resolveAdminLocale(locale, session));
  return { title: `${d.auditLog.title} | KAMISUMI Admin` };
}

export default async function AdminAuditLogsPage({ params }: LocaleParams) {
  const locale = await getLocaleFromParams(params);
  const session = await getAdminSession();
  const d = getAdminDictionary(resolveAdminLocale(locale, session));

  if (!session || !canAny(session.role, ["audit_log:view"])) {
    return (
      <>
        <h1>{d.auditLog.title}</h1>
        <p className="muted">{d.common.noPermission}</p>
      </>
    );
  }

  const logs = await getCommerceWriteRepository().listAuditLogs();
  const recent = [...logs].reverse().slice(0, 200);

  return (
    <>
      <h1>{d.auditLog.title}</h1>
      <p className="muted">{d.auditLog.intro}</p>
      <p className="muted">{logs.length}</p>
      {recent.length === 0 ? (
        <p className="muted">{d.auditLog.empty}</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{d.auditLog.at}</th>
              <th>{d.auditLog.actor}</th>
              <th>{d.auditLog.action}</th>
              <th>{d.auditLog.entity}</th>
              <th>{d.auditLog.summary}</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((log) => (
              <tr key={log.id}>
                <td className="muted">{log.createdAt.slice(0, 19).replace("T", " ")}</td>
                <td>{log.actorId}</td>
                <td>
                  <span className={styles.badge}>{log.action}</span>
                </td>
                <td className="muted">
                  {log.entityType}
                  {log.entityId ? ` · ${log.entityId}` : ""}
                </td>
                <td className="muted">{log.summary ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
