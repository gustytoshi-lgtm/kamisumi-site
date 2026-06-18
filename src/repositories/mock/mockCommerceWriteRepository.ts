import { siteConfig, type Locale } from "@/config/site";
import { products as seedProducts } from "@/content/kamisumi/products";
import type { InventoryStatus } from "@/lib/commerce/inventoryStatus";
import type { OrderStatus } from "@/lib/commerce/orderStatus";
import type {
  CommerceWriteRepository,
  InventoryMovementArgs,
} from "@/repositories/core/commerceWriteRepository";
import {
  CommerceError,
  availableQuantity,
  type ActorContext,
  type AuditEntry,
  type InventoryMovementRecord,
  type InventoryRecord,
  type JournalRecord,
  type JournalStatus,
  type OrderItemInput,
  type OrderRecord,
  type OrderStatusEvent,
  type ProductCreateInput,
  type ProductStatus,
  type ProductUpdateInput,
  type SourcingRequestRecord,
  type SourcingRequestStatus,
  type StoredProduct,
} from "@/repositories/core/writeModels";

const ORG = siteConfig.organization.id;

/**
 * 開発・テスト専用の in-memory 書込 repository。
 * - source の fixture（content/*）は直接書き換えず、起動/seed 時に deep copy する。
 * - reset() / seed() でテスト間の状態分離が可能。
 * - 注意: 開発サーバー再起動で状態は消える（本番DBの代替ではない）。public read repo（fixture）とは別ストア。
 */
export type MockWriteRepository = CommerceWriteRepository & {
  reset(): void;
  seed(): void;
};

type Store = {
  products: Map<string, StoredProduct>;
  inventory: Map<string, InventoryRecord>;
  movements: InventoryMovementRecord[];
  orders: Map<string, OrderRecord>;
  orderEvents: OrderStatusEvent[];
  sourcing: Map<string, SourcingRequestRecord>;
  journal: Map<string, JournalRecord>;
  audit: AuditEntry[];
  idempotency: Set<string>;
  counter: number;
};

function emptyStore(): Store {
  return {
    products: new Map(),
    inventory: new Map(),
    movements: [],
    orders: new Map(),
    orderEvents: [],
    sourcing: new Map(),
    journal: new Map(),
    audit: [],
    idempotency: new Set(),
    counter: 0,
  };
}

