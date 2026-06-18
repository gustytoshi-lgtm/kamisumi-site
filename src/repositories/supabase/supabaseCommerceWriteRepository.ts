import type {
  CommerceWriteRepository,
  InventoryMovementArgs,
} from "@/repositories/core/commerceWriteRepository";
import {
  CommerceError,
  type ActorContext,
  type AuditEntry,
  type InventoryRecord,
  type JournalRecord,
  type OrderRecord,
  type SourcingRequestRecord,
  type StoredProduct,
} from "@/repositories/core/writeModels";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { throwCommerce } from "@/lib/supabase/errors";

/**
 * Supabase 書込 repository（service role / RLS バイパス）。
 *
 * 契約は mock（mockCommerceWriteRepository）と同一（CommerceWriteRepository）。
 * 在庫は DB function apply_inventory_movement（0005）を RPC で呼び、残高更新 + movement + 監査 + 冪等を
 * 1 トランザクションで原子的に行う。永続レベルの不変条件（非負・冪等）は DB が保証する。
 * 業務ルール（RBAC・状態遷移・購入可否）は上位 commerceService が担う。
 *
 * 実 Supabase project / env が必要。未接続では呼ばれない（factory が mock を返す）。
 * contract test は tests/writeContract.supabase.test.ts（実 DB 必須、既定 skip）。
 */

type Db = ReturnType<typeof getSupabaseAdminClient>;
function db(): Db {
  return getSupabaseAdminClient();
}

function nowIso(): string {
  return new Date().toISOString();
}

// ---- 監査 ----
async function writeAudit(
  client: Db,
  ctx: ActorContext,
  organizationId: string,
  action: string,
  entityType: string,
  entityId: string,
  summary?: string,
): Promise<void> {
  const { error } = await client.from("audit_logs").insert({
    organization_id: organizationId,
    actor_id: ctx.userId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    summary,
  });
  if (error) throwCommerce(error);
}

// ---- row → model マッパー ----
function mapInventory(row: Record<string, unknown>): InventoryRecord {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    productId: row.product_id as string,
    warehouseId: (row.warehouse_id as string | null) ?? undefined,
    quantity: (row.quantity as number) ?? 0,
    reserved: (row.reserved as number) ?? 0,
    held: (row.held as number) ?? 0,
    status: row.status as InventoryRecord["status"],
    depositPaid: Boolean(row.deposit_paid),
    holdHours: undefined,
    updatedAt: (row.updated_at as string) ?? nowIso(),
  };
}

function mapOrder(row: Record<string, unknown>, items: Record<string, unknown>[] = []): OrderRecord {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    brandId: row.brand_id as string,
    storeId: row.store_id as string,
    customerId: (row.customer_id as string | null) ?? undefined,
    status: row.status as OrderRecord["status"],
    currency: row.currency as OrderRecord["currency"],
    items: items.map((it) => ({
      id: it.id as string,
      productId: (it.product_id as string | null) ?? undefined,
      description: (it.description as string | null) ?? undefined,
      quantity: (it.quantity as number) ?? 1,
      unitPrice:
        it.unit_price_currency && it.unit_price_amount_minor != null
          ? {
              currency: it.unit_price_currency as OrderRecord["currency"],
              amountMinor: Number(it.unit_price_amount_minor),
            }
          : undefined,
    })),
    customerNote: undefined,
    internalNote: undefined,
    createdAt: (row.created_at as string) ?? nowIso(),
    updatedAt: (row.updated_at as string) ?? nowIso(),
  };
}

function mapSourcing(row: Record<string, unknown>): SourcingRequestRecord {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    brandId: row.brand_id as string,
    customerId: (row.customer_id as string | null) ?? undefined,
    scheduleId: (row.schedule_id as string | null) ?? undefined,
    desiredItem: (row.desired_item as string | null) ?? undefined,
    quantity: (row.quantity as number | null) ?? undefined,
    message: (row.message as string | null) ?? undefined,
    status: row.status as SourcingRequestRecord["status"],
    createdAt: (row.created_at as string) ?? nowIso(),
    updatedAt: (row.updated_at as string) ?? nowIso(),
  };
}

