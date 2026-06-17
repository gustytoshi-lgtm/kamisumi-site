import styles from "./UI.module.css";

type SectionHeadingProps = {
  kicker?: string;
  title: string;
  description?: string;
};

export function SectionHeading({ kicker, title, description }: SectionHeadingProps) {
  return (
    <div className={styles.sectionHeading}>
      {kicker ? <span className="kicker">{kicker}</span> : null}
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
    </div>
  );
}

