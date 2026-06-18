/** サーバーアクションの戻り値。CommerceErrorCode を code に載せ、UI が i18n マッピングする。 */
export type ActionState = { ok: boolean; code?: string };
