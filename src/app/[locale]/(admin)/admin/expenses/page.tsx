import type { Metadata } from "next";
import { AdminActionForm } from "@/components/admin/AdminActionForm";
import { getAdminDictionary } from "@/dictionaries/admin";
import { getAdminSession, resolveAdminLocale } from "@/lib/admin/auth";
import { moneyToMajorString } from "@/lib/format";
import { EXPENSE_CATEGORIES, sumExpensesMinor } from "@/repositories/core/expenseModels";
import { canAny } from "@/lib/commerce/rbac";
import { getLocaleFromParams, type LocaleParams } from "@/lib/params";
import { getExpenseService } from "@/repositories";
import { createExpenseAction, deleteExpenseAction } from "./actions";
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
  return { title: `${d.expenses.title} | KAMISUMI Admin` };
}

export default async function AdminExpensesPage({ params }: LocaleParams) {
  const locale = await getLocaleFromParams(params);
  const session = await getAdminSession();
  const d = getAdminDictionary(resolveAdminLocale(locale, session));

  if (!session || !canAny(session.role, ["purchase:manage"])) {
    return (
      <>
        <h1>{d.expenses.title}</h1>
        <p className="muted">{d.common.noPermission}</p>
      </>
    );
  }

  const actor = { userId: session.userId, role: session.role };
  const expenses = await getExpenseService().listExpenses(actor);
  const totalTwd = sumExpensesMinor(expenses, "TWD");
  const categoryOptions = EXPENSE_CATEGORIES.map((c) => ({ value: c, label: d.expenses.categories[c] }));

  return (
    <>
      <h1>{d.expenses.title}</h1>
      <p className="muted">{d.expenses.intro}</p>

      <section className={styles.panel} style={{ marginTop: "12px" }}>
        <h2>{d.common.create}</h2>
        <AdminActionForm
          action={createExpenseAction}
          fields={[
            { kind: "hidden", name: "locale", value: locale },
            { kind: "text", name: "expenseDate", label: d.expenses.date, required: true, placeholder: "YYYY-MM-DD" },
            { kind: "select", name: "category", label: d.expenses.category, options: categoryOptions },
            { kind: "select", name: "currency", label: "currency", defaultValue: "TWD", options: CURRENCY_OPTIONS },
            { kind: "number", name: "amount", label: d.expenses.amount, required: true },
            { kind: "text", name: "note", label: d.expenses.note },
          ]}
          layout="stack"
          notify={d.notify}
          submitLabel={d.common.create}
        />
      </section>

      <p style={{ marginTop: "12px" }}>
        {d.expenses.total}: <strong>TWD {moneyToMajorString({ currency: "TWD", amountMinor: totalTwd })}</strong>
        <span className="muted"> / {expenses.length}</span>
      </p>
      {expenses.length === 0 ? (
        <p className="muted">{d.expenses.empty}</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{d.expenses.date}</th>
              <th>{d.expenses.category}</th>
              <th>{d.expenses.amount}</th>
              <th>{d.expenses.note}</th>
              <th>{d.common.actions}</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((e) => (
              <tr key={e.id}>
                <td>{e.expenseDate}</td>
                <td>{d.expenses.categories[e.category]}</td>
                <td>
                  {e.amount.currency} {moneyToMajorString(e.amount)}
                </td>
                <td className="muted">{e.note ?? "-"}</td>
                <td>
                  <AdminActionForm
                    action={deleteExpenseAction}
                    confirmText={d.common.confirm}
                    fields={[
                      { kind: "hidden", name: "locale", value: locale },
                      { kind: "hidden", name: "expenseId", value: e.id },
                    ]}
                    notify={d.notify}
                    submitLabel={d.common.delete}
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
