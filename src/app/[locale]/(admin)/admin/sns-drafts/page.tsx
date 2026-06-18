import type { Metadata } from "next";
import { AdminActionForm } from "@/components/admin/AdminActionForm";
import { getAdminDictionary } from "@/dictionaries/admin";
import { getAdminSession, resolveAdminLocale } from "@/lib/admin/auth";
import { canAny } from "@/lib/commerce/rbac";
import { getLocaleFromParams, type LocaleParams } from "@/lib/params";
import { getSnsDraftService } from "@/repositories";
import type { SnsDraftStatus } from "@/lib/commerce/snsDraft";
import {
  approveSnsDraftAction,
  createSnsDraftAction,
  deleteSnsDraftAction,
  rejectSnsDraftAction,
} from "./actions";
import styles from "@/components/admin/Admin.module.css";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const locale = await getLocaleFromParams(params);
  const session = await getAdminSession();
  const d = getAdminDictionary(resolveAdminLocale(locale, session));
  return { title: `${d.snsDrafts.title} | KAMISUMI Admin` };
}

export default async function AdminSnsDraftsPage({ params }: LocaleParams) {
  const locale = await getLocaleFromParams(params);
  const session = await getAdminSession();
  const d = getAdminDictionary(resolveAdminLocale(locale, session));

  if (!session || !canAny(session.role, ["journal:manage"])) {
    return (
      <>
        <h1>{d.snsDrafts.title}</h1>
        <p className="muted">{d.common.noPermission}</p>
      </>
    );
  }

  const actor = { userId: session.userId, role: session.role };
  const drafts = await getSnsDraftService().listDrafts(actor);
  const statusLabel: Record<SnsDraftStatus, string> = {
    pending: d.snsDrafts.pending,
    approved: d.snsDrafts.approved,
    rejected: d.snsDrafts.rejected,
  };

  return (
    <>
      <h1>{d.snsDrafts.title}</h1>
      <p className="muted">{d.snsDrafts.intro}</p>

      <section className={styles.panel} style={{ marginTop: "12px" }}>
        <h2>{d.common.create}</h2>
        <AdminActionForm
          action={createSnsDraftAction}
          fields={[
            { kind: "hidden", name: "locale", value: locale },
            {
              kind: "select",
              name: "platform",
              label: d.snsDrafts.platform,
              options: [
                { value: "threads", label: "Threads" },
                { value: "instagram", label: "Instagram" },
              ],
            },
            { kind: "text", name: "title", label: d.snsDrafts.draftTitle, required: true },
            { kind: "text", name: "shortDescription", label: d.snsDrafts.shortDescription },
          ]}
          layout="stack"
          notify={d.notify}
          submitLabel={d.common.create}
        />
      </section>

      <p className="muted" style={{ marginTop: "12px" }}>
        {drafts.length}
      </p>
      {drafts.length === 0 ? (
        <p className="muted">{d.snsDrafts.empty}</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{d.snsDrafts.platform}</th>
              <th>{d.snsDrafts.body}</th>
              <th>{d.snsDrafts.status}</th>
              <th>{d.common.actions}</th>
            </tr>
          </thead>
          <tbody>
            {drafts.map((draft) => (
              <tr key={draft.id}>
                <td>{draft.platform}</td>
                <td className="muted" style={{ whiteSpace: "pre-wrap", maxWidth: "320px" }}>
                  {draft.body}
                </td>
                <td>
                  <span className={styles.badge}>{statusLabel[draft.status]}</span>
                </td>
                <td>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {draft.status === "pending" && (
                      <>
                        <AdminActionForm
                          action={approveSnsDraftAction}
                          confirmText={d.common.confirm}
                          fields={[
                            { kind: "hidden", name: "locale", value: locale },
                            { kind: "hidden", name: "draftId", value: draft.id },
                          ]}
                          notify={d.notify}
                          submitLabel={d.snsDrafts.approve}
                        />
                        <AdminActionForm
                          action={rejectSnsDraftAction}
                          fields={[
                            { kind: "hidden", name: "locale", value: locale },
                            { kind: "hidden", name: "draftId", value: draft.id },
                          ]}
                          notify={d.notify}
                          submitLabel={d.snsDrafts.reject}
                        />
                      </>
                    )}
                    <AdminActionForm
                      action={deleteSnsDraftAction}
                      confirmText={d.common.confirm}
                      fields={[
                        { kind: "hidden", name: "locale", value: locale },
                        { kind: "hidden", name: "draftId", value: draft.id },
                      ]}
                      notify={d.notify}
                      submitLabel={d.common.delete}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="muted" style={{ marginTop: "12px" }}>
        {d.snsDrafts.noAutoPublishNote}
      </p>
    </>
  );
}
