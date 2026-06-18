import type { CommerceWriteRepository } from "@/repositories/core/commerceWriteRepository";

/**
 * Supabase 書込 repository のスケルトン（Phase 2A 基盤）。
 *
 * mock 書込 repository と同じ契約（CommerceWriteRepository）を満たすための骨組み。
 * 実クエリは本番/開発 Supabase project と env（NEXT_PUBLIC_SUPABASE_URL / SERVICE_ROLE 等）が
 * 用意できた段階で実装する。contract test（tests/writeContract.test.ts の runWriteContract）を
 * この実装に対しても流用して、mock と同一挙動であることを保証する。
 *
 * トランザクション方針:
 *   - 在庫移動は DB function apply_inventory_movement（0005）を RPC で呼び、
 *     残高更新 + movement + audit + 冪等を 1 トランザクションで原子的に行う。
 *   - 注文の状態変更（orders 更新 + order_status_events + audit）など複数テーブル更新も
 *     同様に DB function（または supabase の単一 RPC）で原子的に実装する。
 *   - service_role key はサーバー専用。ブラウザへ露出しない（src/lib/supabase/server.ts に限定）。
 *   - エラーは Postgres の errcode（P0001/P0002 等）→ CommerceError(code) に変換する。
 */
function notImplemented(method: string): never {
  throw new Error(
    `SupabaseCommerceWriteRepository.${method} is not implemented yet. ` +
      `Provide Supabase env + client and implement using tables / RPC (see supabase/migrations/0005).`,
  );
}

export const supabaseCommerceWriteRepository: CommerceWriteRepository = {
  // 商品
  async createProduct() {
    return notImplemented("createProduct");
  },
  async updateProduct() {
    return notImplemented("updateProduct");
  },
  async setProductStatus() {
    return notImplemented("setProductStatus");
  },
  async upsertProductTranslation() {
    return notImplemented("upsertProductTranslation");
  },
  async softDeleteProduct() {
    return notImplemented("softDeleteProduct");
  },
  async restoreProduct() {
    return notImplemented("restoreProduct");
  },
  async getProductById() {
    return notImplemented("getProductById");
  },
  async listManagedProducts() {
    return notImplemented("listManagedProducts");
  },
  // 在庫（apply_inventory_movement RPC を使用）
  async createInventoryItem() {
    return notImplemented("createInventoryItem");
  },
  async getInventoryItem() {
    return notImplemented("getInventoryItem");
  },
  async applyInventoryMovement() {
    return notImplemented("applyInventoryMovement");
  },
  async setInventoryStatus() {
    return notImplemented("setInventoryStatus");
  },
  // 注文
  async createOrder() {
    return notImplemented("createOrder");
  },
  async updateOrder() {
    return notImplemented("updateOrder");
  },
  async changeOrderStatus() {
    return notImplemented("changeOrderStatus");
  },
  async setOrderNotes() {
    return notImplemented("setOrderNotes");
  },
  async getOrder() {
    return notImplemented("getOrder");
  },
  // 買付依頼
  async createSourcingRequest() {
    return notImplemented("createSourcingRequest");
  },
  async setSourcingRequestStatus() {
    return notImplemented("setSourcingRequestStatus");
  },
  async linkSourcingRequestToSchedule() {
    return notImplemented("linkSourcingRequestToSchedule");
  },
  async getSourcingRequest() {
    return notImplemented("getSourcingRequest");
  },
  // Journal
  async createJournalDraft() {
    return notImplemented("createJournalDraft");
  },
  async upsertJournalTranslation() {
    return notImplemented("upsertJournalTranslation");
  },
  async setJournalStatus() {
    return notImplemented("setJournalStatus");
  },
  async softDeleteJournal() {
    return notImplemented("softDeleteJournal");
  },
  async getJournal() {
    return notImplemented("getJournal");
  },
  // 監査
  async listAuditLogs() {
    return notImplemented("listAuditLogs");
  },
};
