import Backlog from "./backlog";
import { getBacklogFilePath } from "@/app/lib/backlogConfig";
import { getBacklogCoverUrl } from "@/app/lib/backlogCovers";
import { getBacklogGames } from "@/app/lib/backlogFile";

export default function BacklogPage() {
  const filePath = getBacklogFilePath();
  let games: (ReturnType<typeof getBacklogGames>[number] & { coverUrl: string | null })[] = [];
  let error: string | null = null;

  if (filePath) {
    try {
      games = getBacklogGames().map((game) => ({ ...game, coverUrl: getBacklogCoverUrl(game) }));
    } catch (loadError) {
      error = loadError instanceof Error ? loadError.message : "Não foi possível ler o arquivo do backlog.";
    }
  }

  return <Backlog initialFilePath={filePath} initialGames={games} initialError={error} />;
}
