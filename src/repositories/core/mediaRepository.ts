import type { ActorContext } from "./writeModels";
import type {
  MediaAsset,
  MediaBucket,
  MediaCreateInput,
  MediaKind,
  MediaUpdateInput,
} from "./mediaModels";

/** メディア資産の永続契約。mock / Supabase が同一契約を満たす。RBAC は mediaService。 */
export interface MediaRepository {
  listMedia(options?: {
    bucket?: MediaBucket;
    kind?: MediaKind;
    includeDeleted?: boolean;
  }): Promise<MediaAsset[]>;
  getMedia(id: string): Promise<MediaAsset | null>;
  createMedia(input: MediaCreateInput, ctx: ActorContext): Promise<MediaAsset>;
  updateMedia(id: string, patch: MediaUpdateInput, ctx: ActorContext): Promise<MediaAsset>;
  softDeleteMedia(id: string, ctx: ActorContext): Promise<MediaAsset>;
  restoreMedia(id: string, ctx: ActorContext): Promise<MediaAsset>;
}
