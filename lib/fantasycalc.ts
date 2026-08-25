import type { SleeperLeague } from "./sleeper";

const BASE = "https://api.fantasycalc.com";

export interface FantasyCalcEntry {
  player: {
    id: number;
    name: string;
    sleeperId: string | null;
    position: string; // QB, RB, WR, TE, PICK
    maybeTeam: string | null;
    maybeAge: number | null;
    maybeYoe: number | null;
    maybeTier: number | null;
  };
  value: number;
  overallRank: number;
  positionRank: number;
  trend30Day: number;
  redraftValue: number;
  maybeRosterPercent: number | null;
}

export interface LeagueValueSettings {
  isDynasty: boolean;
  numQbs: number;
  numTeams: number;
  ppr: number;
}

/** Derive the FantasyCalc value-set params from a live Sleeper league object. */
export function leagueValueSettings(league: SleeperLeague): LeagueValueSettings {
  const qbSlots = league.roster_positions.filter(
    (p) => p === "QB" || p === "SUPER_FLEX"
  ).length;
  const recPts = league.scoring_settings?.rec ?? 0;
  const ppr = recPts >= 1 ? 1 : recPts >= 0.5 ? 0.5 : 0;

  return {
    isDynasty: true,
    numQbs: Math.max(1, qbSlots),
    numTeams: league.total_rosters,
    ppr,
  };
}

export function valueSetKey(s: LeagueValueSettings) {
  return `dynasty_qb${s.numQbs}_team${s.numTeams}_ppr${s.ppr}`;
}

export async function fetchValues(settings: LeagueValueSettings): Promise<FantasyCalcEntry[]> {
  const url = `${BASE}/values/current?isDynasty=${settings.isDynasty}&numQbs=${settings.numQbs}&numTeams=${settings.numTeams}&ppr=${settings.ppr}&includeAdp=false`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`FantasyCalc request failed: ${url} -> ${res.status}`);
  }
  return res.json() as Promise<FantasyCalcEntry[]>;
}
