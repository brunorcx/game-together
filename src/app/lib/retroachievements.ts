import { buildAuthorization, getGame, getAchievementsEarnedBetween, getGameInfoAndUserProgress } from "@retroachievements/api";

const username = process.env.RA_USERNAME as string;
const webApiKey = process.env.RA_API_KEY as string;

const authorization = buildAuthorization({ username, webApiKey });

/**
 * Fetch basic info about a game.
 */
export async function fetchGame(gameId: number) {
  console.log("Fetching game data...", username, webApiKey);
  return await getGame(authorization, { gameId });
}

/**
 * Fetch achievements earned by a user between two dates.
 */
export async function fetchAchievementsBetween(username: string, from: Date, to: Date) {
  return await getAchievementsEarnedBetween(authorization, {
    username,
    fromDate: from,
    toDate: to,
  });
}

/**
 * Fetch game info with user's progress.
 */
export async function fetchGameProgress(username: string, gameId: number) {
  return await getGameInfoAndUserProgress(authorization, {
    username,
    gameId,
  });
}
