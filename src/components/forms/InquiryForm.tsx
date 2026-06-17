"use client";

import { type FormEvent, useState } from "react";
import type { Dictionary } from "@/dictionaries";
import styles from "./Form.module.css";

type InquiryFormProps = {
  dictionary: Dictionary;
  mode: "sourcing" | "contact";
};

type FormState = {
  name: string;
  email: string;
  contactHandle: string;
  country: string;
  desiredItem: string;
  itemUrl: string;
  quantity: string;
  budget: string;
  deadline: string;
  alternatives: string;
  message: string;
  agreement: boolean;
};

const initialState: FormState = {
  name: "",
  email: "",
  contactHandle: "",
  country: "",
  desiredItem: "",
  itemUrl: "",
  quantity: "",
  budget: "",
  deadline: "",
  alternatives: "",
  message: "",
  agreement: false,
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function InquiryForm({ dictionary, mode }: InquiryFormProps) {
  const [values, setValues] = useState(initialState);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function update<Key extends keyof FormState>(key: Key, value: FormState[Key]) {
    setValues((current) => ({ ...current, [key]: value }));
    setSuccess(false);
    setError("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const requiredFields =
      mode === "sourcing"
        ? [values.name, values.email, values.country, values.desiredItem]
        : [values.name, values.email, values.message];

    if (requiredFields.some((value) => !value.trim()) || !values.agreement) {
      setError(dictionary.forms.requiredError);
      return;
    }

    if (!isValidEmail(values.email)) {
      setError(dictionary.forms.emailError);
      return;
    }

    setSuccess(true);
    setValues(initialState);
  }

  return (
    <form className={styles.form} noValidate onSubmit={handleSubmit}>
      {success ? <div className={styles.success}>{dictionary.forms.success}</div> : null}
      {error ? <div className={styles.error}>{error}</div> : null}
      <div className={styles.row}>
        <TextField
          label={dictionary.forms.name}
          name="name"
          onChange={(value) => update("name", value)}
          required
          value={values.name}
        />
        <TextField
          label={dictionary.forms.email}
          name="email"
          onChange={(value) => update("email", value)}
          required
          type="email"
          value={values.email}
        />
      </div>
      <div className={styles.row}>
        <TextField
          label={dictionary.forms.contactHandle}
          name="contactHandle"
          onChange={(value) => update("contactHandle", value)}
          value={values.contactHandle}
        />
        <TextField
          label={dictionary.forms.country}
          name="country"
          onChange={(value) => update("country", value)}
          required={mode === "sourcing"}
          value={values.country}
        />
      </div>
      {mode === "sourcing" ? (
        <>
          <TextField
            label={dictionary.forms.desiredItem}
            name="desiredItem"
            onChange={(value) => update("desiredItem", value)}
            required
            value={values.desiredItem}
          />
          <TextField
            label={dictionary.forms.itemUrl}
            name="itemUrl"
            onChange={(value) => update("itemUrl", value)}
            value={values.itemUrl}
          />
          <div className={styles.row}>
            <TextField
              label={dictionary.forms.quantity}
              name="quantity"
              onChange={(value) => update("quantity", value)}
              value={values.quantity}
            />
            <TextField
              label={dictionary.forms.budget}
              name="budget"
              onChange={(value) => update("budget", value)}
              value={values.budget}
            />
          </div>
          <div className={styles.row}>
            <TextField
              label={dictionary.forms.deadline}
              name="deadline"
              onChange={(value) => update("deadline", value)}
              value={values.deadline}
            />
            <TextField
              label={dictionary.forms.alternatives}
              name="alternatives"
              onChange={(value) => update("alternatives", value)}
              value={values.alternatives}
            />
          </div>
        </>
      ) : null}
      <TextArea
        label={dictionary.forms.message}
        name="message"
        onChange={(value) => update("message", value)}
        required={mode === "contact"}
        value={values.message}
      />
      <label className={styles.checkbox}>
        <input
          checked={values.agreement}
          onChange={(event) => update("agreement", event.target.checked)}
          type="checkbox"
        />
        <span>{dictionary.forms.agreement}</span>
      </label>
      <p className={styles.hint}>{dictionary.common.notSaved}</p>
      <button className={styles.button} type="submit">
        {dictionary.forms.submit}
      </button>
    </form>
  );
}

type TextFieldProps = {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
};

function TextField({ label, name, value, onChange, required = false, type = "text" }: TextFieldProps) {
  return (
    <label className={styles.field}>
      <span>
        {label} {required ? <span className={styles.hint}>*</span> : null}
      </span>
      <input
        aria-required={required}
        name={name}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        value={value}
      />
    </label>
  );
}

type TextAreaProps = {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
};

function TextArea({ label, name, value, onChange, required = false }: TextAreaProps) {
  return (
    <label className={styles.field}>
      <span>
        {label} {required ? <span className={styles.hint}>*</span> : null}
      </span>
      <textarea
        aria-required={required}
        name={name}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  );
}
