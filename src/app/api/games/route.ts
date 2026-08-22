import { NextResponse } from "next/server";
import { addPlayedGame } from "@/app/lib/scoresFile";
import { PlayedGame } from "@/app/interfaces/game.interface";

type GameSubmission = Record<string, string | number | undefined>;

function coerceGame(body: GameSubmission): PlayedGame {
  return {
    name: String(body.name || "").trim(),
    genre: String(body.genre || "")
      .split("/")
      .map((g: string) => g.trim())
      .filter(Boolean),
    date: body.date ? new Date(body.date) : new Date(),
    duration: body.duration ? Number(body.duration) : undefined,
    graphics: Number(body.graphics) || 0,
    soundtrack: Number(body.soundtrack) || 0,
    replayability: Number(body.replayability) || 0,
    notes: String(body.notes || ""),
    flaws: String(body.flaws || ""),
    suggestions: String(body.suggestions || ""),
    difficulty: Number(body.difficulty) || 0,
    ranking: String(body.ranking || "3"),
    platform: String(body.platform || "").trim(),
  };
}

export async function POST(req: Request) {
  const body = await req.json();

  if (!body.platform) {
    return NextResponse.json({ success: false, error: "Plataforma é obrigatória." }, { status: 400 });
  }

  try {
    const game = coerceGame(body);
    addPlayedGame(game);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao salvar.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
