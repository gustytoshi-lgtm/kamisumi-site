import type { Permission, Role } from "./rbac";
import { canAny } from "./rbac";

/**
 * 管理画面のナビゲーション定義。各項目を必要権限に紐づける（単一情報源）。
 * 実際のラベルは src/dictionaries/admin/* に分離（コードへ直書きしない）。
 * 将来の admin ルート実装は、このマップと rbac を消費してメニューを生成・保護する。
 */
export const ADMIN_NAV_KEYS = [
  "dashboard",
  "products",
  "inventory",
  "inventoryMovements",
  "matchaLots",
  "customers",
  "inquiries",
  "provisionalOrders",
  "orders",
  "sourcingRequests",
  "sourcingSchedules",
  "journal",
  "media",
  "purchases",
  "payments",
  "shipments",
  "settings",
  "auditLogs",
] as const;

export type AdminNavKey = (typeof ADMIN_NAV_KEYS)[number];

/** 各メニューを表示・利用するために必要な権限（いずれか1つ持てば可）。 */
export const ADMIN_NAV_PERMISSIONS: Record<AdminNavKey, Permission[]> = {
  dashboard: ["inventory:view_public", "order:update_status", "inquiry:manage"],
  products: ["product:manage", "product:edit_description", "product:edit_translation"],
  inventory: ["inventory:manage", "inventory:view_public"],
  inventoryMovements: ["inventory:move", "inventory:manage"],
  matchaLots: ["inventory:view_public", "inventory:manage"],
  customers: ["customer:view"],
  inquiries: ["inquiry:manage"],
  provisionalOrders: ["provisional_order:manage"],
  orders: ["order:update_status", "provisional_order:manage"],
  sourcingRequests: ["sourcing_request:manage"],
  sourcingSchedules: ["sourcing_schedule:manage"],
  journal: ["journal:manage"],
  media: ["media:manage", "product:manage_images"],
  purchases: ["purchase:manage", "cost:view"],
  payments: ["purchase:manage"],
  shipments: ["order:update_status"],
  settings: ["settings:manage"],
  auditLogs: ["audit_log:view"],
};

/** あるロールが見られる管理メニュー一覧。 */
export function visibleAdminNav(role: Role): AdminNavKey[] {
  return ADMIN_NAV_KEYS.filter((key) => canAny(role, ADMIN_NAV_PERMISSIONS[key]));
}
