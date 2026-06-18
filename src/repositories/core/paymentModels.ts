import type { CurrencyCode, Money } from "@/types/commerce";
import type { PaymentStatus } from "@/lib/commerce/paymentStatus";

/**
 * Phase 2B 入金ドメインのモデル。台湾口座振込の手動確認フローを想定。
 * 機微（金額・照合・会計）情報のため owner 限定（payments_owner RLS, paymentService）。
 * 実銀行口座番号は保存しない（matching_number は照合用の任意文字列）。
 */
export type PaymentRecord = {
  id: string;
  organizationId: string;
  orderId?: string;
  status: PaymentStatus;
  currency: CurrencyCode;
  /** 入金済み金額。 */
  amount: Money;
  /** 予定金額。 */
  expectedAmount?: Money;
  paymentType?: string;
  matchingNumber?: string;
  exchangeRate?: number;
  paidAt?: string;
  confirmedAt?: string;
  confirmedBy?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
};

export type PaymentCreateInput = {
  organizationId?: string;
  orderId?: string;
  currency: CurrencyCode;
  expectedAmountMinor?: number;
  paymentType?: string;
  note?: string;
};

export type PaymentUpdateInput = {
  paymentType?: string;
  matchingNumber?: string;
  expectedAmountMinor?: number;
  note?: string;
};

export type PaymentReceiptInput = {
  amountMinor: number;
  paidAt?: string;
  matchingNumber?: string;
};
