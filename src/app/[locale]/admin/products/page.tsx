import type { Metadata } from "next";
import { ProductManageForm } from "@/components/admin/ProductManageForm";
import { ProductStatusForm } from "@/components/admin/ProductStatusForm";
import { getAdminDictionary } from "@/dictionaries/admin";
import { getAdminSession, resolveAdminLocale } from "@/lib/admin/auth";
import { canAny } from "@/lib/commerce/rbac";
import { getLocalizedText } from "@/lib/localization";
import { getLocaleFromParams, type LocaleParams } from "@/lib/params";
import { getCommerceWriteRepository } from "@/repositories";
import styles from "@/components/admin/Admin.module.css";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const locale = await getLocaleFromParams(params);
  const session = getAdminSession();
  const d = getAdminDictionary(resolveAdminLocale(locale, session));
  return { title: `${d.nav.products} | KAMISUMI Admin` };
}

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

  const canChangeStatus = session !== null && canAny(session.role, ["product:manage_status"]);
  const canManage = session !== null && canAny(session.role, ["product:manage"]);
  // 書込ストア（mock）から読む。論理削除済みも含めて表示する（復元可能にするため）。
  const products = await getCommerceWriteRepository().listManagedProducts({ includeDeleted: true });

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
            <th>{dictionary.common.actions}</th>
            <th>{dictionary.common.delete} / {dictionary.common.restore}</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id} style={{ opacity: product.deletedAt ? 0.5 : 1 }}>
              <td>{product.sku}</td>
              <td>
                <span className={styles.badge}>{product.publicStatus}</span>
                {product.deletedAt && (
                  <span className="muted" style={{ marginLeft: 4, fontSize: "0.8em" }}>
                    (deleted)
                  </span>
                )}
              </td>
              <td>{getLocalizedText(product.title, locale)}</td>
              <td>
                {canChangeStatus && !product.deletedAt ? (
                  <ProductStatusForm
                    common={dictionary.common}
                    currentStatus={product.publicStatus}
                    locale={locale}
                    notify={dictionary.notify}
                    productId={product.id}
                  />
                ) : (
                  <span className="muted">-</span>
                )}
              </td>
              <td>
                {canManage ? (
                  <ProductManageForm
                    common={dictionary.common}
                    deletedAt={product.deletedAt}
                    locale={locale}
                    notify={dictionary.notify}
                    productId={product.id}
                  />
                ) : (
                  <span className="muted">-</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
