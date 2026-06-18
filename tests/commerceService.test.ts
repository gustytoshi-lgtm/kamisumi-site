import { beforeEach, describe, expect, it } from "vitest";
import { createCommerceService } from "@/lib/commerce/commerceService";
import { createMockWriteRepository, type MockWriteRepository } from "@/repositories/mock/mockCommerceWriteRepository";
import { availableQuantity, type ActorContext } from "@/repositories/core/writeModels";

const owner: ActorContext = { userId: "owner-1", role: "owner" };
const frontStaff: ActorContext = { userId: "front-1", role: "front_staff" };
const inventoryStaff: ActorContext = { userId: "inv-1", role: "inventory_staff" };

const SEEDED_PRODUCT_ID = "matcha-kyoto-midori";

let repo: MockWriteRepository;
let service: ReturnType<typeof createCommerceService>;

beforeEach(() => {
  repo = createMockWriteRepository();
  repo.seed();
  service = createCommerceService(repo);
});

async function newInventoryItem(quantity = 0) {
  const item = await repo.createInventoryItem({ productId: SEEDED_PRODUCT_ID }, owner);
  if (quantity > 0) await service.receiveStock(owner, item.id, quantity);
  return (await repo.getInventoryItem(item.id))!;
}

async function expectError(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toMatchObject({ code });
}

describe("product write (CRUD / status / translation / soft-delete)", () => {
  it("updates status and translation, recording audit", async () => {
    await service.setProductStatus(owner, SEEDED_PRODUCT_ID, "sold_out");
    await service.updateProductTranslation(owner, SEEDED_PRODUCT_ID, "ja", { title: "新タイトル" });
    const product = await repo.getProductById(SEEDED_PRODUCT_ID);
    expect(product?.publicStatus).toBe("sold_out");
    expect(product?.title.ja).toBe("新タイトル");
    const audit = await repo.listAuditLogs();
    expect(audit.some((a) => a.action === "status_change")).toBe(true);
    expect(audit.some((a) => a.action === "translation_update")).toBe(true);
  });

  it("soft-deletes then restores, excluding from active list when deleted", async () => {
    await service.deleteProduct(owner, SEEDED_PRODUCT_ID);
    expect((await repo.getProductById(SEEDED_PRODUCT_ID))?.deletedAt).toBeDefined();
    expect((await repo.listManagedProducts()).some((p) => p.id === SEEDED_PRODUCT_ID)).toBe(false);
    expect((await repo.listManagedProducts({ includeDeleted: true })).some((p) => p.id === SEEDED_PRODUCT_ID)).toBe(true);

    await service.restoreProduct(owner, SEEDED_PRODUCT_ID);
    expect((await repo.getProductById(SEEDED_PRODUCT_ID))?.deletedAt).toBeUndefined();
    expect((await repo.listManagedProducts()).some((p) => p.id === SEEDED_PRODUCT_ID)).toBe(true);
  });

  it("creates a product from a cloned input", async () => {
    const base = await repo.getProductById(SEEDED_PRODUCT_ID);
    const clone = structuredClone(base!);
    delete (clone as { id?: string }).id;
    const created = await service.createProduct(owner, { ...clone, slug: "new-slug", sku: "NEW-1" });
    expect(created.id).toBeDefined();
    expect(created.sku).toBe("NEW-1");
  });
});

