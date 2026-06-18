"use client";

import { useActionState } from "react";
import { createOrderAction } from "@/app/[locale]/admin/actions";
import type { ActionState } from "@/lib/admin/actionState";
import type { AdminDictionary } from "@/dictionaries/admin";
import styles from "./Admin.module.css";

type Props = {
  defaultBrandId: string;
  defaultStoreId: string;
  locale: string;
  notify: AdminDictionary["notify"];
  common: AdminDictionary["common"];
};

const initialState: ActionState = { ok: false };

export function CreateOrderForm({
  defaultBrandId,
  defaultStoreId,
  locale,
  notify,
  common,
}: Props) {
  const [state, formAction] = useActionState(createOrderAction, initialState);

  const message = state.ok
    ? notify.success
    : state.code
      ? (notify[state.code as keyof typeof notify] ?? notify.error)
      : "";

  return (
    <form action={formAction} style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
      <input name="locale" type="hidden" value={locale} />
      <input defaultValue={defaultBrandId} name="brandId" placeholder="brandId" style={{ width: "140px" }} type="text" />
      <input defaultValue={defaultStoreId} name="storeId" placeholder="storeId" style={{ width: "140px" }} type="text" />
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
