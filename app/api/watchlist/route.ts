import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  const { sleeperId } = (await request.json()) as { sleeperId: string };
  db.prepare(
    "INSERT INTO watchlist (sleeper_id, added_at) VALUES (?, ?) ON CONFLICT(sleeper_id) DO NOTHING"
  ).run(sleeperId, Date.now());
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const { sleeperId } = (await request.json()) as { sleeperId: string };
  db.prepare("DELETE FROM watchlist WHERE sleeper_id = ?").run(sleeperId);
  return NextResponse.json({ ok: true });
}
