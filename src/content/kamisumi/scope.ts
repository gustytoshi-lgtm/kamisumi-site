import { siteConfig } from "@/config/site";
import type { CoreScope } from "@/types/commerce";

export const kamisumiScope: CoreScope = {
  organizationId: siteConfig.organization.id,
  brandId: siteConfig.brand.id,
  storeId: siteConfig.store.id,
  warehouseId: siteConfig.warehouse.id,
  salesChannelId: siteConfig.store.salesChannelId,
  countryCode: siteConfig.store.countryCode,
  currencyCode: siteConfig.store.defaultCurrency,
};

