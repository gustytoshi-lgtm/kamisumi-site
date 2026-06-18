import type { MediaRepository } from "@/repositories/core/mediaRepository";
import {
  bucketForKind,
  normalizeMediaPath,
  validateMedia,
  type MediaAsset,
  type MediaBucket,
  type MediaCreateInput,
  type MediaKind,
  type MediaUpdateInput,
} from "@/repositories/core/mediaModels";
import { CommerceError, type ActorContext } from "@/repositories/core/writeModels";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { throwCommerce } from "@/lib/supabase/errors";

/**
 * Supabase メディア repository（media_assets, 0002 + 0014）。メタデータのみを扱い、
 * 実ファイルは Supabase Storage（public/private バケット）に置く前提（Storage 連携は別途）。
 * private bucket の閲覧制限・RBAC は mediaService（secrets:view=owner）が担う。
 */
type Db = ReturnType<typeof getSupabaseAdminClient>;
function db(): Db {
  return getSupabaseAdminClient();
}

function mapMedia(row: Record<string, unknown>): MediaAsset {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    bucket: row.bucket as MediaBucket,
    path: row.path as string,
    kind: row.kind as MediaKind,
    mimeType: (row.mime_type as string | null) ?? undefined,
    byteSize: row.byte_size != null ? Number(row.byte_size) : undefined,
    width: row.width != null ? Number(row.width) : undefined,
    height: row.height != null ? Number(row.height) : undefined,
    altJa: (row.alt_ja as string | null) ?? undefined,
    altZh: (row.alt_zh as string | null) ?? undefined,
    sortOrder: Number(row.sort_order ?? 0),
    uploadedBy: (row.uploaded_by as string | null) ?? undefined,
    createdAt: (row.created_at as string) ?? "",
    updatedAt: (row.updated_at as string) ?? "",
    deletedAt: (row.deleted_at as string | null) ?? undefined,
  };
}

async function getOrThrow(id: string): Promise<MediaAsset> {
  const client = db();
  const { data, error } = await client.from("media_assets").select("*").eq("id", id).maybeSingle();
  if (error) throwCommerce(error);
  if (!data) throw new CommerceError("not_found", `media ${id} not found`);
  return mapMedia(data as Record<string, unknown>);
}

export const supabaseMediaRepository: MediaRepository = {
  async listMedia(options) {
    const client = db();
    let query = client.from("media_assets").select("*").order("sort_order", { ascending: true });
    if (options?.bucket) query = query.eq("bucket", options.bucket);
    if (options?.kind) query = query.eq("kind", options.kind);
    if (!options?.includeDeleted) query = query.is("deleted_at", null);
    const { data, error } = await query;
    if (error) throwCommerce(error);
    return (data ?? []).map((r) => mapMedia(r as Record<string, unknown>));
  },
  async getMedia(id) {
    const client = db();
    const { data, error } = await client.from("media_assets").select("*").eq("id", id).maybeSingle();
    if (error) throwCommerce(error);
    return data ? mapMedia(data as Record<string, unknown>) : null;
  },
  async createMedia(input: MediaCreateInput, ctx: ActorContext) {
    const bucket = input.bucket ?? bucketForKind(input.kind);
    const path = normalizeMediaPath(input.path);
    const validationError = validateMedia({ ...input, bucket, path });
    if (validationError) throw new CommerceError("validation", validationError, { reason: validationError });
    const client = db();
    const { data, error } = await client
      .from("media_assets")
      .insert({
        organization_id: input.organizationId,
        bucket,
        path,
        kind: input.kind,
        mime_type: input.mimeType,
        byte_size: input.byteSize,
        width: input.width,
        height: input.height,
        alt_ja: input.altJa,
        alt_zh: input.altZh,
        uploaded_by: ctx.userId,
      })
      .select("*")
      .single();
    if (error) throwCommerce(error);
    return mapMedia(data as Record<string, unknown>);
  },
  async updateMedia(id, patch: MediaUpdateInput, _ctx) {
    void _ctx;
    const client = db();
    const update: Record<string, unknown> = {};
    if (patch.altJa !== undefined) update.alt_ja = patch.altJa;
    if (patch.altZh !== undefined) update.alt_zh = patch.altZh;
    if (patch.sortOrder !== undefined) update.sort_order = patch.sortOrder;
    if (Object.keys(update).length > 0) {
      const { error } = await client.from("media_assets").update(update).eq("id", id);
      if (error) throwCommerce(error);
    }
    return getOrThrow(id);
  },
  async softDeleteMedia(id, _ctx) {
    void _ctx;
    const client = db();
    const { error } = await client
      .from("media_assets")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throwCommerce(error);
    return getOrThrow(id);
  },
  async restoreMedia(id, _ctx) {
    void _ctx;
    const client = db();
    const { error } = await client.from("media_assets").update({ deleted_at: null }).eq("id", id);
    if (error) throwCommerce(error);
    return getOrThrow(id);
  },
};
