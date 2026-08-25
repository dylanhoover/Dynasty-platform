import { NextResponse } from "next/server";
import { setSetting, deleteSetting } from "@/lib/db";
import { TIMELINES, type Timeline } from "@/lib/recommend";

export async function POST(request: Request) {
  const { timeline } = (await request.json()) as { timeline: Timeline };
  if (!TIMELINES.includes(timeline)) {
    return NextResponse.json({ error: "Invalid timeline" }, { status: 400 });
  }
  setSetting("team_timeline", timeline);
  return NextResponse.json({ ok: true });
}

/** Clear a manual override so the timeline goes back to auto-suggesting from team outlook. */
export async function DELETE() {
  deleteSetting("team_timeline");
  return NextResponse.json({ ok: true });
}
