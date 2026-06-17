import styles from "./UI.module.css";

type PageIntroProps = {
  title: string;
  description: string;
  kicker?: string;
};

export function PageIntro({ title, description, kicker }: PageIntroProps) {
  return (
    <header className={`${styles.pageIntro} content-shell`}>
      {kicker ? <span className="kicker">{kicker}</span> : null}
      <h1>{title}</h1>
      <p>{description}</p>
    </header>
  );
}

