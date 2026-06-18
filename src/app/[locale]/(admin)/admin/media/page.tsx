import type { Metadata } from "next";
import { AdminActionForm } from "@/components/admin/AdminActionForm";
import { getAdminDictionary } from "@/dictionaries/admin";
import { getAdminSession, resolveAdminLocale } from "@/lib/admin/auth";
import { MEDIA_KINDS } from "@/repositories/core/mediaModels";
import { canAny } from "@/lib/commerce/rbac";
import { getLocaleFromParams, type LocaleParams } from "@/lib/params";
import { getMediaService } from "@/repositories";
import { createMediaAction, deleteMediaAction, updateMediaAltAction } from "./actions";
import styles from "@/components/admin/Admin.module.css";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const locale = await getLocaleFromParams(params);
  const session = await getAdminSession();
  const d = getAdminDictionary(resolveAdminLocale(locale, session));
  return { title: `${d.media.title} | KAMISUMI Admin` };
}

export default async function AdminMediaPage({ params }: LocaleParams) {
  const locale = await getLocaleFromParams(params);
  const session = await getAdminSession();
  const d = getAdminDictionary(resolveAdminLocale(locale, session));

  if (!session || !canAny(session.role, ["media:manage", "product:manage_images"])) {
    return (
      <>
        <h1>{d.media.title}</h1>
        <p className="muted">{d.common.noPermission}</p>
      </>
    );
  }

  const actor = { userId: session.userId, role: session.role };
  const media = await getMediaService().listMedia(actor);
  const kindOptions = MEDIA_KINDS.map((k) => ({ value: k, label: d.media.kinds[k] }));

  return (
    <>
      <h1>{d.media.title}</h1>
      <p className="muted">{d.media.intro}</p>

      <section className={styles.panel} style={{ marginTop: "12px" }}>
        <h2>{d.common.create}</h2>
        <AdminActionForm
          action={createMediaAction}
          fields={[
            { kind: "hidden", name: "locale", value: locale },
            { kind: "select", name: "kind", label: d.media.kind, options: kindOptions },
            { kind: "text", name: "path", label: d.media.path, required: true, placeholder: "products/sample.png" },
            { kind: "text", name: "mimeType", label: d.media.mimeType, placeholder: "image/png" },
            { kind: "number", name: "byteSize", label: "bytes" },
            { kind: "text", name: "altJa", label: d.media.altJa },
            { kind: "text", name: "altZh", label: d.media.altZh },
          ]}
          layout="stack"
          notify={d.notify}
          submitLabel={d.common.create}
        />
        <p className="muted">{d.media.privateNote}</p>
      </section>

      <p className="muted" style={{ marginTop: "12px" }}>
        {media.length}
      </p>
      {media.length === 0 ? (
        <p className="muted">{d.media.empty}</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{d.media.kind}</th>
              <th>{d.media.bucket}</th>
              <th>{d.media.path}</th>
              <th>alt</th>
              <th>{d.common.actions}</th>
            </tr>
          </thead>
          <tbody>
            {media.map((m) => (
              <tr key={m.id}>
                <td>{d.media.kinds[m.kind]}</td>
                <td>
                  <span className={styles.badge}>{m.bucket}</span>
                </td>
                <td className="muted" style={{ wordBreak: "break-all" }}>
                  {m.path}
                </td>
                <td>
                  <AdminActionForm
                    action={updateMediaAltAction}
                    fields={[
                      { kind: "hidden", name: "locale", value: locale },
                      { kind: "hidden", name: "mediaId", value: m.id },
                      { kind: "text", name: "altJa", label: d.media.altJa, defaultValue: m.altJa },
                      { kind: "text", name: "altZh", label: d.media.altZh, defaultValue: m.altZh },
                    ]}
                    notify={d.notify}
                    submitLabel={d.common.save}
                  />
                </td>
                <td>
                  <AdminActionForm
                    action={deleteMediaAction}
                    confirmText={d.common.confirm}
                    fields={[
                      { kind: "hidden", name: "locale", value: locale },
                      { kind: "hidden", name: "mediaId", value: m.id },
                    ]}
                    notify={d.notify}
                    submitLabel={d.common.delete}
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
