import type { Locale } from "@/config/site";
import type { InventoryMovementReason, InventoryStatus } from "@/lib/commerce/inventoryStatus";
import type { OrderStatus } from "@/lib/commerce/orderStatus";
import type { LocalizedString } from "@/types/commerce";
import type {
  ActorContext,
  AuditEntry,
  InventoryRecord,
  JournalRecord,
  JournalStatus,
  OrderItemInput,
  OrderRecord,
  ProductCreateInput,
  ProductStatus,
  ProductUpdateInput,
  SourcingRequestRecord,
  SourcingRequestStatus,
  StoredProduct,
} from "./writeModels";

/**
 * 書込ユースケースの契約。mock / Supabase が同一実装契約を満たす（contract test で保証）。
 *
 * 責務分担:
 *   - この repository: 原子的な永続化 + 永続レベル不変条件（在庫非負・冪等・監査/イベント記録）。
 *   - 上位の commerceService: RBAC・状態遷移の正当性・購入可否などの業務ルール。
 *
 * 在庫は applyInventoryMovement を唯一の更新経路とし、数量の直接上書きをしない。
 * reserved/held/quantity の各デルタを受け取り、適用後に quantity>=0 / reserved>=0 / held>=0 /
 * available(=quantity-reserved-held)>=0 を保証する。idempotencyKey 指定時は二重適用しない。
 */
export type InventoryMovementArgs = {
  reason: InventoryMovementReason;
  quantityDelta?: number;
  reservedDelta?: number;
  heldDelta?: number;
  note?: string;
  idempotencyKey?: string;
};

export interface CommerceWriteRepository {
  // ---- 商品 ----
  createProduct(input: ProductCreateInput, ctx: ActorContext): Promise<StoredProduct>;
  updateProduct(id: string, patch: ProductUpdateInput, ctx: ActorContext): Promise<StoredProduct>;
  setProductStatus(id: string, status: ProductStatus, ctx: ActorContext): Promise<StoredProduct>;
  upsertProductTranslation(
    id: string,
    locale: Locale,
    fields: { title?: string; shortDescription?: string; description?: string; story?: string },
    ctx: ActorContext,
  ): Promise<StoredProduct>;
  softDeleteProduct(id: string, ctx: ActorContext): Promise<StoredProduct>;
  restoreProduct(id: string, ctx: ActorContext): Promise<StoredProduct>;
  getProductById(id: string): Promise<StoredProduct | null>;
  /** 書込ストア上の商品一覧（既定で論理削除を除外）。 */
  listManagedProducts(options?: { includeDeleted?: boolean }): Promise<StoredProduct[]>;

  // ---- 在庫 ----
  createInventoryItem(
    input: { productId: string; warehouseId?: string; status?: InventoryStatus },
    ctx: ActorContext,
  ): Promise<InventoryRecord>;
  getInventoryItem(id: string): Promise<InventoryRecord | null>;
  applyInventoryMovement(
    itemId: string,
    args: InventoryMovementArgs,
    ctx: ActorContext,
  ): Promise<InventoryRecord>;
  setInventoryStatus(
    itemId: string,
    status: InventoryStatus,
    ctx: ActorContext,
  ): Promise<InventoryRecord>;

  // ---- 注文 ----
  createOrder(
    input: {
      brandId: string;
      storeId: string;
      currency: OrderRecord["currency"];
      customerId?: string;
      items?: OrderItemInput[];
    },
    ctx: ActorContext,
  ): Promise<OrderRecord>;
  updateOrder(
    id: string,
    patch: { items?: OrderItemInput[] },
    ctx: ActorContext,
  ): Promise<OrderRecord>;
  changeOrderStatus(
    id: string,
    toStatus: OrderStatus,
    ctx: ActorContext,
    note?: string,
  ): Promise<OrderRecord>;
  setOrderNotes(
    id: string,
    notes: { customerNote?: string; internalNote?: string },
    ctx: ActorContext,
  ): Promise<OrderRecord>;
  getOrder(id: string): Promise<OrderRecord | null>;

  // ---- 買付依頼 ----
  createSourcingRequest(
    input: { brandId: string; desiredItem?: string; quantity?: number; message?: string; scheduleId?: string },
    ctx: ActorContext,
  ): Promise<SourcingRequestRecord>;
  setSourcingRequestStatus(
    id: string,
    status: SourcingRequestStatus,
    ctx: ActorContext,
  ): Promise<SourcingRequestRecord>;
  linkSourcingRequestToSchedule(
    id: string,
    scheduleId: string,
    ctx: ActorContext,
  ): Promise<SourcingRequestRecord>;
  getSourcingRequest(id: string): Promise<SourcingRequestRecord | null>;

  // ---- Journal ----
  createJournalDraft(
    input: { brandId: string; slug: string; category: string },
    ctx: ActorContext,
  ): Promise<JournalRecord>;
  upsertJournalTranslation(
    id: string,
    locale: Locale,
    fields: { title: string; excerpt?: string },
    ctx: ActorContext,
  ): Promise<JournalRecord>;
  setJournalStatus(id: string, status: JournalStatus, ctx: ActorContext): Promise<JournalRecord>;
  softDeleteJournal(id: string, ctx: ActorContext): Promise<JournalRecord>;
  getJournal(id: string): Promise<JournalRecord | null>;

  // ---- 監査 ----
  listAuditLogs(): Promise<AuditEntry[]>;
}

export type LocalizedPatch = Partial<LocalizedString>;
