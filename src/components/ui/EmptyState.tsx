import styles from "./UI.module.css";

export function EmptyState({ message }: { message: string }) {
  return <div className={styles.emptyState}>{message}</div>;
}

