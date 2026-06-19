"use client";

import { useActionState } from "react";
import type { ActionState } from "@/lib/admin/actionState";
import type { Dictionary } from "@/dictionaries";

export type AccountFormField =
  | { kind: "hidden"; name: string; value: string }
  | {
      kind: "text" | "email" | "tel";
      name: string;
      label: string;
      required?: boolean;
      defaultValue?: string;
      placeholder?: string;
    }
  | {
      kind: "select";
      name: string;
      label: string;
      required?: boolean;
      defaultValue?: string;
      options: { value: string; label: string }[];
    };

type Props = {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  fields: AccountFormField[];
  submitLabel: string;
  notify: Dictionary["account"]["notify"];
};

const initialState: ActionState = { ok: false };

/**
 * 顧客マイページの汎用フォーム。server action（useActionState）+ i18n 通知。
 * 認可（ログイン必須・本人一致）は server action 側で必ず再確認する。
 */
export function AccountActionForm({ action, fields, submitLabel, notify }: Props) {
  const [state, formAction] = useActionState(action, initialState);

  const message = state.ok
    ? notify.success
    : state.code
      ? (notify[state.code as keyof typeof notify] ?? notify.error)
      : "";

  return (
    <form
      action={formAction}
      style={{ display: "grid", gap: "10px", maxWidth: "32rem" }}
    >
      {fields.map((field) => {
        if (field.kind === "hidden") {
          return <input key={field.name} name={field.name} type="hidden" value={field.value} />;
        }
        const labelEl = (
          <span style={{ fontSize: "0.85rem", color: "#615d53" }}>
            {field.label}
            {field.required ? " *" : ""}
          </span>
        );
        if (field.kind === "select") {
          return (
            <label key={field.name} style={{ display: "grid", gap: "3px" }}>
              {labelEl}
              <select defaultValue={field.defaultValue} name={field.name} required={field.required}>
                {field.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          );
        }
        return (
          <label key={field.name} style={{ display: "grid", gap: "3px" }}>
            {labelEl}
            <input
              defaultValue={field.defaultValue}
              name={field.name}
              placeholder={field.placeholder}
              required={field.required}
              type={field.kind}
            />
          </label>
        );
      })}
      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        <button type="submit">{submitLabel}</button>
        {message ? (
          <span className="muted" role="status">
            {message}
          </span>
        ) : null}
      </div>
    </form>
  );
}
