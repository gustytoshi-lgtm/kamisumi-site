/**
 * 通知 interface + mock（Phase 3 基盤）。
 *
 * 重要: 本番送信は行わない。実メール送信サービス・実 API キーは持たない。
 * mock は送信内容を in-memory に記録するだけ（dev・再起動で消える）。
 * 個人情報（宛先メール等）はログに出さない方針（記録は内部用途のみ）。
 */
export type NotificationChannel = "email" | "in_app";

export type NotificationKind =
  | "order_status"
  | "payment_received"
  | "shipment_update"
  | "restock"
  | "sourcing_update";

export type NotificationMessage = {
  channel: NotificationChannel;
  kind: NotificationKind;
  to: string;
  subject?: string;
  body: string;
};

export type NotificationResult = {
  id: string;
  channel: NotificationChannel;
  kind: NotificationKind;
  status: "queued" | "sent" | "skipped";
  createdAt: string;
};

export interface Notifier {
  send(message: NotificationMessage): Promise<NotificationResult>;
}

function validate(message: NotificationMessage): void {
  if (!message.to.trim()) throw new Error("notification requires a recipient");
  if (!message.body.trim()) throw new Error("notification requires a body");
}

export type MockNotifier = Notifier & {
  /** 送信済み記録（宛先はマスクして返す）。 */
  listSent(): NotificationResult[];
  reset(): void;
};

function maskRecipient(to: string): string {
  // 個人情報をそのまま保持しない（先頭2文字 + ***）。
  const head = to.slice(0, 2);
  return `${head}***`;
}

export function createMockNotifier(): MockNotifier {
  let sent: (NotificationResult & { toMasked: string })[] = [];
  let counter = 0;
  return {
    async send(message) {
      validate(message);
      const result: NotificationResult = {
        id: `ntf-${++counter}`,
        channel: message.channel,
        kind: message.kind,
        status: "sent", // mock: 実送信せず "sent" 扱い
        createdAt: new Date().toISOString(),
      };
      sent.push({ ...result, toMasked: maskRecipient(message.to) });
      return result;
    },
    listSent() {
      return sent.map(({ toMasked: _toMasked, ...rest }) => {
        void _toMasked;
        return rest;
      });
    },
    reset() {
      sent = [];
      counter = 0;
    },
  };
}

/** アプリ既定の mock notifier（dev・in-memory。listSent で確認可）。 */
export const mockNotifier: MockNotifier = createMockNotifier();

/** 本番メール送信 adapter の sandbox スケルトン（本番契約後に実装）。 */
export function createSandboxEmailNotifier(): Notifier {
  return {
    async send() {
      throw new Error("production email notifier is not implemented (Phase 3+, no real sending).");
    },
  };
}
