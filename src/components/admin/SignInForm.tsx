"use client";

import { useActionState } from "react";
import type { ActionState } from "@/lib/admin/actionState";
import type { AdminDictionary } from "@/dictionaries/admin";

type Props = {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  locale: string;
  d: AdminDictionary["auth"];
};

const initialState: ActionState = { ok: false };

const labelStyle: React.CSSProperties = { fontSize: "0.8rem", color: "#615d53" };

/** 管理画面サインインフォーム（Supabase 認証モード）。server action + i18n エラー表示。 */
export function SignInForm({ action, locale, d }: Props) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const message = state.ok
    ? ""
    : state.code === "missingFields"
      ? d.missingFields
      : state.code
        ? d.invalidCredentials
        : "";

  return (
    <form action={formAction} style={{ display: "grid", gap: "10px", maxWidth: "360px" }}>
      <input name="locale" type="hidden" value={locale} />
      <label style={{ display: "grid", gap: "2px" }}>
        <span style={labelStyle}>{d.email}</span>
        <input autoComplete="username" name="email" required type="email" />
      </label>
      <label style={{ display: "grid", gap: "2px" }}>
        <span style={labelStyle}>{d.password}</span>
        <input autoComplete="current-password" name="password" required type="password" />
      </label>
      <button disabled={pending} style={{ justifySelf: "start" }} type="submit">
        {d.signIn}
      </button>
      {message ? (
        <span className="muted" role="alert">
          {message}
        </span>
      ) : null}
    </form>
  );
}
