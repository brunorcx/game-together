import Score from "./score";
import { getScoresFilePath } from "@/app/lib/scoresConfig";
import { getPlatforms } from "@/app/lib/scoresFile";

interface SearchParams {
  [key: string]: string | string[] | undefined;
}

function firstSearchValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

export default async function ScorePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const search = await searchParams;
  const filePath = getScoresFilePath();

  let platforms: string[] = [];
  if (filePath) {
    try {
      platforms = getPlatforms();
    } catch {
      platforms = [];
    }
  }

  const initialGame = {
    name: firstSearchValue(search.name),
    platform: firstSearchValue(search.platform),
    genre: firstSearchValue(search.genre),
  };
  const backlogSystem = firstSearchValue(search.backlogSystem);
  const backlogName = firstSearchValue(search.backlogName);
  const occurrenceValue = Number(firstSearchValue(search.backlogOccurrence));
  const backlogCompletion = backlogSystem && backlogName && Number.isInteger(occurrenceValue) && occurrenceValue >= 0
    ? { system: backlogSystem, name: backlogName, occurrence: occurrenceValue }
    : null;

  return (
    <Score
      initialFilePath={filePath}
      initialPlatforms={platforms}
      initialGame={initialGame}
      backlogCompletion={backlogCompletion}
    />
  );
}
