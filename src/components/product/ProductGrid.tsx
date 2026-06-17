import type { Locale } from "@/config/site";
import type { Dictionary } from "@/dictionaries";
import type { Product } from "@/types/commerce";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProductCard } from "./ProductCard";
import styles from "./Product.module.css";

type ProductGridProps = {
  products: Product[];
  locale: Locale;
  dictionary: Dictionary;
};

export function ProductGrid({ products, locale, dictionary }: ProductGridProps) {
  if (products.length === 0) {
    return <EmptyState message={dictionary.common.noItems} />;
  }

  return (
    <div className={styles.grid}>
      {products.map((product) => (
        <ProductCard dictionary={dictionary} key={product.id} locale={locale} product={product} />
      ))}
    </div>
  );
}

