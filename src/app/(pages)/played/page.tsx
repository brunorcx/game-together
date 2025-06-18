import Played from "./played";
import { getAllPlayedGames } from "@/app/lib/mongodb";

export default async function ScorePage() {
  const playedGameList = await getAllPlayedGames();
  return <Played playedGameList={playedGameList} />;
}
