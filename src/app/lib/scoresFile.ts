import fs from "fs";
import { PlayedGame } from "../interfaces/game.interface";
import { getBacklogFilePath } from "./backlogConfig";
import { removeBacklogGameFromContent, type BacklogGameIdentity } from "./backlogFile";
import { getScoresFilePath } from "./scoresConfig";

type RawEntryTextField = Exclude<keyof RawEntry, "platform" | "isMod" | "jogoOriginal">;

const KEY_MAP: Record<string, RawEntryTextField> = {
  nome: "name",
  genero: "genre",
  data: "date",
  duracao: "duration",
  grafico: "graphics",
  ost: "soundtrack",
  replay: "replayability",
  observacoes: "notes",
  ovservacoes: "notes",
  dificuldade: "difficulty",
  ranking: "ranking",
};

const RANKING_TO_NUM: Record<string, string> = { UM: "1", L: "2", B: "3", MB: "4", BP: "5" };
const NUM_TO_RANKING: Record<string, string> = { "1": "UM", "2": "L", "3": "B", "4": "MB", "5": "BP" };

interface RawEntry {
  platform: string | null;
  isMod: boolean;
  jogoOriginal?: string;
  name?: string;
  genre?: string;
  date?: string;
  duration?: string;
  graphics?: string;
  soundtrack?: string;
  replayability?: string;
  notes?: string;
  flaws?: string;
  suggestions?: string;
  difficulty?: string;
  ranking?: string;
}

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizeKey(raw: string): string {
  return stripAccents(raw.trim().toLowerCase()).replace(/[^a-z]/g, "");
}

function parseNumeric(raw: string, label: string, notesAppend: string[]): number {
  const trimmed = raw.trim();
  const match = trimmed.match(/^(\d+(?:[.,]\d+)?)/);
  if (!match) {
    if (trimmed) notesAppend.push(`${label}: ${trimmed}`);
    return 0;
  }
  const clean = match[1].replace(",", ".");
  if (clean !== trimmed) notesAppend.push(`${label}: ${trimmed}`);
  return parseFloat(clean);
}

function parseLegacyDate(raw: string): Date {
  const match = raw.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!match) return new Date(0);
  const [, d, m, yRaw] = match;
  let y = Number(yRaw);
  if (yRaw.length <= 2) y += y < 50 ? 2000 : 1900;
  return new Date(y, Number(m) - 1, Number(d));
}

