import type { ActorContext } from "./writeModels";
import type { ShipmentStatus } from "@/lib/commerce/shipmentStatus";
import type {
  ShipmentCreateInput,
  ShipmentRecord,
  ShipmentStatusEvent,
  ShipmentUpdateInput,
} from "./fulfillmentModels";

/**
 * フルフィルメント（配送）の書込/読取契約。mock / Supabase が同一契約を満たす。
 * 状態遷移の正当性は上位 fulfillmentService（shipmentStatus 状態機械）で強制し、
 * repository は永続化 + 状態イベント + 監査を担う。
 *
 * 入金（payments）は次の作業単位で同 interface に追加予定。
 */
export interface FulfillmentRepository {
  // ---- 配送 ----
  createShipment(input: ShipmentCreateInput, ctx: ActorContext): Promise<ShipmentRecord>;
  updateShipment(
    id: string,
    patch: ShipmentUpdateInput,
    ctx: ActorContext,
  ): Promise<ShipmentRecord>;
  /** 状態遷移を記録する（イベント行 + 注文行の status 更新）。遷移可否は service が検証済み前提。 */
  changeShipmentStatus(
    id: string,
    toStatus: ShipmentStatus,
    ctx: ActorContext,
    note?: string,
  ): Promise<ShipmentRecord>;
  getShipment(id: string): Promise<ShipmentRecord | null>;
  listShipments(options?: { orderId?: string }): Promise<ShipmentRecord[]>;
  listShipmentStatusEvents(shipmentId: string): Promise<ShipmentStatusEvent[]>;
}
