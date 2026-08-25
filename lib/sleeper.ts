const BASE = "https://api.sleeper.app/v1";

export interface SleeperLeague {
  league_id: string;
  name: string;
  season: string;
  total_rosters: number;
  status: string;
  draft_id: string | null;
  roster_positions: string[];
  scoring_settings: Record<string, number>;
  previous_league_id: string | null;
}

export interface SleeperRoster {
  roster_id: number;
  owner_id: string | null;
  players: string[] | null;
  starters: string[] | null;
  reserve: string[] | null;
  taxi: string[] | null;
  settings: {
    wins: number;
    losses: number;
    ties: number;
    fpts: number;
    fpts_against: number;
  };
}

export interface SleeperUser {
  user_id: string;
  display_name: string;
  metadata: { team_name?: string } | null;
}

export interface SleeperPlayer {
  player_id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  position: string | null;
  team: string | null;
  age: number | null;
  years_exp: number | null;
  status: string | null;
  injury_status: string | null;
  injury_body_part: string | null;
  news_updated: number | null;
  fantasy_positions: string[] | null;
  active: boolean;
}

export interface SleeperDraft {
  draft_id: string;
  status: "pre_draft" | "drafting" | "paused" | "complete";
  type: string;
  start_time: number | null;
  settings: { rounds: number; teams: number };
  draft_order: Record<string, number> | null;
  season: string;
}

export interface SleeperDraftPick {
  pick_no: number;
  round: number;
  roster_id: number;
  player_id: string;
  picked_by: string;
  draft_slot: number;
}

export interface SleeperDraftPickAsset {
  season: string;
  round: number;
  roster_id: number; // whose original pick it is
  previous_owner_id: number; // who owned it right before this transaction
  owner_id: number; // who owns it after this transaction
}

export interface SleeperTransaction {
  transaction_id: string;
  type: string;
  status: string;
  roster_ids: number[];
  adds: Record<string, number> | null;
  drops: Record<string, number> | null;
  draft_picks: SleeperDraftPickAsset[];
  created: number;
}

export interface NFLState {
  week: number;
  season: string;
  season_type: string;
}

async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Sleeper request failed: ${url} -> ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function getLeague(leagueId: string) {
  return getJSON<SleeperLeague>(`${BASE}/league/${leagueId}`);
}

export function getRosters(leagueId: string) {
  return getJSON<SleeperRoster[]>(`${BASE}/league/${leagueId}/rosters`);
}

export function getUsers(leagueId: string) {
  return getJSON<SleeperUser[]>(`${BASE}/league/${leagueId}/users`);
}

export function getAllPlayers() {
  return getJSON<Record<string, SleeperPlayer>>(`${BASE}/players/nfl`);
}

export function getDraft(draftId: string) {
  return getJSON<SleeperDraft>(`${BASE}/draft/${draftId}`);
}

export function getDraftPicks(draftId: string) {
  return getJSON<SleeperDraftPick[]>(`${BASE}/draft/${draftId}/picks`);
}

export function getLeagueDrafts(leagueId: string) {
  return getJSON<SleeperDraft[]>(`${BASE}/league/${leagueId}/drafts`);
}

export function getTrendingPlayers(type: "add" | "drop", hours = 24, limit = 50) {
  return getJSON<{ player_id: string; count: number }[]>(
    `${BASE}/players/nfl/trending/${type}?lookback_hours=${hours}&limit=${limit}`
  );
}

export function getTransactions(leagueId: string, week: number) {
  return getJSON<SleeperTransaction[]>(`${BASE}/league/${leagueId}/transactions/${week}`);
}

export function getMatchups(leagueId: string, week: number) {
  return getJSON<
    { roster_id: number; points: number; starters: string[]; players: string[] }[]
  >(`${BASE}/league/${leagueId}/matchups/${week}`);
}

export function getNFLState() {
  return getJSON<NFLState>(`${BASE}/state/nfl`);
}

export function playerDisplayName(p: Pick<SleeperPlayer, "full_name" | "first_name" | "last_name">) {
  return p.full_name ?? ([p.first_name, p.last_name].filter(Boolean).join(" ") || "Unknown");
}
