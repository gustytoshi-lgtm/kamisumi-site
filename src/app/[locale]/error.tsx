"use client";

import { useEffect } from "react";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { defaultLocale } from "@/config/site";
import { getDictionary } from "@/dictionaries";
import { localizePath } from "@/lib/routes";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  const dictionary = getDictionary(defaultLocale);

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="page-section">
      <div className="content-shell stack">
        <h1>{dictionary.pages.error.title}</h1>
        <p>{dictionary.pages.error.description}</p>
        <button onClick={reset} type="button">
          {dictionary.pages.error.retry}
        </button>
        <ButtonLink href={localizePath(defaultLocale)}>{dictionary.common.backToHome}</ButtonLink>
      </div>
    </section>
  );
}

