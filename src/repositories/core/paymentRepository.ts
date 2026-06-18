import type { ActorContext } from "./writeModels";
import type { PaymentStatus } from "@/lib/commerce/paymentStatus";
import type {
  PaymentCreateInput,
  PaymentReceiptInput,
  PaymentRecord,
  PaymentUpdateInput,
} from "./paymentModels";

/**
 * 入金の書込/読取契約。mock / Supabase が同一契約を満たす。
 * 状態遷移の正当性は paymentService（paymentStatus 状態機械）で強制し、
 * repository は永続化 + 監査を担う。owner 限定（payments_owner RLS）。
 */
export interface PaymentRepository {
  createPayment(input: PaymentCreateInput, ctx: ActorContext): Promise<PaymentRecord>;
  updatePayment(id: string, patch: PaymentUpdateInput, ctx: ActorContext): Promise<PaymentRecord>;
  changePaymentStatus(
    id: string,
    toStatus: PaymentStatus,
    ctx: ActorContext,
    note?: string,
  ): Promise<PaymentRecord>;
  /** 入金実績を記録する（受領金額 + 入金日時 + 確認者）。状態遷移は別途 changePaymentStatus。 */
  recordReceipt(
    id: string,
    receipt: PaymentReceiptInput,
    ctx: ActorContext,
  ): Promise<PaymentRecord>;
  getPayment(id: string): Promise<PaymentRecord | null>;
  listPayments(options?: { orderId?: string }): Promise<PaymentRecord[]>;
}
