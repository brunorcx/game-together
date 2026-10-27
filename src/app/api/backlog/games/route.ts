import { NextResponse } from "next/server";
import { addBacklogGame, getBacklogGames, updateBacklogGame, type BacklogGameInput } from "@/app/lib/backlogFile";
import { cleanupOrphanedBacklogCovers } from "@/app/lib/backlogCovers";

interface GameEditRequest {
  originalSystem: unknown;
  originalName: unknown;
  occurrence: unknown;
  name: unknown;
  system: unknown;
  players: unknown;
  playersUncertain: unknown;
  comments: unknown;
}

function isValidPlayers(value: string | null): boolean {
  return value === null || /^\d+(?:\s*-\s*\d+)?(?:\s*,\s*\d+(?:\s*-\s*\d+)?)*$/.test(value);
}

export async function POST(request: Request) {
  let body: Partial<BacklogGameInput>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Corpo da requisição inválido." }, { status: 400 });
  }

  if (
    typeof body.name !== "string" || !body.name.trim() ||
    typeof body.system !== "string" || !body.system.trim() ||
    typeof body.genre !== "string" ||
    typeof body.comments !== "string" ||
    (body.players !== null && body.players !== undefined && typeof body.players !== "string") ||
    typeof body.playersUncertain !== "boolean"
  ) {
    return NextResponse.json({ success: false, error: "Confira os dados obrigatórios do jogo." }, { status: 400 });
  }
  if (body.players && !isValidPlayers(body.players)) {
    return NextResponse.json({ success: false, error: "Número de jogadores inválido." }, { status: 400 });
  }

  try {
    addBacklogGame({
      name: body.name.trim(),
      system: body.system.trim(),
      genre: body.genre.trim(),
      players: body.players?.trim() || null,
      playersUncertain: body.playersUncertain,
      comments: body.comments.trim(),
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível salvar o jogo.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  let body: GameEditRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Corpo da requisição inválido." }, { status: 400 });
  }

  if (
    typeof body.originalSystem !== "string" || !body.originalSystem.trim() ||
    typeof body.originalName !== "string" || !body.originalName.trim() ||
    typeof body.occurrence !== "number" || !Number.isInteger(body.occurrence) || body.occurrence < 0 ||
    typeof body.name !== "string" || !body.name.trim() ||
    typeof body.system !== "string" || !body.system.trim() ||
    (body.players !== null && typeof body.players !== "string") ||
    typeof body.playersUncertain !== "boolean" ||
    typeof body.comments !== "string"
  ) {
    return NextResponse.json({ success: false, error: "Confira os dados obrigatórios do jogo." }, { status: 400 });
  }

  const players = typeof body.players === "string" ? body.players.trim() || null : null;
  if (players && !isValidPlayers(players)) {
    return NextResponse.json({ success: false, error: "Número de jogadores inválido." }, { status: 400 });
  }

  try {
    updateBacklogGame(
      {
        system: body.originalSystem,
        name: body.originalName,
        occurrence: body.occurrence,
      },
      {
        name: body.name,
        system: body.system,
        players,
        playersUncertain: body.playersUncertain,
        comments: body.comments,
      },
    );
    let coverWarning: string | null = null;
    try {
      cleanupOrphanedBacklogCovers(getBacklogGames());
    } catch (error) {
      coverWarning = error instanceof Error ? error.message : "The previous cover could not be removed.";
      console.error("The backlog game was updated, but its previous cover could not be cleaned up.", error);
    }
    return NextResponse.json({ success: true, coverWarning });
  } catch (error) {
    if (error instanceof Error && error.message === "BACKLOG_GAME_NOT_FOUND") {
      return NextResponse.json({ success: false, error: "This game could not be found in the selected backlog file. Refresh the page and try again." }, { status: 404 });
    }
    const message = error instanceof Error ? error.message : "Não foi possível atualizar o jogo.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
