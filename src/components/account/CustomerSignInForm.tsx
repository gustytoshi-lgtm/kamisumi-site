"use client";

import { useActionState } from "react";
import type { ActionState } from "@/lib/admin/actionState";

export type SignInLabels = {
  email: string;
  password: string;
  signIn: string;
  invalidCredentials: string;
  missingFields: string;
};

type Props = {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  locale: string;
  labels: SignInLabels;
};

const initialState: ActionState = { ok: false };
const labelStyle: React.CSSProperties = { fontSize: "0.8rem", color: "#615d53" };

/** 顧客マイページのサインインフォーム（Supabase 認証モード）。server action + i18n エラー表示。 */
export function CustomerSignInForm({ action, locale, labels }: Props) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const message = state.ok
    ? ""
    : state.code === "missingFields"
      ? labels.missingFields
      : state.code
        ? labels.invalidCredentials
        : "";

  return (
    <form action={formAction} style={{ display: "grid", gap: "10px", maxWidth: "360px" }}>
      <input name="locale" type="hidden" value={locale} />
      <label style={{ display: "grid", gap: "2px" }}>
        <span style={labelStyle}>{labels.email}</span>
        <input autoComplete="username" name="email" required type="email" />
      </label>
      <label style={{ display: "grid", gap: "2px" }}>
        <span style={labelStyle}>{labels.password}</span>
        <input autoComplete="current-password" name="password" required type="password" />
      </label>
      <button disabled={pending} style={{ justifySelf: "start" }} type="submit">
        {labels.signIn}
      </button>
      {message ? (
        <span className="muted" role="alert">
          {message}
        </span>
      ) : null}
    </form>
  );
}
