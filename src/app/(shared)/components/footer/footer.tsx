import Link from "next/link";
import styles from "./footer.module.scss";
import { FaDiscord, FaTwitter, FaTwitch, FaYoutube, FaGamepad, FaHeart } from "react-icons/fa";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.topSection}>
        <div className={styles.logoColumn}>
          <div className={styles.logo}>
            <FaGamepad className={styles.logoIcon} />
            <span>Game Together</span>
          </div>
          <p className={styles.tagline}>Connect. Play. Share the experience.</p>
          <div className={styles.socialLinks}>
            <a href="#" aria-label="Discord">
              <FaDiscord />
            </a>
            <a href="#" aria-label="Twitter">
              <FaTwitter />
            </a>
            <a href="#" aria-label="Twitch">
              <FaTwitch />
            </a>
            <a href="#" aria-label="YouTube">
              <FaYoutube />
            </a>
          </div>
        </div>

        <div className={styles.linksColumn}>
          <h3>Explore</h3>
          <ul>
            <li>
              <Link href="/games">All Games</Link>
            </li>
            <li>
              <Link href="/trending">Trending Now</Link>
            </li>
            <li>
              <Link href="/upcoming">Upcoming Releases</Link>
            </li>
            <li>
              <Link href="/genres">Game Genres</Link>
            </li>
          </ul>
        </div>

        <div className={styles.linksColumn}>
          <h3>Community</h3>
          <ul>
            <li>
              <Link href="/forums">Forums</Link>
            </li>
            <li>
              <Link href="/events">Events</Link>
            </li>
            <li>
              <Link href="/teams">Find Teams</Link>
            </li>
            <li>
              <Link href="/streamers">Streamers</Link>
            </li>
          </ul>
        </div>

        <div className={styles.linksColumn}>
          <h3>Support</h3>
          <ul>
            <li>
              <Link href="/help">Help Center</Link>
            </li>
            <li>
              <Link href="/contact">Contact Us</Link>
            </li>
            <li>
              <Link href="/faq">FAQs</Link>
            </li>
            <li>
              <Link href="/feedback">Feedback</Link>
            </li>
          </ul>
        </div>
      </div>

      <div className={styles.bottomSection}>
        <div className={styles.legalLinks}>
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/terms">Terms of Service</Link>
          <Link href="/cookies">Cookie Policy</Link>
        </div>
        <div className={styles.copyright}>
          <p>© {new Date().getFullYear()} Play With Me. All rights reserved.</p>
          <p className={styles.madeWith}>
            Made with <FaHeart className={styles.heartIcon} /> for gamers worldwide
          </p>
        </div>
      </div>
    </footer>
  );
}
