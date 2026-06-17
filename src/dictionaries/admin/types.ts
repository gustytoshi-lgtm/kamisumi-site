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
    search: string;
    status: string;
    actions: string;
    signedInAs: string;
    languageLabel: string;
    noPermission: string;
  };
};
