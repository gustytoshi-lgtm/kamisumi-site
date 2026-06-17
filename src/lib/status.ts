import type { Dictionary, StatusPresentation } from "@/dictionaries";
import type { ProductStatus } from "@/types/commerce";

export function getProductStatusPresentation(
  dictionary: Dictionary,
  status: ProductStatus,
): StatusPresentation {
  return dictionary.productStatus[status];
}

export function isPurchasableStatus(status: ProductStatus): boolean {
  return ["in_stock", "low_stock", "preorder", "sourcing_available"].includes(status);
}

