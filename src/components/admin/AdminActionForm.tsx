"use client";

import { useActionState } from "react";
import type { ActionState } from "@/lib/admin/actionState";
import type { AdminDictionary } from "@/dictionaries/admin";

export type AdminFormField =
  | { kind: "hidden"; name: string; value: string }
  | { kind: "text" | "number" | "email"; name: string; label: string; required?: boolean; defaultValue?: string; placeholder?: string }
  | { kind: "textarea"; name: string; label: string; required?: boolean; defaultValue?: string }
  | { kind: "select"; name: string; label: string; required?: boolean; defaultValue?: string; options: { value: string; label: string }[] };

type Props = {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  fields: AdminFormField[];
  submitLabel: string;
  notify: AdminDictionary["notify"];
  confirmText?: string;
  layout?: "row" | "stack";
};

const initialState: ActionState = { ok: false };

/**
 * 管理画面の汎用フォーム。server action（useActionState）+ 確認ダイアログ + i18n 通知。
 * 各ドメインのフォームはフィールド定義を渡すだけで作れる（権限は server action 側でも再確認）。
 */
export function AdminActionForm({ action, fields, submitLabel, notify, confirmText, layout = "row" }: Props) {
  const [state, formAction] = useActionState(action, initialState);

  const message = state.ok
    ? notify.success
    : state.code
      ? (notify[state.code as keyof typeof notify] ?? notify.error)
      : "";

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (confirmText && !window.confirm(confirmText)) event.preventDefault();
      }}
      style={{
        display: layout === "stack" ? "grid" : "flex",
        gap: "8px",
        alignItems: layout === "stack" ? "stretch" : "center",
        flexWrap: "wrap",
      }}
    >
      {fields.map((field) => {
        if (field.kind === "hidden") {
          return <input key={field.name} name={field.name} type="hidden" value={field.value} />;
        }
        const labelEl = (
          <span style={{ fontSize: "0.8rem", color: "#615d53" }}>
            {field.label}
            {field.required ? " *" : ""}
          </span>
        );
        if (field.kind === "select") {
          return (
            <label key={field.name} style={{ display: "grid", gap: "2px" }}>
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
        if (field.kind === "textarea") {
          return (
            <label key={field.name} style={{ display: "grid", gap: "2px", width: "100%" }}>
              {labelEl}
              <textarea defaultValue={field.defaultValue} name={field.name} required={field.required} rows={2} />
            </label>
          );
        }
        return (
          <label key={field.name} style={{ display: "grid", gap: "2px" }}>
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
      <button style={{ alignSelf: "end" }} type="submit">
        {submitLabel}
      </button>
      {message ? (
        <span className="muted" role="status">
          {message}
        </span>
      ) : null}
    </form>
  );
}
