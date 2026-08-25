import { NextResponse } from "next/server";
import { loadLeagueContext } from "@/lib/league";
import { getTrendingPlayers } from "@/lib/sleeper";

export async function GET() {
  const { rosters, values } = await loadLeagueContext();
  const rosteredIds = new Set(rosters.flatMap((r) => r.players ?? []));

  const trending = await getTrendingPlayers("add", 24, 50);
  const suggestions = trending
    .filter((t) => !rosteredIds.has(t.player_id))
    .map((t) => {
      const p = values.get(t.player_id);
      return {
        sleeperId: t.player_id,
        addCount: t.count,
        name: p?.full_name ?? t.player_id,
        position: p?.position ?? null,
        team: p?.team ?? null,
        value: p?.value ?? null,
      };
    })
    .filter((s) => s.position && ["QB", "RB", "WR", "TE"].includes(s.position));

  return NextResponse.json({ suggestions });
}
