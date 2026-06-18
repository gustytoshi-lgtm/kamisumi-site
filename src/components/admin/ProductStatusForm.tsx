"use client";

import { useActionState } from "react";
import { changeProductStatusAction } from "@/app/[locale]/(admin)/admin/actions";
import type { ActionState } from "@/lib/admin/actionState";
import type { AdminDictionary } from "@/dictionaries/admin";
import styles from "./Admin.module.css";

const PRODUCT_STATUSES = [
  "in_stock",
  "low_stock",
  "preorder",
  "sourcing_available",
  "awaiting_arrival",
  "reserved",
  "sold_out",
  "restock_request",
  "archive",
  "coming_soon",
] as const;

type Props = {
  productId: string;
  currentStatus: string;
  locale: string;
  notify: AdminDictionary["notify"];
  common: AdminDictionary["common"];
};

const initialState: ActionState = { ok: false };

export function ProductStatusForm({ productId, currentStatus, locale, notify, common }: Props) {
  const [state, formAction] = useActionState(changeProductStatusAction, initialState);

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
      <input name="productId" type="hidden" value={productId} />
      <input name="locale" type="hidden" value={locale} />
      <select aria-label={common.status} defaultValue={currentStatus} name="status">
        {PRODUCT_STATUSES.map((status) => (
          <option key={status} value={status}>
            {status}
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
