import { NextResponse } from "next/server";
import { getScoresFilePath, setScoresFilePath } from "@/app/lib/scoresConfig";

export async function GET() {
  const filePath = getScoresFilePath();
  return NextResponse.json({ filePath });
}

export async function POST(req: Request) {
  const { filePath } = await req.json();

  if (!filePath || typeof filePath !== "string") {
    return NextResponse.json({ success: false, error: "Caminho inválido." }, { status: 400 });
  }

  try {
    setScoresFilePath(filePath);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao salvar o caminho.";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