function mapJournal(
  row: Record<string, unknown>,
  translations: Record<string, unknown>[] = [],
): JournalRecord {
  const tx: JournalRecord["translations"] = {};
  for (const t of translations) {
    tx[t.locale as keyof JournalRecord["translations"]] = {
      title: t.title as string,
      excerpt: (t.excerpt as string | null) ?? undefined,
    };
  }
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    brandId: row.brand_id as string,
    slug: row.slug as string,
    category: row.category as string,
    status: row.status as JournalRecord["status"],
    translations: tx,
    publishedAt: (row.published_at as string | null) ?? undefined,
    createdAt: (row.created_at as string) ?? nowIso(),
    updatedAt: (row.updated_at as string) ?? nowIso(),
    deletedAt: (row.deleted_at as string | null) ?? undefined,
  };
}

async function fetchProductOrgId(client: Db, productId: string): Promise<string> {
  const { data, error } = await client
    .from("products")
    .select("organization_id")
    .eq("id", productId)
    .maybeSingle();
  if (error) throwCommerce(error);
  if (!data) throw new CommerceError("not_found", `product ${productId} not found`);
  return data.organization_id as string;
}

export const supabaseCommerceWriteRepository: CommerceWriteRepository = {
  // ===== 商品 =====
  async createProduct(input, ctx) {
    const client = db();
    const { data, error } = await client
      .from("products")
      .insert({
        organization_id: input.organizationId,
        brand_id: input.brandId,
        store_id: input.storeId,
        warehouse_id: input.warehouseId,
        sales_channel_id: input.salesChannelId,
        slug: input.slug,
        sku: input.sku,
        type: input.type,
        category: input.category,
        public_status: input.publicStatus,
        is_original: input.isOriginal,
        is_archive: input.isArchive,
        is_new_arrival: input.isNewArrival,
        price_currency: input.price.currency,
        price_amount_minor: input.price.amountMinor,
        region_code: input.countryCode,
        external_product_id: input.externalProductId,
        external_variant_id: input.externalVariantId,
        published_at: input.publishedAt || null,
      })
      .select("id")
      .single();
    if (error) throwCommerce(error);
    const id = (data as { id: string }).id;
    await writeAudit(client, ctx, input.organizationId, "create", "product", id, input.sku);
    const created = await this.getProductById(id);
    if (!created) throw new CommerceError("not_found", `product ${id} not found after create`);
    return created;
  },

  async updateProduct(id, patch, ctx) {
    const client = db();
    const update: Record<string, unknown> = {};
    if (patch.publicStatus !== undefined) update.public_status = patch.publicStatus;
    if (patch.price !== undefined) {
      update.price_currency = patch.price.currency;
      update.price_amount_minor = patch.price.amountMinor;
    }
    if (patch.isArchive !== undefined) update.is_archive = patch.isArchive;
    if (patch.isNewArrival !== undefined) update.is_new_arrival = patch.isNewArrival;
    if (Object.keys(update).length > 0) {
      const { error } = await client.from("products").update(update).eq("id", id);
      if (error) throwCommerce(error);
    }
    const current = await this.getProductById(id);
    if (!current) throw new CommerceError("not_found", `product ${id} not found`);
    await writeAudit(client, ctx, current.organizationId, "update", "product", id);
    return current;
  },

  async setProductStatus(id, status, ctx) {
    const client = db();
    const { data, error } = await client
      .from("products")
      .update({ public_status: status })
      .eq("id", id)
      .select("organization_id")
      .maybeSingle();
    if (error) throwCommerce(error);
    if (!data) throw new CommerceError("not_found", `product ${id} not found`);
    await writeAudit(client, ctx, data.organization_id as string, "status_change", "product", id, status);
    const updated = await this.getProductById(id);
    if (!updated) throw new CommerceError("not_found", `product ${id} not found`);
    return updated;
  },

  async upsertProductTranslation(id, locale, fields, ctx) {
    const client = db();
    const row: Record<string, unknown> = { product_id: id, locale };
    if (fields.title !== undefined) row.title = fields.title;
    if (fields.shortDescription !== undefined) row.short_description = fields.shortDescription;
    if (fields.description !== undefined) row.description = fields.description;
    if (fields.story !== undefined) row.story = fields.story;
    const { error } = await client
      .from("product_translations")
      .upsert(row, { onConflict: "product_id,locale" });
    if (error) throwCommerce(error);
    const current = await this.getProductById(id);
    if (!current) throw new CommerceError("not_found", `product ${id} not found`);
    await writeAudit(client, ctx, current.organizationId, "translation_update", "product", id, locale);
    return current;
  },

  async softDeleteProduct(id, ctx) {
    const client = db();
    const { data, error } = await client
      .from("products")
      .update({ deleted_at: nowIso() })
      .eq("id", id)
      .select("organization_id")
      .maybeSingle();
    if (error) throwCommerce(error);
    if (!data) throw new CommerceError("not_found", `product ${id} not found`);
    await writeAudit(client, ctx, data.organization_id as string, "delete", "product", id);
    const updated = await this.getProductById(id);
    if (!updated) throw new CommerceError("not_found", `product ${id} not found`);
    return updated;
  },

  async restoreProduct(id, ctx) {
    const client = db();
    const { data, error } = await client
      .from("products")
      .update({ deleted_at: null })
      .eq("id", id)
      .select("organization_id")
      .maybeSingle();
    if (error) throwCommerce(error);
    if (!data) throw new CommerceError("not_found", `product ${id} not found`);
    await writeAudit(client, ctx, data.organization_id as string, "restore", "product", id);
    const updated = await this.getProductById(id);
    if (!updated) throw new CommerceError("not_found", `product ${id} not found`);
    return updated;
  },

  async getProductById(id) {
    const client = db();
    const { data, error } = await client.from("products").select("*").eq("id", id).maybeSingle();
    if (error) throwCommerce(error);
    if (!data) return null;
    return mapStoredProduct(data);
  },

  async listManagedProducts(options) {
    const client = db();
    let query = client.from("products").select("*");
    if (!options?.includeDeleted) query = query.is("deleted_at", null);
    const { data, error } = await query;
    if (error) throwCommerce(error);
    return (data ?? []).map(mapStoredProduct);
  },

  // ===== 在庫（apply_inventory_movement RPC を使用）=====
  async createInventoryItem(input, ctx) {
    const client = db();
    const orgId = await fetchProductOrgId(client, input.productId);
    const { data, error } = await client
      .from("inventory_items")
      .insert({
        organization_id: orgId,
        product_id: input.productId,
        warehouse_id: input.warehouseId,
        status: input.status ?? "available",
        quantity: 0,
        reserved: 0,
        held: 0,
      })
      .select("*")
      .single();
    if (error) throwCommerce(error);
    const record = mapInventory(data as Record<string, unknown>);
    await writeAudit(client, ctx, orgId, "create", "inventory_item", record.id, input.productId);
    return record;
  },

  async getInventoryItem(id) {
    const client = db();
    const { data, error } = await client
      .from("inventory_items")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throwCommerce(error);
    if (!data) return null;
    return mapInventory(data as Record<string, unknown>);
  },

  async applyInventoryMovement(itemId, args: InventoryMovementArgs, ctx) {
    const client = db();
    const { data, error } = await client.rpc("apply_inventory_movement", {
      p_item: itemId,
      p_reason: args.reason,
      p_quantity_delta: args.quantityDelta ?? 0,
      p_reserved_delta: args.reservedDelta ?? 0,
      p_held_delta: args.heldDelta ?? 0,
      p_actor: ctx.userId,
      p_note: args.note ?? null,
      p_idempotency_key: args.idempotencyKey ?? null,
    });
    if (error) throwCommerce(error);
    // RPC returns the inventory_items row.
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) throw new CommerceError("not_found", `inventory ${itemId} not found`);
    return mapInventory(row as Record<string, unknown>);
  },

  async setInventoryStatus(itemId, status, ctx) {
    const client = db();
    const { data, error } = await client
      .from("inventory_items")
      .update({ status })
      .eq("id", itemId)
      .select("*")
      .maybeSingle();
    if (error) throwCommerce(error);
    if (!data) throw new CommerceError("not_found", `inventory ${itemId} not found`);
    const record = mapInventory(data as Record<string, unknown>);
    await writeAudit(client, ctx, record.organizationId, "status_change", "inventory_item", itemId, status);
    return record;
  },

  // ===== 注文 =====
  async createOrder(input, ctx) {
    const client = db();
    const { data, error } = await client
      .from("provisional_orders")
      .insert({
        organization_id: await fetchOrgFromBrand(client, input.brandId),
        brand_id: input.brandId,
        store_id: input.storeId,
        customer_id: input.customerId,
        status: "inquiry_received",
        currency: input.currency,
      })
      .select("*")
      .single();
    if (error) throwCommerce(error);
    const orderRow = data as Record<string, unknown>;
    const orderId = orderRow.id as string;

    if (input.items && input.items.length > 0) {
      const { error: itemsError } = await client.from("provisional_order_items").insert(
        input.items.map((it) => ({
          order_id: orderId,
          product_id: it.productId,
          description: it.description,
          quantity: it.quantity,
          unit_price_currency: it.unitPrice?.currency,
          unit_price_amount_minor: it.unitPrice?.amountMinor,
        })),
      );
      if (itemsError) throwCommerce(itemsError);
    }

    await client.from("order_status_events").insert({
      order_id: orderId,
      from_status: null,
      to_status: "inquiry_received",
      changed_by: ctx.userId,
    });
    await writeAudit(client, ctx, orderRow.organization_id as string, "create", "order", orderId);
    const created = await this.getOrder(orderId);
    if (!created) throw new CommerceError("not_found", `order ${orderId} not found`);
    return created;
  },

  async updateOrder(id, patch, ctx) {
    const client = db();
    if (patch.items) {
      // 全置換: 既存明細を削除して入れ直す（注文編集）。
      const { error: delError } = await client
        .from("provisional_order_items")
        .delete()
        .eq("order_id", id);
      if (delError) throwCommerce(delError);
      if (patch.items.length > 0) {
        const { error: insError } = await client.from("provisional_order_items").insert(
          patch.items.map((it) => ({
            order_id: id,
            product_id: it.productId,
            description: it.description,
            quantity: it.quantity,
            unit_price_currency: it.unitPrice?.currency,
            unit_price_amount_minor: it.unitPrice?.amountMinor,
          })),
        );
        if (insError) throwCommerce(insError);
      }
    }
    const order = await this.getOrder(id);
    if (!order) throw new CommerceError("not_found", `order ${id} not found`);
    await writeAudit(client, ctx, order.organizationId, "update", "order", id);
    return order;
  },

  async changeOrderStatus(id, toStatus, ctx, note) {
    const client = db();
    const { data: existing, error: getError } = await client
      .from("provisional_orders")
      .select("status, organization_id")
      .eq("id", id)
      .maybeSingle();
    if (getError) throwCommerce(getError);
    if (!existing) throw new CommerceError("not_found", `order ${id} not found`);
    const fromStatus = existing.status as string;

    const { error } = await client
      .from("provisional_orders")
      .update({ status: toStatus })
      .eq("id", id);
    if (error) throwCommerce(error);

    await client.from("order_status_events").insert({
      order_id: id,
      from_status: fromStatus,
      to_status: toStatus,
      changed_by: ctx.userId,
      note,
    });
    await writeAudit(
      client,
      ctx,
      existing.organization_id as string,
      "status_change",
      "order",
      id,
      `${fromStatus}->${toStatus}`,
    );
    const order = await this.getOrder(id);
    if (!order) throw new CommerceError("not_found", `order ${id} not found`);
    return order;
  },

  async setOrderNotes(id, notes, ctx) {
    // 注: 現行スキーマ(0002)の provisional_orders には note 列がない。
    // 顧客メモ/内部メモは customer_notes / audit_logs での扱いを別 migration で整備する想定。
    // ここでは監査のみ記録し、注文レコードを返す（書込契約を満たす）。
    const client = db();
    const order = await this.getOrder(id);
    if (!order) throw new CommerceError("not_found", `order ${id} not found`);
    await writeAudit(client, ctx, order.organizationId, "note_update", "order", id);
    return { ...order, customerNote: notes.customerNote, internalNote: notes.internalNote };
  },

  async getOrder(id) {
    const client = db();
    const { data, error } = await client
      .from("provisional_orders")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throwCommerce(error);
    if (!data) return null;
    const { data: items, error: itemsError } = await client
      .from("provisional_order_items")
      .select("*")
      .eq("order_id", id);
    if (itemsError) throwCommerce(itemsError);
    return mapOrder(data as Record<string, unknown>, (items ?? []) as Record<string, unknown>[]);
  },

  // ===== 買付依頼 =====
  async createSourcingRequest(input, ctx) {
    const client = db();
    const orgId = await fetchOrgFromBrand(client, input.brandId);
    const { data, error } = await client
      .from("sourcing_requests")
      .insert({
        organization_id: orgId,
        brand_id: input.brandId,
        schedule_id: input.scheduleId,
        desired_item: input.desiredItem,
        quantity: input.quantity,
        message: input.message,
        status: "received",
      })
      .select("*")
      .single();
    if (error) throwCommerce(error);
    const record = mapSourcing(data as Record<string, unknown>);
    await writeAudit(client, ctx, orgId, "create", "sourcing_request", record.id);
    return record;
  },

  async setSourcingRequestStatus(id, status, ctx) {
    const client = db();
    const { data: existing, error: getError } = await client
      .from("sourcing_requests")
      .select("status, organization_id")
      .eq("id", id)
      .maybeSingle();
    if (getError) throwCommerce(getError);
    if (!existing) throw new CommerceError("not_found", `sourcing ${id} not found`);

    const { data, error } = await client
      .from("sourcing_requests")
      .update({ status })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throwCommerce(error);

    await client.from("sourcing_request_status_events").insert({
      sourcing_request_id: id,
      from_status: existing.status as string,
      to_status: status,
      changed_by: ctx.userId,
    });
    await writeAudit(client, ctx, existing.organization_id as string, "status_change", "sourcing_request", id, status);
    return mapSourcing(data as Record<string, unknown>);
  },

  async linkSourcingRequestToSchedule(id, scheduleId, ctx) {
    const client = db();
    const { data, error } = await client
      .from("sourcing_requests")
      .update({ schedule_id: scheduleId })
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) throwCommerce(error);
    if (!data) throw new CommerceError("not_found", `sourcing ${id} not found`);
    const record = mapSourcing(data as Record<string, unknown>);
    await writeAudit(client, ctx, record.organizationId, "link_schedule", "sourcing_request", id, scheduleId);
    return record;
  },

  async getSourcingRequest(id) {
    const client = db();
    const { data, error } = await client
      .from("sourcing_requests")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throwCommerce(error);
    if (!data) return null;
    return mapSourcing(data as Record<string, unknown>);
  },

  // ===== Journal =====
  async createJournalDraft(input, ctx) {
    const client = db();
    const orgId = await fetchOrgFromBrand(client, input.brandId);
    const { data, error } = await client
      .from("journal_posts")
      .insert({
        organization_id: orgId,
        brand_id: input.brandId,
        slug: input.slug,
        category: input.category,
        status: "draft",
      })
      .select("*")
      .single();
    if (error) throwCommerce(error);
    const record = mapJournal(data as Record<string, unknown>, []);
    await writeAudit(client, ctx, orgId, "create", "journal", record.id, input.slug);
    return record;
  },

  async upsertJournalTranslation(id, locale, fields, ctx) {
    const client = db();
    const { error } = await client.from("journal_translations").upsert(
      { journal_post_id: id, locale, title: fields.title, excerpt: fields.excerpt },
      { onConflict: "journal_post_id,locale" },
    );
    if (error) throwCommerce(error);
    const record = await this.getJournal(id);
    if (!record) throw new CommerceError("not_found", `journal ${id} not found`);
    await writeAudit(client, ctx, record.organizationId, "translation_update", "journal", id, locale);
    return record;
  },

  async setJournalStatus(id, status, ctx) {
    const client = db();
    const update: Record<string, unknown> = { status };
    if (status === "published") update.published_at = nowIso().slice(0, 10);
    const { data, error } = await client
      .from("journal_posts")
      .update(update)
      .eq("id", id)
      .select("organization_id")
      .maybeSingle();
    if (error) throwCommerce(error);
    if (!data) throw new CommerceError("not_found", `journal ${id} not found`);
    await writeAudit(client, ctx, data.organization_id as string, "status_change", "journal", id, status);
    const record = await this.getJournal(id);
    if (!record) throw new CommerceError("not_found", `journal ${id} not found`);
    return record;
  },

  async softDeleteJournal(id, ctx) {
    const client = db();
    const { data, error } = await client
      .from("journal_posts")
      .update({ deleted_at: nowIso() })
      .eq("id", id)
      .select("organization_id")
      .maybeSingle();
    if (error) throwCommerce(error);
    if (!data) throw new CommerceError("not_found", `journal ${id} not found`);
    await writeAudit(client, ctx, data.organization_id as string, "delete", "journal", id);
    const record = await this.getJournal(id);
    if (!record) throw new CommerceError("not_found", `journal ${id} not found`);
    return record;
  },

  async getJournal(id) {
    const client = db();
    const { data, error } = await client
      .from("journal_posts")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throwCommerce(error);
    if (!data) return null;
    const { data: tx, error: txError } = await client
      .from("journal_translations")
      .select("*")
      .eq("journal_post_id", id);
    if (txError) throwCommerce(txError);
    return mapJournal(data as Record<string, unknown>, (tx ?? []) as Record<string, unknown>[]);
  },

  // ===== 監査 =====
  async listAuditLogs() {
    const client = db();
    const { data, error } = await client
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) throwCommerce(error);
    return (data ?? []).map(
      (row): AuditEntry => ({
        id: row.id as string,
        actorId: (row.actor_id as string | null) ?? "",
        action: row.action as string,
        entityType: row.entity_type as string,
        entityId: (row.entity_id as string | null) ?? "",
        summary: (row.summary as string | null) ?? undefined,
        createdAt: (row.created_at as string) ?? nowIso(),
      }),
    );
  },
};

