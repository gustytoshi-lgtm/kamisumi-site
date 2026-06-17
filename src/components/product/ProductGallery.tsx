import Image from "next/image";
import type { Locale } from "@/config/site";
import { getLocalizedText } from "@/lib/localization";
import type { ProductImage } from "@/types/commerce";
import styles from "./Product.module.css";

type ProductGalleryProps = {
  images: ProductImage[];
  locale: Locale;
};

export function ProductGallery({ images, locale }: ProductGalleryProps) {
  const [firstImage, ...rest] = images;

  if (!firstImage) return null;

  return (
    <div className={styles.gallery}>
      <Image
        alt={getLocalizedText(firstImage.alt, locale)}
        className={styles.mainImage}
        height={900}
        src={firstImage.src}
        width={900}
      />
      {rest.length > 0 ? (
        <div className={styles.thumbs}>
          {rest.map((image) => (
            <Image
              alt={getLocalizedText(image.alt, locale)}
              height={220}
              key={image.src}
              src={image.src}
              width={220}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
