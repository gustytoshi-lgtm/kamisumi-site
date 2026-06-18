import type { CurrencyCode, Money } from "@/types/commerce";
import type { ShipmentStatus } from "@/lib/commerce/shipmentStatus";

/**
 * Phase 2B フルフィルメント（配送・入金）ドメインの共通モデル。
 * procurement（仕入）とは別 bounded context。mock / Supabase が同一契約を満たす。
 * 金額は最小通貨単位の整数（Money）。実銀行口座番号は保存しない（照合番号・確認者のみ）。
 */

export type ShipmentRecord = {
  id: string;
  organizationId: string;
  orderId?: string;
  carrier?: string;
  method?: string;
  weightGrams?: number;
  sizeNote?: string;
  costCurrency?: CurrencyCode;
  actualCost?: Money;
  chargedCost?: Money;
  kamisumiBears?: Money;
  trackingNumber?: string;
  shippedOn?: string;
  deliveredOn?: string;
  status: ShipmentStatus;
  damaged: boolean;
  returned: boolean;
  reshipped: boolean;
  statusUpdatedAt?: string;
  statusUpdatedBy?: string;
  createdAt: string;
  updatedAt: string;
};

export type ShipmentCreateInput = {
  organizationId?: string;
  orderId?: string;
  carrier?: string;
  method?: string;
  weightGrams?: number;
  sizeNote?: string;
  costCurrency?: CurrencyCode;
  actualCostMinor?: number;
  chargedCostMinor?: number;
  trackingNumber?: string;
};

export type ShipmentUpdateInput = {
  carrier?: string;
  method?: string;
  weightGrams?: number;
  sizeNote?: string;
  costCurrency?: CurrencyCode;
  actualCostMinor?: number;
  chargedCostMinor?: number;
  trackingNumber?: string;
  shippedOn?: string;
  deliveredOn?: string;
  damaged?: boolean;
  returned?: boolean;
  reshipped?: boolean;
};

export type ShipmentStatusEvent = {
  id: string;
  shipmentId: string;
  fromStatus: ShipmentStatus | null;
  toStatus: ShipmentStatus;
  changedBy: string;
  note?: string;
  createdAt: string;
};
