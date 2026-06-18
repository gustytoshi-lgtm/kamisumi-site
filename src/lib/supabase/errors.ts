import { CommerceError, type CommerceErrorCode } from "@/repositories/core/writeModels";

/**
 * Postgres / PostgREST のエラーを CommerceError（i18n マッピング可能なコード）へ変換する。
 *
 * 対応する DB 側の規約（supabase/migrations 参照）:
 *   - apply_inventory_movement（0005）は errcode を使う:
 *       P0002 = not_found、P0001 = 業務違反（message で negative_stock / insufficient_stock / conflict を区別）
 *   - 一般的な SQLSTATE:
 *       23505 unique_violation → conflict、23503 foreign_key_violation → validation、
 *       23514 check_violation → validation、23502 not_null_violation → validation
 *
 * 既知の業務違反だけ CommerceError に変換し、未知のエラーは null を返す（呼び出し側で再 throw）。
 */
type PgLikeError = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
};

function isPgLike(error: unknown): error is PgLikeError {
  return typeof error === "object" && error !== null && ("code" in error || "message" in error);
}

export function toCommerceError(error: unknown): CommerceError | null {
  if (error instanceof CommerceError) return error;
  if (!isPgLike(error)) return null;

  const code = error.code ?? "";
  const message = (error.message ?? "").toLowerCase();

  if (code === "P0002") {
    return new CommerceError("not_found", error.message ?? "not found");
  }

  if (code === "P0001") {
    const mapped: CommerceErrorCode = message.includes("negative_stock")
      ? "negative_stock"
      : message.includes("insufficient_stock")
        ? "insufficient_stock"
        : message.includes("invalid_transition")
          ? "invalid_transition"
          : message.includes("not_purchasable")
            ? "not_purchasable"
            : message.includes("duplicate")
              ? "duplicate_operation"
              : "conflict";
    return new CommerceError(mapped, error.message ?? "business rule violation");
  }

  switch (code) {
    case "23505": // unique_violation
      return new CommerceError("conflict", error.message ?? "unique violation");
    case "23503": // foreign_key_violation
    case "23514": // check_violation
    case "23502": // not_null_violation
    case "22P02": // invalid_text_representation（不正な UUID 等）
      return new CommerceError("validation", error.message ?? "validation error");
    default:
      return null;
  }
}

/** 既知の業務違反は CommerceError に変換して throw、未知はそのまま再 throw。 */
export function throwCommerce(error: unknown): never {
  const mapped = toCommerceError(error);
  if (mapped) throw mapped;
  throw error;
}
