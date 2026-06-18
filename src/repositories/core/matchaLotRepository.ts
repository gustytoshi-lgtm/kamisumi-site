import type { ActorContext } from "./writeModels";
import type {
  MatchaLotCreateInput,
  MatchaLotRecord,
  MatchaLotUpdateInput,
} from "./matchaLotModels";

/**
 * 抹茶ロットの永続契約。mock / Supabase が同一契約を満たす。
 * 数量の更新は adjustQuantity 経由（永続層で非負を保証）。RBAC は matchaLotService。
 */
export interface MatchaLotRepository {
  listLots(options?: { productId?: string; includeDeleted?: boolean }): Promise<MatchaLotRecord[]>;
  getLot(id: string): Promise<MatchaLotRecord | null>;
  createLot(input: MatchaLotCreateInput, ctx: ActorContext): Promise<MatchaLotRecord>;
  updateLot(id: string, patch: MatchaLotUpdateInput, ctx: ActorContext): Promise<MatchaLotRecord>;
  /** on-hand 数量を delta だけ増減（適用後 quantity>=0 / quantity-reserved>=0 を保証）。 */
  adjustQuantity(id: string, delta: number, ctx: ActorContext, note?: string): Promise<MatchaLotRecord>;
  softDeleteLot(id: string, ctx: ActorContext): Promise<MatchaLotRecord>;
  restoreLot(id: string, ctx: ActorContext): Promise<MatchaLotRecord>;
}
