import type { StatusPresentation } from "@/dictionaries";
import styles from "./Product.module.css";

type ProductStatusBadgeProps = {
  presentation: StatusPresentation;
};

export function ProductStatusBadge({ presentation }: ProductStatusBadgeProps) {
  return (
    <span className={`${styles.status} ${styles[presentation.tone]}`}>
      {presentation.label}
    </span>
  );
}

