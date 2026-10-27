import { NextResponse } from "next/server";
import { getBacklogFilePath, setBacklogFilePath } from "@/app/lib/backlogConfig";
import { getBacklogCoverUrl } from "@/app/lib/backlogCovers";
import { getBacklogGames } from "@/app/lib/backlogFile";

export async function GET() {
  const filePath = getBacklogFilePath();
  if (!filePath) return NextResponse.json({ filePath: null, games: [] });

  try {
    const games = getBacklogGames().map((game) => ({ ...game, coverUrl: getBacklogCoverUrl(game) }));
    return NextResponse.json({ filePath, games });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível ler o arquivo do backlog.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: { filePath?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Corpo da requisição inválido." }, { status: 400 });
  }

  if (typeof body.filePath !== "string" || !body.filePath.trim()) {
    return NextResponse.json({ success: false, error: "Informe o caminho do arquivo .txt." }, { status: 400 });
  }

  try {
    setBacklogFilePath(body.filePath.trim());
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível configurar o arquivo.";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
