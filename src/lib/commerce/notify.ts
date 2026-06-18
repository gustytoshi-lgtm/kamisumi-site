import type { NotificationMessage, Notifier } from "./notifications";

/**
 * best-effort 通知 enqueue。通知の失敗で業務処理（状態変更等）を止めない。
 * notifier 未指定なら何もしない。送信エラーは握りつぶす（記録は notifier 側の責務）。
 */
export async function notifyBestEffort(
  notifier: Notifier | undefined,
  message: NotificationMessage,
): Promise<void> {
  if (!notifier) return;
  try {
    await notifier.send(message);
  } catch {
    // 通知失敗は業務処理に影響させない（ログ出力は個人情報保護のため最小限）。
  }
}
