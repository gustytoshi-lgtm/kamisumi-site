import type { CommerceRepository } from "./core/commerceRepository";
import type { CommerceWriteRepository } from "./core/commerceWriteRepository";
import { getDataBackend, isSupabaseConfigured } from "@/config/dataBackend";
import { createCommerceService, type CommerceService } from "@/lib/commerce/commerceService";
import { mockCommerceRepository } from "./kamisumi/mockCommerceRepository";
import { mockCommerceWriteRepository } from "./mock/mockCommerceWriteRepository";
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

/**
 * 書込 repository factory。既定 mock。Supabase 書込は本番情報が揃ってから実装・有効化する。
 * （読取と同じく DATA_BACKEND と env を尊重）
 */
export function getCommerceWriteRepository(): CommerceWriteRepository {
  if (getDataBackend() === "supabase") {
    if (!isSupabaseConfigured()) {
      throw new Error(
        "DATA_BACKEND=supabase but Supabase env is missing. Unset DATA_BACKEND to use mock.",
      );
    }
    // Supabase 書込 repository は別途実装予定（HANDOFF 参照）。未実装のため明示エラー。
    throw new Error("SupabaseCommerceWriteRepository is not implemented yet. Use mock mode.");
  }
  return mockCommerceWriteRepository;
}

export function getCommerceService(): CommerceService {
  return createCommerceService(getCommerceWriteRepository());
}