export function parseScoresFile(content: string): { platforms: string[]; games: PlayedGame[] } {
  const lines = content.split(/\r\n|\n/);
  const platforms: string[] = [];
  let currentPlatform: string | null = null;
  let isModsSection = false;
  let currentEntry: RawEntry | null = null;
  let currentField: RawEntryTextField | null = null;
  let pendingDefeitos = false;
  const rawEntries: RawEntry[] = [];

  const finalizeEntry = () => {
    if (currentEntry && currentEntry.name) rawEntries.push(currentEntry);
    currentEntry = null;
    currentField = null;
    pendingDefeitos = false;
  };

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();

    const bannerMatch = trimmed.match(/^_{3,}(.+?)_{3,}$/);
    if (bannerMatch) {
      finalizeEntry();
      currentPlatform = bannerMatch[1].trim();
      if (currentPlatform && !platforms.includes(currentPlatform)) platforms.push(currentPlatform);
      isModsSection = false;
      continue;
    }

    const subsectionMatch = trimmed.match(/^-{3,}\s*(.+?)\s*-{3,}$/);
    if (subsectionMatch) {
      finalizeEntry();
      isModsSection = /mods/i.test(subsectionMatch[1]);
      continue;
    }

    if (trimmed === "") {
      continue;
    }

    const jogoOriginalMatch = trimmed.match(/^jogo original\s*:\s*(.*)$/i);
    if (jogoOriginalMatch) {
      finalizeEntry();
      currentEntry = { platform: currentPlatform, isMod: true, jogoOriginal: jogoOriginalMatch[1].trim() };
      currentField = null;
      continue;
    }

    if (/^defeitos\s*&?\s*$/i.test(trimmed)) {
      pendingDefeitos = true;
      currentField = null;
      continue;
    }

    const kvMatch = trimmed.match(/^([^:]{1,25}):(.*)$/);
    if (kvMatch) {
      const normKey = normalizeKey(kvMatch[1]);
      const value = kvMatch[2].trim();

      if (normKey === "nome") {
        if (currentEntry && currentEntry.name) finalizeEntry();
        if (!currentEntry) currentEntry = { platform: currentPlatform, isMod: isModsSection };
        currentEntry.name = value;
        currentField = "name";
        continue;
      }
      if (normKey === "sugestoes") {
        if (!currentEntry) currentEntry = { platform: currentPlatform, isMod: isModsSection };
        const field: RawEntryTextField = pendingDefeitos ? "flaws" : "suggestions";
        currentEntry[field] = value;
        currentField = field;
        pendingDefeitos = false;
        continue;
      }
      if (KEY_MAP[normKey]) {
        if (!currentEntry) currentEntry = { platform: currentPlatform, isMod: isModsSection };
        const field = KEY_MAP[normKey];
        currentEntry[field] = value;
        currentField = field;
        continue;
      }
    }

    if (currentEntry && currentField) {
      const entry = currentEntry as RawEntry;
      entry[currentField] = (entry[currentField] ? entry[currentField] + "\n" : "") + trimmed;
    }
  }
  finalizeEntry();

  const games: PlayedGame[] = rawEntries
    .filter((e) => e.platform && e.name)
    .map((e) => {
      const notesAppend: string[] = [];
      const graphics = parseNumeric(e.graphics || "", "Gráfico", notesAppend);
      const soundtrack = parseNumeric(e.soundtrack || "", "Ost", notesAppend);
      const replayability = parseNumeric(e.replayability || "", "Replay", notesAppend);
      const difficulty = parseNumeric(e.difficulty || "", "Dificuldade", notesAppend);
      const duration = e.duration ? parseNumeric(e.duration, "Duração", notesAppend) : undefined;
      const date = parseLegacyDate(e.date || "");
      const rankingRaw = (e.ranking || "").replace(/['"]/g, "").trim().toUpperCase();
      const ranking = RANKING_TO_NUM[rankingRaw] || "";
      const genre = (e.genre || "")
        .split("/")
        .map((g) => g.trim())
        .filter(Boolean);

      let notes = e.notes || "";
      if (e.isMod && e.jogoOriginal) notes = `Hack/mod de ${e.jogoOriginal}. ${notes}`.trim();
      if (notesAppend.length) notes = [notes, ...notesAppend].filter(Boolean).join(" | ");

      return {
        name: (e.name || "").replace(/#+\s*$/, "").trim(),
        genre,
        date,
        duration,
        graphics,
        soundtrack,
        replayability,
        notes,
        flaws: e.flaws || "",
        suggestions: e.suggestions || "",
        difficulty,
        ranking,
        platform: e.platform as string,
      };
    });

  return { platforms, games };
}

function formatLegacyDate(date: Date): string {
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

function sanitizeMultiline(value: string): string {
  return value
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n+/)
    .join("\n")
    .trim();
}

function indentContinuation(value: string): string {
  return sanitizeMultiline(value)
    .split("\n")
    .map((line, i) => (i === 0 ? line : `\t\t\t${line}`))
    .join("\n");
}

function buildEntryBlock(game: PlayedGame): string {
  const ranking = NUM_TO_RANKING[game.ranking] || "L";
  const lines = [
    `Nome:\t\t\t${game.name}`,
    `Gênero:\t\t\t${(game.genre || []).join("/")}`,
    `Data:\t\t\t${formatLegacyDate(game.date)}`,
  ];
  if (game.duration) lines.push(`Duração:\t\t${game.duration}`);
  lines.push(
    `Gráfico:\t\t${game.graphics}`,
    `Ost:\t\t\t${game.soundtrack}`,
    `Replay:\t\t\t${game.replayability}`,
    `Observações:\t\t${indentContinuation(game.notes || "")}`,
    `Defeitos & `,
    `Sugestões:\t\t${indentContinuation(game.flaws || "")}`,
    `Dificuldade:\t\t${game.difficulty}`,
    `Ranking:\t\t"${ranking}"`
  );
  return lines.join("\n");
}

function findSectionBounds(lines: string[], platform: string): { bannerIndex: number; sectionEnd: number; modsIndex: number | null } | null {
  const bannerRegex = /^_{3,}(.+?)_{3,}$/;
  let bannerIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].trim().match(bannerRegex);
    if (match && match[1].trim() === platform) {
      bannerIndex = i;
      break;
    }
  }
  if (bannerIndex === -1) return null;

  let sectionEnd = lines.length;
  let modsIndex: number | null = null;
  for (let i = bannerIndex + 1; i < lines.length; i++) {
    if (bannerRegex.test(lines[i].trim())) {
      sectionEnd = i;
      break;
    }
    if (modsIndex === null && /^-{3,}\s*mods.*-{3,}$/i.test(lines[i].trim())) {
      modsIndex = i;
    }
  }
  return { bannerIndex, sectionEnd, modsIndex };
}

