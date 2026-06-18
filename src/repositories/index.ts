import type { CommerceRepository } from "./core/commerceRepository";
import type { CommerceWriteRepository } from "./core/commerceWriteRepository";
import type { ProcurementRepository } from "./core/procurementRepository";
import type { FulfillmentRepository } from "./core/fulfillmentRepository";
import type { PaymentRepository } from "./core/paymentRepository";
import { getDataBackend, isSupabaseConfigured } from "@/config/dataBackend";
import { createCommerceService, type CommerceService } from "@/lib/commerce/commerceService";
import {
  createProcurementService,
  type ProcurementService,
} from "@/lib/commerce/procurementService";
import {
  createFulfillmentService,
  type FulfillmentService,
} from "@/lib/commerce/fulfillmentService";
import { createPaymentService, type PaymentService } from "@/lib/commerce/paymentService";
import { mockCommerceRepository } from "./kamisumi/mockCommerceRepository";
import { mockCommerceWriteRepository } from "./mock/mockCommerceWriteRepository";
import { mockProcurementRepository } from "./mock/mockProcurementRepository";
import { mockFulfillmentRepository } from "./mock/mockFulfillmentRepository";
import { supabaseCommerceRepository } from "./supabase/supabaseCommerceRepository";
import { supabaseCommerceWriteRepository } from "./supabase/supabaseCommerceWriteRepository";
import { supabaseProcurementRepository } from "./supabase/supabaseProcurementRepository";
import { supabaseFulfillmentRepository } from "./supabase/supabaseFulfillmentRepository";
import { mockPaymentRepository } from "./mock/mockPaymentRepository";
import { supabasePaymentRepository } from "./supabase/supabasePaymentRepository";
import type { SettingsRepository } from "./core/settingsRepository";
import { createSettingsService, type SettingsService } from "@/lib/commerce/settingsService";
import { mockSettingsRepository } from "./mock/mockSettingsRepository";
import { supabaseSettingsRepository } from "./supabase/supabaseSettingsRepository";
import type { MatchaLotRepository } from "./core/matchaLotRepository";
import { createMatchaLotService, type MatchaLotService } from "@/lib/commerce/matchaLotService";
import { mockMatchaLotRepository } from "./mock/mockMatchaLotRepository";
import { supabaseMatchaLotRepository } from "./supabase/supabaseMatchaLotRepository";
import type { CeramicUnitRepository } from "./core/ceramicUnitRepository";
import { createCeramicUnitService, type CeramicUnitService } from "@/lib/commerce/ceramicUnitService";
import { mockCeramicUnitRepository } from "./mock/mockCeramicUnitRepository";
import { supabaseCeramicUnitRepository } from "./supabase/supabaseCeramicUnitRepository";

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
    // 契約は確定済み。各メソッドは実装待ち（呼ぶと NotImplemented）。HANDOFF 参照。
    return supabaseCommerceWriteRepository;
  }
  return mockCommerceWriteRepository;
}

export function getCommerceService(): CommerceService {
  return createCommerceService(getCommerceWriteRepository());
}

/**
 * Phase 2B 調達 repository factory。既定 mock。読取と同じく DATA_BACKEND と env を尊重する。
 */
export function getProcurementRepository(): ProcurementRepository {
  if (getDataBackend() === "supabase") {
    if (!isSupabaseConfigured()) {
      throw new Error(
        "DATA_BACKEND=supabase but Supabase env is missing. Unset DATA_BACKEND to use mock.",
      );
    }
    return supabaseProcurementRepository;
  }
  return mockProcurementRepository;
}

export function getProcurementService(): ProcurementService {
  return createProcurementService(getProcurementRepository());
}

/** Phase 2B フルフィルメント（配送）repository factory。既定 mock。 */
export function getFulfillmentRepository(): FulfillmentRepository {
  if (getDataBackend() === "supabase") {
    if (!isSupabaseConfigured()) {
      throw new Error(
        "DATA_BACKEND=supabase but Supabase env is missing. Unset DATA_BACKEND to use mock.",
      );
    }
    return supabaseFulfillmentRepository;
  }
  return mockFulfillmentRepository;
}

export function getFulfillmentService(): FulfillmentService {
  return createFulfillmentService(getFulfillmentRepository());
}

/** Phase 2B 入金 repository factory。既定 mock。owner 限定の業務は paymentService 経由。 */
export function getPaymentRepository(): PaymentRepository {
  if (getDataBackend() === "supabase") {
    if (!isSupabaseConfigured()) {
      throw new Error(
        "DATA_BACKEND=supabase but Supabase env is missing. Unset DATA_BACKEND to use mock.",
      );
    }
    return supabasePaymentRepository;
  }
  return mockPaymentRepository;
}

export function getPaymentService(): PaymentService {
  return createPaymentService(getPaymentRepository());
}

/** 業務設定 repository factory。既定 mock。Supabase は実装待ち（スケルトン）。 */
export function getSettingsRepository(): SettingsRepository {
  if (getDataBackend() === "supabase") {
    if (!isSupabaseConfigured()) {
      throw new Error(
        "DATA_BACKEND=supabase but Supabase env is missing. Unset DATA_BACKEND to use mock.",
      );
    }
    return supabaseSettingsRepository;
  }
  return mockSettingsRepository;
}

export function getSettingsService(): SettingsService {
  return createSettingsService(getSettingsRepository());
}

/** 抹茶ロット repository factory。既定 mock。Supabase はスケルトン（実装待ち）。 */
export function getMatchaLotRepository(): MatchaLotRepository {
  if (getDataBackend() === "supabase") {
    if (!isSupabaseConfigured()) {
      throw new Error(
        "DATA_BACKEND=supabase but Supabase env is missing. Unset DATA_BACKEND to use mock.",
      );
    }
    return supabaseMatchaLotRepository;
  }
  return mockMatchaLotRepository;
}

export function getMatchaLotService(): MatchaLotService {
  return createMatchaLotService(getMatchaLotRepository());
}

/** 陶器個体 repository factory。既定 mock。Supabase はスケルトン（実装待ち）。 */
export function getCeramicUnitRepository(): CeramicUnitRepository {
  if (getDataBackend() === "supabase") {
    if (!isSupabaseConfigured()) {
      throw new Error(
        "DATA_BACKEND=supabase but Supabase env is missing. Unset DATA_BACKEND to use mock.",
      );
    }
    return supabaseCeramicUnitRepository;
  }
  return mockCeramicUnitRepository;
}

export function getCeramicUnitService(): CeramicUnitService {
  return createCeramicUnitService(getCeramicUnitRepository());
}
