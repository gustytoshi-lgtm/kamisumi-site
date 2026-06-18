"use client";

import { useActionState } from "react";
import { setSourcingRequestStatusAction } from "@/app/[locale]/admin/actions";
import type { ActionState } from "@/lib/admin/actionState";
import type { AdminDictionary } from "@/dictionaries/admin";
import type { SourcingRequestStatus } from "@/repositories/core/writeModels";
import styles from "./Admin.module.css";

const SOURCING_STATUSES: SourcingRequestStatus[] = [
  "received",
  "reviewing",
  "accepted",
  "declined",
  "closed",
];

type Props = {
  requestId: string;
  currentStatus: SourcingRequestStatus;
  locale: string;
  notify: AdminDictionary["notify"];
  common: AdminDictionary["common"];
};

const initialState: ActionState = { ok: false };

export function SourcingRequestStatusForm({
  requestId,
  currentStatus,
  locale,
  notify,
  common,
}: Props) {
  const [state, formAction] = useActionState(setSourcingRequestStatusAction, initialState);

  const message = state.ok
    ? notify.success
    : state.code
      ? (notify[state.code as keyof typeof notify] ?? notify.error)
      : "";

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!window.confirm(common.confirm)) event.preventDefault();
      }}
      style={{ display: "flex", gap: "8px", alignItems: "center" }}
    >
      <input name="requestId" type="hidden" value={requestId} />
      <input name="locale" type="hidden" value={locale} />
      <select aria-label={common.status} defaultValue={currentStatus} name="status">
        {SOURCING_STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <button className={styles.badge} type="submit">
        {common.apply}
      </button>
      {message ? (
        <span className="muted" role="status">
          {message}
        </span>
      ) : null}
    </form>
  );
}
