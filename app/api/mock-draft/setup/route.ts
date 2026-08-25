import { NextResponse } from "next/server";
import { loadLeagueContext, ownerName } from "@/lib/league";
import { getDraft } from "@/lib/sleeper";
import { slotToUserId } from "@/lib/draft";

export async function GET() {
  const { league, rosters, usersById, myRosterId } = await loadLeagueContext();

  const teams = league.total_rosters;
  const draft = league.draft_id ? await getDraft(league.draft_id) : null;
  const rounds = draft?.settings.rounds ?? 25;
  const draftOrder = draft?.draft_order ?? null;

  const teamNames: string[] = [];
  let mySlot: number | null = null;

  for (let slot = 1; slot <= teams; slot++) {
    const userId = draftOrder ? slotToUserId(draftOrder, slot) : null;
    const roster = userId ? rosters.find((r) => r.owner_id === userId) : rosters[slot - 1];
    teamNames.push(roster ? ownerName(roster, usersById) : `Team ${slot}`);
    if (myRosterId != null && roster?.roster_id === myRosterId) mySlot = slot;
  }

  if (mySlot == null) mySlot = 1; // let the user drive slot 1 if we can't tie them to a real slot

  return NextResponse.json({
    teams,
    rounds,
    rosterPositions: league.roster_positions,
    teamNames,
    mySlot,
    usingRealDraftOrder: draftOrder != null,
  });
}
