import { NextResponse } from "next/server";
import { cleanupOrphanedBacklogCovers, deleteBacklogCover, getBacklogCoverUrl, saveUploadedBacklogCover } from "@/app/lib/backlogCovers";
import { getBacklogGames } from "@/app/lib/backlogFile";

export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ success: false, error: "The image upload could not be read." }, { status: 400 });
  }

  const system = formData.get("system");
  const name = formData.get("name");
  const upload = formData.get("cover");
  if (typeof system !== "string" || !system.trim() || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ success: false, error: "A game system and name are required for the cover." }, { status: 400 });
  }

  const game = { system: system.trim(), name: name.trim() };
  let games;
  try {
    games = getBacklogGames();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not read the backlog file.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }

  const gameIsInBacklog = games.some((entry) => entry.system === game.system && entry.name === game.name);
  if (!gameIsInBacklog) {
    try {
      deleteBacklogCover(game);
      cleanupOrphanedBacklogCovers(games);
      return NextResponse.json({ success: false, error: "This game is no longer in the backlog, so its cover was removed." }, { status: 404 });
    } catch (error) {
      const message = error instanceof Error ? error.message : "The stale cover could not be removed.";
      return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
  }

  if (typeof upload === "string" || !upload) {
    return NextResponse.json({ success: false, error: "Choose an image to upload." }, { status: 400 });
  }
  if (upload.type !== "image/jpeg" || upload.size > 1024 * 1024 || upload.size === 0) {
    return NextResponse.json({ success: false, error: "The compressed cover must be a JPEG image no larger than 1 MB." }, { status: 400 });
  }

  try {
    const bytes = Buffer.from(await upload.arrayBuffer());
    if (bytes.length < 3 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) {
      return NextResponse.json({ success: false, error: "The uploaded file is not a valid JPEG image." }, { status: 400 });
    }

    saveUploadedBacklogCover(game, bytes, upload.type);
    cleanupOrphanedBacklogCovers(games);
    return NextResponse.json({ success: true, coverUrl: getBacklogCoverUrl(game) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save the cover image.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
