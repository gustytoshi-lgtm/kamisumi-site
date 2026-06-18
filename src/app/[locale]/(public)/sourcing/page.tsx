import { redirect } from "next/navigation";
import { getLocaleFromParams, type LocaleParams } from "@/lib/params";
import { localizePath } from "@/lib/routes";

export default async function SourcingIndexPage({ params }: LocaleParams) {
  const locale = await getLocaleFromParams(params);
  redirect(localizePath(locale, "/sourcing/schedule"));
}

