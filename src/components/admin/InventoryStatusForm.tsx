"use client";

import { useActionState } from "react";
import { setInventoryStatusAction } from "@/app/[locale]/admin/actions";
import type { ActionState } from "@/lib/admin/actionState";
import type { AdminDictionary } from "@/dictionaries/admin";
import styles from "./Admin.module.css";

const INVENTORY_STATUSES = [
  "available",
  "reserved",
  "held",
  "awaiting_arrival",
  "inspection_pending",
  "packing",
  "damaged",
  "unavailable",
] as const;

type Props = {
  itemId: string;
  currentStatus: string;
  locale: string;
  notify: AdminDictionary["notify"];
  common: AdminDictionary["common"];
};

const initialState: ActionState = { ok: false };

export function InventoryStatusForm({ itemId, currentStatus, locale, notify, common }: Props) {
  const [state, formAction] = useActionState(setInventoryStatusAction, initialState);

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
      <input name="itemId" type="hidden" value={itemId} />
      <input name="locale" type="hidden" value={locale} />
      <select aria-label={common.status} defaultValue={currentStatus} name="status">
        {INVENTORY_STATUSES.map((s) => (
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
