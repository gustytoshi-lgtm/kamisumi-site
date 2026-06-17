import { getAdminDictionary } from "@/dictionaries/admin";
import { getAdminSession, resolveAdminLocale } from "@/lib/admin/auth";
import { canAny } from "@/lib/commerce/rbac";
import { getLocalizedText } from "@/lib/localization";
import { getLocaleFromParams, type LocaleParams } from "@/lib/params";
import { getCommerceRepository } from "@/repositories";
import styles from "@/components/admin/Admin.module.css";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage({ params }: LocaleParams) {
  const locale = await getLocaleFromParams(params);
  const session = getAdminSession();
  const adminLocale = resolveAdminLocale(locale, session);
  const dictionary = getAdminDictionary(adminLocale);

  const allowed =
    session !== null &&
    canAny(session.role, [
      "product:manage",
      "product:edit_description",
      "product:edit_translation",
    ]);

  if (!allowed) {
    return (
      <>
        <h1>{dictionary.nav.products}</h1>
        <p className="muted">{dictionary.common.noPermission}</p>
      </>
    );
  }

  const products = await getCommerceRepository().listProducts({ includeArchive: true });

  return (
    <>
      <h1>{dictionary.nav.products}</h1>
      <p className="muted">{products.length}</p>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>SKU</th>
            <th>{dictionary.common.status}</th>
            <th>Title ({adminLocale})</th>
            <th>Slug</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id}>
              <td>{product.sku}</td>
              <td>
                <span className={styles.badge}>{product.publicStatus}</span>
              </td>
              <td>{getLocalizedText(product.title, locale)}</td>
              <td className="muted">{product.slug}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted">read-only (Phase 2A scaffold)</p>
    </>
  );
}
