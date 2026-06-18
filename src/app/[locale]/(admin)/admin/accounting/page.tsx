import type { Metadata } from "next";
import { AdminActionForm } from "@/components/admin/AdminActionForm";
import { getAdminDictionary } from "@/dictionaries/admin";
import { getAdminSession, resolveAdminLocale } from "@/lib/admin/auth";
import { buildAccountingEntries } from "@/lib/commerce/accountingExportService";
import { canAny } from "@/lib/commerce/rbac";
import { getLocaleFromParams, type LocaleParams } from "@/lib/params";
import {
  getAccountingExportService,
  getExpenseService,
  getPaymentService,
} from "@/repositories";
import { runAccountingExportAction } from "./actions";
import styles from "@/components/admin/Admin.module.css";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const locale = await getLocaleFromParams(params);
  const session = await getAdminSession();
  const d = getAdminDictionary(resolveAdminLocale(locale, session));
  return { title: `${d.accounting.title} | KAMISUMI Admin` };
}

export default async function AdminAccountingPage({ params }: LocaleParams) {
  const locale = await getLocaleFromParams(params);
  const session = await getAdminSession();
  const d = getAdminDictionary(resolveAdminLocale(locale, session));

  if (!session || !canAny(session.role, ["purchase:manage"])) {
    return (
      <>
        <h1>{d.accounting.title}</h1>
        <p className="muted">{d.common.noPermission}</p>
      </>
    );
  }

  const actor = { userId: session.userId, role: session.role };
  const [expenses, payments, exports] = await Promise.all([
    getExpenseService().listExpenses(actor),
    getPaymentService().listPayments(actor),
    getAccountingExportService().listExports(actor),
  ]);
  const pendingEntries = buildAccountingEntries({ expenses, payments }).length;

  return (
    <>
      <h1>{d.accounting.title}</h1>
      <p className="muted">{d.accounting.intro}</p>
      <p>
        {d.accounting.pendingEntries}: <strong>{pendingEntries}</strong>
      </p>

      <section className={styles.panel} style={{ marginTop: "12px" }}>
        <AdminActionForm
          action={runAccountingExportAction}
          confirmText={d.common.confirm}
          fields={[
            { kind: "hidden", name: "locale", value: locale },
            { kind: "text", name: "idempotencyKey", label: d.accounting.idempotencyKey, required: true, placeholder: "2026-06" },
          ]}
          notify={d.notify}
          submitLabel={d.accounting.runExport}
        />
      </section>

      <p className="muted" style={{ marginTop: "12px" }}>
        {exports.length}
      </p>
      {exports.length === 0 ? (
        <p className="muted">{d.accounting.empty}</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{d.accounting.idempotencyKey}</th>
              <th>{d.accounting.status}</th>
              <th>{d.accounting.entryCount}</th>
              <th>{d.accounting.exportedAt}</th>
            </tr>
          </thead>
          <tbody>
            {exports.map((e) => (
              <tr key={e.idempotencyKey}>
                <td>{e.idempotencyKey}</td>
                <td>
                  <span className={styles.badge}>{e.status}</span>
                </td>
                <td>{e.entryCount}</td>
                <td className="muted">{e.exportedAt.slice(0, 19).replace("T", " ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p className="muted" style={{ marginTop: "12px" }}>
        {d.accounting.boundaryNote}
      </p>
    </>
  );
}
