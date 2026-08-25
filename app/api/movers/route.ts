import { NextResponse } from "next/server";
import { loadLeagueContext, ownerName } from "@/lib/league";

export async function GET() {
  const { rosters, usersById, values, myRosterId } = await loadLeagueContext();

  const ownerOfPlayer = new Map<string, { rosterId: number; team: string }>();
  for (const r of rosters) {
    for (const id of r.players ?? []) {
      ownerOfPlayer.set(id, { rosterId: r.roster_id, team: ownerName(r, usersById) });
    }
  }

  const owned = [...values.values()].filter(
    (p) => p.value != null && ownerOfPlayer.has(p.sleeper_id)
  );

  const withOwner = owned.map((p) => ({
    ...p,
    owner: ownerOfPlayer.get(p.sleeper_id)!,
  }));

  const sellHigh = withOwner
    .filter((p) => myRosterId != null && p.owner.rosterId === myRosterId && (p.trend_30day ?? 0) > 0)
    .sort((a, b) => (b.trend_30day ?? 0) - (a.trend_30day ?? 0))
    .slice(0, 10);

  const buyLow = withOwner
    .filter(
      (p) =>
        (myRosterId == null || p.owner.rosterId !== myRosterId) &&
        (p.value ?? 0) > 1000 &&
        (p.trend_30day ?? 0) < 0
    )
    .sort((a, b) => (a.trend_30day ?? 0) - (b.trend_30day ?? 0))
    .slice(0, 10);

  const leagueMovers = owned
    .slice()
    .sort((a, b) => Math.abs(b.trend_30day ?? 0) - Math.abs(a.trend_30day ?? 0))
    .slice(0, 15)
    .map((p) => ({ ...p, owner: ownerOfPlayer.get(p.sleeper_id)! }));

  return NextResponse.json({
    hasRosters: owned.length > 0,
    hasMyTeam: myRosterId != null,
    sellHigh,
    buyLow,
    leagueMovers,
  });
}
