/**
 * Feature flag。半完成機能を公開へ漏らさないための既定OFFスイッチ。
 * 管理画面は ADMIN_ENABLED=true のときだけ有効化される（既定は無効＝/admin は 404）。
 */
export function isAdminEnabled(): boolean {
  return process.env.ADMIN_ENABLED === "true";
}

/**
 * 顧客マイページ（公開 UI）の有効判定。既定 OFF＝`/[locale]/account` は真の 404。
 * Phase 1 公開サイトの導線・SEO を変えないため、明示的に有効化した時のみ到達可能にする。
 */
export function isCustomerPortalEnabled(): boolean {
  return process.env.CUSTOMER_PORTAL_ENABLED === "true";
}
