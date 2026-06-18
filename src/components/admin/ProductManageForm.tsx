"use client";

import { useActionState } from "react";
import { softDeleteProductAction, restoreProductAction } from "@/app/[locale]/(admin)/admin/actions";
import type { ActionState } from "@/lib/admin/actionState";
import type { AdminDictionary } from "@/dictionaries/admin";
import styles from "./Admin.module.css";

type Props = {
  productId: string;
  deletedAt?: string;
  locale: string;
  notify: AdminDictionary["notify"];
  common: AdminDictionary["common"];
};

const initialState: ActionState = { ok: false };

export function ProductManageForm({ productId, deletedAt, locale, notify, common }: Props) {
  const [deleteState, deleteAction] = useActionState(softDeleteProductAction, initialState);
  const [restoreState, restoreAction] = useActionState(restoreProductAction, initialState);

  const deleteMsg = deleteState.ok
    ? notify.success
    : deleteState.code
      ? (notify[deleteState.code as keyof typeof notify] ?? notify.error)
      : "";
  const restoreMsg = restoreState.ok
    ? notify.success
    : restoreState.code
      ? (notify[restoreState.code as keyof typeof notify] ?? notify.error)
      : "";

  if (deletedAt) {
    return (
      <form action={restoreAction} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <input name="productId" type="hidden" value={productId} />
        <input name="locale" type="hidden" value={locale} />
        <button className={styles.badge} type="submit">
          {common.restore}
        </button>
        {restoreMsg && <span className="muted" role="status">{restoreMsg}</span>}
      </form>
    );
  }

  return (
    <form
      action={deleteAction}
      onSubmit={(event) => {
        if (!window.confirm(common.confirm)) event.preventDefault();
      }}
      style={{ display: "flex", gap: "8px", alignItems: "center" }}
    >
      <input name="productId" type="hidden" value={productId} />
      <input name="locale" type="hidden" value={locale} />
      <button className={styles.badge} style={{ opacity: 0.7 }} type="submit">
        {common.delete}
      </button>
      {deleteMsg && <span className="muted" role="status">{deleteMsg}</span>}
    </form>
  );
}
