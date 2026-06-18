import type { Metadata } from "next";
import { AdminActionForm, type AdminFormField } from "@/components/admin/AdminActionForm";
import { getAdminDictionary } from "@/dictionaries/admin";
import { getAdminSession, resolveAdminLocale } from "@/lib/admin/auth";
import { canAny } from "@/lib/commerce/rbac";
import { getLocaleFromParams, type LocaleParams } from "@/lib/params";
import { getSettingsService } from "@/repositories";
import {
  EDITABLE_SETTINGS,
  getSettingDefinition,
  type SettingGroup,
} from "@/repositories/core/settingsModels";
import { updateSettingAction } from "./actions";
import styles from "@/components/admin/Admin.module.css";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const locale = await getLocaleFromParams(params);
  const session = await getAdminSession();
  const d = getAdminDictionary(resolveAdminLocale(locale, session));
  return { title: `${d.settings.title} | KAMISUMI Admin` };
}

export default async function AdminSettingsPage({ params }: LocaleParams) {
  const locale = await getLocaleFromParams(params);
  const session = await getAdminSession();
  const adminLocale = resolveAdminLocale(locale, session);
  const d = getAdminDictionary(adminLocale);

  if (!session || !canAny(session.role, ["settings:manage"])) {
    return (
      <>
        <h1>{d.settings.title}</h1>
        <p className="muted">{d.common.noPermission}</p>
      </>
    );
  }

  const actor = { userId: session.userId, role: session.role };
  const [records, history] = await Promise.all([
    getSettingsService().listSettings(actor),
    getSettingsService().listHistory(actor),
  ]);
  const valueOf = (key: string) => records.find((r) => r.key === key)?.value ?? "";

  const fieldFor = (key: string, value: string): AdminFormField => {
    const def = getSettingDefinition(key)!;
    if (def.type === "bool") {
      return {
        kind: "select",
        name: "value",
        label: d.settings.fields[key as keyof typeof d.settings.fields],
        defaultValue: value || "on",
        options: [
          { value: "on", label: d.settings.on },
          { value: "off", label: d.settings.off },
        ],
      };
    }
    const kind = def.type === "int" ? "number" : def.type === "email" ? "email" : "text";
    return {
      kind,
      name: "value",
      label: d.settings.fields[key as keyof typeof d.settings.fields],
      defaultValue: value,
      required: def.required,
    };
  };

  const groups: SettingGroup[] = ["brand", "sales", "content"];

  return (
    <>
      <h1>{d.settings.title}</h1>
      <p className="muted">{d.settings.intro}</p>
      <p className="muted">{d.settings.publicReflectNote}</p>

      {groups.map((group) => {
        const defs = EDITABLE_SETTINGS.filter((s) => s.group === group);
        if (defs.length === 0) return null;
        return (
          <section className={styles.panel} key={group} style={{ marginTop: "16px" }}>
            <h2>{d.settings.groups[group]}</h2>
            <div style={{ display: "grid", gap: "10px" }}>
              {defs.map((def) => (
                <div
                  key={def.key}
                  style={{ borderBottom: "1px solid #d3ccbf", paddingBottom: "8px" }}
                >
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    {def.provisional ? (
                      <span className={styles.badge}>{d.settings.provisional}</span>
                    ) : null}
                  </div>
                  <AdminActionForm
                    action={updateSettingAction}
                    fields={[
                      { kind: "hidden", name: "key", value: def.key },
                      { kind: "hidden", name: "locale", value: locale },
                      fieldFor(def.key, valueOf(def.key)),
                    ]}
                    notify={d.notify}
                    submitLabel={d.common.save}
                  />
                </div>
              ))}
            </div>
          </section>
        );
      })}

      <p className="muted" style={{ marginTop: "16px" }}>
        {d.settings.nonEditableNote}
      </p>

      <section className={styles.panel} style={{ marginTop: "16px" }}>
        <h2>{d.settings.history}</h2>
        {history.length === 0 ? (
          <p className="muted">{d.settings.noHistory}</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>key</th>
                <th>old → new</th>
                <th>{d.common.signedInAs}</th>
                <th>at</th>
              </tr>
            </thead>
            <tbody>
              {history.slice(0, 20).map((h) => (
                <tr key={h.id}>
                  <td>{h.key}</td>
                  <td className="muted">
                    {(h.oldValue ?? "∅") + " → " + h.newValue}
                  </td>
                  <td>{h.changedBy}</td>
                  <td className="muted">{h.changedAt.slice(0, 19).replace("T", " ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
