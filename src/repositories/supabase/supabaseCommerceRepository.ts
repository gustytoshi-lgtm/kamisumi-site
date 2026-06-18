import type { CommerceRepository } from "@/repositories/core/commerceRepository";
import type {
  CurrencyCode,
  FaqItem,
  JournalPost,
  LocalizedString,
  LocalizedStringList,
  Product,
  ProductImage,
  SourcingSchedule,
} from "@/types/commerce";
import type { Locale } from "@/config/site";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { throwCommerce } from "@/lib/supabase/errors";

/**
 * Supabase 読取 repository。公開サイトが `DATA_BACKEND=supabase` のとき使用する。
 *
 * 0001（カタログ/Journal/sourcing/faq）スキーマと同契約（CommerceRepository）を満たす。
 * 正規化テーブル（*_translations / *_images / *_detail）を PostgREST の埋め込み select で取得し、
 * 公開型（Product / JournalPost / …）へ組み立てる。
 * 読取は service role（RLS バイパス）で行い、公開可否はクエリ条件（published / deleted_at is null）で制御する。
 *
 * 実 Supabase project / 完全な seed が必要。mock と同結果になることは
 * tests/writeContract.supabase.test.ts と並ぶ read 検証（実 DB 接続後）で確認する。
 */

type Db = ReturnType<typeof getSupabaseAdminClient>;
function db(): Db {
  return getSupabaseAdminClient();
}

const LOCALES: Locale[] = ["zh-tw", "ja", "en"];

function emptyLocalized(): LocalizedString {
  return { "zh-tw": "", ja: "", en: "" };
}

/** 翻訳行配列から、指定フィールドの LocalizedString を組み立てる。 */
function localizedFrom(
  rows: Record<string, unknown>[],
  field: string,
): LocalizedString {
  const out = emptyLocalized();
  for (const row of rows) {
    const locale = row.locale as Locale;
    if (LOCALES.includes(locale) && typeof row[field] === "string") {
      out[locale] = row[field] as string;
    }
  }
  return out;
}

const PRODUCT_SELECT =
  "*, product_translations(*), product_reference_prices(*), product_images(*, product_image_alt(*)), product_matcha_detail(data), product_ceramic_detail(data), product_related_products(related_slug), product_related_journal(related_journal_id)";

function mapProduct(row: Record<string, unknown>): Product {
  const translations = (row.product_translations ?? []) as Record<string, unknown>[];
  const refPrices = (row.product_reference_prices ?? []) as Record<string, unknown>[];
  const images = (row.product_images ?? []) as Record<string, unknown>[];
  const relatedProducts = (row.product_related_products ?? []) as Record<string, unknown>[];
  const relatedJournal = (row.product_related_journal ?? []) as Record<string, unknown>[];
  const matcha = row.product_matcha_detail as { data?: unknown } | null;
  const ceramic = row.product_ceramic_detail as { data?: unknown } | null;

  const mappedImages: ProductImage[] = [...images]
    .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0))
    .map((img) => ({
      src: img.src as string,
      kind: img.kind as ProductImage["kind"],
      alt: localizedFrom((img.product_image_alt ?? []) as Record<string, unknown>[], "alt"),
    }));

  return {
    organizationId: row.organization_id as string,
    brandId: row.brand_id as string,
    storeId: row.store_id as string,
    warehouseId: (row.warehouse_id as string | null) ?? undefined,
    salesChannelId: (row.sales_channel_id as string | null) ?? undefined,
    countryCode: (row.region_code as string | null) ?? undefined,
    currencyCode: row.price_currency as CurrencyCode,
    id: row.id as string,
    slug: row.slug as string,
    sku: row.sku as string,
    type: row.type as Product["type"],
    category: row.category as Product["category"],
    publicStatus: row.public_status as Product["publicStatus"],
    isOriginal: Boolean(row.is_original),
    isArchive: Boolean(row.is_archive),
    isNewArrival: Boolean(row.is_new_arrival),
    publishedAt: (row.published_at as string | null) ?? "",
    title: localizedFrom(translations, "title"),
    shortDescription: localizedFrom(translations, "short_description"),
    description: localizedFrom(translations, "description"),
    story: localizedFrom(translations, "story"),
    price: {
      currency: row.price_currency as CurrencyCode,
      amountMinor: Number(row.price_amount_minor ?? 0),
    },
    referencePrices: refPrices.map((rp) => ({
      currency: rp.currency as CurrencyCode,
      amountMinor: Number(rp.amount_minor ?? 0),
      isReference: true,
    })),
    images: mappedImages,
    brandName: localizedFrom(translations, "brand_name"),
    makerName: localizedFrom(translations, "maker_name"),
    region: localizedFrom(translations, "region"),
    shippingNote: localizedFrom(translations, "shipping_note"),
    estimatedDispatch: localizedFrom(translations, "estimated_dispatch"),
    relatedJournalIds: relatedJournal.map((r) => r.related_journal_id as string),
    relatedProductIds: relatedProducts.map((r) => r.related_slug as string),
    matchaDetail: (matcha?.data as Product["matchaDetail"]) ?? undefined,
    ceramicDetail: (ceramic?.data as Product["ceramicDetail"]) ?? undefined,
    externalProductId: (row.external_product_id as string | null) ?? undefined,
    externalVariantId: (row.external_variant_id as string | null) ?? undefined,
  };
}

