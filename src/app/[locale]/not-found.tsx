import { ButtonLink } from "@/components/ui/ButtonLink";
import { defaultLocale } from "@/config/site";
import { getDictionary } from "@/dictionaries";
import { localizePath } from "@/lib/routes";

export default function NotFound() {
  const dictionary = getDictionary(defaultLocale);

  return (
    <section className="page-section">
      <div className="content-shell stack">
        <h1>{dictionary.pages.notFound.title}</h1>
        <p>{dictionary.pages.notFound.description}</p>
        <ButtonLink href={localizePath(defaultLocale)}>{dictionary.common.backToHome}</ButtonLink>
      </div>
    </section>
  );
}

