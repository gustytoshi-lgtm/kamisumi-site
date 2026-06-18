import type { ActorContext } from "./writeModels";
import type {
  CeramicUnitCreateInput,
  CeramicUnitRecord,
  CeramicUnitStatus,
  CeramicUnitUpdateInput,
} from "./ceramicUnitModels";

/**
 * 陶器個体の永続契約。mock / Supabase が同一契約を満たす。
 * cost の表示制御・RBAC は ceramicUnitService が担う（repository は cost を保持・返す）。
 */
export interface CeramicUnitRepository {
  listUnits(options?: { productId?: string; includeDeleted?: boolean }): Promise<CeramicUnitRecord[]>;
  getUnit(id: string): Promise<CeramicUnitRecord | null>;
  createUnit(input: CeramicUnitCreateInput, ctx: ActorContext): Promise<CeramicUnitRecord>;
  updateUnit(id: string, patch: CeramicUnitUpdateInput, ctx: ActorContext): Promise<CeramicUnitRecord>;
  setStatus(id: string, status: CeramicUnitStatus, ctx: ActorContext): Promise<CeramicUnitRecord>;
  softDeleteUnit(id: string, ctx: ActorContext): Promise<CeramicUnitRecord>;
  restoreUnit(id: string, ctx: ActorContext): Promise<CeramicUnitRecord>;
}
