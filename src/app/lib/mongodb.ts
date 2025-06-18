import { MongoClient, Collection } from "mongodb";
import { PlayedGame } from "../interfaces/game.interface";

const URI = process.env.MONGODB_URI!;
const DB_NAME = process.env.MONGODB_DB!;
const COLLECTION_NAME = process.env.MONGODB_COLLECTION!;

if (!URI || !DB_NAME || !COLLECTION_NAME) {
  throw new Error("Missing MongoDB environment variables.");
}

const client = new MongoClient(URI);

async function getCollection(): Promise<Collection<PlayedGame>> {
  const db = client.db(DB_NAME);
  return db.collection<PlayedGame>(COLLECTION_NAME);
}

export async function addPlayedGame(game: PlayedGame) {
  const collection = await getCollection();
  return collection.insertOne(game);
}

export async function getPlayedGame(query: Partial<PlayedGame>) {
  const collection = await getCollection();
  return collection.findOne(query);
}

export async function putPlayedGame(query: Partial<PlayedGame>, update: Partial<PlayedGame>) {
  const collection = await getCollection();
  return collection.updateOne(query, { $set: update });
}

export async function removePlayedGame(query: Partial<PlayedGame>) {
  const collection = await getCollection();
  return collection.deleteOne(query);
}

export async function getAllPlayedGames(): Promise<PlayedGame[]> {
  const collection = await getCollection();
  const games = await collection.find({}).toArray();

  return games.map((game) => ({
    name: game.name,
    platform: game.platform,
    genre: game.genre,
    date: new Date(game.date),
    duration: Number(game.duration),
    graphics: Number(game.graphics),
    soundtrack: Number(game.soundtrack),
    replayability: Number(game.replayability),
    notes: game.notes,
    flaws: game.flaws,
    suggestions: game.suggestions,
    difficulty: Number(game.difficulty),
    ranking: game.ranking,
  }));
}
