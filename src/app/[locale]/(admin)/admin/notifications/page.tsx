import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isDevToolsEnabled } from "@/config/devtools";
import { getAdminDictionary } from "@/dictionaries/admin";
import { getAdminSession, resolveAdminLocale } from "@/lib/admin/auth";
import { mockNotifier } from "@/lib/commerce/notifications";
import { getLocaleFromParams, type LocaleParams } from "@/lib/params";
import styles from "@/components/admin/Admin.module.css";

// 開発専用: mock 通知の送信記録ビューア。本番/Supabase/ADMIN無効では 404（dev tools ガード）。
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const locale = await getLocaleFromParams(params);
  const session = await getAdminSession();
  const d = getAdminDictionary(resolveAdminLocale(locale, session));
  return { title: `${d.nav.dashboard} · notifications | KAMISUMI Admin` };
}

export default async function AdminNotificationsPage({ params }: LocaleParams) {
  if (!isDevToolsEnabled()) notFound();
  await getLocaleFromParams(params);

  const sent = mockNotifier.listSent();

  return (
    <>
      <h1>通知（dev・mock）</h1>
      <p className="muted">
        注文/入金/配送の状態変更で enqueue された通知の記録です（mock・本番送信なし・宛先はマスク）。
        サーバー再起動で消えます。
      </p>
      <p className="muted">{sent.length}</p>
      {sent.length === 0 ? (
        <p className="muted">まだ通知はありません。注文の状態変更などを行うと記録されます。</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>kind</th>
              <th>channel</th>
              <th>status</th>
              <th>createdAt</th>
            </tr>
          </thead>
          <tbody>
            {[...sent].reverse().map((n) => (
              <tr key={n.id}>
                <td>
                  <span className={styles.badge}>{n.kind}</span>
                </td>
                <td>{n.channel}</td>
                <td>{n.status}</td>
                <td className="muted">{n.createdAt.slice(0, 19).replace("T", " ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
