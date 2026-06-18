/**
 * 抹茶ロットの先入先出（FIFO）と賞味期限アラートの単一情報源（純ロジック・DB非依存）。
 *
 * 在庫の物理数量そのものは inventory_items が持つ。本モジュールは「ロット単位」での
 * 引当順序（FIFO）と賞味期限の警告区分を扱う。数量/予約/入荷予定はドメイン型として受け取り、
 * 永続層（matcha_lots + inventory）からの供給は repository が担う。
 */

export type MatchaLot = {
  id: string;
  productId: string;
  lotCode?: string;
  bestBefore?: string; // ISO date (YYYY-MM-DD)
  purchasedOn?: string; // ISO date
  quantity: number; // 数量（on-hand）
  reserved: number; // 予約数
  incoming: number; // 入荷予定数
  fifoSeq: number; // 先入先出順（DB bigserial）
};

/** 販売可能数 = 数量 - 予約数（負にはしない）。 */
export function availableCount(lot: MatchaLot): number {
  return Math.max(0, lot.quantity - lot.reserved);
}

/** FIFO 順（fifoSeq 昇順、同値は仕入日→賞味期限の早い順）。元配列は変更しない。 */
export function sortFifo(lots: MatchaLot[]): MatchaLot[] {
  return [...lots].sort((a, b) => {
    if (a.fifoSeq !== b.fifoSeq) return a.fifoSeq - b.fifoSeq;
    const pa = a.purchasedOn ?? "";
    const pb = b.purchasedOn ?? "";
    if (pa !== pb) return pa < pb ? -1 : 1;
    const ba = a.bestBefore ?? "";
    const bb = b.bestBefore ?? "";
    return ba < bb ? -1 : ba > bb ? 1 : 0;
  });
}

export type FifoAllocation = { lotId: string; take: number };
export type FifoResult = {
  allocations: FifoAllocation[];
  /** 引き当てきれなかった数量（0 なら全量充足）。 */
  shortfall: number;
};

/** demand を FIFO 順に各ロットの販売可能数の範囲で引き当てる。 */
export function allocateFifo(lots: MatchaLot[], demand: number): FifoResult {
  if (!Number.isInteger(demand) || demand < 0) {
    throw new Error(`demand must be a non-negative integer (got ${demand})`);
  }
  let remaining = demand;
  const allocations: FifoAllocation[] = [];
  for (const lot of sortFifo(lots)) {
    if (remaining <= 0) break;
    const take = Math.min(availableCount(lot), remaining);
    if (take > 0) {
      allocations.push({ lotId: lot.id, take });
      remaining -= take;
    }
  }
  return { allocations, shortfall: remaining };
}

// ---- 賞味期限アラート ----

/** 既定のアラート日数（賞味期限まで何日で警告するか）。設定で上書き可能。 */
export const DEFAULT_BEST_BEFORE_THRESHOLDS = [90, 60, 30, 14] as const;

export type BestBeforeAlert =
  | { kind: "expired"; daysUntil: number }
  | { kind: "approaching"; thresholdDays: number; daysUntil: number }
  | { kind: "ok"; daysUntil: number };

/** target(賞味期限) と today の日数差（UTC 日付ベース、負なら期限切れ）。 */
export function daysUntil(target: string, today: string): number {
  const t = Date.parse(`${target}T00:00:00Z`);
  const n = Date.parse(`${today}T00:00:00Z`);
  if (Number.isNaN(t) || Number.isNaN(n)) {
    throw new Error(`invalid date(s): target=${target} today=${today}`);
  }
  return Math.floor((t - n) / 86_400_000);
}

/**
 * 賞味期限の警告区分を返す。期限切れ→"expired"、しきい値以内→最も小さい該当しきい値の
 * "approaching"、それ以外→"ok"。thresholds は設定可能（既定 90/60/30/14）。
 */
export function bestBeforeAlert(
  bestBefore: string,
  today: string,
  thresholds: readonly number[] = DEFAULT_BEST_BEFORE_THRESHOLDS,
): BestBeforeAlert {
  const d = daysUntil(bestBefore, today);
  if (d < 0) return { kind: "expired", daysUntil: d };
  const ascending = [...thresholds].sort((a, b) => a - b);
  for (const threshold of ascending) {
    if (d <= threshold) return { kind: "approaching", thresholdDays: threshold, daysUntil: d };
  }
  return { kind: "ok", daysUntil: d };
}
