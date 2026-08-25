import type { PlayerValueRow, TeamSummary } from "./valuation";

export interface Recommendation {
  sleeper_id: string;
  score: number;
  reasons: string[];
}

export type Timeline = "win_now" | "balanced" | "rebuild";
export const TIMELINES: Timeline[] = ["rebuild", "balanced", "win_now"];

const TIMELINE_WEIGHT = 0.3;
const YOUTH_PIVOT_AGE = 27; // roughly the age dynasty value starts pricing in decline

/**
 * How much a player's age should move their score for the chosen team timeline.
 * Centered on 0 (no effect) for `balanced`; positive favors youth for `rebuild`,
 * positive favors proven/older production for `win_now`.
 */
function timelineMultiplier(age: number | null, timeline: Timeline): number {
  if (timeline === "balanced" || age == null) return 1;
  const youthFactor = Math.max(-1, Math.min(1, (YOUTH_PIVOT_AGE - age) / 8));
  const direction = timeline === "rebuild" ? 1 : -1;
  return 1 + TIMELINE_WEIGHT * direction * youthFactor;
}

/** Default timeline suggested by the Home page's Contend/Retool/Rebuild outlook, until overridden. */
export function suggestTimeline(classification: TeamSummary["classification"] | null): Timeline {
  switch (classification) {
    case "Contend":
      return "win_now";
    case "Rebuild":
      return "rebuild";
    case "Retool":
    case "Pre-Draft":
    default:
      return "balanced";
  }
}

const CORE_POSITIONS = ["QB", "RB", "WR", "TE"] as const;
type Position = (typeof CORE_POSITIONS)[number];

/**
 * How many of the league's total draftable slots "belong" to each position, given its
 * roster_positions. QB/SUPER_FLEX count fully for QB (superflex is almost always started
 * by a second QB in a 2QB league); FLEX is split across RB/WR/TE by how often each is
 * actually flex-started in practice.
 */
function positionWeights(rosterPositions: string[]): Record<Position, number> {
  const counts: Record<string, number> = {};
  for (const slot of rosterPositions) counts[slot] = (counts[slot] ?? 0) + 1;

  const flexShare = { RB: 0.45, WR: 0.45, TE: 0.1 };
  const superFlexShare = { QB: 1 }; // superflex slot treated as a QB slot

  const weights: Record<Position, number> = { QB: 0, RB: 0, WR: 0, TE: 0 };
  for (const pos of CORE_POSITIONS) weights[pos] += counts[pos] ?? 0;

  const flexSlots = counts["FLEX"] ?? 0;
  weights.RB += flexSlots * flexShare.RB;
  weights.WR += flexSlots * flexShare.WR;
  weights.TE += flexSlots * flexShare.TE;

  const superFlexSlots = counts["SUPER_FLEX"] ?? 0;
  weights.QB += superFlexSlots * superFlexShare.QB;

  return weights;
}

/** Target roster-build count per position, proportioning the full draft by position weight. */
function targetCounts(rosterPositions: string[], totalRounds: number): Record<Position, number> {
  const weights = positionWeights(rosterPositions);
  const totalWeight = CORE_POSITIONS.reduce((s, p) => s + weights[p], 0);
  const targets = {} as Record<Position, number>;
  for (const pos of CORE_POSITIONS) {
    targets[pos] = totalWeight > 0 ? (totalRounds * weights[pos]) / totalWeight : totalRounds / 4;
  }
  return targets;
}

export function computeRecommendations(
  available: PlayerValueRow[],
  myPlayers: PlayerValueRow[],
  rosterPositions: string[],
  totalRounds: number,
  timeline: Timeline = "balanced",
  topN = Infinity
): Recommendation[] {
  const targets = targetCounts(rosterPositions, totalRounds);

  const myCounts: Record<Position, number> = { QB: 0, RB: 0, WR: 0, TE: 0 };
  for (const p of myPlayers) {
    if (p.position && CORE_POSITIONS.includes(p.position as Position)) {
      myCounts[p.position as Position]++;
    }
  }

  const needFraction: Record<Position, number> = { QB: 0, RB: 0, WR: 0, TE: 0 };
  for (const pos of CORE_POSITIONS) {
    needFraction[pos] = Math.max(0, targets[pos] - myCounts[pos]) / Math.max(1, targets[pos]);
  }

  // Positional value cliff: how much value you lose at this position by waiting 3 more picks.
  const byPosition: Record<Position, PlayerValueRow[]> = { QB: [], RB: [], WR: [], TE: [] };
  for (const p of available) {
    if (p.position && CORE_POSITIONS.includes(p.position as Position) && p.value != null) {
      byPosition[p.position as Position].push(p);
    }
  }
  for (const pos of CORE_POSITIONS) {
    byPosition[pos].sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  }
  const cliffFor = (pos: Position, rankAtPos: number) => {
    const list = byPosition[pos];
    const here = list[rankAtPos]?.value ?? 0;
    const soon = list[Math.min(list.length - 1, rankAtPos + 3)]?.value ?? here;
    return here > 0 ? Math.max(0, (here - soon) / here) : 0;
  };

  const NEED_WEIGHT = 0.6;
  const CLIFF_WEIGHT = 0.5;

  const scored: Recommendation[] = [];
  for (const pos of CORE_POSITIONS) {
    byPosition[pos].forEach((p, idx) => {
      const value = p.value ?? 0;
      const need = needFraction[pos];
      const cliff = cliffFor(pos, idx);
      const ageMult = timelineMultiplier(p.age, timeline);
      const score = value * (1 + NEED_WEIGHT * need) * (1 + CLIFF_WEIGHT * cliff) * ageMult;

      const reasons: string[] = [];
      if (need > 0.4) {
        reasons.push(
          myCounts[pos] === 0
            ? `You have no ${pos}s yet`
            : `Thin at ${pos} for your roster build`
        );
      }
      if (cliff > 0.25) {
        reasons.push(`Value cliff at ${pos} — drops off soon after this`);
      }
      if (timeline !== "balanced" && p.age != null) {
        if (timeline === "rebuild" && ageMult > 1.08) {
          reasons.push(`Fits your rebuild timeline (age ${p.age})`);
        } else if (timeline === "win_now" && ageMult > 1.08) {
          reasons.push(`Proven production for a win-now build (age ${p.age})`);
        }
      }
      if (reasons.length === 0) reasons.push("Best value on the board");

      scored.push({ sleeper_id: p.sleeper_id, score, reasons });
    });
  }

  return scored.sort((a, b) => b.score - a.score).slice(0, topN);
}
