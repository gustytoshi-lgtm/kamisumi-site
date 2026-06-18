import type { MatchaLot } from "@/lib/commerce/matchaLot";

/**
 * 抹茶ロットの永続モデル（matcha_lots, 0001 + 0010）。
 * FIFO/賞味期限の純ロジックは lib/commerce/matchaLot.ts。本型はそこへ写像できる（toMatchaLot）。
 */
export type MatchaLotRecord = {
  id: string;
  organizationId: string;
  productId: string;
  lotCode?: string;
  teaHouse?: string;
  bestBefore?: string; // YYYY-MM-DD
  purchasedOn?: string; // YYYY-MM-DD
  storageLocation?: string;
  quantity: number; // on-hand
  reserved: number;
  incoming: number;
  fifoSeq: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
};

export type MatchaLotCreateInput = {
  organizationId?: string;
  productId: string;
  lotCode?: string;
  teaHouse?: string;
  bestBefore?: string;
  purchasedOn?: string;
  storageLocation?: string;
  quantity?: number;
};

export type MatchaLotUpdateInput = Partial<
  Pick<
    MatchaLotRecord,
    "lotCode" | "teaHouse" | "bestBefore" | "purchasedOn" | "storageLocation"
  >
>;

/** FIFO ロジック用の MatchaLot へ写像。 */
export function toMatchaLot(record: MatchaLotRecord): MatchaLot {
  return {
    id: record.id,
    productId: record.productId,
    lotCode: record.lotCode,
    bestBefore: record.bestBefore,
    purchasedOn: record.purchasedOn,
    quantity: record.quantity,
    reserved: record.reserved,
    incoming: record.incoming,
    fifoSeq: record.fifoSeq,
  };
}
