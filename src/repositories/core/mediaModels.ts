/**
 * メディア（画像/ファイル）資産モデル（media_assets, 0002 + 0014）。
 *
 * bucket: public（商品/Journal/ブランド画像）/ private（レシート/仕入証明/顧客関連/内部資料）。
 * private の内部資料は公開せず、閲覧は owner 限定（mediaService）。実ファイルは Storage（Supabase）側。
 * mock では「メタデータ登録」のみで実アップロードは行わない（dev・再起動で消える）。
 */
export type MediaBucket = "public" | "private";

export type MediaKind =
  | "product"
  | "journal"
  | "brand"
  | "receipt"
  | "sourcing_proof"
  | "customer"
  | "internal";

export const MEDIA_KINDS: readonly MediaKind[] = [
  "product",
  "journal",
  "brand",
  "receipt",
  "sourcing_proof",
  "customer",
  "internal",
];

/** kind ごとの既定 bucket（receipt/customer/internal/sourcing_proof は private）。 */
export function bucketForKind(kind: MediaKind): MediaBucket {
  return kind === "product" || kind === "journal" || kind === "brand" ? "public" : "private";
}

export function isMediaKind(value: string): value is MediaKind {
  return (MEDIA_KINDS as readonly string[]).includes(value);
}

/** 受け入れる MIME（公開画像 + private は PDF も許可）。 */
export const ALLOWED_IMAGE_MIME = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/avif",
  "image/svg+xml",
] as const;
export const ALLOWED_PRIVATE_EXTRA_MIME = ["application/pdf"] as const;

export const MAX_MEDIA_BYTES = 5 * 1024 * 1024; // 5MB
export const MAX_MEDIA_DIMENSION = 4000; // px

export type MediaAsset = {
  id: string;
  organizationId: string;
  bucket: MediaBucket;
  path: string;
  kind: MediaKind;
  mimeType?: string;
  byteSize?: number;
  width?: number;
  height?: number;
  altJa?: string;
  altZh?: string;
  sortOrder: number;
  uploadedBy?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
};

export type MediaCreateInput = {
  organizationId?: string;
  kind: MediaKind;
  bucket?: MediaBucket;
  path: string;
  mimeType?: string;
  byteSize?: number;
  width?: number;
  height?: number;
  altJa?: string;
  altZh?: string;
};

export type MediaUpdateInput = Partial<{
  altJa: string;
  altZh: string;
  sortOrder: number;
}>;

/**
 * ファイル名/パスの正規化: 小文字化、空白→-、英数・- . / _ 以外を除去、連続 - を畳む。
 * パストラバーサル（..）を除去する。
 */
export function normalizeMediaPath(path: string): string {
  const cleaned = path
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-._/]/g, "")
    .replace(/-{2,}/g, "-");
  // セグメント分割し、空 / "." / 全ドット("..", "...")を除去（パストラバーサル防止）。
  return cleaned
    .split("/")
    .filter((segment) => segment !== "" && segment !== "." && !/^\.+$/.test(segment))
    .join("/");
}

/** メディア入力の検証。問題があればコード文字列を返す（null なら OK）。 */
export function validateMedia(input: {
  bucket: MediaBucket;
  mimeType?: string;
  byteSize?: number;
  width?: number;
  height?: number;
  path: string;
}): string | null {
  if (!input.path || input.path.trim() === "") return "path_required";
  if (input.byteSize !== undefined && (input.byteSize < 0 || input.byteSize > MAX_MEDIA_BYTES)) {
    return "size_exceeded";
  }
  for (const dim of [input.width, input.height]) {
    if (dim !== undefined && (dim < 0 || dim > MAX_MEDIA_DIMENSION)) return "dimension_exceeded";
  }
  if (input.mimeType) {
    const allowed: string[] = [
      ...ALLOWED_IMAGE_MIME,
      ...(input.bucket === "private" ? ALLOWED_PRIVATE_EXTRA_MIME : []),
    ];
    if (!allowed.includes(input.mimeType)) return "mime_not_allowed";
  }
  return null;
}
