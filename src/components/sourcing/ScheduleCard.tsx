import Link from "next/link";
import type { Locale } from "@/config/site";
import type { Dictionary } from "@/dictionaries";
import { getDateFormatter, getLocalizedText } from "@/lib/localization";
import { localizePath } from "@/lib/routes";
import type { SourcingSchedule } from "@/types/commerce";
import styles from "./Schedule.module.css";

type ScheduleCardProps = {
  schedule: SourcingSchedule;
  locale: Locale;
  dictionary: Dictionary;
};

export function ScheduleCard({ schedule, locale, dictionary }: ScheduleCardProps) {
  return (
    <article className={styles.card}>
      <div className={styles.date}>
        <time dateTime={schedule.date}>{getDateFormatter(locale).format(new Date(schedule.date))}</time>
        <span>
          {dictionary.forms.deadline}:{" "}
          {getDateFormatter(locale).format(new Date(schedule.applicationDeadline))}
        </span>
      </div>
      <div>
        <h3>{getLocalizedText(schedule.publicLocationName, locale)}</h3>
        <p>{getLocalizedText(schedule.region, locale)}</p>
        <p>{getLocalizedText(schedule.note, locale)}</p>
        <div className={styles.categories}>
          {schedule.category.map((category) => (
            <span key={category}>{dictionary.categories[category]}</span>
          ))}
        </div>
        {schedule.acceptsRequests ? (
          <Link href={localizePath(locale, "/sourcing/request")}>{dictionary.productStatus.sourcing_available.cta}</Link>
        ) : null}
      </div>
      <span className={styles.status}>{dictionary.scheduleStatus[schedule.status]}</span>
    </article>
  );
}

