import type { Money } from "@/types/commerce";
import { subtractMoney } from "./money";

/**
 * 配送状態機械 + 送料差額計算。
 *
 * 注: shipments テーブル（0003）には現状 status 列がない。永続化する際は追加 migration
 * （0008 以降）で status 列を足す前提（本モジュールは純ロジックとして先行）。DECISIONS PM-023。
 * damaged / returned / reshipped は補助フラグであり、ここでは状態遷移として returned/reshipped を扱う。
 */
export const SHIPMENT_STATUSES = [
  "preparing", // 梱包準備
  "shipped", // 発送済
  "delivered", // 配達完了
  "returned", // 返送
  "reshipped", // 再発送
  "cancelled", // 取消（発送前）
] as const;

export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number];

export function isShipmentStatus(value: string): value is ShipmentStatus {
  return (SHIPMENT_STATUSES as readonly string[]).includes(value);
}

/** 終端状態。 */
export const TERMINAL_SHIPMENT_STATUSES: ReadonlySet<ShipmentStatus> = new Set([
  "delivered",
  "cancelled",
]);

const SHIPMENT_TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
  preparing: ["shipped", "cancelled"],
  shipped: ["delivered", "returned"],
  delivered: ["returned"], // 配達後の返品
  returned: ["reshipped"],
  reshipped: ["delivered", "returned"],
  cancelled: [],
};

export function nextShipmentStatuses(from: ShipmentStatus): ShipmentStatus[] {
  return [...SHIPMENT_TRANSITIONS[from]];
}

export function canTransitionShipment(from: ShipmentStatus, to: ShipmentStatus): boolean {
  if (from === to) return false;
  return SHIPMENT_TRANSITIONS[from].includes(to);
}

export function isTerminalShipmentStatus(status: ShipmentStatus): boolean {
  return TERMINAL_SHIPMENT_STATUSES.has(status);
}

/**
 * 送料差額 = 実送料 - 顧客請求送料。正なら KAMISUMI 負担、負なら顧客超過徴収。
 * 通貨が異なる場合は subtractMoney が throw する（無断合算を拒否）。
 */
export function freightDifference(actualCost: Money, chargedCost: Money): Money {
  return subtractMoney(actualCost, chargedCost);
}

/** KAMISUMI 負担額（差額が正のときのみ。負なら 0）。 */
export function kamisumiBorneFreight(actualCost: Money, chargedCost: Money): Money {
  const diff = freightDifference(actualCost, chargedCost);
  return diff.amountMinor > 0 ? diff : { currency: diff.currency, amountMinor: 0 };
}
