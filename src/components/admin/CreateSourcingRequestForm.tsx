"use client";

import { useActionState } from "react";
import { createSourcingRequestAction } from "@/app/[locale]/(admin)/admin/actions";
import type { ActionState } from "@/lib/admin/actionState";
import type { AdminDictionary } from "@/dictionaries/admin";
import styles from "./Admin.module.css";

type Props = {
  defaultBrandId: string;
  locale: string;
  notify: AdminDictionary["notify"];
  common: AdminDictionary["common"];
};

const initialState: ActionState = { ok: false };

export function CreateSourcingRequestForm({ defaultBrandId, locale, notify, common }: Props) {
  const [state, formAction] = useActionState(createSourcingRequestAction, initialState);

  const message = state.ok
    ? notify.success
    : state.code
      ? (notify[state.code as keyof typeof notify] ?? notify.error)
      : "";

  return (
    <form action={formAction} style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
      <input name="locale" type="hidden" value={locale} />
      <input defaultValue={defaultBrandId} name="brandId" placeholder="brandId" style={{ width: "120px" }} type="text" />
      <input name="desiredItem" placeholder={common.note} style={{ width: "160px" }} type="text" />
      <input min={1} name="quantity" placeholder={common.quantity} style={{ width: "72px" }} type="number" />
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
