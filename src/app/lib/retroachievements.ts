import { buildAuthorization, getAchievementsEarnedBetween, getConsoleIds, getGame, getGameInfoAndUserProgress, getGameList } from "@retroachievements/api";
import type { FetchedSystem, GameList } from "@retroachievements/api";
import { gameTitleSimilarity } from "./gameTitleMatching";

const username = process.env.RA_USERNAME as string;
const webApiKey = process.env.RA_API_KEY as string;

function getAuthorization() {
  if (!username || !webApiKey) throw new Error("RetroAchievements credentials are not configured.");
  return buildAuthorization({ username, webApiKey });
}

let consoleIdsPromise: Promise<FetchedSystem[]> | null = null;
const gameLists = new Map<number, Promise<GameList>>();

const SYSTEM_ALIASES: Record<string, string[]> = {
  coopgames: [],
  pcwindows: [],
  nes: ["NES/Famicom", "Nintendo Entertainment System"],
  mame: ["Arcade"],
  sharpx68000: ["Sharp X68000"],
  gameboy: ["Game Boy"],
  snes: ["SNES/Super Famicom", "Super Nintendo Entertainment System"],
  megadrive: ["Genesis/Mega Drive", "Mega Drive", "Genesis"],
  pcengine: ["PC Engine/TurboGrafx-16", "PC Engine"],
  neogeo: ["Neo Geo CD", "Neo Geo", "Arcade"],
  megacd: ["Sega CD"],
  playstation1: ["PlayStation"],
  nintendo64: ["Nintendo 64"],
  gameboyadvance: ["Game Boy Advance"],
  playstation2: ["PlayStation 2"],
  xbox: ["Xbox"],
  segasaturn: ["Saturn", "Sega Saturn"],
  gamecube: ["GameCube"],
  nintendods: ["Nintendo DS"],
  psp: ["PlayStation Portable"],
  wii: ["Wii"],
  "3ds": ["Nintendo 3DS"],
  nintendoswitch: ["Nintendo Switch"],
};

function normalizeSystemName(name: string): string {
  return name.toLocaleLowerCase().replace(/[^a-z0-9]/g, "");
}

async function getConsoleIdsCached(): Promise<FetchedSystem[]> {
  if (!consoleIdsPromise) {
    consoleIdsPromise = getConsoleIds(getAuthorization(), {
      shouldOnlyRetrieveActiveSystems: true,
      shouldOnlyRetrieveGameSystems: true,
    });
  }
  return consoleIdsPromise;
}

async function getGameListCached(consoleId: number): Promise<GameList> {
  let gameList = gameLists.get(consoleId);
  if (!gameList) {
    gameList = getGameList(getAuthorization(), {
      consoleId,
      shouldOnlyRetrieveGamesWithAchievements: false,
    });
    gameLists.set(consoleId, gameList);
  }
  return gameList;
}

export async function fetchRetroAchievementsCover(system: string, title: string): Promise<{
  bytes: Uint8Array;
  contentType: string;
} | null> {
  const aliases = SYSTEM_ALIASES[normalizeSystemName(system)];
  if (!aliases?.length || !username || !webApiKey) return null;

  try {
    const consoles = await getConsoleIdsCached();
    const normalizedAliases = aliases.map(normalizeSystemName);
    const consoleIds = consoles
      .filter((consoleInfo) => normalizedAliases.includes(normalizeSystemName(consoleInfo.name)))
      .map((consoleInfo) => consoleInfo.id);

    let bestMatch: { id: number; score: number } | null = null;
    for (const consoleId of consoleIds) {
      const games = await getGameListCached(consoleId);
      for (const candidate of games) {
        const score = gameTitleSimilarity(title, candidate.title);
        if (!bestMatch || score > bestMatch.score) bestMatch = { id: candidate.id, score };
      }
    }

    if (!bestMatch || bestMatch.score < 0.76) return null;

    const game = await getGame(getAuthorization(), { gameId: bestMatch.id });
    if (!game.imageBoxArt) return null;
    const imageUrl = game.imageBoxArt.startsWith("http")
      ? game.imageBoxArt
      : `https://retroachievements.org${game.imageBoxArt}`;
    const response = await fetch(imageUrl, { signal: AbortSignal.timeout(12000) });
    if (!response.ok) throw new Error(`RetroAchievements cover returned HTTP ${response.status}`);
    return { bytes: new Uint8Array(await response.arrayBuffer()), contentType: response.headers.get("content-type") || "image/png" };
  } catch (error) {
    console.error(`RetroAchievements cover lookup failed for "${title}" on "${system}".`, error);
    return null;
  }
}

/**
 * Fetch basic info about a game.
 */
export async function fetchGame(gameId: number) {
  return await getGame(getAuthorization(), { gameId });
}

/**
 * Fetch achievements earned by a user between two dates.
 */
export async function fetchAchievementsBetween(username: string, from: Date, to: Date) {
  return await getAchievementsEarnedBetween(getAuthorization(), {
    username,
    fromDate: from,
    toDate: to,
  });
}

/**
 * Fetch game info with user's progress.
 */
export async function fetchGameProgress(username: string, gameId: number) {
  return await getGameInfoAndUserProgress(getAuthorization(), {
    username,
    gameId,
  });
}
