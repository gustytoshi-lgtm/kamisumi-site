import type { Metadata } from "next";
import { getAdminDictionary } from "@/dictionaries/admin";
import { getAdminSession, resolveAdminLocale } from "@/lib/admin/auth";
import { moneyToMajorString } from "@/lib/format";
import { bestBeforeAlert } from "@/lib/commerce/matchaLot";
import { buildProfitSnapshot } from "@/lib/commerce/profitAnalysis";
import { can } from "@/lib/commerce/rbac";
import { getLocaleFromParams, type LocaleParams } from "@/lib/params";
import {
  getCeramicUnitService,
  getCommerceRepository,
  getExpenseService,
  getFulfillmentService,
  getMatchaLotService,
  getPaymentService,
  getProcurementService,
} from "@/repositories";
import styles from "@/components/admin/Admin.module.css";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const locale = await getLocaleFromParams(params);
  const session = await getAdminSession();
  const d = getAdminDictionary(resolveAdminLocale(locale, session));
  return { title: `${d.nav.dashboard} | KAMISUMI Admin` };
}

export default async function AdminDashboardPage({ params }: LocaleParams) {
  const locale = await getLocaleFromParams(params);
  const session = await getAdminSession();
  const d = getAdminDictionary(resolveAdminLocale(locale, session));
  const role = session?.role;
  const actor = session ? { userId: session.userId, role: session.role } : null;

  const cards: { label: string; value: string }[] = [];

  const repository = getCommerceRepository();
  const products = await repository.listProducts({ includeArchive: true });
  cards.push({ label: d.nav.products, value: String(products.length) });

  // 在庫系（inventory:view_public）
  if (actor && role && can(role, "inventory:view_public")) {
    const [lots, units] = await Promise.all([
      getMatchaLotService().listLots(actor),
      getCeramicUnitService().listUnits(actor),
    ]);
    const today = new Date().toISOString().slice(0, 10);
    const alerts = lots.filter(
      (l) => l.bestBefore && bestBeforeAlert(l.bestBefore, today).kind !== "ok",
    ).length;
    cards.push({ label: d.nav.matchaLots, value: String(lots.length) });
    cards.push({ label: d.nav.ceramicUnits, value: String(units.length) });
    cards.push({ label: d.dashboard.bestBeforeAlerts, value: String(alerts) });
  }

  // 配送（order:update_status）
  if (actor && role && can(role, "order:update_status")) {
    const shipments = await getFulfillmentService().listShipments(actor);
    cards.push({ label: d.dashboard.shipments, value: String(shipments.length) });
  }

  // 仕入・入金・経費（purchase:manage = owner）
  if (actor && role && can(role, "purchase:manage")) {
    const [suppliers, purchases, payments] = await Promise.all([
      getProcurementService().listSuppliers(actor),
      getProcurementService().listPurchases(actor),
      getPaymentService().listPayments(actor),
    ]);
    cards.push({ label: d.dashboard.suppliers, value: String(suppliers.length) });
    cards.push({ label: d.dashboard.purchases, value: String(purchases.length) });
    cards.push({ label: d.dashboard.payments, value: String(payments.length) });
  }

  // 利益サマリ（profit:view = owner）
  let profitLine: string | null = null;
  if (actor && role && can(role, "profit:view")) {
    const [payments, purchases, shipments, expenses] = await Promise.all([
      getPaymentService().listPayments(actor),
      getProcurementService().listPurchases(actor),
      getFulfillmentService().listShipments(actor),
      getExpenseService().listExpenses(actor),
    ]);
    const snap = buildProfitSnapshot({ currency: "TWD", payments, purchases, shipments, expenses });
    profitLine = `${d.profit.grossProfit}: TWD ${moneyToMajorString(snap.grossProfit)} / ${d.profit.grossMargin} ${(snap.grossMarginBasisPoints / 100).toFixed(2)}%`;
  }

  return (
    <>
      <h1>{d.nav.dashboard}</h1>
      <div className={styles.cards}>
        {cards.map((card) => (
          <div className={styles.card} key={card.label}>
            <span className="muted">{card.label}</span>
            <div>
              <strong>{card.value}</strong>
            </div>
          </div>
        ))}
      </div>
      {profitLine && <p style={{ marginTop: "8px" }}>{profitLine}</p>}
      <p className="muted" style={{ marginTop: "8px" }}>
        {d.common.signedInAs}: {role ?? "-"} (data backend:{" "}
        {process.env.DATA_BACKEND === "supabase" ? "supabase" : "mock"})
      </p>
    </>
  );
}
