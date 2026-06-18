import type { Metadata } from "next";
import { AdminActionForm } from "@/components/admin/AdminActionForm";
import { getAdminDictionary } from "@/dictionaries/admin";
import { getAdminSession, resolveAdminLocale } from "@/lib/admin/auth";
import { moneyToMajorString } from "@/lib/format";
import { nextPaymentStatuses } from "@/lib/commerce/paymentStatus";
import { canAny } from "@/lib/commerce/rbac";
import { getLocaleFromParams, type LocaleParams } from "@/lib/params";
import { getPaymentService } from "@/repositories";
import type { Money } from "@/types/commerce";
import {
  changePaymentStatusAction,
  createPaymentAction,
  recordReceiptAction,
} from "./actions";
import styles from "@/components/admin/Admin.module.css";

export const dynamic = "force-dynamic";

function money(m?: Money): string {
  if (!m) return "-";
  return `${m.currency} ${moneyToMajorString(m)}`;
}

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const locale = await getLocaleFromParams(params);
  const session = await getAdminSession();
  const d = getAdminDictionary(resolveAdminLocale(locale, session));
  return { title: `${d.payments.title} | KAMISUMI Admin` };
}

const CURRENCY_OPTIONS = [
  { value: "TWD", label: "TWD" },
  { value: "JPY", label: "JPY" },
  { value: "USD", label: "USD" },
];

export default async function AdminPaymentsPage({ params }: LocaleParams) {
  const locale = await getLocaleFromParams(params);
  const session = await getAdminSession();
  const d = getAdminDictionary(resolveAdminLocale(locale, session));

  if (!session || !canAny(session.role, ["purchase:manage"])) {
    return (
      <>
        <h1>{d.payments.title}</h1>
        <p className="muted">{d.common.noPermission}</p>
      </>
    );
  }

  const actor = { userId: session.userId, role: session.role };
  const payments = await getPaymentService().listPayments(actor);

  return (
    <>
      <h1>{d.payments.title}</h1>
      <p className="muted">{d.payments.intro}</p>

      <section className={styles.panel} style={{ marginTop: "12px" }}>
        <h2>{d.common.create}</h2>
        <AdminActionForm
          action={createPaymentAction}
          fields={[
            { kind: "hidden", name: "locale", value: locale },
            { kind: "text", name: "orderId", label: d.payments.orderId },
            { kind: "select", name: "currency", label: "currency", defaultValue: "TWD", options: CURRENCY_OPTIONS },
            { kind: "number", name: "expectedAmount", label: d.payments.expectedAmount },
            { kind: "text", name: "paymentType", label: d.payments.paymentType },
          ]}
          layout="stack"
          notify={d.notify}
          submitLabel={d.common.create}
        />
        <p className="muted">{d.payments.noBankNote}</p>
      </section>

      <p className="muted" style={{ marginTop: "12px" }}>
        {payments.length}
      </p>
      {payments.length === 0 ? (
        <p className="muted">{d.payments.empty}</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{d.payments.orderId}</th>
              <th>{d.common.status}</th>
              <th>{d.payments.expectedAmount}</th>
              <th>{d.payments.paidAmount}</th>
              <th>{d.common.actions}</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id}>
                <td className="muted">{p.orderId ?? "-"}</td>
                <td>
                  <span className={styles.badge}>{p.status}</span>
                </td>
                <td>{money(p.expectedAmount)}</td>
                <td>{money(p.amount)}</td>
                <td>
                  <div style={{ display: "grid", gap: "6px" }}>
                    {nextPaymentStatuses(p.status).length > 0 ? (
                      <AdminActionForm
                        action={changePaymentStatusAction}
                        confirmText={d.common.confirm}
                        fields={[
                          { kind: "hidden", name: "locale", value: locale },
                          { kind: "hidden", name: "paymentId", value: p.id },
                          {
                            kind: "select",
                            name: "toStatus",
                            label: d.common.status,
                            options: nextPaymentStatuses(p.status).map((s) => ({ value: s, label: s })),
                          },
                        ]}
                        notify={d.notify}
                        submitLabel={d.common.apply}
                      />
                    ) : null}
                    <AdminActionForm
                      action={recordReceiptAction}
                      fields={[
                        { kind: "hidden", name: "locale", value: locale },
                        { kind: "hidden", name: "paymentId", value: p.id },
                        { kind: "hidden", name: "currency", value: p.currency },
                        { kind: "number", name: "amount", label: d.payments.paidAmount, required: true },
                        { kind: "text", name: "matchingNumber", label: d.payments.matchingNumber },
                      ]}
                      notify={d.notify}
                      submitLabel={d.payments.recordReceipt}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
