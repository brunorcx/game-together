import { NextResponse } from "next/server";
import { syncBacklogCovers } from "@/app/lib/backlogCovers";
import { getBacklogGames } from "@/app/lib/backlogFile";

export async function POST() {
  try {
    const result = await syncBacklogCovers(getBacklogGames());
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível atualizar as capas.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
