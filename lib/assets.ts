import { db } from "./db";
import { loadPlayerValues, type PlayerValueRow } from "./valuation";

export interface Asset {
  id: string;
  name: string;
  position: string; // QB, RB, WR, TE, PICK
  team: string | null;
  age: number | null;
  value: number | null;
  trend30day: number | null;
  isPick: boolean;
}

interface PickRow {
  sleeper_id: string;
  fc_name: string;
  value: number;
  trend_30day: number;
}

/** All rankable players plus future draft picks, as a single tradeable-asset list. */
export function loadAllAssets(valueSet: string): Asset[] {
  const players = loadPlayerValues(valueSet);
  const playerAssets: Asset[] = [...players.values()]
    .filter((p): p is PlayerValueRow & { value: number } => p.value != null)
    .map((p) => ({
      id: p.sleeper_id,
      name: p.full_name ?? p.sleeper_id,
      position: p.position ?? "?",
      team: p.team,
      age: p.age,
      value: p.value,
      trend30day: p.trend_30day,
      isPick: false,
    }));

  const pickRows = db
    .prepare(
      "SELECT sleeper_id, fc_name, value, trend_30day FROM dynasty_values WHERE value_set = ? AND is_pick = 1"
    )
    .all(valueSet) as PickRow[];

  const pickAssets: Asset[] = pickRows.map((p) => ({
    id: p.sleeper_id,
    name: p.fc_name,
    position: "PICK",
    team: null,
    age: null,
    value: p.value,
    trend30day: p.trend_30day,
    isPick: true,
  }));

  return [...playerAssets, ...pickAssets].sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
}
