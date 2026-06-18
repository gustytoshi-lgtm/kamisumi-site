import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isAdminEnabled } from "@/config/features";
import { isDevToolsEnabled } from "@/config/devtools";
import { getDataBackend } from "@/config/dataBackend";
import { DevModeBar } from "@/components/admin/DevModeBar";
import { getAdminDictionary } from "@/dictionaries/admin";
import { getAdminAuthMode, getAdminSession, resolveAdminLocale } from "@/lib/admin/auth";
import { visibleAdminNav, type AdminNavKey } from "@/lib/commerce/adminNav";
import { getLocaleFromParams, type LocaleParams } from "@/lib/params";
import { localizePath } from "@/lib/routes";
import styles from "@/components/admin/Admin.module.css";

// 管理画面はリクエスト時に flag/セッションを評価する（ビルド時に固定しない）。
export const dynamic = "force-dynamic";

// 実装済みのページだけ遷移先パスを持つ（未実装メニューはリンクにしない）。
const IMPLEMENTED_ROUTES: Partial<Record<AdminNavKey, string>> = {
  dashboard: "/admin",
  products: "/admin/products",
  inventory: "/admin/inventory",
  orders: "/admin/orders",
  sourcingRequests: "/admin/sourcing",
  journal: "/admin/journal",
  matchaLots: "/admin/matcha-lots",
  ceramicUnits: "/admin/ceramic-units",
  purchases: "/admin/suppliers",
  payments: "/admin/payments",
  shipments: "/admin/shipping",
  expenses: "/admin/expenses",
  settings: "/admin/settings",
};

type AdminLayoutProps = LocaleParams & { children: ReactNode };

export default async function AdminLayout({ children, params }: AdminLayoutProps) {
  if (!isAdminEnabled()) notFound();

  const locale = await getLocaleFromParams(params);
  const session = await getAdminSession();
  const adminLocale = resolveAdminLocale(locale, session);
  const dictionary = getAdminDictionary(adminLocale);

  if (!session) {
    return (
      <main className="page-main" id="main-content">
        <section className="page-section">
          <div className={`content-shell ${styles.signin}`}>
            <h1>KAMISUMI Admin</h1>
            <p className="muted">{dictionary.common.noPermission}</p>
            <p className="muted">
              (mock auth) ADMIN_DEV_ROLE=owner|front_staff|inventory_staff|editor
            </p>
          </div>
        </section>
      </main>
    );
  }

  const navKeys = visibleAdminNav(session.role);
  const showDevBar = isDevToolsEnabled();

  return (
    <main className="page-main" id="main-content">
      {showDevBar ? (
        <DevModeBar
          authMode={getAdminAuthMode()}
          backend={getDataBackend()}
          locale={locale}
          role={session.role}
        />
      ) : null}
      <section className="page-section">
        <div className={`content-shell ${styles.shell}`}>
          <nav className={styles.nav} aria-label="Admin">
            <span className={styles.badge}>
              {dictionary.common.signedInAs}: {session.role}
            </span>
            {navKeys.map((key) => {
              const route = IMPLEMENTED_ROUTES[key];
              return route ? (
                <Link className={styles.navLink} href={localizePath(locale, route)} key={key}>
                  {dictionary.nav[key]}
                </Link>
              ) : (
                <span className={`${styles.navLink} muted`} key={key} aria-disabled="true">
                  {dictionary.nav[key]}
                </span>
              );
            })}
          </nav>
          <div className={styles.panel}>{children}</div>
        </div>
      </section>
    </main>
  );
}
