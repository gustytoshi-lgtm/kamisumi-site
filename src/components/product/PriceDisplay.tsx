import type { Locale } from "@/config/site";
import type { Dictionary } from "@/dictionaries";
import { formatMoney } from "@/lib/format";
import type { Money } from "@/types/commerce";
import styles from "./Product.module.css";

type PriceDisplayProps = {
  price: Money;
  referencePrices?: Money[];
  locale: Locale;
  dictionary: Dictionary;
};

export function PriceDisplay({ price, referencePrices = [], locale, dictionary }: PriceDisplayProps) {
  return (
    <div className={styles.price}>
      <strong>
        {price.amountMinor > 0 ? formatMoney(price, locale) : dictionary.common.comingSoon}
      </strong>
      {referencePrices[0] ? (
        <span>
          {dictionary.common.referencePrice}: {formatMoney(referencePrices[0], locale)}
        </span>
      ) : null}
    </div>
  );
}

