import { NextResponse } from "next/server";
import { loadLeagueContext, ownerName } from "@/lib/league";
import { getDraft, getDraftPicks } from "@/lib/sleeper";
import { pickSlot, slotToUserId, upcomingPicksForUser } from "@/lib/draft";
import { computeRecommendations, suggestTimeline, TIMELINES, type Timeline } from "@/lib/recommend";
import { classifyTeams } from "@/lib/valuation";
import { db, getSetting } from "@/lib/db";

export async function GET() {
  const { league, rosters, usersById, values, myRosterId } = await loadLeagueContext();

  if (!league.draft_id) {
    return NextResponse.json({ draft: null });
  }

  const draft = await getDraft(league.draft_id);
  const picks = draft.status === "pre_draft" ? [] : await getDraftPicks(league.draft_id);
  const draftedIds = new Set(picks.map((p) => p.player_id));

  const available = [...values.values()]
    .filter(
      (v) =>
        v.value != null &&
        !draftedIds.has(v.sleeper_id) &&
        v.position &&
        ["QB", "RB", "WR", "TE"].includes(v.position)
    )
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

  const positionCounts: Record<string, number> = {};
  for (const p of available) {
    if (!p.position) continue;
    positionCounts[p.position] = (positionCounts[p.position] ?? 0) + 1;
  }
  const topAvailablePositionCounts: Record<string, number> = {};
  for (const p of available.slice(0, 100)) {
    if (!p.position) continue;
    topAvailablePositionCounts[p.position] = (topAvailablePositionCounts[p.position] ?? 0) + 1;
  }

  const recentPicks = picks
    .slice(-15)
    .reverse()
    .map((p) => {
      const roster = rosters.find((r) => r.roster_id === p.roster_id);
      const playerRow = values.get(p.player_id);
      return {
        pickNo: p.pick_no,
        round: p.round,
        team: roster ? ownerName(roster, usersById) : `Roster ${p.roster_id}`,
        playerName: playerRow?.full_name ?? p.player_id,
        position: playerRow?.position ?? null,
      };
    });

  let myUpcoming: number[] = [];
  let onTheClockTeam: string | null = null;
  let isMyTurn = false;
  const currentPickNo = picks.length + 1;

  if (draft.draft_order && draft.status !== "complete") {
    const teams = draft.settings.teams;
    const rounds = draft.settings.rounds;
    const slot = pickSlot(currentPickNo, teams);
    const onClockUserId = slotToUserId(draft.draft_order, slot);
    const onClockRoster = rosters.find((r) => r.owner_id === onClockUserId);
    onTheClockTeam = onClockRoster
      ? ownerName(onClockRoster, usersById)
      : (onClockUserId ? usersById.get(onClockUserId)?.display_name ?? null : null);
    isMyTurn =
      draft.status === "drafting" && myRosterId != null && onClockRoster?.roster_id === myRosterId;

    if (myRosterId != null) {
      const myRoster = rosters.find((r) => r.roster_id === myRosterId);
      if (myRoster?.owner_id) {
        myUpcoming = upcomingPicksForUser(
          draft.draft_order,
          teams,
          rounds,
          myRoster.owner_id,
          picks.length
        ).slice(0, 5);
      }
    }
  }

  const watchlist = db.prepare("SELECT sleeper_id FROM watchlist").all() as { sleeper_id: string }[];

  const teamSummaries = classifyTeams(rosters, values);
  const myClassification =
    myRosterId != null
      ? (teamSummaries.find((s) => s.rosterId === myRosterId)?.classification ?? null)
      : null;
  const suggestedTimeline = suggestTimeline(myClassification);

  const storedTimeline = getSetting("team_timeline");
  const timelineSource: "auto" | "manual" = TIMELINES.includes(storedTimeline as Timeline)
    ? "manual"
    : "auto";
  const timeline: Timeline =
    timelineSource === "manual" ? (storedTimeline as Timeline) : suggestedTimeline;

  let recommendations: ReturnType<typeof computeRecommendations> = [];
  if (myRosterId != null && draft.status !== "complete") {
    const myPickedIds = picks
      .filter((p) => p.roster_id === myRosterId)
      .map((p) => p.player_id);
    const myPlayers = myPickedIds
      .map((id) => values.get(id))
      .filter((p): p is NonNullable<typeof p> => !!p);
    recommendations = computeRecommendations(
      available,
      myPlayers,
      league.roster_positions,
      draft.settings.rounds,
      timeline
    );
  }

  return NextResponse.json({
    draft: {
      status: draft.status,
      rounds: draft.settings.rounds,
      teams: draft.settings.teams,
      currentPickNo,
      onTheClockTeam,
      isMyTurn,
    },
    myUpcoming,
    recentPicks,
    available: available.slice(0, 400),
    recommendations,
    hasMyTeam: myRosterId != null,
    timeline,
    timelineSource,
    suggestedTimeline,
    teamOutlook: myClassification,
    positionCounts,
    topAvailablePositionCounts,
    watchlist: watchlist.map((w) => w.sleeper_id),
  });
}
