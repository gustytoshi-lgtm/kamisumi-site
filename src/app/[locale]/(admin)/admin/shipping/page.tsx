import type { Metadata } from "next";
import { AdminActionForm } from "@/components/admin/AdminActionForm";
import { getAdminDictionary } from "@/dictionaries/admin";
import { getAdminSession, resolveAdminLocale } from "@/lib/admin/auth";
import { moneyToMajorString } from "@/lib/format";
import { nextShipmentStatuses } from "@/lib/commerce/shipmentStatus";
import { canAny } from "@/lib/commerce/rbac";
import { getLocaleFromParams, type LocaleParams } from "@/lib/params";
import { getFulfillmentService } from "@/repositories";
import type { Money } from "@/types/commerce";
import { changeShipmentStatusAction, createShipmentAction } from "./actions";
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
  return { title: `${d.shipments.title} | KAMISUMI Admin` };
}

const CURRENCY_OPTIONS = [
  { value: "TWD", label: "TWD" },
  { value: "JPY", label: "JPY" },
  { value: "USD", label: "USD" },
];

export default async function AdminShippingPage({ params }: LocaleParams) {
  const locale = await getLocaleFromParams(params);
  const session = await getAdminSession();
  const d = getAdminDictionary(resolveAdminLocale(locale, session));

  if (!session || !canAny(session.role, ["order:update_status"])) {
    return (
      <>
        <h1>{d.shipments.title}</h1>
        <p className="muted">{d.common.noPermission}</p>
      </>
    );
  }

  const actor = { userId: session.userId, role: session.role };
  const shipments = await getFulfillmentService().listShipments(actor);

  return (
    <>
      <h1>{d.shipments.title}</h1>
      <p className="muted">{d.shipments.intro}</p>

      <section className={styles.panel} style={{ marginTop: "12px" }}>
        <h2>{d.common.create}</h2>
        <AdminActionForm
          action={createShipmentAction}
          fields={[
            { kind: "hidden", name: "locale", value: locale },
            { kind: "text", name: "orderId", label: d.shipments.orderId },
            { kind: "text", name: "carrier", label: d.shipments.carrier },
            { kind: "text", name: "method", label: d.shipments.method },
            { kind: "text", name: "trackingNumber", label: d.shipments.tracking },
            { kind: "select", name: "costCurrency", label: "currency", defaultValue: "TWD", options: CURRENCY_OPTIONS },
            { kind: "number", name: "actualCost", label: d.shipments.actualCost },
            { kind: "number", name: "chargedCost", label: d.shipments.chargedCost },
          ]}
          layout="stack"
          notify={d.notify}
          submitLabel={d.common.create}
        />
      </section>

      <p className="muted" style={{ marginTop: "12px" }}>
        {shipments.length}
      </p>
      {shipments.length === 0 ? (
        <p className="muted">{d.shipments.empty}</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{d.shipments.orderId}</th>
              <th>{d.shipments.carrier}</th>
              <th>{d.common.status}</th>
              <th>{d.shipments.tracking}</th>
              <th>{d.shipments.actualCost} / {d.shipments.chargedCost}</th>
              <th>{d.common.actions}</th>
            </tr>
          </thead>
          <tbody>
            {shipments.map((s) => (
              <tr key={s.id}>
                <td className="muted">{s.orderId ?? "-"}</td>
                <td>{s.carrier ?? "-"}</td>
                <td>
                  <span className={styles.badge}>{s.status}</span>
                </td>
                <td className="muted">{s.trackingNumber ?? "-"}</td>
                <td className="muted">
                  {money(s.actualCost)} / {money(s.chargedCost)}
                </td>
                <td>
                  {nextShipmentStatuses(s.status).length > 0 ? (
                    <AdminActionForm
                      action={changeShipmentStatusAction}
                      confirmText={d.common.confirm}
                      fields={[
                        { kind: "hidden", name: "locale", value: locale },
                        { kind: "hidden", name: "shipmentId", value: s.id },
                        {
                          kind: "select",
                          name: "toStatus",
                          label: d.common.status,
                          options: nextShipmentStatuses(s.status).map((x) => ({ value: x, label: x })),
                        },
                      ]}
                      notify={d.notify}
                      submitLabel={d.common.apply}
                    />
                  ) : (
                    <span className="muted">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
