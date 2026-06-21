import type { CommerceRepository } from "./core/commerceRepository";
import type { CommerceWriteRepository } from "./core/commerceWriteRepository";
import type { AuditEntry } from "./core/writeModels";
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
import type { ExpenseRepository } from "./core/expenseRepository";
import { createExpenseService, type ExpenseService } from "@/lib/commerce/expenseService";
import { mockExpenseRepository } from "./mock/mockExpenseRepository";
import { supabaseExpenseRepository } from "./supabase/supabaseExpenseRepository";
import {
  createAccountingExportService,
  type AccountingExportService,
} from "@/lib/commerce/accountingExportService";
import { mockAccountingExporter } from "@/lib/commerce/accountingExport";
import type { MediaRepository } from "./core/mediaRepository";
import { createMediaService, type MediaService } from "@/lib/commerce/mediaService";
import { mockMediaRepository } from "./mock/mockMediaRepository";
import { supabaseMediaRepository } from "./supabase/supabaseMediaRepository";
import { createSnsDraftService, type SnsDraftService } from "@/lib/commerce/snsDraftService";
import { mockSnsDraftRepository } from "@/lib/commerce/snsDraft";
import { mockNotifier } from "@/lib/commerce/notifications";
import type { Notifier } from "@/lib/commerce/notifications";
import type { CustomerPortalRepository } from "./core/customerRepository";
import {
  createCustomerPortalService,
  type CustomerPortalService,
} from "@/lib/customer/customerPortalService";
import { mockCustomerPortalRepository } from "./mock/mockCustomerPortalRepository";
import { supabaseCustomerPortalRepository } from "./supabase/supabaseCustomerPortalRepository";
import { createMockCartRepository, type CartRepository } from "@/lib/commerce/cart";
import { createMockManualTransferAdapter, type CheckoutAdapter } from "@/lib/commerce/checkout";
import {
  createManualTransferOrderService,
  createMockManualTransferOrderRepository,
  type ManualTransferOrderRepository,
  type ManualTransferOrderService,
} from "@/lib/commerce/checkoutOrder";
import { supabaseCheckoutOrderRepository } from "./supabase/supabaseCheckoutOrderRepository";

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
    return supabaseCommerceWriteRepository;
  }
  return mockCommerceWriteRepository;
}

export function getCommerceService(): CommerceService {
  return createCommerceService(getCommerceWriteRepository(), getNotifier());
}

/**
 * 操作履歴（監査ログ）の全ドメイン横断集約。owner 限定の操作履歴ビューア用。
 *
 * Supabase は全ドメインが単一の `audit_logs` テーブルへ書込むため、commerce write の
 * `listAuditLogs()` が全件を返す。mock は各ドメインが独立した audit ストアを持つので、
 * 商品/在庫/注文/買付/読み物（commerce write）に加え、配送・入金・調達を横断マージする。
 * 並び順は呼び出し側（`sortAuditEntriesDesc`）で確定するためここでは整列しない。
 */
export async function collectAuditLogs(): Promise<AuditEntry[]> {
  if (getDataBackend() === "supabase") {
    if (!isSupabaseConfigured()) {
      throw new Error(
        "DATA_BACKEND=supabase but Supabase env is missing. Unset DATA_BACKEND to use mock.",
      );
    }
    return supabaseCommerceWriteRepository.listAuditLogs();
  }
  const commerce = await mockCommerceWriteRepository.listAuditLogs();
  return [
    ...commerce,
    ...mockFulfillmentRepository.listAuditLogs(),
    ...mockPaymentRepository.listAuditLogs(),
    ...mockProcurementRepository.listAuditLogs(),
  ];
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
  return createFulfillmentService(getFulfillmentRepository(), getNotifier());
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
  return createPaymentService(getPaymentRepository(), getNotifier());
}

/** 業務設定 repository factory。既定 mock。Supabase は実クエリ実装済み（実 DB 検証待ち）。 */
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

/** 抹茶ロット repository factory。既定 mock。Supabase は実クエリ実装済み（実 DB 検証待ち）。 */
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

/** 陶器個体 repository factory。既定 mock。Supabase は実クエリ実装済み（実 DB 検証待ち）。 */
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

