import { NextResponse } from "next/server";
import { loadLeagueContext, ownerName } from "@/lib/league";
import { getTransactions, type SleeperTransaction } from "@/lib/sleeper";

// Sleeper buckets transactions by "leg" (0 = preseason/offseason, 1-18ish = regular season weeks).
const WEEKS_TO_SCAN = Array.from({ length: 19 }, (_, i) => i);

export async function GET() {
  const { league, rosters, usersById, values } = await loadLeagueContext();

  const results = await Promise.allSettled(
    WEEKS_TO_SCAN.map((week) => getTransactions(league.league_id, week))
  );

  const all: SleeperTransaction[] = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  const trades = all
    .filter((t) => t.type === "trade" && t.status === "complete")
    .sort((a, b) => b.created - a.created)
    .slice(0, 25);

  const rosterById = new Map(rosters.map((r) => [r.roster_id, r]));
  const teamName = (rosterId: number) => {
    const roster = rosterById.get(rosterId);
    return roster ? ownerName(roster, usersById) : `Roster ${rosterId}`;
  };
  const playerName = (playerId: string) => values.get(playerId)?.full_name ?? playerId;

  const formatted = trades.map((t) => {
    const teams = t.roster_ids.map((rosterId) => {
      const received: string[] = [];
      const sent: string[] = [];

      for (const [playerId, toRosterId] of Object.entries(t.adds ?? {})) {
        if (toRosterId === rosterId) received.push(playerName(playerId));
      }
      for (const [playerId, fromRosterId] of Object.entries(t.drops ?? {})) {
        if (fromRosterId === rosterId) sent.push(playerName(playerId));
      }
      for (const pick of t.draft_picks ?? []) {
        const label = `${pick.season} Round ${pick.round} pick`;
        if (pick.owner_id === rosterId) received.push(label);
        if (pick.previous_owner_id === rosterId && pick.previous_owner_id !== pick.owner_id) {
          sent.push(label);
        }
      }

      return { rosterId, team: teamName(rosterId), received, sent };
    });

    return {
      transactionId: t.transaction_id,
      created: t.created,
      teams,
    };
  });

  return NextResponse.json({ trades: formatted });
}
