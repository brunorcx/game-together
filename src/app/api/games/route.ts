import { NextResponse } from "next/server";
import { addPlayedGame } from "@/app/lib/mongodb";

export async function POST(req: Request) {
  const body = await req.json();

  try {
    const result = await addPlayedGame(body);
    return NextResponse.json({ success: true, result });
  } catch (error) {
    return NextResponse.json({ success: false, error }, { status: 500 });
  }
}