const JOURNAL_SELECT =
  "*, journal_translations(*), journal_related_products(related_slug)";

function mapJournalPost(row: Record<string, unknown>): JournalPost {
  const translations = (row.journal_translations ?? []) as Record<string, unknown>[];
  const related = (row.journal_related_products ?? []) as Record<string, unknown>[];

  const body: LocalizedStringList = { "zh-tw": [], ja: [], en: [] };
  for (const t of translations) {
    const locale = t.locale as Locale;
    if (LOCALES.includes(locale) && Array.isArray(t.body)) {
      body[locale] = (t.body as unknown[]).map((p) => String(p));
    }
  }

  return {
    organizationId: row.organization_id as string,
    brandId: row.brand_id as string,
    storeId: "",
    currencyCode: "TWD",
    id: (row.legacy_id as string | null) ?? (row.id as string),
    slug: row.slug as string,
    category: row.category as JournalPost["category"],
    title: localizedFrom(translations, "title"),
    excerpt: localizedFrom(translations, "excerpt"),
    body,
    coverImage: {
      src: (row.cover_image_src as string | null) ?? "",
      kind: "documentary",
      alt: localizedFrom(translations, "cover_image_alt"),
    },
    relatedProductIds: related.map((r) => r.related_slug as string),
    sourceThreadUrl: (row.source_thread_url as string | null) ?? undefined,
    publishedAt: (row.published_at as string | null) ?? "",
  };
}

export const supabaseCommerceRepository: CommerceRepository = {
  async listProducts(filters) {
    const client = db();
    let query = client.from("products").select(PRODUCT_SELECT).is("deleted_at", null);
    if (filters?.category) query = query.eq("category", filters.category);
    if (filters?.status) query = query.eq("public_status", filters.status);
    if (filters?.newOnly) query = query.eq("is_new_arrival", true);
    if (filters?.includeArchive === false) query = query.eq("is_archive", false);
    query = query.order("published_at", { ascending: false });
    if (typeof filters?.limit === "number") query = query.limit(filters.limit);
    const { data, error } = await query;
    if (error) throwCommerce(error);
    return (data ?? []).map((r) => mapProduct(r as Record<string, unknown>));
  },

  async getProductBySlug(slug) {
    const client = db();
    const { data, error } = await client
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("slug", slug)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throwCommerce(error);
    if (!data) return null;
    return mapProduct(data as Record<string, unknown>);
  },

  async listJournalPosts(filters) {
    const client = db();
    let query = client
      .from("journal_posts")
      .select(JOURNAL_SELECT)
      .is("deleted_at", null)
      .eq("status", "published");
    if (filters?.category) query = query.eq("category", filters.category);
    query = query.order("published_at", { ascending: false });
    if (typeof filters?.limit === "number") query = query.limit(filters.limit);
    const { data, error } = await query;
    if (error) throwCommerce(error);
    return (data ?? []).map((r) => mapJournalPost(r as Record<string, unknown>));
  },

  async getJournalPostBySlug(slug) {
    const client = db();
    const { data, error } = await client
      .from("journal_posts")
      .select(JOURNAL_SELECT)
      .eq("slug", slug)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throwCommerce(error);
    if (!data) return null;
    return mapJournalPost(data as Record<string, unknown>);
  },

  async listSourcingSchedules() {
    const client = db();
    const { data, error } = await client
      .from("sourcing_schedules")
      .select("*, sourcing_schedule_translations(*)")
      .is("deleted_at", null)
      .order("schedule_date", { ascending: true });
    if (error) throwCommerce(error);
    return (data ?? []).map((row): SourcingSchedule => {
      const r = row as Record<string, unknown>;
      const tx = (r.sourcing_schedule_translations ?? []) as Record<string, unknown>[];
      return {
        organizationId: r.organization_id as string,
        brandId: r.brand_id as string,
        storeId: "",
        currencyCode: "TWD",
        id: r.id as string,
        date: r.schedule_date as string,
        region: localizedFrom(tx, "region"),
        publicLocationName: localizedFrom(tx, "public_location_name"),
        category: (r.categories as SourcingSchedule["category"]) ?? [],
        applicationDeadline: (r.application_deadline as string | null) ?? "",
        status: r.status as SourcingSchedule["status"],
        note: localizedFrom(tx, "note"),
        acceptsRequests: Boolean(r.accepts_requests),
      };
    });
  },

  async listFaqs() {
    const client = db();
    const { data, error } = await client
      .from("faqs")
      .select("*, faq_translations(*)")
      .order("sort_order", { ascending: true });
    if (error) throwCommerce(error);
    return (data ?? []).map((row): FaqItem => {
      const r = row as Record<string, unknown>;
      const tx = (r.faq_translations ?? []) as Record<string, unknown>[];
      return {
        id: r.id as string,
        category: r.category as FaqItem["category"],
        question: localizedFrom(tx, "question"),
        answer: localizedFrom(tx, "answer"),
      };
    });
  },
};
