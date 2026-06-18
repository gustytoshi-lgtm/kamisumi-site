/**
 * 入金状態機械（台湾口座振込の手動確認フローを想定）。
 *
 * 状態値は DB（0003 payments.status の CHECK）に合わせる。spec §3.G の
 * `not_requested` / `requested` は本実装の `unbilled` / `billed` に対応する
 * （適用済み migration を書き換えないため。DECISIONS PM-022）。
 * 実銀行口座番号は保存しない（照合番号・確認者のみ）。
 */
export const PAYMENT_STATUSES = [
  "unbilled", // 請求前（≈ not_requested）
  "billed", // 請求済（≈ requested）
  "unpaid", // 請求後・入金待ち
  "partially_paid", // 一部入金
  "paid", // 全額入金
  "overpaid", // 過入金
  "underpaid", // 不足入金
  "refunded", // 返金済（終端）
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export function isPaymentStatus(value: string): value is PaymentStatus {
  return (PAYMENT_STATUSES as readonly string[]).includes(value);
}

/** 終端状態。ここからは遷移しない。 */
export const TERMINAL_PAYMENT_STATUSES: ReadonlySet<PaymentStatus> = new Set(["refunded"]);

const PAYMENT_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  unbilled: ["billed"],
  billed: ["unpaid", "partially_paid", "paid", "overpaid", "underpaid"],
  unpaid: ["partially_paid", "paid", "overpaid", "underpaid"],
  partially_paid: ["paid", "overpaid", "underpaid", "refunded"],
  underpaid: ["partially_paid", "paid", "refunded"],
  paid: ["overpaid", "refunded"],
  overpaid: ["refunded"],
  refunded: [],
};

export function nextPaymentStatuses(from: PaymentStatus): PaymentStatus[] {
  return [...PAYMENT_TRANSITIONS[from]];
}

export function canTransitionPayment(from: PaymentStatus, to: PaymentStatus): boolean {
  if (from === to) return false;
  return PAYMENT_TRANSITIONS[from].includes(to);
}

export function isTerminalPaymentStatus(status: PaymentStatus): boolean {
  return TERMINAL_PAYMENT_STATUSES.has(status);
}
