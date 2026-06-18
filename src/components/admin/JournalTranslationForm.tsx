"use client";

import { useActionState } from "react";
import { upsertJournalTranslationAction } from "@/app/[locale]/(admin)/admin/actions";
import type { ActionState } from "@/lib/admin/actionState";
import type { AdminDictionary } from "@/dictionaries/admin";
import styles from "./Admin.module.css";

type Props = {
  journalId: string;
  targetLocale: "ja" | "zh-tw";
  currentTitle?: string;
  currentExcerpt?: string;
  locale: string;
  notify: AdminDictionary["notify"];
  common: AdminDictionary["common"];
};

const initialState: ActionState = { ok: false };

export function JournalTranslationForm({
  journalId,
  targetLocale,
  currentTitle,
  currentExcerpt,
  locale,
  notify,
  common,
}: Props) {
  const [state, formAction] = useActionState(upsertJournalTranslationAction, initialState);

  const message = state.ok
    ? notify.success
    : state.code
      ? (notify[state.code as keyof typeof notify] ?? notify.error)
      : "";

  return (
    <form action={formAction} style={{ display: "grid", gap: "4px" }}>
      <input name="journalId" type="hidden" value={journalId} />
      <input name="locale" type="hidden" value={locale} />
      <input name="targetLocale" type="hidden" value={targetLocale} />
      <input
        aria-label={`${common.title} (${targetLocale})`}
        defaultValue={currentTitle ?? ""}
        name="title"
        placeholder={`${common.title} (${targetLocale})`}
        required
        style={{ width: "100%" }}
        type="text"
      />
      <input
        aria-label={`${common.excerpt} (${targetLocale})`}
        defaultValue={currentExcerpt ?? ""}
        name="excerpt"
        placeholder={`${common.excerpt} (${targetLocale})`}
        style={{ width: "100%" }}
        type="text"
      />
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <button className={styles.badge} type="submit">
          {common.save}
        </button>
        {message ? (
          <span className="muted" role="status">
            {message}
          </span>
        ) : null}
      </div>
    </form>
  );
}
