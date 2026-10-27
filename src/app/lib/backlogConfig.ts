import fs from "fs";
import path from "path";

const CONFIG_PATH = path.join(process.cwd(), ".backlog-config.json");

interface BacklogConfig {
  filePath: string;
}

export function getBacklogFilePath(): string | null {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
    const config: BacklogConfig = JSON.parse(raw);
    return config.filePath || null;
  } catch {
    return null;
  }
}

export function setBacklogFilePath(filePath: string): void {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    throw new Error(`Arquivo não encontrado: ${filePath}`);
  }

  const config: BacklogConfig = { filePath };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
}
