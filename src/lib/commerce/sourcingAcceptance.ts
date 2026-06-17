/**
 * 買付（sourcing）受付の停止条件を設定値で評価する純粋関数。
 * 受付期限・最大受付件数・最大購入数量・手動停止・買付予定中止のいずれかで停止する。
 * 実際の締切日時や上限は管理画面/設定から渡す（ここに固定値を埋め込まない）。
 */
export type SourcingAcceptanceConfig = {
  /** ISO 文字列。null なら期限なし。 */
  deadline?: string | null;
  /** 受付可能な最大件数。null/undefined なら無制限。 */
  maxRequests?: number | null;
  /** 受付可能な最大合計数量。null/undefined なら無制限。 */
  maxQuantity?: number | null;
  /** 運営による手動停止。 */
  manuallyStopped?: boolean;
  /** 対象の買付予定が中止された。 */
  scheduleCancelled?: boolean;
};

export type SourcingAcceptanceState = {
  currentRequests: number;
  currentQuantity: number;
  now?: Date;
};

export type SourcingAcceptanceReason =
  | "open"
  | "manually_stopped"
  | "schedule_cancelled"
  | "deadline_passed"
  | "max_requests_reached"
  | "max_quantity_reached";

export function evaluateSourcingAcceptance(
  config: SourcingAcceptanceConfig,
  state: SourcingAcceptanceState,
): { open: boolean; reason: SourcingAcceptanceReason } {
  if (config.manuallyStopped) return { open: false, reason: "manually_stopped" };
  if (config.scheduleCancelled) return { open: false, reason: "schedule_cancelled" };

  if (config.deadline) {
    const now = state.now ?? new Date();
    if (now.getTime() > new Date(config.deadline).getTime()) {
      return { open: false, reason: "deadline_passed" };
    }
  }

  if (typeof config.maxRequests === "number" && state.currentRequests >= config.maxRequests) {
    return { open: false, reason: "max_requests_reached" };
  }

  if (typeof config.maxQuantity === "number" && state.currentQuantity >= config.maxQuantity) {
    return { open: false, reason: "max_quantity_reached" };
  }

  return { open: true, reason: "open" };
}

/** 取り置き期限の既定（時間）。予約金入金済みは自動期限切れの対象外。 */
export const DEFAULT_HOLD_HOURS = 48;

export function holdExpiresAt(heldAt: Date, holdHours: number = DEFAULT_HOLD_HOURS): Date {
  return new Date(heldAt.getTime() + holdHours * 60 * 60 * 1000);
}

export function isHoldExpired(
  heldAt: Date,
  options: { now?: Date; holdHours?: number; depositPaid?: boolean } = {},
): boolean {
  if (options.depositPaid) return false; // 予約金入金済みは自動期限切れにしない
  const now = options.now ?? new Date();
  return now.getTime() > holdExpiresAt(heldAt, options.holdHours).getTime();
}
