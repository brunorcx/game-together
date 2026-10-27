import crypto from "crypto";
import fs from "fs";
import path from "path";
import type { BacklogGame } from "./backlogFile";
import { gameTitleSimilarity } from "./gameTitleMatching";
import { fetchRetroAchievementsCover } from "./retroachievements";

const COVERS_DIRECTORY = path.join(process.cwd(), ".backlog-covers");
const EXTENSIONS = [".jpg", ".png", ".webp", ".gif"];
const EXCLUDED_STEAM_PRODUCTS = /\b(?:soundtrack|artbook|digital artbook|game pack|character pack|bundle|upgrade|demo|playtest|server pack)\b/i;

export function getBacklogCoverKey(game: Pick<BacklogGame, "system" | "name">): string {
  return crypto.createHash("sha256").update(`${game.system}\0${game.name}`).digest("hex");
}

function getCoverPath(key: string): string | null {
  for (const extension of EXTENSIONS) {
    const filePath = path.join(COVERS_DIRECTORY, `${key}${extension}`);
    if (fs.existsSync(filePath)) return filePath;
  }
  return null;
}

export function getBacklogCoverUrl(game: Pick<BacklogGame, "system" | "name">): string | null {
  const coverPath = getCoverPath(getBacklogCoverKey(game));
  if (!coverPath) return null;

  const version = crypto.createHash("sha256").update(fs.readFileSync(coverPath)).digest("hex").slice(0, 12);
  return `/api/backlog/covers/${getBacklogCoverKey(game)}?v=${version}`;
}

export function saveUploadedBacklogCover(
  game: Pick<BacklogGame, "system" | "name">,
  bytes: Buffer,
  contentType: string,
): void {
  const extension = imageExtension(contentType);
  if (!extension) throw new Error("Unsupported cover image format.");
  if (!bytes.length || bytes.length > 1024 * 1024) throw new Error("The compressed cover must be 1 MB or smaller.");

  fs.mkdirSync(COVERS_DIRECTORY, { recursive: true });
  const key = getBacklogCoverKey(game);
  for (const oldExtension of EXTENSIONS) {
    const oldPath = path.join(COVERS_DIRECTORY, `${key}${oldExtension}`);
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }
  fs.writeFileSync(path.join(COVERS_DIRECTORY, `${key}${extension}`), bytes);
}

export function deleteBacklogCover(game: Pick<BacklogGame, "system" | "name">): void {
  const key = getBacklogCoverKey(game);
  for (const extension of EXTENSIONS) {
    const coverPath = path.join(COVERS_DIRECTORY, `${key}${extension}`);
    if (fs.existsSync(coverPath)) fs.unlinkSync(coverPath);
  }
}

export function deleteBacklogCoverIfOrphaned(
  game: Pick<BacklogGame, "system" | "name">,
  remainingGames: BacklogGame[],
): void {
  const key = getBacklogCoverKey(game);
  if (remainingGames.some((remaining) => getBacklogCoverKey(remaining) === key)) return;
  deleteBacklogCover(game);
}

export function cleanupOrphanedBacklogCovers(games: BacklogGame[]): void {
  fs.mkdirSync(COVERS_DIRECTORY, { recursive: true });
  const activeKeys = new Set(games.map(getBacklogCoverKey));
  for (const fileName of fs.readdirSync(COVERS_DIRECTORY)) {
    const key = path.parse(fileName).name;
    if (/^[a-f0-9]{64}$/.test(key) && !activeKeys.has(key)) {
      fs.unlinkSync(path.join(COVERS_DIRECTORY, fileName));
    }
  }
}

function imageExtension(contentType: string): string | null {
  if (contentType.includes("jpeg")) return ".jpg";
  if (contentType.includes("png")) return ".png";
  if (contentType.includes("webp")) return ".webp";
  if (contentType.includes("gif")) return ".gif";
  return null;
}

