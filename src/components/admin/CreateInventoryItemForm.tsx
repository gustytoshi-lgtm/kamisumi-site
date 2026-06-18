"use client";

import { useActionState } from "react";
import { createInventoryItemAction } from "@/app/[locale]/(admin)/admin/actions";
import type { ActionState } from "@/lib/admin/actionState";
import type { AdminDictionary } from "@/dictionaries/admin";
import styles from "./Admin.module.css";

type Props = {
  locale: string;
  notify: AdminDictionary["notify"];
  common: AdminDictionary["common"];
};

const initialState: ActionState = { ok: false };

export function CreateInventoryItemForm({ locale, notify, common }: Props) {
  const [state, formAction] = useActionState(createInventoryItemAction, initialState);

  const message = state.ok
    ? notify.success
    : state.code
      ? (notify[state.code as keyof typeof notify] ?? notify.error)
      : "";

  return (
    <form action={formAction} style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
      <input name="locale" type="hidden" value={locale} />
      <input name="productId" placeholder="productId" required style={{ width: "180px" }} type="text" />
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
