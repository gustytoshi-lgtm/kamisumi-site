/**
 * ロールベース認可（RBAC）の単一情報源。
 * サーバー側の認可・RLS のアプリ側ガード・管理画面メニュー制御で共通利用する。
 * 重要: front_staff（妻を想定）は原価・利益・口座設定・権限管理・全顧客CSV・秘密設定を閲覧不可。
 */
export const ROLES = ["owner", "front_staff", "inventory_staff", "editor"] as const;
export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  // 顧客対応系（front_staff 可）
  "customer:view",
  "customer:edit",
  "inquiry:manage",
  "provisional_order:manage",
  "order:update_status",
  "sourcing_request:manage",
  "sourcing_schedule:manage",
  "product:edit_description",
  "product:edit_translation",
  "journal:manage",
  "inventory:view_public",
  // 在庫運用系
  "inventory:manage",
  "inventory:move",
  // 編集系
  "product:manage",
  "product:manage_images",
  "product:manage_status",
  "media:manage",
  // 経営/機微（front_staff 不可）
  "cost:view",
  "profit:view",
  "purchase:manage",
  "settings:manage",
  "settings:bank", // 口座設定（実口座番号は保存しない）
  "secrets:view",
  "user:manage", // ユーザー・権限管理
  "customer:export_all", // 全顧客CSV
  "audit_log:view",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ALL_PERMISSIONS: Permission[] = [...PERMISSIONS];

const FRONT_STAFF_PERMISSIONS: Permission[] = [
  "customer:view",
  "customer:edit",
  "inquiry:manage",
  "provisional_order:manage",
  "order:update_status",
  "sourcing_request:manage",
  "sourcing_schedule:manage",
  "product:edit_description",
  "product:edit_translation",
  "journal:manage",
  "inventory:view_public",
];

const INVENTORY_STAFF_PERMISSIONS: Permission[] = [
  "inventory:view_public",
  "inventory:manage",
  "inventory:move",
  "provisional_order:manage",
  "order:update_status",
];

const EDITOR_PERMISSIONS: Permission[] = [
  "product:edit_description",
  "product:edit_translation",
  "product:manage_images",
  "journal:manage",
  "media:manage",
  "inventory:view_public",
];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  owner: ALL_PERMISSIONS,
  front_staff: FRONT_STAFF_PERMISSIONS,
  inventory_staff: INVENTORY_STAFF_PERMISSIONS,
  editor: EDITOR_PERMISSIONS,
};

/** front_staff など一般ロードが決して持ってはいけない機微権限。テストの番兵として使う。 */
export const SENSITIVE_PERMISSIONS: Permission[] = [
  "cost:view",
  "profit:view",
  "settings:bank",
  "secrets:view",
  "user:manage",
  "customer:export_all",
];

export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function canAny(role: Role, permissions: Permission[]): boolean {
  return permissions.some((permission) => can(role, permission));
}

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}
