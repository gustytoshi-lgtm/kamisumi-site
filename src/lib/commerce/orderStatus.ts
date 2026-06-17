/**
 * 仮注文〜完了までの注文状態機械。
 * 公開サイトでは未使用（Phase 2A 管理画面で使用）。状態遷移の正当性を一元管理する。
 * 実在しない業務ルールを作らないため、遷移は「明らかに安全な前進と取消・返金」のみ定義し、
 * 細部の運用ルールは設定・運用で調整できるようにしている。
 */
export const ORDER_STATUSES = [
  "inquiry_received",
  "quote_preparing",
  "quote_sent",
  "payment_waiting",
  "partially_paid",
  "deposit_paid",
  "sourcing_scheduled",
  "sourcing_in_progress",
  "purchased",
  "awaiting_arrival",
  "inspection_pending",
  "shipping_quote_sent",
  "balance_waiting",
  "paid_in_full",
  "packing",
  "shipped",
  "delivered",
  "completed",
  "cancelled",
  "refunded",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** 終端状態。ここからは前進しない。 */
export const TERMINAL_ORDER_STATUSES: ReadonlySet<OrderStatus> = new Set([
  "completed",
  "refunded",
]);

/**
 * 主要な前進フロー。cancelled / refunded への遷移は別途共通的に許可する（下記 canTransitionOrder 参照）。
 */
const FORWARD_FLOW: Record<OrderStatus, OrderStatus[]> = {
  inquiry_received: ["quote_preparing"],
  quote_preparing: ["quote_sent"],
  quote_sent: ["payment_waiting"],
  payment_waiting: ["partially_paid", "deposit_paid", "paid_in_full"],
  partially_paid: ["deposit_paid", "paid_in_full"],
  deposit_paid: ["sourcing_scheduled", "sourcing_in_progress"],
  sourcing_scheduled: ["sourcing_in_progress"],
  sourcing_in_progress: ["purchased"],
  purchased: ["awaiting_arrival"],
  awaiting_arrival: ["inspection_pending"],
  inspection_pending: ["shipping_quote_sent"],
  shipping_quote_sent: ["balance_waiting"],
  balance_waiting: ["paid_in_full"],
  paid_in_full: ["packing"],
  packing: ["shipped"],
  shipped: ["delivered"],
  delivered: ["completed"],
  completed: [],
  cancelled: ["refunded"],
  refunded: [],
};

/** 取消可能な状態（発送前まで）。発送以降は取消ではなく返送/返金フローへ。 */
const CANCELLABLE_BEFORE_SHIP: ReadonlySet<OrderStatus> = new Set([
  "inquiry_received",
  "quote_preparing",
  "quote_sent",
  "payment_waiting",
  "partially_paid",
  "deposit_paid",
  "sourcing_scheduled",
  "sourcing_in_progress",
  "purchased",
  "awaiting_arrival",
  "inspection_pending",
  "shipping_quote_sent",
  "balance_waiting",
  "paid_in_full",
  "packing",
]);

export function nextOrderStatuses(from: OrderStatus): OrderStatus[] {
  const forward = [...FORWARD_FLOW[from]];
  if (CANCELLABLE_BEFORE_SHIP.has(from)) forward.push("cancelled");
  // 入金実績のある状態からは返金が可能。
  if (["partially_paid", "deposit_paid", "paid_in_full", "cancelled"].includes(from)) {
    if (!forward.includes("refunded")) forward.push("refunded");
  }
  return forward;
}

export function canTransitionOrder(from: OrderStatus, to: OrderStatus): boolean {
  if (from === to) return false;
  return nextOrderStatuses(from).includes(to);
}

export function isTerminalOrderStatus(status: OrderStatus): boolean {
  return TERMINAL_ORDER_STATUSES.has(status);
}
