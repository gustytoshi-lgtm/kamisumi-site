import { getAdminDictionary } from "@/dictionaries/admin";
import { getAdminSession, resolveAdminLocale } from "@/lib/admin/auth";
import { getLocaleFromParams, type LocaleParams } from "@/lib/params";
import { getCommerceRepository } from "@/repositories";
import styles from "@/components/admin/Admin.module.css";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage({ params }: LocaleParams) {
  const locale = await getLocaleFromParams(params);
  const session = getAdminSession();
  const dictionary = getAdminDictionary(resolveAdminLocale(locale, session));

  const repository = getCommerceRepository();
  const [products, journal, schedules] = await Promise.all([
    repository.listProducts({ includeArchive: true }),
    repository.listJournalPosts(),
    repository.listSourcingSchedules(),
  ]);

  const cards: { label: string; value: number }[] = [
    { label: dictionary.nav.products, value: products.length },
    { label: dictionary.nav.journal, value: journal.length },
    { label: dictionary.nav.sourcingSchedules, value: schedules.length },
  ];

  return (
    <>
      <h1>{dictionary.nav.dashboard}</h1>
      <div className={styles.cards}>
        {cards.map((card) => (
          <div className={styles.card} key={card.label}>
            <span className="muted">{card.label}</span>
            <div>
              <strong>{card.value}</strong>
            </div>
          </div>
        ))}
      </div>
      <p className="muted">
        {dictionary.common.signedInAs}: {session?.role ?? "-"} (data backend:{" "}
        {process.env.DATA_BACKEND === "supabase" ? "supabase" : "mock"})
      </p>
    </>
  );
}
