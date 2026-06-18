import type { Locale } from "@/config/site";
import type { Role } from "@/lib/commerce/rbac";
import type { InventoryMovementReason, InventoryStatus } from "@/lib/commerce/inventoryStatus";
import type { OrderStatus } from "@/lib/commerce/orderStatus";
import type { CurrencyCode, Money, Product, ProductStatus } from "@/types/commerce";

/**
 * 書込レイヤの共通モデル・エラー・操作コンテキスト。
 * mock / Supabase の両 write repository が同じ契約（commerceWriteRepository.ts）を満たすための型。
 */

/** 操作ユーザー文脈。監査・権限・所有組織の判定に使う。 */
export type ActorContext = {
  userId: string;
  role: Role;
  organizationId?: string;
};

/** UI が i18n メッセージへマッピングできるよう、原因をコード化したエラー。 */
export type CommerceErrorCode =
  | "forbidden"
  | "not_found"
  | "validation"
  | "invalid_transition"
  | "insufficient_stock"
  | "negative_stock"
  | "duplicate_operation"
  | "conflict"
  | "not_purchasable";

export class CommerceError extends Error {
  readonly code: CommerceErrorCode;
  readonly detail?: Record<string, unknown>;
  constructor(code: CommerceErrorCode, message: string, detail?: Record<string, unknown>) {
    super(message);
    this.name = "CommerceError";
    this.code = code;
    this.detail = detail;
  }
}

/** 在庫の運用レコード（available = quantity - reserved - held）。 */
export type InventoryRecord = {
  id: string;
  organizationId: string;
  productId: string;
  warehouseId?: string;
  quantity: number; // 物理在庫
  reserved: number; // 予約済み
  held: number; // 取り置き
  status: InventoryStatus;
  depositPaid: boolean;
  heldAt?: string;
  holdHours?: number;
  updatedAt: string;
  deletedAt?: string;
};

export function availableQuantity(record: InventoryRecord): number {
  return record.quantity - record.reserved - record.held;
}

export type InventoryMovementRecord = {
  id: string;
  inventoryItemId: string;
  reason: InventoryMovementReason;
  quantityDelta: number;
  resultingQuantity: number;
  resultingReserved: number;
  resultingHeld: number;
  actorId: string;
  note?: string;
  createdAt: string;
};

export type OrderItemInput = {
  productId?: string;
  description?: string;
  quantity: number;
  unitPrice?: Money;
};

export type OrderRecord = {
  id: string;
  organizationId: string;
  brandId: string;
  storeId: string;
  customerId?: string;
  status: OrderStatus;
  currency: CurrencyCode;
  items: (OrderItemInput & { id: string })[];
  customerNote?: string;
  internalNote?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
};

export type OrderStatusEvent = {
  id: string;
  orderId: string;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  changedBy: string;
  note?: string;
  createdAt: string;
};

export type SourcingRequestStatus = "received" | "reviewing" | "accepted" | "declined" | "closed";

export type SourcingRequestRecord = {
  id: string;
  organizationId: string;
  brandId: string;
  customerId?: string;
  scheduleId?: string;
  desiredItem?: string;
  quantity?: number;
  message?: string;
  status: SourcingRequestStatus;
  createdAt: string;
  updatedAt: string;
};

export type JournalStatus = "draft" | "scheduled" | "published" | "unlisted";

export type JournalRecord = {
  id: string;
  organizationId: string;
  brandId: string;
  slug: string;
  category: string;
  status: JournalStatus;
  translations: Partial<Record<Locale, { title: string; excerpt?: string }>>;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
};

export type AuditEntry = {
  id: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  summary?: string;
  createdAt: string;
};

/** 書込ストア上の商品（論理削除フラグ付き）。 */
export type StoredProduct = Product & { deletedAt?: string };

/** 商品の作成・更新入力（公開型 Product のサブセット）。 */
export type ProductCreateInput = Omit<Product, "id"> & { id?: string };
export type ProductUpdateInput = Partial<Omit<Product, "id" | "slug">>;

export type { ProductStatus };
