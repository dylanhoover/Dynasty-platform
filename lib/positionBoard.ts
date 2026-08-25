const CORE_POSITIONS = ["QB", "RB", "WR", "TE"] as const;
export type CorePosition = (typeof CORE_POSITIONS)[number];

export interface PositionBoardEntry {
  sleeperId: string;
  rank: number; // draft-order rank within this position only
  fullName: string | null;
  team: string | null;
  age: number | null;
  value: number | null;
}

interface RankablePlayer {
  sleeper_id: string;
  position: string | null;
  full_name: string | null;
  team: string | null;
  age: number | null;
  value: number | null;
}

/**
 * Splits an already-ranked player list (by value, or by a personalized recommendation
 * score — whatever order it arrives in) into one ordered draft list per position, so
 * you can pull straight from "who's next at RB" during a live draft instead of scanning
 * a mixed board.
 */
export function buildPositionBoards<T extends RankablePlayer>(
  rankedPlayers: T[]
): Record<CorePosition, PositionBoardEntry[]> {
  const boards: Record<CorePosition, PositionBoardEntry[]> = { QB: [], RB: [], WR: [], TE: [] };

  for (const p of rankedPlayers) {
    if (!p.position || !CORE_POSITIONS.includes(p.position as CorePosition)) continue;
    const pos = p.position as CorePosition;
    boards[pos].push({
      sleeperId: p.sleeper_id,
      rank: boards[pos].length + 1,
      fullName: p.full_name,
      team: p.team,
      age: p.age,
      value: p.value,
    });
  }

  return boards;
}
