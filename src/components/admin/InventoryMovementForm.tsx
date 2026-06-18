"use client";

import { useActionState } from "react";
import { applyInventoryMovementAction } from "@/app/[locale]/(admin)/admin/actions";
import type { ActionState } from "@/lib/admin/actionState";
import type { AdminDictionary } from "@/dictionaries/admin";
import styles from "./Admin.module.css";

const MOVEMENT_REASONS = [
  "purchase_in",
  "manual_adjust",
  "reserve",
  "release_reservation",
  "hold",
  "release_hold",
  "ship_out",
  "mark_damaged",
  "return_in",
  "inspection",
] as const;

type Props = {
  itemId: string;
  locale: string;
  notify: AdminDictionary["notify"];
  common: AdminDictionary["common"];
};

const initialState: ActionState = { ok: false };

export function InventoryMovementForm({ itemId, locale, notify, common }: Props) {
  const [state, formAction] = useActionState(applyInventoryMovementAction, initialState);

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
      style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}
    >
      <input name="itemId" type="hidden" value={itemId} />
      <input name="locale" type="hidden" value={locale} />
      <select aria-label={common.reason} name="reason" required>
        {MOVEMENT_REASONS.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
      <input
        aria-label={common.quantity}
        defaultValue={0}
        name="quantityDelta"
        style={{ width: "72px" }}
        type="number"
      />
      <input
        aria-label={common.note}
        name="note"
        placeholder={common.note}
        style={{ width: "120px" }}
        type="text"
      />
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
