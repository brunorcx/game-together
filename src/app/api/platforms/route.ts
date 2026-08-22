import { NextResponse } from "next/server";
import { getPlatforms } from "@/app/lib/scoresFile";

export async function GET() {
  try {
    const platforms = getPlatforms();
    return NextResponse.json({ success: true, platforms });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao ler plataformas.";
    return NextResponse.json({ success: false, error: message, platforms: [] }, { status: 400 });
  }
}
