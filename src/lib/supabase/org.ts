import { siteConfig } from "@/config/site";
import { CommerceError } from "@/repositories/core/writeModels";
import { getSupabaseAdminClient } from "./server";
import { throwCommerce } from "./errors";

/**
 * 単一テナントの既定組織 UUID 解決。
 *
 * service 層は org 未指定時に `siteConfig.organization.id`（mock 用スラッグ "org-kagurakoji"。UUID ではない）へ
 * フォールバックするため、Supabase 層でそのまま uuid 列へ渡すと型不一致で失敗する（I-023）。
 * ここで organizations.code から実 UUID を解決し、スラッグ/未指定を実 DB でも破綻させない。
 */
type Client = ReturnType<typeof getSupabaseAdminClient>;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string | null | undefined): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

let cachedDefaultOrgId: string | null = null;

/** 既定組織（siteConfig.organization.code）の実 UUID を解決して memoize する。 */
export async function resolveDefaultOrgId(client: Client): Promise<string> {
  if (cachedDefaultOrgId) return cachedDefaultOrgId;
  const { data, error } = await client
    .from("organizations")
    .select("id")
    .eq("code", siteConfig.organization.code)
    .maybeSingle();
  if (error) throwCommerce(error);
  if (!data) {
    throw new CommerceError("not_found", `organization '${siteConfig.organization.code}' not found`);
  }
  cachedDefaultOrgId = (data as { id: string }).id;
  return cachedDefaultOrgId;
}

/**
 * 受け取った org id が実 UUID ならそのまま、未指定 or mock スラッグなら既定組織の実 UUID を返す。
 * 実 UUID を渡す呼び出し（contract test 等）はそのまま通り、スラッグ依存の本番フォールバックは救済される。
 */
export async function resolveOrgId(client: Client, maybeOrgId?: string | null): Promise<string> {
  if (isUuid(maybeOrgId)) return maybeOrgId;
  return resolveDefaultOrgId(client);
}

/** テスト用: memoize をリセットする。 */
export function resetDefaultOrgIdCache(): void {
  cachedDefaultOrgId = null;
}
