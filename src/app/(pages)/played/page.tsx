import Played from "./played";
import { getAllPlayedGames } from "@/app/lib/scoresFile";

export default async function ScorePage() {
  let playedGameList: Awaited<ReturnType<typeof getAllPlayedGames>> = [];
  let error: string | null = null;

  try {
    playedGameList = getAllPlayedGames();
  } catch {
    error = "Nenhum arquivo de scores configurado. Vá até a página Score para selecionar o arquivo .txt.";
  }

  return <Played playedGameList={playedGameList} error={error} />;
}
