import { adminJa } from "./ja";
import { adminZhTw } from "./zh-tw";
import type { AdminDictionary, AdminLocale } from "./types";

export type { AdminDictionary, AdminLocale } from "./types";

const adminDictionaries: Record<AdminLocale, AdminDictionary> = {
  ja: adminJa,
  "zh-tw": adminZhTw,
};

export function getAdminDictionary(locale: AdminLocale): AdminDictionary {
  return adminDictionaries[locale];
}
