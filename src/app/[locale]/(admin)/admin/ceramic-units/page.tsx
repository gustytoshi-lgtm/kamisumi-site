import type { Metadata } from "next";
import { AdminActionForm } from "@/components/admin/AdminActionForm";
import { getAdminDictionary } from "@/dictionaries/admin";
import { getAdminSession, resolveAdminLocale } from "@/lib/admin/auth";
import { moneyToMajorString } from "@/lib/format";
import { CERAMIC_UNIT_STATUSES } from "@/repositories/core/ceramicUnitModels";
import { canAny, can } from "@/lib/commerce/rbac";
import { getLocaleFromParams, type LocaleParams } from "@/lib/params";
import { getCeramicUnitService } from "@/repositories";
import { createCeramicUnitAction, deleteCeramicUnitAction, setCeramicUnitStatusAction } from "./actions";
import styles from "@/components/admin/Admin.module.css";

export const dynamic = "force-dynamic";

const CURRENCY_OPTIONS = [
  { value: "TWD", label: "TWD" },
  { value: "JPY", label: "JPY" },
  { value: "USD", label: "USD" },
];

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const locale = await getLocaleFromParams(params);
  const session = await getAdminSession();
  const d = getAdminDictionary(resolveAdminLocale(locale, session));
  return { title: `${d.ceramicUnits.title} | KAMISUMI Admin` };
}

export default async function AdminCeramicUnitsPage({ params }: LocaleParams) {
  const locale = await getLocaleFromParams(params);
  const session = await getAdminSession();
  const d = getAdminDictionary(resolveAdminLocale(locale, session));

  if (!session || !canAny(session.role, ["inventory:view_public", "inventory:manage"])) {
    return (
      <>
        <h1>{d.ceramicUnits.title}</h1>
        <p className="muted">{d.common.noPermission}</p>
      </>
    );
  }

  const actor = { userId: session.userId, role: session.role };
  const canManage = canAny(session.role, ["inventory:manage"]);
  const showCost = can(session.role, "cost:view");
  const units = await getCeramicUnitService().listUnits(actor);
  const statusOptions = CERAMIC_UNIT_STATUSES.map((s) => ({ value: s, label: d.ceramicUnits.statuses[s] }));

  return (
    <>
      <h1>{d.ceramicUnits.title}</h1>
      <p className="muted">{d.ceramicUnits.intro}</p>

      {canManage && (
        <section className={styles.panel} style={{ marginTop: "12px" }}>
          <h2>{d.common.create}</h2>
          <AdminActionForm
            action={createCeramicUnitAction}
            fields={[
              { kind: "hidden", name: "locale", value: locale },
              { kind: "text", name: "productId", label: d.ceramicUnits.productId, required: true },
              { kind: "text", name: "unitCode", label: d.ceramicUnits.unitCode, required: true },
              { kind: "text", name: "dimensions", label: d.ceramicUnits.dimensions },
              { kind: "text", name: "glaze", label: d.ceramicUnits.glaze },
              { kind: "text", name: "condition", label: d.ceramicUnits.condition },
              { kind: "text", name: "inspectionResult", label: d.ceramicUnits.inspection },
              ...(showCost
                ? ([
                    { kind: "select", name: "costCurrency", label: "currency", defaultValue: "TWD", options: CURRENCY_OPTIONS },
                    { kind: "number", name: "cost", label: d.ceramicUnits.cost },
                  ] as const)
                : []),
            ]}
            layout="stack"
            notify={d.notify}
            submitLabel={d.common.create}
          />
        </section>
      )}

      <p className="muted" style={{ marginTop: "12px" }}>
        {units.length}
      </p>
      {units.length === 0 ? (
        <p className="muted">{d.ceramicUnits.empty}</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{d.ceramicUnits.unitCode}</th>
              <th>{d.ceramicUnits.productId}</th>
              <th>{d.ceramicUnits.status}</th>
              <th>{d.ceramicUnits.cost}</th>
              {canManage && <th>{d.common.actions}</th>}
            </tr>
          </thead>
          <tbody>
            {units.map((u) => (
              <tr key={u.id} style={u.deletedAt ? { opacity: 0.5 } : undefined}>
                <td>{u.unitCode}</td>
                <td className="muted">{u.productId}</td>
                <td>
                  <span className={styles.badge}>{d.ceramicUnits.statuses[u.status]}</span>
                </td>
                <td>
                  {showCost ? (u.cost ? `${u.cost.currency} ${moneyToMajorString(u.cost)}` : "-") : (
                    <span className="muted">{d.ceramicUnits.costHidden}</span>
                  )}
                </td>
                {canManage && (
                  <td>
                    <div style={{ display: "grid", gap: "6px" }}>
                      <AdminActionForm
                        action={setCeramicUnitStatusAction}
                        fields={[
                          { kind: "hidden", name: "locale", value: locale },
                          { kind: "hidden", name: "unitId", value: u.id },
                          { kind: "select", name: "status", label: d.ceramicUnits.status, defaultValue: u.status, options: statusOptions },
                        ]}
                        notify={d.notify}
                        submitLabel={d.common.apply}
                      />
                      <AdminActionForm
                        action={deleteCeramicUnitAction}
                        confirmText={d.common.confirm}
                        fields={[
                          { kind: "hidden", name: "locale", value: locale },
                          { kind: "hidden", name: "unitId", value: u.id },
                        ]}
                        notify={d.notify}
                        submitLabel={d.common.delete}
                      />
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