async function downloadCover(game: BacklogGame): Promise<boolean> {
  let image = await fetchRetroAchievementsCover(game.system, game.name);

  if (!image) {
    const searchUrl = new URL("https://store.steampowered.com/api/storesearch/");
    searchUrl.searchParams.set("term", game.name);
    searchUrl.searchParams.set("l", "english");
    searchUrl.searchParams.set("cc", "US");
    const searchResponse = await fetch(searchUrl, { signal: AbortSignal.timeout(12000) });
    if (!searchResponse.ok) throw new Error(`Steam search returned HTTP ${searchResponse.status}`);

    const searchData = (await searchResponse.json()) as { items?: Array<{ id: number; name: string }> };
    const bestMatch = (searchData.items || [])
      .filter((item) => !EXCLUDED_STEAM_PRODUCTS.test(item.name))
      .map((item) => ({ item, score: gameTitleSimilarity(game.name, item.name) }))
      .sort((left, right) => right.score - left.score)[0];
    if (!bestMatch || bestMatch.score < 0.65) return false;

    const libraryCoverUrl = `https://cdn.akamai.steamstatic.com/steam/apps/${bestMatch.item.id}/library_600x900.jpg`;
    const libraryResponse = await fetch(libraryCoverUrl, { signal: AbortSignal.timeout(12000) });
    if (libraryResponse.ok && libraryResponse.headers.get("content-type")?.startsWith("image/")) {
      image = {
        bytes: new Uint8Array(await libraryResponse.arrayBuffer()),
        contentType: libraryResponse.headers.get("content-type") || "image/jpeg",
      };
    } else {
      const detailsUrl = new URL("https://store.steampowered.com/api/appdetails");
      detailsUrl.searchParams.set("appids", String(bestMatch.item.id));
      detailsUrl.searchParams.set("cc", "US");
      detailsUrl.searchParams.set("l", "english");
      const detailsResponse = await fetch(detailsUrl, { signal: AbortSignal.timeout(12000) });
      if (!detailsResponse.ok) throw new Error(`Steam game details returned HTTP ${detailsResponse.status}`);
      const details = (await detailsResponse.json()) as Record<string, { success?: boolean; data?: { header_image?: string } }>;
      const headerImage = details[String(bestMatch.item.id)]?.data?.header_image;
      if (!headerImage) return false;
      const imageResponse = await fetch(headerImage, { signal: AbortSignal.timeout(12000) });
      if (!imageResponse.ok) throw new Error(`Steam cover returned HTTP ${imageResponse.status}`);
      image = {
        bytes: new Uint8Array(await imageResponse.arrayBuffer()),
        contentType: imageResponse.headers.get("content-type") || "image/jpeg",
      };
    }
  }

  const extension = imageExtension(image.contentType);
  const bytes = Buffer.from(image.bytes);
  if (!extension || !bytes.length || bytes.length > 8 * 1024 * 1024) return false;

  fs.mkdirSync(COVERS_DIRECTORY, { recursive: true });
  const key = getBacklogCoverKey(game);
  for (const oldExtension of EXTENSIONS) {
    const oldPath = path.join(COVERS_DIRECTORY, `${key}${oldExtension}`);
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }
  fs.writeFileSync(path.join(COVERS_DIRECTORY, `${key}${extension}`), bytes);
  return true;
}

export async function syncBacklogCovers(games: BacklogGame[]): Promise<{ updated: number; missing: number; failed: number }> {
  fs.mkdirSync(COVERS_DIRECTORY, { recursive: true });
  let updated = 0;
  let missing = 0;
  let failed = 0;
  let nextIndex = 0;

  const workers = Array.from({ length: Math.min(4, games.length) }, async () => {
    while (nextIndex < games.length) {
      const game = games[nextIndex++];
      try {
        if (await downloadCover(game)) updated++;
        else missing++;
      } catch (error) {
        console.error(`Unable to update cover for "${game.name}" (${game.system}).`, error);
        failed++;
      }
    }
  });
  await Promise.all(workers);

  cleanupOrphanedBacklogCovers(games);

  return { updated, missing, failed };
}

export function readBacklogCover(key: string): { bytes: Buffer; contentType: string } | null {
  if (!/^[a-f0-9]{64}$/.test(key)) return null;
  const filePath = getCoverPath(key);
  if (!filePath) return null;
  const contentTypeByExtension: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
  };
  return { bytes: fs.readFileSync(filePath), contentType: contentTypeByExtension[path.extname(filePath)] };
}
