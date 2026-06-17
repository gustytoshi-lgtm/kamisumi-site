/**
 * 在庫の物理/論理状態。在庫数の単純上書きではなく inventory_movements に履歴を残す前提。
 * 公開サイトでは公開ステータス（ProductStatus）に変換して表示し、これらの内部状態は直接出さない。
 */
export const INVENTORY_STATUSES = [
  "available",
  "reserved",
  "held",
  "awaiting_arrival",
  "inspection_pending",
  "packing",
  "damaged",
  "unavailable",
] as const;

export type InventoryStatus = (typeof INVENTORY_STATUSES)[number];

/** 在庫移動の理由。movements に必ず理由と操作者を残す。 */
export const INVENTORY_MOVEMENT_REASONS = [
  "purchase_in",
  "manual_adjust",
  "reserve",
  "release_reservation",
  "hold",
  "release_hold",
  "ship_out",
  "mark_damaged",
  "return_in",
  "inspection",
] as const;

export type InventoryMovementReason = (typeof INVENTORY_MOVEMENT_REASONS)[number];

const INVENTORY_FLOW: Record<InventoryStatus, InventoryStatus[]> = {
  awaiting_arrival: ["inspection_pending", "unavailable"],
  inspection_pending: ["available", "damaged", "unavailable"],
  available: ["reserved", "held", "packing", "damaged", "unavailable"],
  reserved: ["available", "held", "packing", "unavailable"],
  held: ["available", "reserved", "unavailable"],
  packing: ["available", "unavailable"],
  damaged: ["unavailable", "available"],
  unavailable: ["available"],
};

export function nextInventoryStatuses(from: InventoryStatus): InventoryStatus[] {
  return [...INVENTORY_FLOW[from]];
}

export function canTransitionInventory(from: InventoryStatus, to: InventoryStatus): boolean {
  if (from === to) return false;
  return INVENTORY_FLOW[from].includes(to);
}

/** 公開向けに表示してよい在庫か（held/reserved/damaged/unavailable は在庫数として公開しない）。 */
export function isPubliclyCountable(status: InventoryStatus): boolean {
  return status === "available";
}
