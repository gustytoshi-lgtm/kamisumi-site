/**
 * Feature flag。半完成機能を公開へ漏らさないための既定OFFスイッチ。
 * 管理画面は ADMIN_ENABLED=true のときだけ有効化される（既定は無効＝/admin は 404）。
 */
export function isAdminEnabled(): boolean {
  return process.env.ADMIN_ENABLED === "true";
}
