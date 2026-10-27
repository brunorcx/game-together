import fs from "fs";
import { getBacklogFilePath } from "./backlogConfig";

export interface BacklogGame {
  system: string;
  name: string;
  genre: string;
  players: string | null;
  playersUncertain: boolean;
  comments: string;
}

export type BacklogGameInput = BacklogGame;

function configuredFilePath(): string {
  const filePath = getBacklogFilePath();
  if (!filePath) throw new Error("BACKLOG_PATH_NOT_SET");
  return filePath;
}

export function parseBacklogFile(content: string): BacklogGame[] {
  const games: BacklogGame[] = [];
  let currentSystem = "";

  for (const rawLine of content.replace(/^\uFEFF/, "").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    const section = line.match(/^-{3,}\s*(.+?)\s*-{3,}$/);
    if (section) {
      currentSystem = section[1].trim();
      continue;
    }
    if (!currentSystem || line.startsWith("---")) continue;

    const comment = line.match(/^comments?\s*:\s*(.*)$/i);
    if (comment && games.length && games[games.length - 1].system === currentSystem) {
      games[games.length - 1].comments = [games[games.length - 1].comments, comment[1]].filter(Boolean).join("\n");
      continue;
    }

    const metadataParts = line.split(/\s*--\s*/);
    let rawName = metadataParts.shift() || "";
    let slashIndex = rawName.indexOf("//");
    while (slashIndex > 0) {
      const previousCharacter = rawName[slashIndex - 1];
      if (/\s|\)/.test(previousCharacter)) {
        metadataParts.unshift(rawName.slice(slashIndex + 2).trim());
        rawName = rawName.slice(0, slashIndex).trimEnd();
        break;
      }
      slashIndex = rawName.indexOf("//", slashIndex + 2);
    }
    const metadata = metadataParts.filter(Boolean);
    let name = rawName.trim();
    if (!name) continue;
    let comments = "";
    const markedNote = name.match(/\s+(#{2,3})\s*(.+)$/);
    if (markedNote) {
      const markerType = markedNote[1];
      const note = markedNote[2].trim();
      name = name.slice(0, markedNote.index).trim();
      if (markerType === "###") {
        comments = note;
      } else {
        const [markedGenre, ...commentParts] = note.split(/\s+/);
        if (markedGenre) metadata.push(markedGenre);
        comments = commentParts.join(" ");
      }
    }

    const playerPattern = /\s*\((\d+(?:\s*-\s*\d+)?(?:\s*,\s*\d+(?:\s*-\s*\d+)?)*|\?)(\?)?\)(?=(?:\s*\[[^\]]+\])?\s*$)/;
    let playerMatch = name.match(playerPattern);
    let players: string | null = null;
    let playersUncertain = false;
    if (playerMatch) {
      players = playerMatch[1] === "?" ? null : playerMatch[1].replace(/\s/g, "");
      playersUncertain = playerMatch[1] === "?" || Boolean(playerMatch[2]);
      const suffix = name.match(/\s*\[[^\]]+\]\s*$/)?.[0].trim();
      name = `${name.slice(0, playerMatch.index).trim()}${suffix ? ` ${suffix}` : ""}`;
    }

    let genre = metadata.join(" -- ").trim();
    if (!playerMatch) {
      playerMatch = genre.match(/\((\d+(?:\s*-\s*\d+)?(?:\s*,\s*\d+(?:\s*-\s*\d+)?)*|\?)(\?)?\)\s*$/);
      if (playerMatch) {
        players = playerMatch[1] === "?" ? null : playerMatch[1].replace(/\s/g, "");
        playersUncertain = playerMatch[1] === "?" || Boolean(playerMatch[2]);
        genre = genre.slice(0, playerMatch.index).trim();
      }
    }

    games.push({
      system: currentSystem,
      name,
      genre,
      players,
      playersUncertain,
      comments,
    });
  }

  return games;
}

export function getBacklogGames(): BacklogGame[] {
  return parseBacklogFile(fs.readFileSync(configuredFilePath(), "utf-8"));
}

function formatGame(game: BacklogGameInput): string {
  const playerInfo = game.players
    ? ` (${game.players}${game.playersUncertain ? "?" : ""})`
    : game.playersUncertain
      ? " (?)"
      : "";
  const genre = game.genre.trim();
  const entry = `${game.name.trim()}${playerInfo}${genre ? ` -- ${genre}` : ""}`;
  const comments = game.comments.trim().replace(/\r\n/g, "\n").split("\n");
  return [entry, ...comments.filter(Boolean).map((comment) => `  Comments: ${comment}`)].join("\n");
}

