import { isLocale, type Locale } from "@/config/site";

export function localizePath(locale: Locale, path = "/"): string {
  const normalizedPath = path === "/" ? "" : path.startsWith("/") ? path : `/${path}`;
  return `/${locale}${normalizedPath}`;
}

export function productPath(locale: Locale, slug: string): string {
  return localizePath(locale, `/products/${slug}`);
}

export function journalPath(locale: Locale, slug: string): string {
  return localizePath(locale, `/journal/${slug}`);
}

export function replaceLocaleInPath(pathname: string, locale: Locale): string {
  const segments = pathname.split("/");
  if (segments.length > 1) {
    segments[1] = locale;
    return segments.join("/") || localizePath(locale);
  }

  return localizePath(locale);
}

export function stripLocale(pathname: string): string {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] && isLocale(parts[0])) {
    return `/${parts.slice(1).join("/")}`;
  }

  return pathname || "/";
}

