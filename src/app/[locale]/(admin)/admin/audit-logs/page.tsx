import type { Metadata } from "next";
import { getAdminDictionary } from "@/dictionaries/admin";
import { getAdminSession, resolveAdminLocale } from "@/lib/admin/auth";
import { canAny } from "@/lib/commerce/rbac";
import {
  auditFilterFacets,
  filterAuditEntries,
  hasActiveAuditFilter,
  sortAuditEntriesDesc,
  type AuditLogFilter,
} from "@/lib/commerce/auditLog";
import { getLocaleFromParams, type LocaleParams } from "@/lib/params";
import { collectAuditLogs } from "@/repositories";
import styles from "@/components/admin/Admin.module.css";

export const dynamic = "force-dynamic";

type AuditLogsSearchParams = {
  actor?: string;
  action?: string;
  entityType?: string;
  q?: string;
  from?: string;
  to?: string;
};

type AuditLogsPageProps = LocaleParams & {
  searchParams?: Promise<AuditLogsSearchParams>;
};

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const locale = await getLocaleFromParams(params);
  const session = await getAdminSession();
  const d = getAdminDictionary(resolveAdminLocale(locale, session));
  return { title: `${d.auditLog.title} | KAMISUMI Admin` };
}

const labelStyle: React.CSSProperties = { fontSize: "0.8rem", color: "#615d53" };
const fieldStyle: React.CSSProperties = { display: "grid", gap: "2px" };

export default async function AdminAuditLogsPage({ params, searchParams }: AuditLogsPageProps) {
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

  const query = (await searchParams) ?? {};
  const filter: AuditLogFilter = {
    actor: query.actor,
    action: query.action,
    entityType: query.entityType,
    query: query.q,
    from: query.from,
    to: query.to,
  };

  const all = sortAuditEntriesDesc(await collectAuditLogs());
  const facets = auditFilterFacets(all);
  const filtered = filterAuditEntries(all, filter);
  const recent = filtered.slice(0, 200);
  const isFiltered = hasActiveAuditFilter(filter);

  return (
    <>
      <h1>{d.auditLog.title}</h1>
      <p className="muted">{d.auditLog.intro}</p>

      <form
        method="get"
        style={{ display: "flex", gap: "8px", alignItems: "end", flexWrap: "wrap", margin: "12px 0" }}
      >
        <label style={fieldStyle}>
          <span style={labelStyle}>{d.auditLog.actor}</span>
          <select defaultValue={query.actor ?? ""} name="actor">
            <option value="">{d.auditLog.all}</option>
            {facets.actors.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        <label style={fieldStyle}>
          <span style={labelStyle}>{d.auditLog.action}</span>
          <select defaultValue={query.action ?? ""} name="action">
            <option value="">{d.auditLog.all}</option>
            {facets.actions.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        <label style={fieldStyle}>
          <span style={labelStyle}>{d.auditLog.entity}</span>
          <select defaultValue={query.entityType ?? ""} name="entityType">
            <option value="">{d.auditLog.all}</option>
            {facets.entityTypes.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        <label style={fieldStyle}>
          <span style={labelStyle}>{d.auditLog.queryLabel}</span>
          <input
            defaultValue={query.q ?? ""}
            name="q"
            placeholder={d.auditLog.queryPlaceholder}
            type="search"
          />
        </label>

        <label style={fieldStyle}>
          <span style={labelStyle}>{d.auditLog.from}</span>
          <input defaultValue={query.from ?? ""} name="from" type="date" />
        </label>

        <label style={fieldStyle}>
          <span style={labelStyle}>{d.auditLog.to}</span>
          <input defaultValue={query.to ?? ""} name="to" type="date" />
        </label>

        <button type="submit">{d.auditLog.apply}</button>
        <a className="muted" href={`/${locale}/admin/audit-logs`}>
          {d.auditLog.reset}
        </a>
      </form>

      <p className="muted">
        {d.auditLog.showing}: {filtered.length} / {all.length}
      </p>

      {recent.length === 0 ? (
        <p className="muted">{isFiltered ? d.auditLog.noMatch : d.auditLog.empty}</p>
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
            {recent.map((log, index) => (
              <tr key={`${log.id}-${index}`}>
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
