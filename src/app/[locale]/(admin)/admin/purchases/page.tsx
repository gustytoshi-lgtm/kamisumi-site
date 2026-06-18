import type { Metadata } from "next";
import Link from "next/link";
import { AdminActionForm } from "@/components/admin/AdminActionForm";
import { getAdminDictionary } from "@/dictionaries/admin";
import { getAdminSession, resolveAdminLocale } from "@/lib/admin/auth";
import { moneyToMajorString } from "@/lib/format";
import { canAny } from "@/lib/commerce/rbac";
import { getLocaleFromParams, type LocaleParams } from "@/lib/params";
import { localizePath } from "@/lib/routes";
import { getProcurementService } from "@/repositories";
import { purchaseAncillaryTotalMinor } from "@/repositories/core/procurementModels";
import {
  allocatePurchaseCostsAction,
  createPurchaseAction,
  deletePurchaseAction,
  restorePurchaseAction,
} from "./actions";
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
  return { title: `${d.purchases.title} | KAMISUMI Admin` };
}

export default async function AdminPurchasesPage({ params }: LocaleParams) {
  const locale = await getLocaleFromParams(params);
  const session = await getAdminSession();
  const d = getAdminDictionary(resolveAdminLocale(locale, session));

  if (!session || !canAny(session.role, ["purchase:manage"])) {
    return (
      <>
        <h1>{d.purchases.title}</h1>
        <p className="muted">{d.common.noPermission}</p>
      </>
    );
  }

  const actor = { userId: session.userId, role: session.role };
  const purchases = await getProcurementService().listPurchases(actor, { includeDeleted: true });
  const methodOptions = (["quantity", "purchase_value", "none"] as const).map((m) => ({
    value: m,
    label: d.purchases.methods[m],
  }));

  return (
    <>
      <h1>{d.purchases.title}</h1>
      <p className="muted">{d.purchases.intro}</p>
      <p>
        <Link href={localizePath(locale, "/admin/suppliers")}>{d.purchases.toSuppliers}</Link>
      </p>

      <section className={styles.panel} style={{ marginTop: "12px" }}>
        <h2>{d.common.create}</h2>
        <AdminActionForm
          action={createPurchaseAction}
          fields={[
            { kind: "hidden", name: "locale", value: locale },
            { kind: "text", name: "purchasedOn", label: d.purchases.purchasedOn, required: true, placeholder: "YYYY-MM-DD" },
            { kind: "select", name: "currency", label: "currency", defaultValue: "JPY", options: CURRENCY_OPTIONS },
            { kind: "text", name: "supplierId", label: d.purchases.supplier },
            { kind: "number", name: "domesticShipping", label: d.purchases.domesticShipping },
            { kind: "number", name: "transport", label: d.purchases.transport },
            { kind: "number", name: "otherExpense", label: d.purchases.otherExpense },
            { kind: "text", name: "itemDescription", label: d.purchases.itemDescription },
            { kind: "number", name: "itemQuantity", label: d.purchases.itemQuantity },
            { kind: "number", name: "itemUnitPrice", label: d.purchases.itemUnitPrice },
          ]}
          layout="stack"
          notify={d.notify}
          submitLabel={d.common.create}
        />
      </section>

      <p className="muted" style={{ marginTop: "12px" }}>
        {purchases.length}
      </p>
      {purchases.length === 0 ? (
        <p className="muted">{d.purchases.empty}</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{d.purchases.purchasedOn}</th>
              <th>{d.purchases.items}</th>
              <th>{d.purchases.ancillaryTotal}</th>
              <th>{d.purchases.allocations}</th>
              <th>{d.purchases.allocate}</th>
              <th>{d.common.actions}</th>
            </tr>
          </thead>
          <tbody>
            {purchases.map((p) => (
              <tr key={p.id} style={p.deletedAt ? { opacity: 0.5 } : undefined}>
                <td>
                  {p.purchasedOn} <span className="muted">{p.currency}</span>
                </td>
                <td>{p.items.length}</td>
                <td>
                  {p.currency}{" "}
                  {moneyToMajorString({
                    currency: p.currency,
                    amountMinor: purchaseAncillaryTotalMinor(p),
                  })}
                </td>
                <td>{p.allocations.length}</td>
                <td>
                  <AdminActionForm
                    action={allocatePurchaseCostsAction}
                    fields={[
                      { kind: "hidden", name: "locale", value: locale },
                      { kind: "hidden", name: "purchaseId", value: p.id },
                      { kind: "select", name: "method", label: d.purchases.method, options: methodOptions },
                    ]}
                    notify={d.notify}
                    submitLabel={d.purchases.allocate}
                  />
                </td>
                <td>
                  {p.deletedAt ? (
                    <AdminActionForm
                      action={restorePurchaseAction}
                      fields={[
                        { kind: "hidden", name: "locale", value: locale },
                        { kind: "hidden", name: "purchaseId", value: p.id },
                      ]}
                      notify={d.notify}
                      submitLabel={d.common.restore}
                    />
                  ) : (
                    <AdminActionForm
                      action={deletePurchaseAction}
                      confirmText={d.common.confirm}
                      fields={[
                        { kind: "hidden", name: "locale", value: locale },
                        { kind: "hidden", name: "purchaseId", value: p.id },
                      ]}
                      notify={d.notify}
                      submitLabel={d.common.delete}
                    />
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
