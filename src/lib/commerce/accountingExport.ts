import type { Money } from "@/types/commerce";

/**
 * 会計ソフト連携の **export interface**（将来の外部会計連携用）。
 *
 * 重要な境界（spec §4）:
 *   - 自作するのは「管理会計の集計を外部会計ソフトへ渡す入口」だけ。
 *   - 税務会計・総勘定元帳・決算書・税務申告は自作しない（外部ソフトの責務）。
 *   - 実 API キー・実口座は持たない。ここでは契約（interface）と mock adapter のみ。
 *
 * 冪等性: 同一 idempotencyKey の再 export は二重計上せず "duplicate" を返す。
 */
export type AccountingSourceType = "order" | "purchase" | "payment" | "shipment" | "expense";

export type AccountingEntry = {
  sourceType: AccountingSourceType;
  sourceId: string;
  accountingDate: string; // ISO date (YYYY-MM-DD)
  amount: Money;
  taxCategory?: string;
  taxRate?: number; // percent（表示用。税額計算は外部会計側）
  paymentMethod?: string;
  settlementStatus?: string;
  invoiceNumber?: string;
  receiptFile?: string; // private bucket の参照のみ（実ファイルは持たない）
  externalAccountingId?: string;
  memo?: string;
};

export type ExportBatch = {
  idempotencyKey: string;
  entries: AccountingEntry[];
};

export type ExportStatus = "exported" | "duplicate" | "error";

export type ExportResult = {
  idempotencyKey: string;
  status: ExportStatus;
  entryCount: number;
  exportedAt: string;
};

export interface AccountingExporter {
  /** バッチを export する。同一 idempotencyKey の再実行は "duplicate"。 */
  exportBatch(batch: ExportBatch): Promise<ExportResult>;
  /** 既存 export の状態取得（未 export は null）。 */
  getExport(idempotencyKey: string): Promise<ExportResult | null>;
}

function validateBatch(batch: ExportBatch): void {
  if (!batch.idempotencyKey || batch.idempotencyKey.trim() === "") {
    throw new Error("accounting export requires an idempotencyKey");
  }
  if (batch.entries.length === 0) {
    throw new Error("accounting export batch must contain at least one entry");
  }
  for (const entry of batch.entries) {
    if (!Number.isInteger(entry.amount.amountMinor)) {
      throw new Error(`accounting entry amount must be an integer minor amount (${entry.sourceId})`);
    }
  }
}

/**
 * 開発・テスト用の冪等 mock exporter。外部会計ソフトの代わりに in-memory で記録する。
 * 本番は同 interface を実装する adapter に差し替える（Phase 4）。
 */
export function createMockAccountingExporter(): AccountingExporter {
  const exported = new Map<string, ExportResult>();
  return {
    async exportBatch(batch) {
      validateBatch(batch);
      const existing = exported.get(batch.idempotencyKey);
      if (existing) {
        // 二重実行防止: 既に export 済みなら計上せず duplicate を返す。
        return { ...existing, status: "duplicate" };
      }
      const result: ExportResult = {
        idempotencyKey: batch.idempotencyKey,
        status: "exported",
        entryCount: batch.entries.length,
        exportedAt: new Date().toISOString(),
      };
      exported.set(batch.idempotencyKey, result);
      return result;
    },
    async getExport(idempotencyKey) {
      return exported.get(idempotencyKey) ?? null;
    },
  };
}
