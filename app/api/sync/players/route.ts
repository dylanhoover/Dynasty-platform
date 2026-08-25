import { NextResponse } from "next/server";
import { ensurePlayersSynced } from "@/lib/sync";

export async function POST(request: Request) {
  const force = new URL(request.url).searchParams.get("force") === "1";
  const result = await ensurePlayersSynced(force);
  return NextResponse.json(result);
}
