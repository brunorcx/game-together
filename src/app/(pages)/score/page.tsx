import Score from "./score";
import { getScoresFilePath } from "@/app/lib/scoresConfig";
import { getPlatforms } from "@/app/lib/scoresFile";

export default async function ScorePage() {
  const filePath = getScoresFilePath();

  let platforms: string[] = [];
  if (filePath) {
    try {
      platforms = getPlatforms();
    } catch {
      platforms = [];
    }
  }

  return <Score initialFilePath={filePath} initialPlatforms={platforms} />;
}
