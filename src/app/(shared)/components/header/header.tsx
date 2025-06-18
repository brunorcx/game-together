import Link from "next/link";
import styles from "./header.module.scss";
import { FaUser, FaSignInAlt } from "react-icons/fa";

export default function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <div className={styles.logoContainer}>
          <Link href="/" className={styles.logo}>
            🎮 Game Together
          </Link>
        </div>

        <nav className={styles.nav}>
          <Link href="/about">About</Link>
          <Link href="/game">Game of the month</Link>
          <Link href="/score">Score</Link>
          <Link href="/played">Past Games</Link>
        </nav>

        <div className={styles.authContainer}>
          <button className={styles.authButton}>
            <FaSignInAlt className={styles.icon} />
            <span>Login</span>
          </button>
          <button className={styles.authButton}>
            <FaUser className={styles.icon} />
            <span>Register</span>
          </button>
        </div>
      </div>
    </header>
  );
}
