import { fetchGame, fetchGameProgress } from "@/app/lib/retroachievements";
import Game from "@/app/(pages)/game/game";

export default async function GamePage() {
  const gameOfTheMonthID = 11367; // Example game ID
  const username = process.env.RA_USERNAME as string;
  const gameData = await fetchGame(gameOfTheMonthID);
  const gameProgress = await fetchGameProgress(username, gameOfTheMonthID); // Replace with actual username
  return <Game game={gameData} gameProgress={gameProgress} startDate="2023-11-01" endDate="2023-11-30" />;
}
