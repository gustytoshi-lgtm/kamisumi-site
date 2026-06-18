"use client";

import { useActionState } from "react";
import { createJournalDraftAction } from "@/app/[locale]/(admin)/admin/actions";
import type { ActionState } from "@/lib/admin/actionState";
import type { AdminDictionary } from "@/dictionaries/admin";
import styles from "./Admin.module.css";

type Props = {
  defaultBrandId: string;
  locale: string;
  notify: AdminDictionary["notify"];
  common: AdminDictionary["common"];
};

const initialState: ActionState = { ok: false };

export function CreateJournalDraftForm({ defaultBrandId, locale, notify, common }: Props) {
  const [state, formAction] = useActionState(createJournalDraftAction, initialState);

  const message = state.ok
    ? notify.success
    : state.code
      ? (notify[state.code as keyof typeof notify] ?? notify.error)
      : "";

  return (
    <form action={formAction} style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
      <input name="locale" type="hidden" value={locale} />
      <input defaultValue={defaultBrandId} name="brandId" placeholder="brandId" style={{ width: "120px" }} type="text" />
      <input
        name="slug"
        pattern="[a-z0-9-]+"
        placeholder={common.slug}
        required
        style={{ width: "140px" }}
        title="a-z 0-9 hyphen"
        type="text"
      />
      <input name="category" placeholder={common.category} required style={{ width: "100px" }} type="text" />
      <button className={styles.badge} type="submit">
        {common.create}
      </button>
      {message ? (
        <span className="muted" role="status">
          {message}
        </span>
      ) : null}
    </form>
  );
}
