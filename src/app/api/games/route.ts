import { NextResponse } from "next/server";
import { addPlayedGame, addPlayedGameAndCompleteBacklog } from "@/app/lib/scoresFile";
import { cleanupOrphanedBacklogCovers } from "@/app/lib/backlogCovers";
import { getBacklogGames } from "@/app/lib/backlogFile";
import { PlayedGame } from "@/app/interfaces/game.interface";

type GameSubmission = Record<string, unknown>;

interface BacklogCompletionRequest {
  backlogSystem: string;
  backlogName: string;
  backlogOccurrence: number;
}

function isBacklogIdentity(value: unknown): value is BacklogCompletionRequest {
  if (!value || typeof value !== "object") return false;
  const identity = value as Record<string, unknown>;
  return (
    typeof identity.backlogSystem === "string" && Boolean(identity.backlogSystem.trim()) &&
    typeof identity.backlogName === "string" && Boolean(identity.backlogName.trim()) &&
    typeof identity.backlogOccurrence === "number" &&
    Number.isInteger(identity.backlogOccurrence) &&
    identity.backlogOccurrence >= 0
  );
}

function coerceGame(body: GameSubmission): PlayedGame {
  return {
    name: String(body.name || "").trim(),
    genre: String(body.genre || "")
      .split("/")
      .map((g: string) => g.trim())
      .filter(Boolean),
    date: body.date ? new Date(String(body.date)) : new Date(),
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
  let body: GameSubmission;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Corpo da requisição inválido." }, { status: 400 });
  }

  if (!body.platform) {
    return NextResponse.json({ success: false, error: "Plataforma é obrigatória." }, { status: 400 });
  }

  const completion = body.backlogCompletion;
  if (completion !== undefined && !isBacklogIdentity(completion)) {
    return NextResponse.json({ success: false, error: "Backlog completion details are invalid." }, { status: 400 });
  }

  try {
    const game = coerceGame(body);
    if (!completion) {
      addPlayedGame(game);
      return NextResponse.json({ success: true });
    }

    addPlayedGameAndCompleteBacklog(game, {
      system: completion.backlogSystem,
      name: completion.backlogName,
      occurrence: completion.backlogOccurrence,
    });

    let coverWarning: string | null = null;
    try {
      cleanupOrphanedBacklogCovers(getBacklogGames());
    } catch (error) {
      coverWarning = error instanceof Error ? error.message : "The backlog cover could not be removed.";
      console.error("The score was saved and the backlog entry removed, but cover cleanup failed.", error);
    }

    return NextResponse.json({ success: true, backlogRemoved: true, coverWarning });
  } catch (error) {
    if (error instanceof Error && error.message === "BACKLOG_GAME_NOT_FOUND") {
      return NextResponse.json({ success: false, error: "This game is no longer in the backlog. No score was saved." }, { status: 404 });
    }
    const message = error instanceof Error ? error.message : "Erro ao salvar.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
