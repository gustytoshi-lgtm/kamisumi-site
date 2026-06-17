import type { Locale } from "@/config/site";

export type LocalizedString = Record<Locale, string>;
export type LocalizedStringList = Record<Locale, string[]>;

export type CurrencyCode = "TWD" | "JPY" | "USD";

export type Money = {
  currency: CurrencyCode;
  amountMinor: number;
  isReference?: boolean;
};

export type ProductStatus =
  | "in_stock"
  | "low_stock"
  | "preorder"
  | "sourcing_available"
  | "awaiting_arrival"
  | "reserved"
  | "sold_out"
  | "restock_request"
  | "archive"
  | "coming_soon";

export type ProductType = "matcha" | "ceramic" | "tea_tool" | "gift_set" | "original";

export type ProductCategory = "matcha" | "ceramics" | "tea-tools" | "gift-sets" | "originals";

export type CoreScope = {
  organizationId: string;
  businessUnitId?: string;
  brandId: string;
  storeId: string;
  warehouseId?: string;
  salesChannelId?: string;
  countryCode?: string;
  currencyCode: CurrencyCode;
};

export type Brand = {
  id: string;
  name: string;
  organizationId: string;
};

export type Store = {
  id: string;
  brandId: string;
  name: string;
  defaultLocale: Locale;
  defaultCurrency: CurrencyCode;
  countryCode: string;
};

export type SalesChannel = {
  id: string;
  storeId: string;
  name: string;
};

export type Warehouse = {
  id: string;
  name: string;
  countryCode: string;
};

export type ProductImage = {
  src: string;
  alt: LocalizedString;
  kind: "brand" | "documentary" | "detail";
};

export type MatchaDetail = {
  weight: string;
  bestBefore?: LocalizedString;
  origin?: LocalizedString;
  suitableForUsucha: boolean;
  suitableForKoicha: boolean;
  bitterness: number;
  umami: number;
  aroma: number;
  sweetness: number;
  recommendedUse?: LocalizedStringList;
  storage?: LocalizedString;
  purchaseLimit?: LocalizedString;
  availabilityDifficulty?: LocalizedString;
  kamisumiComment?: LocalizedString;
};

export type CeramicDetail = {
  dimensions: string;
  capacity?: string;
  weight?: string;
  material?: LocalizedString;
  glaze?: LocalizedString;
  microwaveSafe?: boolean;
  dishwasherSafe?: boolean;
  boxIncluded?: boolean;
  handmadeVariation?: boolean;
  careBeforeUse?: LocalizedString;
  footImage?: string;
  breakagePolicyNote?: LocalizedString;
};

export type Product = CoreScope & {
  id: string;
  slug: string;
  sku: string;
  type: ProductType;
  category: ProductCategory;
  publicStatus: ProductStatus;
  isOriginal: boolean;
  isArchive: boolean;
  isNewArrival: boolean;
  publishedAt: string;
  title: LocalizedString;
  shortDescription: LocalizedString;
  description: LocalizedString;
  story: LocalizedString;
  price: Money;
  referencePrices: Money[];
  images: ProductImage[];
  brandName?: LocalizedString;
  makerName?: LocalizedString;
  region?: LocalizedString;
  shippingNote: LocalizedString;
  estimatedDispatch: LocalizedString;
  relatedJournalIds: string[];
  relatedProductIds: string[];
  matchaDetail?: MatchaDetail;
  ceramicDetail?: CeramicDetail;
  externalProductId?: string;
  externalVariantId?: string;
};

export type JournalCategory =
  | "tea-notes"
  | "craft-stories"
  | "sourcing-diary"
  | "care-and-use"
  | "making-kamisumi";

export type JournalPost = CoreScope & {
  id: string;
  slug: string;
  category: JournalCategory;
  title: LocalizedString;
  excerpt: LocalizedString;
  body: LocalizedStringList;
  coverImage: ProductImage;
  relatedProductIds: string[];
  sourceThreadUrl?: string;
  publishedAt: string;
};

export type SourcingScheduleStatus =
  | "before_open"
  | "open"
  | "limited"
  | "closed"
  | "sourcing"
  | "completed"
  | "cancelled";

export type SourcingSchedule = CoreScope & {
  id: string;
  date: string;
  region: LocalizedString;
  publicLocationName: LocalizedString;
  category: ProductCategory[];
  applicationDeadline: string;
  status: SourcingScheduleStatus;
  note: LocalizedString;
  acceptsRequests: boolean;
};

export type FaqItem = {
  id: string;
  category: "order" | "shipping" | "sourcing" | "product" | "legal";
  question: LocalizedString;
  answer: LocalizedString;
};

