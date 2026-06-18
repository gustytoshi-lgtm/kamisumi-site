"use client";

import { useActionState } from "react";
import { setOrderNotesAction } from "@/app/[locale]/admin/actions";
import type { ActionState } from "@/lib/admin/actionState";
import type { AdminDictionary } from "@/dictionaries/admin";
import styles from "./Admin.module.css";

type Props = {
  orderId: string;
  customerNote?: string;
  internalNote?: string;
  locale: string;
  notify: AdminDictionary["notify"];
  common: AdminDictionary["common"];
};

const initialState: ActionState = { ok: false };

export function OrderNotesForm({
  orderId,
  customerNote,
  internalNote,
  locale,
  notify,
  common,
}: Props) {
  const [state, formAction] = useActionState(setOrderNotesAction, initialState);

  const message = state.ok
    ? notify.success
    : state.code
      ? (notify[state.code as keyof typeof notify] ?? notify.error)
      : "";

  return (
    <form
      action={formAction}
      style={{ display: "grid", gap: "6px" }}
    >
      <input name="orderId" type="hidden" value={orderId} />
      <input name="locale" type="hidden" value={locale} />
      <textarea
        aria-label={common.customerNote}
        defaultValue={customerNote ?? ""}
        name="customerNote"
        placeholder={common.customerNote}
        rows={2}
        style={{ resize: "vertical" }}
      />
      <textarea
        aria-label={common.internalNote}
        defaultValue={internalNote ?? ""}
        name="internalNote"
        placeholder={common.internalNote}
        rows={2}
        style={{ resize: "vertical" }}
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
