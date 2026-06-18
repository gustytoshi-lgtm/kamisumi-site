import type { Metadata } from "next";
import { CreateInventoryItemForm } from "@/components/admin/CreateInventoryItemForm";
import { InventoryMovementForm } from "@/components/admin/InventoryMovementForm";
import { InventoryStatusForm } from "@/components/admin/InventoryStatusForm";
import { getAdminDictionary } from "@/dictionaries/admin";
import { getAdminSession, resolveAdminLocale } from "@/lib/admin/auth";
import { canAny } from "@/lib/commerce/rbac";
import { getLocaleFromParams, type LocaleParams } from "@/lib/params";
import { getCommerceWriteRepository } from "@/repositories";
import styles from "@/components/admin/Admin.module.css";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const locale = await getLocaleFromParams(params);
  const session = getAdminSession();
  const d = getAdminDictionary(resolveAdminLocale(locale, session));
  return { title: `${d.nav.inventory} | KAMISUMI Admin` };
}

export default async function AdminInventoryPage({ params }: LocaleParams) {
  const locale = await getLocaleFromParams(params);
  const session = getAdminSession();
  const adminLocale = resolveAdminLocale(locale, session);
  const dictionary = getAdminDictionary(adminLocale);

  const allowed =
    session !== null &&
    canAny(session.role, ["inventory:manage", "inventory:move", "inventory:view_public"]);

  if (!allowed) {
    return (
      <>
        <h1>{dictionary.nav.inventory}</h1>
        <p className="muted">{dictionary.common.noPermission}</p>
      </>
    );
  }

  const canManage = session !== null && canAny(session.role, ["inventory:manage"]);
  const canMove = session !== null && canAny(session.role, ["inventory:move", "inventory:manage"]);

  const repo = getCommerceWriteRepository();
  // 実装注: mock では inventory アイテムは createInventoryItem で都度作成。
  // audit ログから在庫アイテム ID を逆引きして一覧表示する。Supabase 化で JOIN クエリに変更する。
  const auditLogs = await repo.listAuditLogs();
  const inventoryCreatedIds = auditLogs
    .filter((a) => a.action === "create" && a.entityType === "inventory_item")
    .map((a) => a.entityId);

  const inventoryItems = await Promise.all(
    inventoryCreatedIds.map((id) => repo.getInventoryItem(id)),
  );
  const validItems = inventoryItems.filter(
    (item): item is NonNullable<typeof item> => item !== null,
  );

  return (
    <>
      <h1>{dictionary.nav.inventory}</h1>
      {canManage && (
        <CreateInventoryItemForm
          common={dictionary.common}
          locale={locale}
          notify={dictionary.notify}
        />
      )}
      {validItems.length === 0 ? (
        <p className="muted">—</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>ID</th>
              <th>{dictionary.common.status}</th>
              <th>Qty</th>
              <th>Rsv</th>
              <th>Held</th>
              <th>{dictionary.common.actions}</th>
              <th>{dictionary.common.reason}</th>
            </tr>
          </thead>
          <tbody>
            {validItems.map((item) => (
              <tr key={item.id}>
                <td>
                  <code style={{ fontSize: "0.8em" }}>{item.id}</code>
                </td>
                <td>
                  <span className={styles.badge}>{item.status}</span>
                </td>
                <td>{item.quantity}</td>
                <td>{item.reserved}</td>
                <td>{item.held}</td>
                <td>
                  {canManage ? (
                    <InventoryStatusForm
                      common={dictionary.common}
                      currentStatus={item.status}
                      itemId={item.id}
                      locale={locale}
                      notify={dictionary.notify}
                    />
                  ) : (
                    <span className="muted">-</span>
                  )}
                </td>
                <td>
                  {canMove ? (
                    <InventoryMovementForm
                      common={dictionary.common}
                      itemId={item.id}
                      locale={locale}
                      notify={dictionary.notify}
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
      <details>
        <summary className="muted" style={{ cursor: "pointer", fontSize: "0.9em" }}>
          {dictionary.common.viewHistory} ({auditLogs.length})
        </summary>
        <table className={styles.table} style={{ marginTop: "8px", fontSize: "0.85em" }}>
          <thead>
            <tr>
              <th>Action</th>
              <th>Entity</th>
              <th>ID</th>
              <th>Actor</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {auditLogs
              .filter((a) => a.entityType === "inventory_item")
              .slice(-20)
              .reverse()
              .map((a) => (
                <tr key={a.id}>
                  <td>{a.action}</td>
                  <td>{a.entityType}</td>
                  <td>
                    <code style={{ fontSize: "0.8em" }}>{a.entityId.slice(0, 12)}</code>
                  </td>
                  <td>{a.actorId}</td>
                  <td>{new Date(a.createdAt).toLocaleString()}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </details>
    </>
  );
}
