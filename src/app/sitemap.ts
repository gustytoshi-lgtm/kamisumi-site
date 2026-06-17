import type { MetadataRoute } from "next";
import { localeHtmlLang, siteConfig, supportedLocales, type Locale } from "@/config/site";
import { localizePath } from "@/lib/routes";
import { getCommerceRepository } from "@/repositories";

const staticPaths = [
  "/",
  "/shop",
  "/new-arrivals",
  "/sourcing/schedule",
  "/sourcing/request",
  "/journal",
  "/about",
  "/order",
  "/shipping",
  "/faq",
  "/contact",
  "/legal",
  "/privacy",
];

function urlFor(locale: Locale, path: string) {
  return new URL(localizePath(locale, path), siteConfig.siteUrl).toString();
}

function alternates(path: string) {
  return {
    languages: Object.fromEntries(
      supportedLocales.map((locale) => [localeHtmlLang[locale], urlFor(locale, path)]),
    ),
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const repository = getCommerceRepository();
  const [products, posts] = await Promise.all([
    repository.listProducts({ includeArchive: true }),
    repository.listJournalPosts(),
  ]);

  const dynamicPaths = [
    ...products.map((product) => `/products/${product.slug}`),
    ...posts.map((post) => `/journal/${post.slug}`),
  ];

  return supportedLocales.flatMap((locale) =>
    [...staticPaths, ...dynamicPaths].map((path) => ({
      url: urlFor(locale, path),
      lastModified: new Date(),
      changeFrequency: path === "/" ? "weekly" : "monthly",
      priority: path === "/" ? 1 : 0.7,
      alternates: alternates(path),
    })),
  );
}

