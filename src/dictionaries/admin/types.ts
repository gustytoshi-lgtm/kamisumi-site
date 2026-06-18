import type { AdminNavKey } from "@/lib/commerce/adminNav";

/** 管理画面の表示言語（公開 locale とは別に profiles.admin_locale で保持）。 */
export type AdminLocale = "ja" | "zh-tw";

export type AdminDictionary = {
  adminLocaleName: string;
  nav: Record<AdminNavKey, string>;
  common: {
    save: string;
    cancel: string;
    create: string;
    edit: string;
    delete: string;
    restore: string;
    publish: string;
    unpublish: string;
    search: string;
    status: string;
    actions: string;
    signedInAs: string;
    languageLabel: string;
    noPermission: string;
    confirm: string;
    apply: string;
    quantity: string;
    reason: string;
    note: string;
    customerNote: string;
    internalNote: string;
    slug: string;
    category: string;
    title: string;
    excerpt: string;
    viewHistory: string;
    reopen: string;
  };
  /** CommerceErrorCode と success に対応する通知文言。 */
  notify: {
    success: string;
    forbidden: string;
    not_found: string;
    validation: string;
    invalid_transition: string;
    insufficient_stock: string;
    negative_stock: string;
    duplicate_operation: string;
    conflict: string;
    not_purchasable: string;
    error: string;
  };
};
