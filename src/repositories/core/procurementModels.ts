import type { CurrencyCode } from "@/types/commerce";

/**
 * Phase 2B 調達ドメインの共通モデル。mock / Supabase の両 procurement repository が
 * 同じ契約（procurementRepository.ts）を満たすための型。
 *
 * 機微情報（原価・利益・内部メモ・非公開仕入先）は service/RLS で owner に限定する。
 * 公開 API へは PublicSupplier（note/contact を落とした投影）のみ返す。
 */

export type SupplierPublicLevel = "public" | "brand_only" | "region_only" | "private";

export const SUPPLIER_PUBLIC_LEVELS: readonly SupplierPublicLevel[] = [
  "public",
  "brand_only",
  "region_only",
  "private",
];

export function isSupplierPublicLevel(value: string): value is SupplierPublicLevel {
  return (SUPPLIER_PUBLIC_LEVELS as readonly string[]).includes(value);
}

export type SupplierRecord = {
  id: string;
  organizationId: string;
  name: string;
  region?: string;
  publicLevel: SupplierPublicLevel;
  /** 内部メモ（公開しない）。 */
  note?: string;
  /** 連絡先（内部のみ）。 */
  contact?: string;
  /** 既定の仕入通貨。 */
  defaultCurrency?: CurrencyCode;
  /** 国コード（ISO-3166-1 alpha-2）。 */
  countryCode?: string;
  /** 主要ブランド/作家/窯元との関連（任意）。 */
  brandId?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
};

export type SupplierCreateInput = {
  organizationId: string;
  name: string;
  region?: string;
  publicLevel?: SupplierPublicLevel;
  note?: string;
  contact?: string;
  defaultCurrency?: CurrencyCode;
  countryCode?: string;
  brandId?: string;
};

export type SupplierUpdateInput = Partial<Omit<SupplierCreateInput, "organizationId">>;

/** 公開 API へ返してよい仕入先投影（内部メモ・連絡先・原価関連を含まない）。 */
export type PublicSupplier = {
  id: string;
  name: string;
  region?: string;
  countryCode?: string;
  brandId?: string;
};

/** 公開可否で SupplierRecord を公開投影へ落とす。public_level='public' のみが公開対象。 */
export function toPublicSupplier(record: SupplierRecord): PublicSupplier {
  return {
    id: record.id,
    name: record.name,
    region: record.region,
    countryCode: record.countryCode,
    brandId: record.brandId,
  };
}

// ============ 仕入記録（買付） ============

export type PurchaseItemInput = {
  productId?: string;
  description?: string;
  quantity: number;
  unitPriceMinor: number;
  taxMinor?: number;
  discountMinor?: number;
};

export type PurchaseItemRecord = {
  id: string;
  purchaseId: string;
  productId?: string;
  description?: string;
  quantity: number;
  unitPriceMinor: number;
  taxMinor: number;
  discountMinor: number;
};

/** 明細の正味額（最小通貨単位整数）= 単価*数量 + 税 - 値引。 */
export function purchaseItemNetMinor(item: {
  unitPriceMinor: number;
  quantity: number;
  taxMinor?: number;
  discountMinor?: number;
}): number {
  return item.unitPriceMinor * item.quantity + (item.taxMinor ?? 0) - (item.discountMinor ?? 0);
}

export type PurchaseCreateInput = {
  organizationId?: string;
  supplierId?: string;
  scheduleId?: string;
  purchasedOn: string; // ISO date
  currency: CurrencyCode;
  exchangeRate?: number;
  domesticShippingMinor?: number;
  transportMinor?: number;
  parkingMinor?: number;
  highwayMinor?: number;
  otherExpenseMinor?: number;
  note?: string;
  items?: PurchaseItemInput[];
};

/** 付帯費用合計（最小通貨単位整数）。原価配賦の対象額。 */
export function purchaseAncillaryTotalMinor(input: {
  domesticShippingMinor?: number;
  transportMinor?: number;
  parkingMinor?: number;
  highwayMinor?: number;
  otherExpenseMinor?: number;
}): number {
  return (
    (input.domesticShippingMinor ?? 0) +
    (input.transportMinor ?? 0) +
    (input.parkingMinor ?? 0) +
    (input.highwayMinor ?? 0) +
    (input.otherExpenseMinor ?? 0)
  );
}

export type CostAllocationRecord = {
  id: string;
  purchaseId: string;
  purchaseItemId?: string;
  method: string; // DB enum（quantity/amount/weight/volume/manual/none）
  allocatedCurrency: CurrencyCode;
  allocatedAmountMinor: number;
};

export type PurchaseRecord = {
  id: string;
  organizationId: string;
  supplierId?: string;
  scheduleId?: string;
  purchasedOn: string;
  currency: CurrencyCode;
  exchangeRate?: number;
  domesticShippingMinor: number;
  transportMinor: number;
  parkingMinor: number;
  highwayMinor: number;
  otherExpenseMinor: number;
  note?: string;
  items: PurchaseItemRecord[];
  allocations: CostAllocationRecord[];
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
};
