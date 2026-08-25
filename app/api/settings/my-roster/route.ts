import { NextResponse } from "next/server";
import { setSetting } from "@/lib/db";

export async function POST(request: Request) {
  const { rosterId } = (await request.json()) as { rosterId: number };
  setSetting("my_roster_id", String(rosterId));
  return NextResponse.json({ ok: true });
}