function insertGameIntoContent(content: string, platform: string, game: PlayedGame): string {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const bounds = findSectionBounds(lines, platform);
  const entryBlock = buildEntryBlock(game);

  if (!bounds) {
    const trimmedContent = content.replace(/\r\n/g, "\n").replace(/\s+$/, "");
    const banner = `___________________${platform}_______________________`;
    return `${trimmedContent}\n\n\n${banner}\n\n${entryBlock}\n`;
  }

  const insertAt = bounds.modsIndex !== null ? bounds.modsIndex : bounds.sectionEnd;
  const before = lines.slice(0, insertAt);
  const after = lines.slice(insertAt);
  while (before.length && before[before.length - 1].trim() === "") before.pop();

  return [...before, "", entryBlock, "", ...after].join("\n");
}

function readContent(): string {
  const filePath = getScoresFilePath();
  if (!filePath) throw new Error("SCORES_PATH_NOT_SET");
  return fs.readFileSync(filePath, "utf-8");
}

function writeContent(content: string): void {
  const filePath = getScoresFilePath();
  if (!filePath) throw new Error("SCORES_PATH_NOT_SET");
  fs.writeFileSync(filePath, content, "utf-8");
}

export function getAllPlayedGames(): PlayedGame[] {
  const content = readContent();
  return parseScoresFile(content).games;
}

export function getPlatforms(): string[] {
  const content = readContent();
  return parseScoresFile(content).platforms;
}

export function addPlayedGame(game: PlayedGame): void {
  const content = readContent();
  const updated = insertGameIntoContent(content, game.platform, game);
  writeContent(updated);
}

export function addPlayedGameAndCompleteBacklog(game: PlayedGame, backlogGame: BacklogGameIdentity): void {
  const scoresFilePath = getScoresFilePath();
  const backlogFilePath = getBacklogFilePath();
  if (!scoresFilePath) throw new Error("SCORES_PATH_NOT_SET");
  if (!backlogFilePath) throw new Error("BACKLOG_PATH_NOT_SET");

  const originalScores = fs.readFileSync(scoresFilePath, "utf-8");
  const originalBacklog = fs.readFileSync(backlogFilePath, "utf-8");
  const updatedScores = insertGameIntoContent(originalScores, game.platform, game);
  const removal = removeBacklogGameFromContent(originalBacklog, backlogGame);
  let scoresWritten = false;
  let backlogWriteAttempted = false;

  try {
    fs.writeFileSync(scoresFilePath, updatedScores, "utf-8");
    scoresWritten = true;
    backlogWriteAttempted = true;
    fs.writeFileSync(backlogFilePath, removal.content, "utf-8");
  } catch (error) {
    const rollbackErrors: string[] = [];
    if (backlogWriteAttempted) {
      try {
        fs.writeFileSync(backlogFilePath, originalBacklog, "utf-8");
      } catch (rollbackError) {
        rollbackErrors.push(`Could not restore the backlog file: ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`);
      }
    }
    if (scoresWritten) {
      try {
        fs.writeFileSync(scoresFilePath, originalScores, "utf-8");
      } catch (rollbackError) {
        rollbackErrors.push(`Could not restore the scores file: ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`);
      }
    }

    const originalError = error instanceof Error ? error.message : String(error);
    throw new Error([`Could not complete the game: ${originalError}`, ...rollbackErrors].join(" "));
  }
}
