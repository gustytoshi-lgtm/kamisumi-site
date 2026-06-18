"use client";

import { useActionState } from "react";
import { changeOrderStatusAction } from "@/app/[locale]/(admin)/admin/actions";
import type { ActionState } from "@/lib/admin/actionState";
import type { AdminDictionary } from "@/dictionaries/admin";
import type { OrderStatus } from "@/lib/commerce/orderStatus";
import styles from "./Admin.module.css";

type Props = {
  orderId: string;
  nextStatuses: OrderStatus[];
  locale: string;
  notify: AdminDictionary["notify"];
  common: AdminDictionary["common"];
};

const initialState: ActionState = { ok: false };

export function OrderStatusForm({ orderId, nextStatuses, locale, notify, common }: Props) {
  const [state, formAction] = useActionState(changeOrderStatusAction, initialState);

  const message = state.ok
    ? notify.success
    : state.code
      ? (notify[state.code as keyof typeof notify] ?? notify.error)
      : "";

  if (nextStatuses.length === 0) {
    return <span className="muted">—</span>;
  }

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!window.confirm(common.confirm)) event.preventDefault();
      }}
      style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}
    >
      <input name="orderId" type="hidden" value={orderId} />
      <input name="locale" type="hidden" value={locale} />
      <select aria-label={common.status} name="toStatus" required>
        {nextStatuses.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
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
