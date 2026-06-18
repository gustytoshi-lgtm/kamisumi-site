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
  /** 業務設定（§8）画面のラベル。 */
  settings: {
    title: string;
    intro: string;
    groups: { brand: string; sales: string; content: string };
    fields: {
      contact_email: string;
      social_threads: string;
      social_instagram: string;
      hold_hours: string;
      order_accepting: string;
      restock_accept: string;
    };
    on: string;
    off: string;
    provisional: string;
    nonEditableNote: string;
    history: string;
    noHistory: string;
    publicReflectNote: string;
  };
  /** 仕入先管理（§12）画面のラベル。 */
  suppliers: {
    title: string;
    intro: string;
    name: string;
    region: string;
    country: string;
    publicLevel: string;
    contact: string;
    note: string;
    levels: { public: string; brand_only: string; region_only: string; private: string };
    empty: string;
    confidentialNote: string;
  };
  /** 入金管理（§12）画面のラベル。 */
  payments: {
    title: string;
    intro: string;
    orderId: string;
    expectedAmount: string;
    paidAmount: string;
    paymentType: string;
    matchingNumber: string;
    recordReceipt: string;
    empty: string;
    noBankNote: string;
  };
  /** 配送管理（§12）画面のラベル。 */
  shipments: {
    title: string;
    intro: string;
    orderId: string;
    carrier: string;
    method: string;
    tracking: string;
    actualCost: string;
    chargedCost: string;
    empty: string;
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
