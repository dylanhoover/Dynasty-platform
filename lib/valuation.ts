import { db } from "./db";
import type { SleeperLeague, SleeperRoster } from "./sleeper";
import { leagueValueSettings, valueSetKey } from "./fantasycalc";

export interface PlayerValueRow {
  sleeper_id: string;
  full_name: string | null;
  position: string | null;
  team: string | null;
  age: number | null;
  injury_status: string | null;
  value: number | null;
  overall_rank: number | null;
  position_rank: number | null;
  trend_30day: number | null;
}

/** Resolve which cached FantasyCalc value set applies to this league. */
export function leagueValueSetKey(league: SleeperLeague) {
  return valueSetKey(leagueValueSettings(league));
}

/** Player + dynasty value rows, left-joined so unranked players still show up. */
export function loadPlayerValues(valueSet: string): Map<string, PlayerValueRow> {
  const rows = db
    .prepare(
      `SELECT p.sleeper_id, p.full_name, p.position, p.team, p.age, p.injury_status,
              v.value, v.overall_rank, v.position_rank, v.trend_30day
       FROM players p
       LEFT JOIN dynasty_values v ON v.sleeper_id = p.sleeper_id AND v.value_set = ?`
    )
    .all(valueSet) as PlayerValueRow[];

  return new Map(rows.map((r) => [r.sleeper_id, r]));
}

export function rosterTotalValue(playerIds: string[], values: Map<string, PlayerValueRow>) {
  return playerIds.reduce((sum, id) => sum + (values.get(id)?.value ?? 0), 0);
}

/** Value-weighted average age across a roster's top N assets (core of the team). */
export function coreAverageAge(
  playerIds: string[],
  values: Map<string, PlayerValueRow>,
  topN = 10
) {
  const withValue = playerIds
    .map((id) => values.get(id))
    .filter((v): v is PlayerValueRow => !!v && v.value != null && v.age != null)
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
    .slice(0, topN);

  if (withValue.length === 0) return null;
  const totalValue = withValue.reduce((s, v) => s + (v.value ?? 0), 0);
  if (totalValue === 0) return null;
  const weighted = withValue.reduce((s, v) => s + (v.value ?? 0) * (v.age ?? 0), 0);
  return weighted / totalValue;
}

export interface TeamSummary {
  rosterId: number;
  totalValue: number;
  coreAge: number | null;
  winPct: number;
  classification: "Contend" | "Retool" | "Rebuild" | "Pre-Draft";
}

/** Lean heuristic: rank teams by dynasty value and win%, and by core age, to bucket strategy. */
export function classifyTeams(
  rosters: SleeperRoster[],
  values: Map<string, PlayerValueRow>
): TeamSummary[] {
  const noRostersYet = rosters.every((r) => !r.players || r.players.length === 0);
  if (noRostersYet) {
    return rosters.map((r) => ({
      rosterId: r.roster_id,
      totalValue: 0,
      coreAge: null,
      winPct: 0,
      classification: "Pre-Draft",
    }));
  }

  const raw = rosters.map((r) => {
    const playerIds = r.players ?? [];
    const w = r.settings?.wins ?? 0;
    const l = r.settings?.losses ?? 0;
    const t = r.settings?.ties ?? 0;
    const games = w + l + t;
    return {
      rosterId: r.roster_id,
      totalValue: rosterTotalValue(playerIds, values),
      coreAge: coreAverageAge(playerIds, values),
      winPct: games > 0 ? (w + t * 0.5) / games : 0,
    };
  });

  const sortedByValue = [...raw].sort((a, b) => b.totalValue - a.totalValue);
  const sortedByWinPct = [...raw].sort((a, b) => b.winPct - a.winPct);
  const valueRank = new Map(sortedByValue.map((t, i) => [t.rosterId, i / Math.max(1, raw.length - 1)]));
  const winRank = new Map(sortedByWinPct.map((t, i) => [t.rosterId, i / Math.max(1, raw.length - 1)]));

  return raw.map((t) => {
    const vr = valueRank.get(t.rosterId) ?? 1; // 0 = best, 1 = worst
    const wr = winRank.get(t.rosterId) ?? 1;
    let classification: TeamSummary["classification"];
    if (wr <= 0.4 && vr <= 0.5) classification = "Contend";
    else if (wr >= 0.6 && (vr >= 0.5 || (t.coreAge ?? 0) >= 27)) classification = "Rebuild";
    else classification = "Retool";
    return { ...t, classification };
  });
}
