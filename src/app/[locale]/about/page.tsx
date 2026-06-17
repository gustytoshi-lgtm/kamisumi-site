import type { Metadata } from "next";
import { PageIntro } from "@/components/ui/PageIntro";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { siteConfig } from "@/config/site";
import { getDictionary } from "@/dictionaries";
import { getLocaleFromParams, type LocaleParams } from "@/lib/params";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const locale = await getLocaleFromParams(params);
  const dictionary = getDictionary(locale);

  return buildMetadata({
    locale,
    path: "/about",
    title: dictionary.pages.about.title,
    description: dictionary.pages.about.description,
  });
}

export default async function AboutPage({ params }: LocaleParams) {
  const locale = await getLocaleFromParams(params);
  const dictionary = getDictionary(locale);

  return (
    <>
      <PageIntro
        description={dictionary.pages.about.description}
        kicker={dictionary.nav.about}
        title={dictionary.pages.about.title}
      />
      <section className="page-section compact">
        <div className="content-shell two-column">
          <div className="stack">
            {dictionary.pages.about.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          <div className="stack">
            <SectionHeading title={siteConfig.organization.displayName} />
            <p className="muted">{siteConfig.commerceCore.name}</p>
            <p>{dictionary.pages.home.aboutLead}</p>
          </div>
        </div>
      </section>
    </>
  );
}

