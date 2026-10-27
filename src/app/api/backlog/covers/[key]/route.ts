import { NextResponse } from "next/server";
import { readBacklogCover } from "@/app/lib/backlogCovers";

export async function GET(_request: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const cover = readBacklogCover(key);
  if (!cover) return new NextResponse(null, { status: 404 });

  return new NextResponse(new Uint8Array(cover.bytes), {
    headers: {
      "Content-Type": cover.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
