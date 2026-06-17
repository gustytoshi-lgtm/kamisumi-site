import type { Metadata } from "next";
import { ScheduleList } from "@/components/sourcing/ScheduleList";
import { PageIntro } from "@/components/ui/PageIntro";
import { getDictionary } from "@/dictionaries";
import { getLocaleFromParams, type LocaleParams } from "@/lib/params";
import { buildMetadata } from "@/lib/seo";
import { getCommerceRepository } from "@/repositories";

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const locale = await getLocaleFromParams(params);
  const dictionary = getDictionary(locale);

  return buildMetadata({
    locale,
    path: "/sourcing/schedule",
    title: dictionary.pages.sourcingSchedule.title,
    description: dictionary.pages.sourcingSchedule.description,
  });
}

export default async function SourcingSchedulePage({ params }: LocaleParams) {
  const locale = await getLocaleFromParams(params);
  const dictionary = getDictionary(locale);
  const schedules = await getCommerceRepository().listSourcingSchedules();

  return (
    <>
      <PageIntro
        description={dictionary.pages.sourcingSchedule.description}
        kicker={dictionary.nav.sourcing}
        title={dictionary.pages.sourcingSchedule.title}
      />
      <section className="page-section compact">
        <div className="content-shell">
          <ScheduleList dictionary={dictionary} locale={locale} schedules={schedules} />
        </div>
      </section>
    </>
  );
}

