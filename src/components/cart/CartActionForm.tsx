"use client";

import { useActionState } from "react";
import type { ActionState } from "@/lib/admin/actionState";
import type { Dictionary } from "@/dictionaries";

export type CartFormField =
  | { kind: "hidden"; name: string; value: string }
  | {
      kind: "number";
      name: string;
      label: string;
      defaultValue?: string;
      min?: number;
      required?: boolean;
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
  fields: CartFormField[];
  submitLabel: string;
  notify: Dictionary["cart"]["notify"];
  /** inline=横並び（明細行・ボタンのみ）, stack=縦並び（追加フォーム）。 */
  layout?: "inline" | "stack";
};

const initialState: ActionState = { ok: false };

/** カート/チェックアウトの汎用フォーム。認可・在庫・金額検証は server action 側で必ず再確認する。 */
export function CartActionForm({ action, fields, submitLabel, notify, layout = "inline" }: Props) {
  const [state, formAction] = useActionState(action, initialState);

  const message = state.ok
    ? notify.success
    : state.code
      ? (notify[state.code as keyof typeof notify] ?? notify.error)
      : "";

  return (
    <form
      action={formAction}
      style={{
        display: layout === "stack" ? "grid" : "flex",
        gap: "8px",
        alignItems: layout === "stack" ? "stretch" : "end",
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
        return (
          <label key={field.name} style={{ display: "grid", gap: "2px" }}>
            {labelEl}
            <input
              defaultValue={field.defaultValue}
              min={field.min}
              name={field.name}
              required={field.required}
              step={1}
              style={{ width: "5.5rem" }}
              type="number"
            />
          </label>
        );
      })}
      <button type="submit">{submitLabel}</button>
      {message ? (
        <span className="muted" role="status">
          {message}
        </span>
      ) : null}
    </form>
  );
}
