import GamePage from "./(pages)/game/page";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <GamePage />
    </div>
  );
}