function insertGame(content: string, game: BacklogGameInput): string {
  const lines = content.split(/\r?\n/);
  const sectionPattern = /^-{3,}\s*(.+?)\s*-{3,}$/;
  const sectionIndex = lines.findIndex((line) => {
    const match = line.trim().match(sectionPattern);
    return match?.[1].trim().toLocaleLowerCase() === game.system.trim().toLocaleLowerCase();
  });
  const entry = formatGame(game);

  if (sectionIndex < 0) {
    const trimmedLines = lines;
    while (trimmedLines.length && !trimmedLines[trimmedLines.length - 1].trim()) trimmedLines.pop();
    if (trimmedLines.length) trimmedLines.push("", "");
    trimmedLines.push(`--- ${game.system.trim()} ---`, ...entry.split("\n"));
  } else {
    let sectionEnd = lines.length;
    for (let index = sectionIndex + 1; index < lines.length; index++) {
      if (lines[index].trim().match(sectionPattern)) {
        sectionEnd = index;
        break;
      }
    }
    let insertAt = sectionEnd;
    while (insertAt > sectionIndex + 1 && !lines[insertAt - 1].trim()) insertAt--;
    lines.splice(insertAt, 0, ...entry.split("\n"));
  }

  return lines.join(content.includes("\r\n") ? "\r\n" : "\n");
}

export function addBacklogGame(game: BacklogGameInput): void {
  const filePath = configuredFilePath();
  const content = fs.readFileSync(filePath, "utf-8");
  fs.writeFileSync(filePath, insertGame(content, game), "utf-8");
}

export interface BacklogGameUpdate {
  name: string;
  system: string;
  players: string | null;
  playersUncertain: boolean;
  comments: string;
}

export interface BacklogGameIdentity {
  system: string;
  name: string;
  occurrence: number;
}

export function removeBacklogGameFromContent(
  content: string,
  original: BacklogGameIdentity,
): { content: string; game: BacklogGame } {
  const lines = content.split(/\r?\n/);
  const games = parseBacklogFile(content);
  const matchingIndexes = games.reduce<number[]>((indexes, game, index) => {
    if (game.system === original.system && game.name === original.name) indexes.push(index);
    return indexes;
  }, []);
  const targetIndex = matchingIndexes[original.occurrence];
  if (targetIndex === undefined) throw new Error("BACKLOG_GAME_NOT_FOUND");

  const entryIndexes: number[] = [];
  let currentSystem = "";
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index].trim();
    const section = line.match(/^-{3,}\s*(.+?)\s*-{3,}$/);
    if (section) {
      currentSystem = section[1].trim();
      continue;
    }
    if (!currentSystem || !line || line.startsWith("---") || /^comments?\s*:/i.test(line)) continue;
    entryIndexes.push(index);
  }

  const start = entryIndexes[targetIndex];
  if (start === undefined) throw new Error("BACKLOG_GAME_NOT_FOUND");
  const linesToRemove = new Set<number>([start]);
  for (let index = start + 1; index < lines.length && !entryIndexes.includes(index); index++) {
    if (/^\s*comments?\s*:/i.test(lines[index])) linesToRemove.add(index);
  }

  const newline = content.includes("\r\n") ? "\r\n" : "\n";
  return {
    content: lines.filter((_line, index) => !linesToRemove.has(index)).join(newline),
    game: games[targetIndex],
  };
}

export function updateBacklogGame(
  original: { system: string; name: string; occurrence: number },
  update: BacklogGameUpdate,
): void {
  const filePath = configuredFilePath();
  const content = fs.readFileSync(filePath, "utf-8");
  const games = parseBacklogFile(content);
  const matchingIndexes = games.reduce<number[]>((indexes, game, index) => {
    if (game.system === original.system && game.name === original.name) indexes.push(index);
    return indexes;
  }, []);
  const targetIndex = matchingIndexes[original.occurrence];
  if (targetIndex === undefined) throw new Error("BACKLOG_GAME_NOT_FOUND");

  const updatedGame: BacklogGameInput = {
    ...games[targetIndex],
    ...update,
    name: update.name.trim(),
    system: update.system.trim(),
    comments: update.comments.trim(),
  };

  let updatedContent: string;
  if (original.system.localeCompare(updatedGame.system, undefined, { sensitivity: "base" }) === 0) {
    const lines = content.split(/\r?\n/);
    const entryIndexes: number[] = [];
    let currentSystem = "";
    for (let index = 0; index < lines.length; index++) {
      const line = lines[index].trim();
      const section = line.match(/^-{3,}\s*(.+?)\s*-{3,}$/);
      if (section) {
        currentSystem = section[1].trim();
        continue;
      }
      if (!currentSystem || !line || line.startsWith("---") || /^comments?\s*:/i.test(line)) continue;
      entryIndexes.push(index);
    }

    const start = entryIndexes[targetIndex];
    if (start === undefined) throw new Error("BACKLOG_GAME_NOT_FOUND");
    const nextEntry = entryIndexes[targetIndex + 1] ?? lines.length;
    const commentIndexes: number[] = [];
    for (let index = start + 1; index < nextEntry; index++) {
      if (/^\s*comments?\s*:/i.test(lines[index])) commentIndexes.push(index);
    }

    const newline = content.includes("\r\n") ? "\r\n" : "\n";
    const replacement = formatGame(updatedGame).split("\n");
    lines[start] = replacement[0];
    for (const index of commentIndexes.reverse()) lines.splice(index, 1);
    lines.splice(start + 1, 0, ...replacement.slice(1));
    updatedContent = lines.join(newline);
  } else {
    const removal = removeBacklogGameFromContent(content, original);
    updatedContent = insertGame(removal.content, updatedGame);
  }

  fs.writeFileSync(filePath, updatedContent, "utf-8");
}
