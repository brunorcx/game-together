import { Game, GameInfoAndUserProgress } from "@retroachievements/api";

export interface GamePageProps {
  game: Game;
  startDate: string;
  endDate: string;
  gameProgress: GameInfoAndUserProgress;
}

export interface PlayedGame {
  name: string;
  genre: string[];
  date: Date;
  duration?: number;
  graphics: number;
  soundtrack: number;
  replayability: number;
  notes?: string;
  flaws: string;
  suggestions?: string;
  difficulty: number;
  ranking: string;
  platform: string;
}
