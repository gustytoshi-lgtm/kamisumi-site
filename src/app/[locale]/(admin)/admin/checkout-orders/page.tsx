import type { Metadata } from "next";
import { AdminActionForm } from "@/components/admin/AdminActionForm";
import { getAdminDictionary } from "@/dictionaries/admin";
import { getAdminSession, resolveAdminLocale } from "@/lib/admin/auth";
import { canTransitionOrder } from "@/lib/commerce/orderStatus";
import { canTransitionPayment } from "@/lib/commerce/paymentStatus";
import { canAny } from "@/lib/commerce/rbac";
import { formatMoney } from "@/lib/format";
import { getLocaleFromParams, type LocaleParams } from "@/lib/params";
import { getManualTransferOrderService } from "@/repositories";
import styles from "@/components/admin/Admin.module.css";
import { cancelCheckoutOrderAction, confirmCheckoutPaymentAction } from "./actions";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const locale = await getLocaleFromParams(params);
  const session = await getAdminSession();
  const d = getAdminDictionary(resolveAdminLocale(locale, session));
  return { title: `${d.checkoutOrders.title} | KAMISUMI Admin` };
}

export default async function AdminCheckoutOrdersPage({ params }: LocaleParams) {
  const locale = await getLocaleFromParams(params);
  const session = await getAdminSession();
  const d = getAdminDictionary(resolveAdminLocale(locale, session));
  const co = d.checkoutOrders;

  if (!session || !canAny(session.role, ["purchase:manage"])) {
    return (
      <>
        <h1>{co.title}</h1>
        <p className="muted">{d.common.noPermission}</p>
      </>
    );
  }

  const orders = await getManualTransferOrderService().listOrders({
    userId: session.userId,
    role: session.role,
  });
  const recent = [...orders].reverse();

  return (
    <>
      <h1>{co.title}</h1>
      <p className="muted">{co.intro}</p>
      <p className="muted">{co.mockNote}</p>
      {recent.length === 0 ? (
        <p className="muted">{co.empty}</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{co.reference}</th>
              <th>{co.items}</th>
              <th>{co.amount}</th>
              <th>{co.orderStatus}</th>
              <th>{co.paymentStatus}</th>
              <th>{co.placedAt}</th>
              <th>{d.common.actions}</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((order) => {
              const itemCount = order.items.reduce((acc, item) => acc + item.quantity, 0);
              const canPay = canTransitionPayment(order.paymentStatus, "paid");
              const canCancel = canTransitionOrder(order.orderStatus, "cancelled");
              return (
                <tr key={order.orderId}>
                  <td>{order.reference}</td>
                  <td className="muted">{itemCount}</td>
                  <td>{formatMoney(order.amount, locale)}</td>
                  <td>
                    <span className={styles.badge}>{order.orderStatus}</span>
                  </td>
                  <td>
                    <span className={styles.badge}>{order.paymentStatus}</span>
                  </td>
                  <td className="muted">{order.createdAt.slice(0, 19).replace("T", " ")}</td>
                  <td style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {canPay ? (
                      <AdminActionForm
                        action={confirmCheckoutPaymentAction}
                        confirmText={d.common.confirm}
                        fields={[
                          { kind: "hidden", name: "orderId", value: order.orderId },
                          { kind: "hidden", name: "locale", value: locale },
                        ]}
                        notify={d.notify}
                        submitLabel={co.confirmPayment}
                      />
                    ) : null}
                    {canCancel ? (
                      <AdminActionForm
                        action={cancelCheckoutOrderAction}
                        confirmText={d.common.confirm}
                        fields={[
                          { kind: "hidden", name: "orderId", value: order.orderId },
                          { kind: "hidden", name: "locale", value: locale },
                        ]}
                        notify={d.notify}
                        submitLabel={co.cancelOrder}
                      />
                    ) : null}
                    {!canPay && !canCancel ? <span className="muted">-</span> : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </>
  );
}
