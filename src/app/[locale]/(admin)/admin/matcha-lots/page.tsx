import type { Metadata } from "next";
import { AdminActionForm } from "@/components/admin/AdminActionForm";
import { getAdminDictionary } from "@/dictionaries/admin";
import { getAdminSession, resolveAdminLocale } from "@/lib/admin/auth";
import { availableCount, bestBeforeAlert } from "@/lib/commerce/matchaLot";
import { canAny } from "@/lib/commerce/rbac";
import { getLocaleFromParams, type LocaleParams } from "@/lib/params";
import { getMatchaLotService } from "@/repositories";
import { toMatchaLot } from "@/repositories/core/matchaLotModels";
import { createMatchaLotAction, adjustMatchaLotAction, deleteMatchaLotAction } from "./actions";
import styles from "@/components/admin/Admin.module.css";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const locale = await getLocaleFromParams(params);
  const session = await getAdminSession();
  const d = getAdminDictionary(resolveAdminLocale(locale, session));
  return { title: `${d.matchaLots.title} | KAMISUMI Admin` };
}

export default async function AdminMatchaLotsPage({ params }: LocaleParams) {
  const locale = await getLocaleFromParams(params);
  const session = await getAdminSession();
  const d = getAdminDictionary(resolveAdminLocale(locale, session));

  if (!session || !canAny(session.role, ["inventory:view_public", "inventory:manage"])) {
    return (
      <>
        <h1>{d.matchaLots.title}</h1>
        <p className="muted">{d.common.noPermission}</p>
      </>
    );
  }

  const canManage = canAny(session.role, ["inventory:manage"]);
  const actor = { userId: session.userId, role: session.role };
  const lots = await getMatchaLotService().listLots(actor);
  const today = new Date().toISOString().slice(0, 10);

  function alertView(bestBefore?: string) {
    if (!bestBefore) return <span className="muted">-</span>;
    const a = bestBeforeAlert(bestBefore, today);
    const map = {
      expired: { color: "#a4443c", label: d.matchaLots.alertExpired },
      approaching: { color: "#a58a55", label: d.matchaLots.alertApproaching },
      ok: { color: "#44513b", label: d.matchaLots.alertOk },
    } as const;
    const v = map[a.kind];
    return (
      <span style={{ background: v.color, color: "#fffdf8", borderRadius: "4px", padding: "1px 8px", fontSize: "0.78rem" }}>
        {v.label}（{a.daysUntil}d）
      </span>
    );
  }

  return (
    <>
      <h1>{d.matchaLots.title}</h1>
      <p className="muted">{d.matchaLots.intro}</p>

      {canManage && (
        <section className={styles.panel} style={{ marginTop: "12px" }}>
          <h2>{d.common.create}</h2>
          <AdminActionForm
            action={createMatchaLotAction}
            fields={[
              { kind: "hidden", name: "locale", value: locale },
              { kind: "text", name: "productId", label: d.matchaLots.productId, required: true },
              { kind: "text", name: "lotCode", label: d.matchaLots.lotCode },
              { kind: "text", name: "teaHouse", label: d.matchaLots.teaHouse },
              { kind: "text", name: "bestBefore", label: d.matchaLots.bestBefore, placeholder: "YYYY-MM-DD" },
              { kind: "text", name: "purchasedOn", label: d.matchaLots.purchasedOn, placeholder: "YYYY-MM-DD" },
              { kind: "text", name: "storageLocation", label: d.matchaLots.storageLocation },
              { kind: "number", name: "quantity", label: d.matchaLots.quantity },
            ]}
            layout="stack"
            notify={d.notify}
            submitLabel={d.common.create}
          />
        </section>
      )}

      <p className="muted" style={{ marginTop: "12px" }}>
        {lots.length}
      </p>
      {lots.length === 0 ? (
        <p className="muted">{d.matchaLots.empty}</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{d.matchaLots.lotCode}</th>
              <th>{d.matchaLots.productId}</th>
              <th>{d.matchaLots.quantity}</th>
              <th>{d.matchaLots.available}</th>
              <th>{d.matchaLots.bestBefore}</th>
              {canManage && <th>{d.common.actions}</th>}
            </tr>
          </thead>
          <tbody>
            {lots.map((lot) => (
              <tr key={lot.id}>
                <td>{lot.lotCode ?? "-"}</td>
                <td className="muted">{lot.productId}</td>
                <td>{lot.quantity}</td>
                <td>{availableCount(toMatchaLot(lot))}</td>
                <td>
                  {lot.bestBefore ?? "-"} {alertView(lot.bestBefore)}
                </td>
                {canManage && (
                  <td>
                    <div style={{ display: "grid", gap: "6px" }}>
                      <AdminActionForm
                        action={adjustMatchaLotAction}
                        fields={[
                          { kind: "hidden", name: "locale", value: locale },
                          { kind: "hidden", name: "lotId", value: lot.id },
                          { kind: "number", name: "delta", label: d.matchaLots.delta, required: true },
                        ]}
                        notify={d.notify}
                        submitLabel={d.matchaLots.adjust}
                      />
                      <AdminActionForm
                        action={deleteMatchaLotAction}
                        confirmText={d.common.confirm}
                        fields={[
                          { kind: "hidden", name: "locale", value: locale },
                          { kind: "hidden", name: "lotId", value: lot.id },
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
