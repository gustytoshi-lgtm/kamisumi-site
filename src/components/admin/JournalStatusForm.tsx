"use client";

import { useActionState } from "react";
import { setJournalStatusAction, softDeleteJournalAction } from "@/app/[locale]/(admin)/admin/actions";
import type { ActionState } from "@/lib/admin/actionState";
import type { AdminDictionary } from "@/dictionaries/admin";
import type { JournalStatus } from "@/repositories/core/writeModels";
import styles from "./Admin.module.css";

type Props = {
  journalId: string;
  currentStatus: JournalStatus;
  deletedAt?: string;
  locale: string;
  notify: AdminDictionary["notify"];
  common: AdminDictionary["common"];
};

const initialState: ActionState = { ok: false };

export function JournalStatusForm({
  journalId,
  currentStatus,
  deletedAt,
  locale,
  notify,
  common,
}: Props) {
  const [publishState, publishAction] = useActionState(setJournalStatusAction, initialState);
  const [deleteState, deleteAction] = useActionState(softDeleteJournalAction, initialState);

  const publishMessage = publishState.ok
    ? notify.success
    : publishState.code
      ? (notify[publishState.code as keyof typeof notify] ?? notify.error)
      : "";

  const deleteMessage = deleteState.ok
    ? notify.success
    : deleteState.code
      ? (notify[deleteState.code as keyof typeof notify] ?? notify.error)
      : "";

  if (deletedAt) {
    return <span className="muted">削除済み</span>;
  }

  return (
    <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
      {currentStatus !== "published" && (
        <form
          action={publishAction}
          onSubmit={(event) => {
            if (!window.confirm(common.confirm)) event.preventDefault();
          }}
        >
          <input name="journalId" type="hidden" value={journalId} />
          <input name="locale" type="hidden" value={locale} />
          <input name="status" type="hidden" value="published" />
          <button className={styles.badge} type="submit">
            {common.publish}
          </button>
        </form>
      )}
      {currentStatus === "published" && (
        <form
          action={publishAction}
          onSubmit={(event) => {
            if (!window.confirm(common.confirm)) event.preventDefault();
          }}
        >
          <input name="journalId" type="hidden" value={journalId} />
          <input name="locale" type="hidden" value={locale} />
          <input name="status" type="hidden" value="unlisted" />
          <button className={styles.badge} type="submit">
            {common.unpublish}
          </button>
        </form>
      )}
      <form
        action={deleteAction}
        onSubmit={(event) => {
          if (!window.confirm(common.confirm)) event.preventDefault();
        }}
      >
        <input name="journalId" type="hidden" value={journalId} />
        <input name="locale" type="hidden" value={locale} />
        <button className={styles.badge} style={{ opacity: 0.7 }} type="submit">
          {common.delete}
        </button>
      </form>
      {publishMessage ? (
        <span className="muted" role="status">
          {publishMessage}
        </span>
      ) : null}
      {deleteMessage ? (
        <span className="muted" role="status">
          {deleteMessage}
        </span>
      ) : null}
    </div>
  );
}
