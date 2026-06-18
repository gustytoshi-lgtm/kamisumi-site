import type { Metadata } from "next";
import { getAdminDictionary } from "@/dictionaries/admin";
import { getAdminSession, resolveAdminLocale } from "@/lib/admin/auth";
import { moneyToMajorString } from "@/lib/format";
import { buildProfitSnapshot } from "@/lib/commerce/profitAnalysis";
import { canAny } from "@/lib/commerce/rbac";
import { getLocaleFromParams, type LocaleParams } from "@/lib/params";
import {
  getExpenseService,
  getFulfillmentService,
  getPaymentService,
  getProcurementService,
} from "@/repositories";
import type { Money } from "@/types/commerce";
import styles from "@/components/admin/Admin.module.css";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const locale = await getLocaleFromParams(params);
  const session = await getAdminSession();
  const d = getAdminDictionary(resolveAdminLocale(locale, session));
  return { title: `${d.profit.title} | KAMISUMI Admin` };
}

const money = (m: Money): string => `${m.currency} ${moneyToMajorString(m)}`;

export default async function AdminProfitPage({ params }: LocaleParams) {
  const locale = await getLocaleFromParams(params);
  const session = await getAdminSession();
  const d = getAdminDictionary(resolveAdminLocale(locale, session));

  if (!session || !canAny(session.role, ["profit:view"])) {
    return (
      <>
        <h1>{d.profit.title}</h1>
        <p className="muted">{d.common.noPermission}</p>
      </>
    );
  }

  const actor = { userId: session.userId, role: session.role };
  const [payments, purchases, shipments, expenses] = await Promise.all([
    getPaymentService().listPayments(actor),
    getProcurementService().listPurchases(actor),
    getFulfillmentService().listShipments(actor),
    getExpenseService().listExpenses(actor),
  ]);

  const snapshot = buildProfitSnapshot({ currency: "TWD", payments, purchases, shipments, expenses });
  const marginPct = (snapshot.grossMarginBasisPoints / 100).toFixed(2);

  const rows: { label: string; value: string; strong?: boolean }[] = [
    { label: d.profit.revenue, value: money(snapshot.revenue) },
    { label: d.profit.cost, value: money(snapshot.cost) },
    { label: d.profit.grossProfit, value: money(snapshot.grossProfit), strong: true },
    { label: d.profit.grossMargin, value: `${marginPct}%` },
    { label: d.profit.contributionProfit, value: money(snapshot.contributionProfit), strong: true },
  ];

  return (
    <>
      <h1>{d.profit.title}</h1>
      <p className="muted">{d.profit.intro}</p>

      <div className={styles.cards} style={{ marginTop: "12px" }}>
        {rows.map((r) => (
          <div className={styles.card} key={r.label}>
            <span className="muted">{r.label}</span>
            <div>{r.strong ? <strong>{r.value}</strong> : <span>{r.value}</span>}</div>
          </div>
        ))}
      </div>

      <p className="muted" style={{ marginTop: "8px" }}>
        {d.profit.assumptions}
      </p>
    </>
  );
}
