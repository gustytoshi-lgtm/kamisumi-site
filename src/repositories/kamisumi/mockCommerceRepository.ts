import { faqs } from "@/content/kamisumi/faqs";
import { journalPosts } from "@/content/kamisumi/journal";
import { products } from "@/content/kamisumi/products";
import { sourcingSchedules } from "@/content/kamisumi/sourcing";
import type {
  CommerceRepository,
  JournalFilters,
  ProductFilters,
} from "@/repositories/core/commerceRepository";
import type { JournalPost, Product } from "@/types/commerce";

function newestFirst<T extends { publishedAt: string }>(items: T[]): T[] {
  return [...items].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
}

function applyLimit<T>(items: T[], limit?: number): T[] {
  return typeof limit === "number" ? items.slice(0, limit) : items;
}

function filterProducts(filters: ProductFilters = {}): Product[] {
  const includeArchive = filters.includeArchive ?? true;
  const filtered = products.filter((product) => {
    if (!includeArchive && product.isArchive) return false;
    if (filters.category && product.category !== filters.category) return false;
    if (filters.status && product.publicStatus !== filters.status) return false;
    if (filters.newOnly && !product.isNewArrival) return false;
    return true;
  });

  return applyLimit(newestFirst(filtered), filters.limit);
}

function filterJournalPosts(filters: JournalFilters = {}): JournalPost[] {
  const filtered = journalPosts.filter((post) => {
    if (filters.category && post.category !== filters.category) return false;
    return true;
  });

  return applyLimit(newestFirst(filtered), filters.limit);
}

export const mockCommerceRepository: CommerceRepository = {
  async listProducts(filters) {
    return filterProducts(filters);
  },
  async getProductBySlug(slug) {
    return products.find((product) => product.slug === slug) ?? null;
  },
  async listJournalPosts(filters) {
    return filterJournalPosts(filters);
  },
  async getJournalPostBySlug(slug) {
    return journalPosts.find((post) => post.slug === slug) ?? null;
  },
  async listSourcingSchedules() {
    return [...sourcingSchedules].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
  },
  async listFaqs() {
    return faqs;
  },
};

