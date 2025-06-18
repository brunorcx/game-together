import { FaCalendarAlt, FaTrophy, FaUsers, FaClock, FaGamepad } from "react-icons/fa";
import styles from "./game.module.scss";
import Image from "next/image";
import { GamePageProps } from "@/app/interfaces/game.interface";

export default function Game({ game, startDate, endDate, gameProgress }: GamePageProps) {
  const baseImageUrl = "https://retroachievements.org";
  console.log(gameProgress);
  return (
    <div className={styles.gamePage}>
      <div className={styles.heroSection}>
        <div className={styles.gameCover}>
          {game.imageIcon ? (
            <Image src={baseImageUrl + game.imageBoxArt} width={100} height={100} alt={`${game.title} cover`} className={styles.coverImage} />
          ) : (
            <div className={styles.coverPlaceholder}>
              <FaGamepad className={styles.placeholderIcon} />
            </div>
          )}
        </div>

        <div className={styles.gameInfo}>
          <div className={styles.gameHeader}>
            <h1>{game.title}</h1>
            <div className={styles.platformGenre}>
              <span className={styles.platform}>{game.consoleName}</span>
              <span className={styles.genre}>{game.genre}</span>
            </div>
          </div>

          <div className={styles.dateRange}>
            <FaCalendarAlt className={styles.icon} />
            <span>
              {new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()}
            </span>
          </div>

          <div className={styles.statsContainer}>
            <div className={styles.statItem}>
              <FaTrophy className={styles.icon} />
              <div>
                <span className={styles.statValue}>{gameProgress.numAwardedToUserHardcore}</span>
                <span className={styles.statLabel}>Points</span>
              </div>
            </div>
            <div className={styles.statItem}>
              <FaUsers className={styles.icon} />
              <div>
                <span className={styles.statValue}>{gameProgress.numDistinctPlayersHardcore}</span>
                <span className={styles.statLabel}>Players</span>
              </div>
            </div>
            <div className={styles.statItem}>
              <FaClock className={styles.icon} />
              <div>
                <span className={styles.statValue}>{gameProgress.numAchievements}</span>
                <span className={styles.statLabel}>Achievements</span>
              </div>
            </div>
          </div>

          <p className={styles.description}>{gameProgress.userCompletionHardcore}</p>

          <div className={styles.actionButtons}>
            <button className={styles.primaryButton}>Join the Challenge</button>
            <button className={styles.secondaryButton}>View Forum</button>
          </div>
        </div>
      </div>

      <div className={styles.communitySection}>
        <h2>Community Activity</h2>
        <div className={styles.activityGrid}>
          {/* Placeholder for activity feed */}
          <div className={styles.activityCard}>
            <h3>Recent Achievements</h3>
            <p>See what players have unlocked recently</p>
          </div>
          <div className={styles.activityCard}>
            <h3>Leaderboard</h3>
            <p>Top players this month</p>
          </div>
          <div className={styles.activityCard}>
            <h3>Discussion Thread</h3>
            <p>Join the conversation</p>
          </div>
        </div>
      </div>
    </div>
  );
}