describe("inventory (movements, non-negative, reservation restore, double-exec)", () => {
  it("receives stock and increases availability", async () => {
    const item = await newInventoryItem(10);
    expect(item.quantity).toBe(10);
    expect(availableQuantity(item)).toBe(10);
  });

  it("reserves and releases, restoring availability", async () => {
    const item = await newInventoryItem(10);
    const reserved = await service.reserveStock(owner, item.id, 4);
    expect(reserved.reserved).toBe(4);
    expect(availableQuantity(reserved)).toBe(6);
    const released = await service.releaseReservation(owner, item.id, 4);
    expect(released.reserved).toBe(0);
    expect(availableQuantity(released)).toBe(10);
  });

  it("rejects reserving below available stock", async () => {
    const item = await newInventoryItem(3);
    await expectError(service.reserveStock(owner, item.id, 5), "insufficient_stock");
  });

  it("never drives quantity negative", async () => {
    const item = await newInventoryItem(2);
    await expectError(service.adjustStock(owner, item.id, -5), "negative_stock");
  });

  it("prevents double decrement with an idempotency key", async () => {
    const item = await newInventoryItem(10);
    await service.reserveStock(owner, item.id, 3, { idempotencyKey: "reserve-abc" });
    await service.reserveStock(owner, item.id, 3, { idempotencyKey: "reserve-abc" });
    const after = await repo.getInventoryItem(item.id);
    expect(after?.reserved).toBe(3); // 2回目は再適用されない
  });

  it("ships only what is reserved and reduces both physical and reserved", async () => {
    const item = await newInventoryItem(10);
    await service.reserveStock(owner, item.id, 4);
    const shipped = await service.shipAllocate(owner, item.id, 4);
    expect(shipped.quantity).toBe(6);
    expect(shipped.reserved).toBe(0);
    await expectError(service.shipAllocate(owner, item.id, 1), "conflict");
  });

  it("blocks reservation of a non-purchasable product", async () => {
    await service.setProductStatus(owner, SEEDED_PRODUCT_ID, "sold_out");
    const item = await newInventoryItem(10);
    await expectError(service.reserveStock(owner, item.id, 1), "not_purchasable");
  });
});

describe("order status machine via service", () => {
  async function newOrder() {
    return service.createOrder(owner, { brandId: "b", storeId: "s", currency: "TWD" });
  }

  it("advances along valid transitions and records events", async () => {
    const order = await newOrder();
    await service.changeOrderStatus(owner, order.id, "quote_preparing");
    const updated = await service.changeOrderStatus(owner, order.id, "quote_sent");
    expect(updated.status).toBe("quote_sent");
  });

  it("rejects invalid transitions", async () => {
    const order = await newOrder();
    await expectError(service.changeOrderStatus(owner, order.id, "shipped"), "invalid_transition");
  });

  it("cancels and reopens only from cancelled", async () => {
    const order = await newOrder();
    await service.cancelOrder(owner, order.id);
    expect((await repo.getOrder(order.id))?.status).toBe("cancelled");
    const reopened = await service.reopenOrder(owner, order.id);
    expect(reopened.status).toBe("inquiry_received");
  });
});

describe("rbac enforcement (owner vs front_staff vs inventory_staff)", () => {
  it("front_staff cannot manage products or move inventory", async () => {
    await expectError(service.createProduct(frontStaff, {} as never), "forbidden");
    const item = await newInventoryItem(5);
    await expectError(service.receiveStock(frontStaff, item.id, 1), "forbidden");
  });

  it("front_staff can update translations and order status", async () => {
    await expect(
      service.updateProductTranslation(frontStaff, SEEDED_PRODUCT_ID, "ja", { title: "T" }),
    ).resolves.toBeDefined();
    const order = await service.createOrder(frontStaff, { brandId: "b", storeId: "s", currency: "TWD" });
    await expect(service.changeOrderStatus(frontStaff, order.id, "quote_preparing")).resolves.toBeDefined();
  });

  it("inventory_staff can move stock but not edit product catalog", async () => {
    const item = await newInventoryItem(5);
    await service.reserveStock(inventoryStaff, item.id, 2);
    const shipped = await service.shipAllocate(inventoryStaff, item.id, 2);
    expect(shipped.quantity).toBe(3);
    await expectError(service.setProductStatus(inventoryStaff, SEEDED_PRODUCT_ID, "in_stock"), "forbidden");
  });
});

describe("mock reset isolation", () => {
  it("reset clears state", async () => {
    await service.createOrder(owner, { brandId: "b", storeId: "s", currency: "TWD" });
    repo.reset();
    expect(await repo.listAuditLogs()).toHaveLength(0);
    expect(await repo.getProductById(SEEDED_PRODUCT_ID)).toBeNull();
  });
});