export function createMockWriteRepository(): MockWriteRepository {
  let store = emptyStore();
  const now = () => new Date().toISOString();
  const id = (prefix: string) => `${prefix}-${++store.counter}`;
  const audit = (ctx: ActorContext, action: string, entityType: string, entityId: string, summary?: string) => {
    store.audit.push({
      id: id("audit"),
      actorId: ctx.userId,
      action,
      entityType,
      entityId,
      summary,
      createdAt: now(),
    });
  };

  function seed(): void {
    store = emptyStore();
    for (const product of seedProducts) {
      store.products.set(product.id, structuredClone(product) as StoredProduct);
    }
  }

  function requireProduct(productId: string): StoredProduct {
    const product = store.products.get(productId);
    if (!product) throw new CommerceError("not_found", `product ${productId} not found`);
    return product;
  }
  function requireInventory(itemId: string): InventoryRecord {
    const item = store.inventory.get(itemId);
    if (!item) throw new CommerceError("not_found", `inventory ${itemId} not found`);
    return item;
  }
  function requireOrder(orderId: string): OrderRecord {
    const order = store.orders.get(orderId);
    if (!order) throw new CommerceError("not_found", `order ${orderId} not found`);
    return order;
  }

  const repo: MockWriteRepository = {
    reset() {
      store = emptyStore();
    },
    seed,

    // ---- 商品 ----
    async createProduct(input: ProductCreateInput, ctx) {
      const productId = input.id ?? id("prod");
      const product = { ...(input as StoredProduct), id: productId };
      store.products.set(productId, product);
      audit(ctx, "create", "product", productId, product.sku);
      return product;
    },
    async updateProduct(productId, patch: ProductUpdateInput, ctx) {
      const current = requireProduct(productId);
      const updated = { ...current, ...patch };
      store.products.set(productId, updated);
      audit(ctx, "update", "product", productId);
      return updated;
    },
    async setProductStatus(productId, status: ProductStatus, ctx) {
      const current = requireProduct(productId);
      const updated = { ...current, publicStatus: status };
      store.products.set(productId, updated);
      audit(ctx, "status_change", "product", productId, status);
      return updated;
    },
    async upsertProductTranslation(productId, locale: Locale, fields, ctx) {
      const current = requireProduct(productId);
      const updated: StoredProduct = { ...current };
      if (fields.title !== undefined) updated.title = { ...current.title, [locale]: fields.title };
      if (fields.shortDescription !== undefined)
        updated.shortDescription = { ...current.shortDescription, [locale]: fields.shortDescription };
      if (fields.description !== undefined)
        updated.description = { ...current.description, [locale]: fields.description };
      if (fields.story !== undefined) updated.story = { ...current.story, [locale]: fields.story };
      store.products.set(productId, updated);
      audit(ctx, "translation_update", "product", productId, locale);
      return updated;
    },
    async softDeleteProduct(productId, ctx) {
      const current = requireProduct(productId);
      const updated = { ...current, deletedAt: now() };
      store.products.set(productId, updated);
      audit(ctx, "delete", "product", productId);
      return updated;
    },
    async restoreProduct(productId, ctx) {
      const current = requireProduct(productId);
      const updated = { ...current };
      delete updated.deletedAt;
      store.products.set(productId, updated);
      audit(ctx, "restore", "product", productId);
      return updated;
    },
    async getProductById(productId) {
      return store.products.get(productId) ?? null;
    },
    async listManagedProducts(options) {
      const all = [...store.products.values()];
      return options?.includeDeleted ? all : all.filter((product) => !product.deletedAt);
    },

    // ---- 在庫 ----
    async createInventoryItem(input, ctx) {
      const itemId = id("inv");
      const record: InventoryRecord = {
        id: itemId,
        organizationId: ORG,
        productId: input.productId,
        warehouseId: input.warehouseId,
        quantity: 0,
        reserved: 0,
        held: 0,
        status: input.status ?? "available",
        depositPaid: false,
        updatedAt: now(),
      };
      store.inventory.set(itemId, record);
      audit(ctx, "create", "inventory_item", itemId, input.productId);
      return record;
    },
    async getInventoryItem(itemId) {
      return store.inventory.get(itemId) ?? null;
    },
    async applyInventoryMovement(itemId, args: InventoryMovementArgs, ctx) {
      const item = requireInventory(itemId);

      // 冪等: 同じ idempotencyKey の二重実行は再適用しない（在庫二重減算防止）。
      if (args.idempotencyKey) {
        if (store.idempotency.has(args.idempotencyKey)) return item;
      }

      const nextQuantity = item.quantity + (args.quantityDelta ?? 0);
      const nextReserved = item.reserved + (args.reservedDelta ?? 0);
      const nextHeld = item.held + (args.heldDelta ?? 0);

      if (nextQuantity < 0) {
        throw new CommerceError("negative_stock", "quantity would go negative", { itemId });
      }
      if (nextReserved < 0 || nextHeld < 0) {
        throw new CommerceError("conflict", "reserved/held would go negative", { itemId });
      }
      if (nextQuantity - nextReserved - nextHeld < 0) {
        throw new CommerceError("insufficient_stock", "available would go negative", {
          itemId,
          available: availableQuantity(item),
        });
      }

      item.quantity = nextQuantity;
      item.reserved = nextReserved;
      item.held = nextHeld;
      item.updatedAt = now();
      store.inventory.set(itemId, item);

      store.movements.push({
        id: id("mv"),
        inventoryItemId: itemId,
        reason: args.reason,
        quantityDelta: args.quantityDelta ?? 0,
        resultingQuantity: nextQuantity,
        resultingReserved: nextReserved,
        resultingHeld: nextHeld,
        actorId: ctx.userId,
        note: args.note,
        createdAt: now(),
      });
      audit(ctx, "inventory_movement", "inventory_item", itemId, args.reason);
      if (args.idempotencyKey) store.idempotency.add(args.idempotencyKey);
      return item;
    },
    async setInventoryStatus(itemId, status: InventoryStatus, ctx) {
      const item = requireInventory(itemId);
      item.status = status;
      item.updatedAt = now();
      store.inventory.set(itemId, item);
      audit(ctx, "status_change", "inventory_item", itemId, status);
      return item;
    },

    // ---- 注文 ----
    async createOrder(input, ctx) {
      const orderId = id("order");
      const order: OrderRecord = {
        id: orderId,
        organizationId: ORG,
        brandId: input.brandId,
        storeId: input.storeId,
        customerId: input.customerId,
        status: "inquiry_received",
        currency: input.currency,
        items: (input.items ?? []).map((item) => ({ ...item, id: id("item") })),
        createdAt: now(),
        updatedAt: now(),
      };
      store.orders.set(orderId, order);
      store.orderEvents.push({
        id: id("oevent"),
        orderId,
        fromStatus: null,
        toStatus: "inquiry_received",
        changedBy: ctx.userId,
        createdAt: now(),
      });
      audit(ctx, "create", "order", orderId);
      return order;
    },
    async updateOrder(orderId, patch: { items?: OrderItemInput[] }, ctx) {
      const order = requireOrder(orderId);
      if (patch.items) order.items = patch.items.map((item) => ({ ...item, id: id("item") }));
      order.updatedAt = now();
      store.orders.set(orderId, order);
      audit(ctx, "update", "order", orderId);
      return order;
    },
    async changeOrderStatus(orderId, toStatus: OrderStatus, ctx, note) {
      const order = requireOrder(orderId);
      const fromStatus = order.status;
      order.status = toStatus;
      order.updatedAt = now();
      store.orders.set(orderId, order);
      store.orderEvents.push({
        id: id("oevent"),
        orderId,
        fromStatus,
        toStatus,
        changedBy: ctx.userId,
        note,
        createdAt: now(),
      });
      audit(ctx, "status_change", "order", orderId, `${fromStatus}->${toStatus}`);
      return order;
    },
    async setOrderNotes(orderId, notes, ctx) {
      const order = requireOrder(orderId);
      if (notes.customerNote !== undefined) order.customerNote = notes.customerNote;
      if (notes.internalNote !== undefined) order.internalNote = notes.internalNote;
      order.updatedAt = now();
      store.orders.set(orderId, order);
      audit(ctx, "note_update", "order", orderId);
      return order;
    },
    async getOrder(orderId) {
      return store.orders.get(orderId) ?? null;
    },

    // ---- 買付依頼 ----
    async createSourcingRequest(input, ctx) {
      const reqId = id("sourcing");
      const record: SourcingRequestRecord = {
        id: reqId,
        organizationId: ORG,
        brandId: input.brandId,
        desiredItem: input.desiredItem,
        quantity: input.quantity,
        message: input.message,
        scheduleId: input.scheduleId,
        status: "received",
        createdAt: now(),
        updatedAt: now(),
      };
      store.sourcing.set(reqId, record);
      audit(ctx, "create", "sourcing_request", reqId);
      return record;
    },
    async setSourcingRequestStatus(reqId, status: SourcingRequestStatus, ctx) {
      const record = store.sourcing.get(reqId);
      if (!record) throw new CommerceError("not_found", `sourcing ${reqId} not found`);
      record.status = status;
      record.updatedAt = now();
      store.sourcing.set(reqId, record);
      audit(ctx, "status_change", "sourcing_request", reqId, status);
      return record;
    },
    async linkSourcingRequestToSchedule(reqId, scheduleId, ctx) {
      const record = store.sourcing.get(reqId);
      if (!record) throw new CommerceError("not_found", `sourcing ${reqId} not found`);
      record.scheduleId = scheduleId;
      record.updatedAt = now();
      store.sourcing.set(reqId, record);
      audit(ctx, "link_schedule", "sourcing_request", reqId, scheduleId);
      return record;
    },
    async getSourcingRequest(reqId) {
      return store.sourcing.get(reqId) ?? null;
    },

    // ---- Journal ----
    async createJournalDraft(input, ctx) {
      const journalId = id("journal");
      const record: JournalRecord = {
        id: journalId,
        organizationId: ORG,
        brandId: input.brandId,
        slug: input.slug,
        category: input.category,
        status: "draft",
        translations: {},
        createdAt: now(),
        updatedAt: now(),
      };
      store.journal.set(journalId, record);
      audit(ctx, "create", "journal", journalId, input.slug);
      return record;
    },
    async upsertJournalTranslation(journalId, locale: Locale, fields, ctx) {
      const record = store.journal.get(journalId);
      if (!record) throw new CommerceError("not_found", `journal ${journalId} not found`);
      record.translations = { ...record.translations, [locale]: fields };
      record.updatedAt = now();
      store.journal.set(journalId, record);
      audit(ctx, "translation_update", "journal", journalId, locale);
      return record;
    },
    async setJournalStatus(journalId, status: JournalStatus, ctx) {
      const record = store.journal.get(journalId);
      if (!record) throw new CommerceError("not_found", `journal ${journalId} not found`);
      record.status = status;
      if (status === "published" && !record.publishedAt) {
        record.publishedAt = now().slice(0, 10);
      }
      record.updatedAt = now();
      store.journal.set(journalId, record);
      audit(ctx, "status_change", "journal", journalId, status);
      return record;
    },
    async softDeleteJournal(journalId, ctx) {
      const record = store.journal.get(journalId);
      if (!record) throw new CommerceError("not_found", `journal ${journalId} not found`);
      record.deletedAt = now();
      store.journal.set(journalId, record);
      audit(ctx, "delete", "journal", journalId);
      return record;
    },
    async getJournal(journalId) {
      return store.journal.get(journalId) ?? null;
    },

    // ---- 監査 ----
    async listAuditLogs() {
      return [...store.audit];
    },
  };

  return repo;
}

/** アプリ既定の mock 書込 repository（起動時に fixture から seed）。 */
export const mockCommerceWriteRepository = createMockWriteRepository();
mockCommerceWriteRepository.seed();
