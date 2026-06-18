import type { Metadata } from "next";
import { CreateJournalDraftForm } from "@/components/admin/CreateJournalDraftForm";
import { JournalStatusForm } from "@/components/admin/JournalStatusForm";
import { getAdminDictionary } from "@/dictionaries/admin";
import { getAdminSession, resolveAdminLocale } from "@/lib/admin/auth";
import { canAny } from "@/lib/commerce/rbac";
import { getLocaleFromParams, type LocaleParams } from "@/lib/params";
import { getCommerceWriteRepository } from "@/repositories";
import { siteConfig } from "@/config/site";
import styles from "@/components/admin/Admin.module.css";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const locale = await getLocaleFromParams(params);
  const session = getAdminSession();
  const d = getAdminDictionary(resolveAdminLocale(locale, session));
  return { title: `${d.nav.journal} | KAMISUMI Admin` };
}

export default async function AdminJournalPage({ params }: LocaleParams) {
  const locale = await getLocaleFromParams(params);
  const session = getAdminSession();
  const adminLocale = resolveAdminLocale(locale, session);
  const dictionary = getAdminDictionary(adminLocale);

  const allowed = session !== null && canAny(session.role, ["journal:manage"]);

  if (!allowed) {
    return (
      <>
        <h1>{dictionary.nav.journal}</h1>
        <p className="muted">{dictionary.common.noPermission}</p>
      </>
    );
  }

  const repo = getCommerceWriteRepository();
  const auditLogs = await repo.listAuditLogs();
  const journalIds = auditLogs
    .filter((a) => a.action === "create" && a.entityType === "journal")
    .map((a) => a.entityId);

  const posts = await Promise.all(journalIds.map((id) => repo.getJournal(id)));
  const validPosts = posts.filter(
    (p): p is NonNullable<typeof p> => p !== null,
  );

  return (
    <>
      <h1>{dictionary.nav.journal}</h1>
      <CreateJournalDraftForm
        common={dictionary.common}
        defaultBrandId={siteConfig.brand.id}
        locale={locale}
        notify={dictionary.notify}
      />
      <p className="muted">{validPosts.length}</p>
      {validPosts.length === 0 ? (
        <p className="muted">—</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Slug</th>
              <th>{dictionary.common.status}</th>
              <th>{dictionary.common.category}</th>
              <th>{dictionary.common.title} (ja)</th>
              <th>{dictionary.common.actions}</th>
            </tr>
          </thead>
          <tbody>
            {validPosts.map((post) => (
              <tr key={post.id}>
                <td>
                  <code style={{ fontSize: "0.8em" }}>{post.slug}</code>
                </td>
                <td>
                  <span className={styles.badge}>{post.status}</span>
                </td>
                <td>{post.category}</td>
                <td>{post.translations.ja?.title ?? "—"}</td>
                <td>
                  <JournalStatusForm
                    common={dictionary.common}
                    currentStatus={post.status}
                    deletedAt={post.deletedAt}
                    journalId={post.id}
                    locale={locale}
                    notify={dictionary.notify}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
