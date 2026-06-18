import type { Metadata } from "next";
import Link from "next/link";
import { AdminActionForm } from "@/components/admin/AdminActionForm";
import { getAdminDictionary } from "@/dictionaries/admin";
import { getAdminSession, resolveAdminLocale } from "@/lib/admin/auth";
import { canAny } from "@/lib/commerce/rbac";
import { getLocaleFromParams, type LocaleParams } from "@/lib/params";
import { localizePath } from "@/lib/routes";
import { getProcurementService } from "@/repositories";
import { SUPPLIER_PUBLIC_LEVELS } from "@/repositories/core/procurementModels";
import {
  changeSupplierLevelAction,
  createSupplierAction,
  deleteSupplierAction,
  restoreSupplierAction,
} from "./actions";
import styles from "@/components/admin/Admin.module.css";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const locale = await getLocaleFromParams(params);
  const session = await getAdminSession();
  const d = getAdminDictionary(resolveAdminLocale(locale, session));
  return { title: `${d.suppliers.title} | KAMISUMI Admin` };
}

export default async function AdminSuppliersPage({ params }: LocaleParams) {
  const locale = await getLocaleFromParams(params);
  const session = await getAdminSession();
  const d = getAdminDictionary(resolveAdminLocale(locale, session));

  if (!session || !canAny(session.role, ["purchase:manage"])) {
    return (
      <>
        <h1>{d.suppliers.title}</h1>
        <p className="muted">{d.common.noPermission}</p>
      </>
    );
  }

  const actor = { userId: session.userId, role: session.role };
  const suppliers = await getProcurementService().listSuppliers(actor, { includeDeleted: true });

  const levelOptions = SUPPLIER_PUBLIC_LEVELS.map((lv) => ({
    value: lv,
    label: d.suppliers.levels[lv],
  }));

  return (
    <>
      <h1>{d.suppliers.title}</h1>
      <p className="muted">{d.suppliers.intro}</p>
      <p>
        <Link href={localizePath(locale, "/admin/purchases")}>{d.purchases.toPurchases}</Link>
      </p>

      <section className={styles.panel} style={{ marginTop: "12px" }}>
        <h2>{d.common.create}</h2>
        <AdminActionForm
          action={createSupplierAction}
          fields={[
            { kind: "hidden", name: "locale", value: locale },
            { kind: "text", name: "name", label: d.suppliers.name, required: true },
            { kind: "text", name: "region", label: d.suppliers.region },
            { kind: "text", name: "countryCode", label: d.suppliers.country },
            {
              kind: "select",
              name: "publicLevel",
              label: d.suppliers.publicLevel,
              defaultValue: "private",
              options: levelOptions,
            },
            { kind: "text", name: "contact", label: d.suppliers.contact },
            { kind: "text", name: "note", label: d.suppliers.note },
          ]}
          layout="stack"
          notify={d.notify}
          submitLabel={d.common.create}
        />
        <p className="muted">{d.suppliers.confidentialNote}</p>
      </section>

      <p className="muted" style={{ marginTop: "12px" }}>
        {suppliers.length}
      </p>
      {suppliers.length === 0 ? (
        <p className="muted">{d.suppliers.empty}</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{d.suppliers.name}</th>
              <th>{d.suppliers.region}</th>
              <th>{d.suppliers.publicLevel}</th>
              <th>{d.common.actions}</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((s) => (
              <tr key={s.id} style={s.deletedAt ? { opacity: 0.5 } : undefined}>
                <td>{s.name}</td>
                <td>{s.region ?? "-"}</td>
                <td>
                  <AdminActionForm
                    action={changeSupplierLevelAction}
                    fields={[
                      { kind: "hidden", name: "locale", value: locale },
                      { kind: "hidden", name: "supplierId", value: s.id },
                      {
                        kind: "select",
                        name: "publicLevel",
                        label: d.suppliers.publicLevel,
                        defaultValue: s.publicLevel,
                        options: levelOptions,
                      },
                    ]}
                    notify={d.notify}
                    submitLabel={d.common.apply}
                  />
                </td>
                <td>
                  {s.deletedAt ? (
                    <AdminActionForm
                      action={restoreSupplierAction}
                      fields={[
                        { kind: "hidden", name: "locale", value: locale },
                        { kind: "hidden", name: "supplierId", value: s.id },
                      ]}
                      notify={d.notify}
                      submitLabel={d.common.restore}
                    />
                  ) : (
                    <AdminActionForm
                      action={deleteSupplierAction}
                      confirmText={d.common.confirm}
                      fields={[
                        { kind: "hidden", name: "locale", value: locale },
                        { kind: "hidden", name: "supplierId", value: s.id },
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
