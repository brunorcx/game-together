import fs from "fs";
import path from "path";

const CONFIG_PATH = path.join(process.cwd(), ".scores-config.json");

interface ScoresConfig {
  filePath: string;
}

export function getScoresFilePath(): string | null {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
    const config: ScoresConfig = JSON.parse(raw);
    return config.filePath || null;
  } catch {
    return null;
  }
}

export function setScoresFilePath(filePath: string): void {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Arquivo não encontrado: ${filePath}`);
  }
  const config: ScoresConfig = { filePath };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
}
