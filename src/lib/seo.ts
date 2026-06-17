import type { Metadata } from "next";
import { localeHtmlLang, siteConfig, supportedLocales, type Locale } from "@/config/site";
import { getLocalizedText } from "@/lib/localization";
import { localizePath } from "@/lib/routes";
import type { JournalPost, Product, ProductStatus } from "@/types/commerce";
import { moneyToMajorString } from "./format";

type MetadataInput = {
  locale: Locale;
  path?: string;
  title: string;
  description: string;
  image?: string;
};

export function absoluteUrl(locale: Locale, path = "/"): string {
  return new URL(localizePath(locale, path), siteConfig.siteUrl).toString();
}

export function buildMetadata({
  locale,
  path = "/",
  title,
  description,
  image = "/api/og",
}: MetadataInput): Metadata {
  const localizedTitle = `${title} | ${siteConfig.brand.name}`;
  const imageUrl = new URL(image, siteConfig.siteUrl).toString();

  return {
    metadataBase: new URL(siteConfig.siteUrl),
    title: localizedTitle,
    description,
    alternates: {
      canonical: absoluteUrl(locale, path),
      languages: Object.fromEntries(
        supportedLocales.map((targetLocale) => [
          localeHtmlLang[targetLocale],
          absoluteUrl(targetLocale, path),
        ]),
      ),
    },
    openGraph: {
      title: localizedTitle,
      description,
      url: absoluteUrl(locale, path),
      siteName: siteConfig.brand.name,
      locale: localeHtmlLang[locale],
      type: "website",
      images: [{ url: imageUrl, width: 1200, height: 630, alt: localizedTitle }],
    },
    twitter: {
      card: "summary_large_image",
      title: localizedTitle,
      description,
      images: [imageUrl],
    },
  };
}

export function productJsonLd(product: Product, locale: Locale) {
  const name = getLocalizedText(product.title, locale);
  const description = getLocalizedText(product.shortDescription, locale);
  const image = product.images[0]?.src
    ? new URL(product.images[0].src, siteConfig.siteUrl).toString()
    : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description,
    sku: product.sku,
    brand: product.brandName
      ? {
          "@type": "Brand",
          name: getLocalizedText(product.brandName, locale),
        }
      : undefined,
    image,
    offers:
      product.price.amountMinor > 0
        ? {
            "@type": "Offer",
            priceCurrency: product.price.currency,
            price: moneyToMajorString(product.price),
            availability: productAvailabilityUrl(product.publicStatus),
            url: absoluteUrl(locale, `/products/${product.slug}`),
          }
        : undefined,
  };
}

function productAvailabilityUrl(status: ProductStatus): string {
  const availabilityByStatus: Record<ProductStatus, string> = {
    in_stock: "https://schema.org/InStock",
    low_stock: "https://schema.org/LimitedAvailability",
    preorder: "https://schema.org/PreOrder",
    sourcing_available: "https://schema.org/PreOrder",
    awaiting_arrival: "https://schema.org/OutOfStock",
    reserved: "https://schema.org/OutOfStock",
    sold_out: "https://schema.org/OutOfStock",
    restock_request: "https://schema.org/OutOfStock",
    archive: "https://schema.org/OutOfStock",
    coming_soon: "https://schema.org/PreOrder",
  };

  return availabilityByStatus[status];
}

export function articleJsonLd(post: JournalPost, locale: Locale) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: getLocalizedText(post.title, locale),
    description: getLocalizedText(post.excerpt, locale),
    image: new URL(post.coverImage.src, siteConfig.siteUrl).toString(),
    datePublished: post.publishedAt,
    author: {
      "@type": "Organization",
      name: siteConfig.organization.name,
    },
  };
}

export function breadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