/** 経費 repository factory。既定 mock。Supabase は実クエリ実装済み（実 DB 検証待ち）。 */
export function getExpenseRepository(): ExpenseRepository {
  if (getDataBackend() === "supabase") {
    if (!isSupabaseConfigured()) {
      throw new Error(
        "DATA_BACKEND=supabase but Supabase env is missing. Unset DATA_BACKEND to use mock.",
      );
    }
    return supabaseExpenseRepository;
  }
  return mockExpenseRepository;
}

export function getExpenseService(): ExpenseService {
  return createExpenseService(getExpenseRepository());
}

/**
 * 会計 export サービス。現状は in-memory mock exporter（dev・再起動で消える）。
 * 本番は同 interface の adapter に差し替える（Phase 4）。
 */
export function getAccountingExportService(): AccountingExportService {
  return createAccountingExportService(mockAccountingExporter);
}

/** メディア repository factory。既定 mock。Supabase はメタデータ実クエリ実装済み（Storage 連携は実装待ち）。 */
export function getMediaRepository(): MediaRepository {
  if (getDataBackend() === "supabase") {
    if (!isSupabaseConfigured()) {
      throw new Error(
        "DATA_BACKEND=supabase but Supabase env is missing. Unset DATA_BACKEND to use mock.",
      );
    }
    return supabaseMediaRepository;
  }
  return mockMediaRepository;
}

export function getMediaService(): MediaService {
  return createMediaService(getMediaRepository());
}

/** SNS 下書きサービス（Phase 3・dev mock。承認しても自動公開しない）。 */
export function getSnsDraftService(): SnsDraftService {
  return createSnsDraftService(mockSnsDraftRepository);
}

/**
 * 通知 notifier（Phase 3・dev mock。本番送信なし）。状態変化サービスへ注入され best-effort で enqueue。
 * 本番は同 interface のメール/配信 adapter へ差し替える。
 */
export function getNotifier(): Notifier {
  return mockNotifier;
}

/** 顧客マイページ repository factory。既定 mock。Supabase は customer_accounts + RLS で本人データに限定。 */
export function getCustomerPortalRepository(): CustomerPortalRepository {
  if (getDataBackend() === "supabase") {
    if (!isSupabaseConfigured()) {
      throw new Error(
        "DATA_BACKEND=supabase but Supabase env is missing. Unset DATA_BACKEND to use mock.",
      );
    }
    return supabaseCustomerPortalRepository;
  }
  return mockCustomerPortalRepository;
}

export function getCustomerPortalService(): CustomerPortalService {
  return createCustomerPortalService(getCustomerPortalRepository());
}

// ---- cart / checkout（Phase 3 公開 UI。mock のみ。本番決済なし）----
// プロセス内シングルトン。mock は in-memory（dev・再起動で消える）。本番カート永続化は Phase 4+。
const mockCartRepository = createMockCartRepository();
const mockManualTransferAdapter = createMockManualTransferAdapter();

/** cart repository factory。現状 mock のみ（Supabase カート永続化は Phase 4+）。 */
export function getCartRepository(): CartRepository {
  return mockCartRepository;
}

/** checkout adapter factory。手動振込 mock のみ。本番決済 provider は契約後に同 interface で差し替える。 */
export function getCheckoutAdapter(): CheckoutAdapter {
  return mockManualTransferAdapter;
}

// 手動振込の注文台帳（mock シングルトン）。checkout 時に注文を記録し、owner が入金確認する。
const mockManualTransferOrderRepository = createMockManualTransferOrderRepository();

/**
 * 手動振込の注文台帳 repository factory。既定 mock。
 * `DATA_BACKEND=supabase` かつ env 揃いのときのみ Supabase（0017 checkout_orders, owner RLS）。
 * 設定不備で supabase 指定時は明示エラー（誤って本番風に動かさない）。
 */
export function getManualTransferOrderRepository(): ManualTransferOrderRepository {
  if (getDataBackend() === "supabase") {
    if (!isSupabaseConfigured()) {
      throw new Error(
        "DATA_BACKEND=supabase but Supabase env is missing. Unset DATA_BACKEND to use mock.",
      );
    }
    return supabaseCheckoutOrderRepository;
  }
  return mockManualTransferOrderRepository;
}

/** 手動振込の注文台帳 service factory。placeOrder は公開、確認/取消/一覧は owner 限定。 */
export function getManualTransferOrderService(): ManualTransferOrderService {
  return createManualTransferOrderService(getManualTransferOrderRepository());
}
