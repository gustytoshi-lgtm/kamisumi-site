import type { CommerceRepository } from "./core/commerceRepository";
import { getDataBackend, isSupabaseConfigured } from "@/config/dataBackend";
import { mockCommerceRepository } from "./kamisumi/mockCommerceRepository";
import { supabaseCommerceRepository } from "./supabase/supabaseCommerceRepository";

/**
 * 公開 UI はこの factory 経由でのみデータを取得する（Supabase/Shopify 等を直接呼ばない）。
 * 既定は mock。DATA_BACKEND=supabase かつ Supabase 設定済みのときだけ Supabase 実装へ切り替える。
 */
export function getCommerceRepository(): CommerceRepository {
  if (getDataBackend() === "supabase") {
    if (!isSupabaseConfigured()) {
      throw new Error(
        "DATA_BACKEND=supabase but Supabase env is missing. " +
          "Set NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY, or unset DATA_BACKEND to use mock.",
      );
    }
    return supabaseCommerceRepository;
  }
  return mockCommerceRepository;
}
