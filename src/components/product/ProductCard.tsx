import Link from "next/link";
import Image from "next/image";
import type { Locale } from "@/config/site";
import type { Dictionary } from "@/dictionaries";
import { getLocalizedText } from "@/lib/localization";
import { productPath } from "@/lib/routes";
import { getProductStatusPresentation } from "@/lib/status";
import type { Product } from "@/types/commerce";
import { PriceDisplay } from "./PriceDisplay";
import styles from "./Product.module.css";
import { ProductStatusBadge } from "./ProductStatusBadge";

type ProductCardProps = {
  product: Product;
  locale: Locale;
  dictionary: Dictionary;
};

export function ProductCard({ product, locale, dictionary }: ProductCardProps) {
  const status = getProductStatusPresentation(dictionary, product.publicStatus);
  const image = product.images[0];

  return (
    <article className={styles.card}>
      {image ? (
        <Image
          alt={getLocalizedText(image.alt, locale)}
          className={styles.cardImage}
          height={720}
          src={image.src}
          width={960}
        />
      ) : null}
      <div className={styles.cardBody}>
        <div className={styles.meta}>
          <ProductStatusBadge presentation={status} />
          <span>{dictionary.categories[product.category]}</span>
        </div>
        <h3>
          <Link href={productPath(locale, product.slug)}>
            {getLocalizedText(product.title, locale)}
          </Link>
        </h3>
        <p>{getLocalizedText(product.shortDescription, locale)}</p>
        <div className={styles.cardFooter}>
          <PriceDisplay
            dictionary={dictionary}
            locale={locale}
            price={product.price}
            referencePrices={product.referencePrices}
          />
          <Link className={styles.ctaLink} href={productPath(locale, product.slug)}>
            {status.cta}
          </Link>
        </div>
      </div>
    </article>
  );
}
