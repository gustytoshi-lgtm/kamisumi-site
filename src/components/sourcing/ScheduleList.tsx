import type { Locale } from "@/config/site";
import type { Dictionary } from "@/dictionaries";
import type { SourcingSchedule } from "@/types/commerce";
import { EmptyState } from "@/components/ui/EmptyState";
import { ScheduleCard } from "./ScheduleCard";
import styles from "./Schedule.module.css";

type ScheduleListProps = {
  schedules: SourcingSchedule[];
  locale: Locale;
  dictionary: Dictionary;
};

export function ScheduleList({ schedules, locale, dictionary }: ScheduleListProps) {
  if (schedules.length === 0) return <EmptyState message={dictionary.common.noItems} />;

  return (
    <div className={styles.grid}>
      {schedules.map((schedule) => (
        <ScheduleCard
          dictionary={dictionary}
          key={schedule.id}
          locale={locale}
          schedule={schedule}
        />
      ))}
    </div>
  );
}

