import type { MediaBucket } from "@/repositories/core/mediaModels";

/** アップロード可能なバイト列。 */
export type MediaUploadBody = Uint8Array | ArrayBuffer | Blob;

/**
 * メディア実ファイルの保管・URL 解決の抽象（mock / Supabase Storage）。
 * public バケットは公開 URL、private バケットは期限付き署名 URL で配信する。
 * RBAC（private = secrets:view=owner）は mediaService が担い、ここは保管/URL 生成のみ。
 */
export type MediaStorage = {
  upload(bucket: MediaBucket, path: string, body: MediaUploadBody, contentType: string): Promise<void>;
  remove(bucket: MediaBucket, path: string): Promise<void>;
  /** public バケットの公開 URL（同期）。 */
  publicUrl(bucket: MediaBucket, path: string): string;
  /** 期限付き署名 URL（private バケット向け）。 */
  signedUrl(bucket: MediaBucket, path: string, expiresInSeconds: number): Promise<string>;
};

/**
 * 開発・テスト用の in-memory Storage。実ファイルは保持せず、存在のみ記録し擬似 URL を返す。
 */
export function createMockMediaStorage(): MediaStorage & { reset(): void; has(bucket: MediaBucket, path: string): boolean } {
  const store = new Map<string, string>();
  const key = (bucket: MediaBucket, path: string) => `${bucket}/${path}`;
  return {
    reset() {
      store.clear();
    },
    has(bucket, path) {
      return store.has(key(bucket, path));
    },
    async upload(bucket, path, _body, contentType) {
      store.set(key(bucket, path), contentType);
    },
    async remove(bucket, path) {
      store.delete(key(bucket, path));
    },
    publicUrl(bucket, path) {
      return `mock-storage://${bucket}/${path}`;
    },
    async signedUrl(bucket, path, expiresInSeconds) {
      return `mock-storage://${bucket}/${path}?token=mock&expires=${expiresInSeconds}`;
    },
  };
}

export const mockMediaStorage = createMockMediaStorage();
