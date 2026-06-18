import { getDataBackend } from "./dataBackend";
import { isAdminEnabled } from "./features";

/**
 * 開発専用ツール（dev-check ページ / 開発バー / mock リセット / ロール確認）の有効判定。
 * 本番（NODE_ENV=production, 例: next build/start）では必ず無効＝安全側。
 * 有効条件: 非本番 かつ 管理画面有効 かつ mock バックエンド。
 */
export function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === "production";
}

export function isDevToolsEnabled(): boolean {
  return !isProductionRuntime() && isAdminEnabled() && getDataBackend() === "mock";
}
