import type {
  FaqItem,
  JournalCategory,
  JournalPost,
  Product,
  ProductCategory,
  ProductStatus,
  SourcingSchedule,
} from "@/types/commerce";

export type ProductFilters = {
  category?: ProductCategory;
  status?: ProductStatus;
  newOnly?: boolean;
  includeArchive?: boolean;
  limit?: number;
};

export type JournalFilters = {
  category?: JournalCategory;
  limit?: number;
};

export interface CommerceRepository {
  listProducts(filters?: ProductFilters): Promise<Product[]>;
  getProductBySlug(slug: string): Promise<Product | null>;
  listJournalPosts(filters?: JournalFilters): Promise<JournalPost[]>;
  getJournalPostBySlug(slug: string): Promise<JournalPost | null>;
  listSourcingSchedules(): Promise<SourcingSchedule[]>;
  listFaqs(): Promise<FaqItem[]>;
}