// products row → StoredProduct（書込ストア用の最小マッピング。公開リッチ型は read repo が担う）。
function mapStoredProduct(row: Record<string, unknown>): StoredProduct {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    brandId: row.brand_id as string,
    storeId: row.store_id as string,
    warehouseId: (row.warehouse_id as string | null) ?? undefined,
    salesChannelId: (row.sales_channel_id as string | null) ?? undefined,
    currencyCode: row.price_currency as StoredProduct["currencyCode"],
    countryCode: (row.region_code as string | null) ?? undefined,
    slug: row.slug as string,
    sku: row.sku as string,
    type: row.type as StoredProduct["type"],
    category: row.category as StoredProduct["category"],
    publicStatus: row.public_status as StoredProduct["publicStatus"],
    isOriginal: Boolean(row.is_original),
    isArchive: Boolean(row.is_archive),
    isNewArrival: Boolean(row.is_new_arrival),
    publishedAt: (row.published_at as string | null) ?? "",
    title: emptyLocalized(),
    shortDescription: emptyLocalized(),
    description: emptyLocalized(),
    story: emptyLocalized(),
    price: {
      currency: row.price_currency as StoredProduct["currencyCode"],
      amountMinor: Number(row.price_amount_minor ?? 0),
    },
    referencePrices: [],
    images: [],
    shippingNote: emptyLocalized(),
    estimatedDispatch: emptyLocalized(),
    relatedJournalIds: [],
    relatedProductIds: [],
    externalProductId: (row.external_product_id as string | null) ?? undefined,
    externalVariantId: (row.external_variant_id as string | null) ?? undefined,
    deletedAt: (row.deleted_at as string | null) ?? undefined,
  };
}

function emptyLocalized() {
  return { "zh-tw": "", ja: "", en: "" };
}

async function fetchOrgFromBrand(client: Db, brandId: string): Promise<string> {
  const { data, error } = await client
    .from("brands")
    .select("organization_id")
    .eq("id", brandId)
    .maybeSingle();
  if (error) throwCommerce(error);
  if (!data) throw new CommerceError("not_found", `brand ${brandId} not found`);
  return data.organization_id as string;
}
