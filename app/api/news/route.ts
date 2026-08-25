import { NextResponse } from "next/server";
import { fetchNews } from "@/lib/news";
import { loadLeagueContext, ownerName } from "@/lib/league";

export async function GET() {
  const [articles, { values, rosters, usersById, myRosterId }] = await Promise.all([
    fetchNews(),
    loadLeagueContext(),
  ]);

  const ownerOfPlayer = new Map<string, string>();
  for (const r of rosters) {
    for (const id of r.players ?? []) ownerOfPlayer.set(id, ownerName(r, usersById));
  }

  const injuries = [...values.values()]
    .filter((p) => p.injury_status && p.value != null)
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
    .slice(0, 25)
    .map((p) => ({
      ...p,
      owner: ownerOfPlayer.get(p.sleeper_id) ?? null,
      isMine: myRosterId != null && rosters.some(
        (r) => r.roster_id === myRosterId && (r.players ?? []).includes(p.sleeper_id)
      ),
    }));

  return NextResponse.json({ articles, injuries });
}
