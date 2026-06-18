import type { Money } from "@/types/commerce";

/**
 * 陶器個体（一点物）の永続モデル（ceramic_units, 0003 + 0011）。
 * cost は機微情報（原価）。service が cost:view を持たないロールには cost を落として返す。
 */
export type CeramicUnitStatus = "available" | "reserved" | "sold" | "archived";

export const CERAMIC_UNIT_STATUSES: readonly CeramicUnitStatus[] = [
  "available",
  "reserved",
  "sold",
  "archived",
];

export function isCeramicUnitStatus(value: string): value is CeramicUnitStatus {
  return (CERAMIC_UNIT_STATUSES as readonly string[]).includes(value);
}

export type CeramicUnitRecord = {
  id: string;
  productId: string;
  unitCode: string;
  status: CeramicUnitStatus;
  /** 個体別原価（機微・owner/cost:view のみ）。 */
  cost?: Money;
  dimensions?: string;
  weightGrams?: number;
  glaze?: string;
  condition?: string;
  variationNote?: string;
  boxIncluded?: boolean;
  inspectionResult?: string;
  imageMediaId?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
};

export type CeramicUnitCreateInput = {
  productId: string;
  unitCode: string;
  costMinor?: number;
  costCurrency?: Money["currency"];
  dimensions?: string;
  weightGrams?: number;
  glaze?: string;
  condition?: string;
  variationNote?: string;
  boxIncluded?: boolean;
  inspectionResult?: string;
};

export type CeramicUnitUpdateInput = Partial<
  Pick<
    CeramicUnitRecord,
    "dimensions" | "weightGrams" | "glaze" | "condition" | "variationNote" | "boxIncluded" | "inspectionResult"
  >
>;

/** cost を落とした投影（cost:view を持たないロール向け）。 */
export function stripCost(record: CeramicUnitRecord): CeramicUnitRecord {
  const { cost: _cost, ...rest } = record;
  void _cost;
  return rest;
}
