import type { Metadata } from "next";
import { CreateOrderForm } from "@/components/admin/CreateOrderForm";
import { OrderNotesForm } from "@/components/admin/OrderNotesForm";
import { OrderStatusForm } from "@/components/admin/OrderStatusForm";
import { ReopenOrderForm } from "@/components/admin/ReopenOrderForm";
import { getAdminDictionary } from "@/dictionaries/admin";
import { getAdminSession, resolveAdminLocale } from "@/lib/admin/auth";
import { nextOrderStatuses } from "@/lib/commerce/orderStatus";
import { canAny } from "@/lib/commerce/rbac";
import { getLocaleFromParams, type LocaleParams } from "@/lib/params";
import { getCommerceWriteRepository } from "@/repositories";
import { siteConfig } from "@/config/site";
import styles from "@/components/admin/Admin.module.css";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const locale = await getLocaleFromParams(params);
  const session = getAdminSession();
  const d = getAdminDictionary(resolveAdminLocale(locale, session));
  return { title: `${d.nav.orders} | KAMISUMI Admin` };
}

export default async function AdminOrdersPage({ params }: LocaleParams) {
  const locale = await getLocaleFromParams(params);
  const session = getAdminSession();
  const adminLocale = resolveAdminLocale(locale, session);
  const dictionary = getAdminDictionary(adminLocale);

  const allowed =
    session !== null &&
    canAny(session.role, ["order:update_status", "provisional_order:manage"]);

  if (!allowed) {
    return (
      <>
        <h1>{dictionary.nav.orders}</h1>
        <p className="muted">{dictionary.common.noPermission}</p>
      </>
    );
  }

  const canUpdateStatus = session !== null && canAny(session.role, ["order:update_status"]);
  const canManage = session !== null && canAny(session.role, ["provisional_order:manage"]);

  const repo = getCommerceWriteRepository();
  const auditLogs = await repo.listAuditLogs();
  const orderCreatedIds = auditLogs
    .filter((a) => a.action === "create" && a.entityType === "order")
    .map((a) => a.entityId);

  const orders = await Promise.all(orderCreatedIds.map((id) => repo.getOrder(id)));
  const validOrders = orders.filter(
    (order): order is NonNullable<typeof order> => order !== null,
  );

  return (
    <>
      <h1>{dictionary.nav.orders}</h1>
      {canManage && (
        <CreateOrderForm
          common={dictionary.common}
          defaultBrandId={siteConfig.brand.id}
          defaultStoreId={siteConfig.store.id}
          locale={locale}
          notify={dictionary.notify}
        />
      )}
      <p className="muted">{validOrders.length}</p>
      {validOrders.length === 0 ? (
        <p className="muted">—</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>ID</th>
              <th>{dictionary.common.status}</th>
              <th>Brand</th>
              <th>{dictionary.common.actions}</th>
              <th>{dictionary.common.customerNote} / {dictionary.common.internalNote}</th>
            </tr>
          </thead>
          <tbody>
            {validOrders.map((order) => (
              <tr key={order.id}>
                <td>
                  <code style={{ fontSize: "0.8em" }}>{order.id}</code>
                </td>
                <td>
                  <span className={styles.badge}>{order.status}</span>
                </td>
                <td>{order.brandId}</td>
                <td>
                  {canUpdateStatus ? (
                    <div style={{ display: "grid", gap: "4px" }}>
                      <OrderStatusForm
                        common={dictionary.common}
                        locale={locale}
                        nextStatuses={nextOrderStatuses(order.status)}
                        notify={dictionary.notify}
                        orderId={order.id}
                      />
                      {order.status === "cancelled" && (
                        <ReopenOrderForm
                          common={dictionary.common}
                          locale={locale}
                          notify={dictionary.notify}
                          orderId={order.id}
                        />
                      )}
                    </div>
                  ) : (
                    <span className="muted">-</span>
                  )}
                </td>
                <td>
                  {canManage ? (
                    <OrderNotesForm
                      common={dictionary.common}
                      customerNote={order.customerNote}
                      internalNote={order.internalNote}
                      locale={locale}
                      notify={dictionary.notify}
                      orderId={order.id}
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
