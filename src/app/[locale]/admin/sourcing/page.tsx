import type { Metadata } from "next";
import { SourcingRequestStatusForm } from "@/components/admin/SourcingRequestStatusForm";
import { getAdminDictionary } from "@/dictionaries/admin";
import { getAdminSession, resolveAdminLocale } from "@/lib/admin/auth";
import { canAny } from "@/lib/commerce/rbac";
import { getLocaleFromParams, type LocaleParams } from "@/lib/params";
import { getCommerceWriteRepository } from "@/repositories";
import styles from "@/components/admin/Admin.module.css";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const locale = await getLocaleFromParams(params);
  const session = getAdminSession();
  const d = getAdminDictionary(resolveAdminLocale(locale, session));
  return { title: `${d.nav.sourcingRequests} | KAMISUMI Admin` };
}

export default async function AdminSourcingPage({ params }: LocaleParams) {
  const locale = await getLocaleFromParams(params);
  const session = getAdminSession();
  const adminLocale = resolveAdminLocale(locale, session);
  const dictionary = getAdminDictionary(adminLocale);

  const allowed =
    session !== null && canAny(session.role, ["sourcing_request:manage"]);

  if (!allowed) {
    return (
      <>
        <h1>{dictionary.nav.sourcingRequests}</h1>
        <p className="muted">{dictionary.common.noPermission}</p>
      </>
    );
  }

  const repo = getCommerceWriteRepository();
  const auditLogs = await repo.listAuditLogs();
  const sourcingIds = auditLogs
    .filter((a) => a.action === "create" && a.entityType === "sourcing_request")
    .map((a) => a.entityId);

  const requests = await Promise.all(sourcingIds.map((id) => repo.getSourcingRequest(id)));
  const validRequests = requests.filter(
    (r): r is NonNullable<typeof r> => r !== null,
  );

  return (
    <>
      <h1>{dictionary.nav.sourcingRequests}</h1>
      <p className="muted">{validRequests.length}</p>
      {validRequests.length === 0 ? (
        <p className="muted">—</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>ID</th>
              <th>{dictionary.common.status}</th>
              <th>{dictionary.common.note}</th>
              <th>Qty</th>
              <th>{dictionary.common.actions}</th>
            </tr>
          </thead>
          <tbody>
            {validRequests.map((req) => (
              <tr key={req.id}>
                <td>
                  <code style={{ fontSize: "0.8em" }}>{req.id}</code>
                </td>
                <td>
                  <span className={styles.badge}>{req.status}</span>
                </td>
                <td>{req.desiredItem ?? "—"}</td>
                <td>{req.quantity ?? "—"}</td>
                <td>
                  <SourcingRequestStatusForm
                    common={dictionary.common}
                    currentStatus={req.status}
                    locale={locale}
                    notify={dictionary.notify}
                    requestId={req.id}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
