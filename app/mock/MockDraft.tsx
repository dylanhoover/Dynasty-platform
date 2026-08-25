"use client";

import { useEffect, useMemo, useState } from "react";
import { computeRecommendations, type Timeline } from "@/lib/recommend";
import { pickSlot } from "@/lib/draft";
import type { PlayerValueRow } from "@/lib/valuation";

interface Asset {
  id: string;
  name: string;
  position: string;
  team: string | null;
  age: number | null;
  value: number | null;
  trend30day: number | null;
  isPick: boolean;
}

interface Setup {
  teams: number;
  rounds: number;
  rosterPositions: string[];
  teamNames: string[];
  mySlot: number;
  usingRealDraftOrder: boolean;
}

interface LogEntry {
  pickNo: number;
  slot: number;
  team: string;
  asset: Asset;
}

interface SimState {
  pool: Asset[];
  rosterAssets: Record<number, Asset[]>;
  pickNo: number;
  log: LogEntry[];
}

const POSITIONS = ["ALL", "QB", "RB", "WR", "TE"] as const;
const TIMELINE_OPTIONS: { value: Timeline; label: string }[] = [
  { value: "rebuild", label: "Build for future" },
  { value: "balanced", label: "Balanced" },
  { value: "win_now", label: "Win now" },
];

function toRow(a: Asset): PlayerValueRow {
  return {
    sleeper_id: a.id,
    full_name: a.name,
    position: a.position,
    team: a.team,
    age: a.age,
    injury_status: null,
    value: a.value,
    overall_rank: null,
    position_rank: null,
    trend_30day: a.trend30day,
  };
}

/** Weighted-random pick among the top few candidates so AI opponents aren't perfectly deterministic. */
function weightedIndex(count: number): number {
  const weights = [0.55, 0.25, 0.12, 0.05, 0.03].slice(0, count);
  const total = weights.reduce((s, w) => s + w, 0);
  let r = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return i;
  }
  return weights.length - 1;
}

function simulateAiPicks(
  startPickNo: number,
  pool: Asset[],
  rosterAssets: Record<number, Asset[]>,
  setup: Setup
): SimState {
  let pickNo = startPickNo;
  const remaining = [...pool];
  const rosters: Record<number, Asset[]> = { ...rosterAssets };
  const log: LogEntry[] = [];
  const total = setup.teams * setup.rounds;

  while (pickNo <= total) {
    const slot = pickSlot(pickNo, setup.teams);
    if (slot === setup.mySlot) break;
    if (remaining.length === 0) break;

    const aiRoster = rosters[slot] ?? [];
    const recs = computeRecommendations(
      remaining.map(toRow),
      aiRoster.map(toRow),
      setup.rosterPositions,
      setup.rounds,
      "balanced",
      5
    );
    const chosenId = recs[weightedIndex(recs.length)]?.sleeper_id ?? remaining[0].id;
    const assetIdx = remaining.findIndex((a) => a.id === chosenId);
    const asset = remaining[assetIdx];
    remaining.splice(assetIdx, 1);
    rosters[slot] = [...aiRoster, asset];
    log.push({ pickNo, slot, team: setup.teamNames[slot - 1] ?? `Team ${slot}`, asset });
    pickNo++;
  }

  return { pool: remaining, rosterAssets: rosters, pickNo, log };
}

export default function MockDraft() {
  const [setup, setSetup] = useState<Setup | null>(null);
  const [initialPool, setInitialPool] = useState<Asset[] | null>(null);
  const [sim, setSim] = useState<SimState | null>(null);
  const [started, setStarted] = useState(false);
  const [timeline, setTimeline] = useState<Timeline>("balanced");
  const [positionFilter, setPositionFilter] = useState<(typeof POSITIONS)[number]>("ALL");
  const [search, setSearch] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/mock-draft/setup").then((r) => r.json()),
      fetch("/api/players").then((r) => r.json()),
    ]).then(([setupJson, playersJson]) => {
      setSetup(setupJson);
      const pool = (playersJson.assets as Asset[])
        .filter((a) => !a.isPick)
        .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
      setInitialPool(pool);
    });
  }, []);

  const start = () => {
    if (!setup || !initialPool) return;
    const resolved = simulateAiPicks(1, initialPool, {}, setup);
    setSim(resolved);
    setStarted(true);
  };

  const reset = () => {
    setSim(null);
    setStarted(false);
    setSearch("");
    setPositionFilter("ALL");
  };

  const draftPlayer = (asset: Asset) => {
    if (!setup || !sim) return;
    const myRoster = sim.rosterAssets[setup.mySlot] ?? [];
    const afterMine: SimState = {
      pool: sim.pool.filter((a) => a.id !== asset.id),
      rosterAssets: { ...sim.rosterAssets, [setup.mySlot]: [...myRoster, asset] },
      pickNo: sim.pickNo + 1,
      log: [...sim.log, { pickNo: sim.pickNo, slot: setup.mySlot, team: "You", asset }],
    };
    const resolved = simulateAiPicks(afterMine.pickNo, afterMine.pool, afterMine.rosterAssets, setup);
    setSim({
      pool: resolved.pool,
      rosterAssets: resolved.rosterAssets,
      pickNo: resolved.pickNo,
      log: [...afterMine.log, ...resolved.log],
    });
  };

  const myAssets = useMemo(
    () => (setup && sim?.rosterAssets[setup.mySlot]) ?? [],
    [setup, sim]
  );

  const recommendations = useMemo(() => {
    if (!setup || !sim) return [];
    return computeRecommendations(
      sim.pool.map(toRow),
      myAssets.map(toRow),
      setup.rosterPositions,
      setup.rounds,
      timeline
    );
  }, [setup, sim, myAssets, timeline]);

  const recommendedAssets = useMemo(() => {
    if (!sim) return [];
    const byId = new Map(sim.pool.map((a) => [a.id, a]));
    return recommendations
      .map((r) => ({ ...r, asset: byId.get(r.sleeper_id) }))
      .filter((r): r is typeof r & { asset: Asset } => !!r.asset);
  }, [recommendations, sim]);

  const filtered = useMemo(() => {
    return recommendedAssets.filter((r) => {
      if (positionFilter !== "ALL" && r.asset.position !== positionFilter) return false;
      if (search && !r.asset.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [recommendedAssets, positionFilter, search]);

  const myPositionCounts: Record<string, number> = {};
  for (const a of myAssets) myPositionCounts[a.position] = (myPositionCounts[a.position] ?? 0) + 1;

  const total = setup ? setup.teams * setup.rounds : 0;
  const complete = sim ? sim.pickNo > total : false;
  const isMyTurn = setup && sim ? pickSlot(sim.pickNo, setup.teams) === setup.mySlot : false;

  const myUpcoming: number[] = [];
  if (setup && sim) {
    for (let p = sim.pickNo; p <= total && myUpcoming.length < 5; p++) {
      if (pickSlot(p, setup.teams) === setup.mySlot) myUpcoming.push(p);
    }
  }

  if (!setup || !initialPool) {
    return <p className="text-sm text-zinc-500">Loading player pool…</p>;
  }

  if (!started) {
    return (
      <div className="rounded-lg border border-zinc-800 p-5">
        <p className="mb-3 text-sm text-zinc-400">
          Simulates a full {setup.teams}-team, {setup.rounds}-round startup draft against the real
          player pool. AI opponents draft using the same value + need + scarcity logic as your real
          Draft Assistant, with a little randomness so it&apos;s not the same result every time.{" "}
          {setup.usingRealDraftOrder
            ? "It uses your league's actual draft order, so pick numbers match your real draft."
            : "Your league's draft order wasn't available, so a default order is used."}
        </p>
        <button
          onClick={start}
          className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400"
        >
          Start Mock Draft
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-3">
        <div>
          <p className="text-sm font-medium text-zinc-200">
            {complete
              ? "Mock draft complete"
              : `Pick ${sim!.pickNo} of ${total} — Round ${Math.ceil(sim!.pickNo / setup.teams)}`}
          </p>
          {!complete && myUpcoming.length > 0 && (
            <p className="text-xs text-zinc-500">
              Your next picks: <span className="text-zinc-300">{myUpcoming.join(", ")}</span>
            </p>
          )}
        </div>
        <button
          onClick={reset}
          className="rounded-md border border-zinc-800 px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200"
        >
          Reset
        </button>
      </div>

      {isMyTurn && !complete && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-emerald-300">You&apos;re on the clock</p>
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <span>Timeline:</span>
            <div className="flex overflow-hidden rounded-md border border-zinc-800">
              {TIMELINE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setTimeline(opt.value)}
                  className={`px-2.5 py-1 text-xs font-medium ${
                    timeline === opt.value
                      ? "bg-indigo-500 text-white"
                      : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 flex flex-col gap-3">
          {!complete && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                {POSITIONS.map((pos) => (
                  <button
                    key={pos}
                    onClick={() => setPositionFilter(pos)}
                    className={`rounded-md px-3 py-1 text-xs font-medium ${
                      positionFilter === pos
                        ? "bg-indigo-500 text-white"
                        : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
                    }`}
                  >
                    {pos}
                  </button>
                ))}
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search player…"
                  className="ml-auto rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-zinc-200 placeholder:text-zinc-600"
                />
              </div>

              <div className="max-h-[65vh] overflow-y-auto rounded-lg border border-zinc-800">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-zinc-900 text-left text-xs uppercase tracking-wide text-zinc-500">
                    <tr>
                      <th className="px-3 py-2">#</th>
                      <th className="px-3 py-2">Player</th>
                      <th className="px-3 py-2">Pos</th>
                      <th className="px-3 py-2">Team</th>
                      <th className="px-3 py-2">Age</th>
                      <th className="px-3 py-2">Value</th>
                      <th className="px-3 py-2">Why</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.slice(0, 150).map((r, i) => (
                      <tr key={r.sleeper_id} className="border-t border-zinc-800/70 hover:bg-zinc-900/50">
                        <td className="px-3 py-1.5 text-zinc-500">{i + 1}</td>
                        <td className="px-3 py-1.5 text-zinc-200">{r.asset.name}</td>
                        <td className="px-3 py-1.5 text-zinc-400">{r.asset.position}</td>
                        <td className="px-3 py-1.5 text-zinc-500">{r.asset.team ?? "FA"}</td>
                        <td className="px-3 py-1.5 text-zinc-500">{r.asset.age ?? "—"}</td>
                        <td className="px-3 py-1.5 text-zinc-200">{r.asset.value?.toLocaleString()}</td>
                        <td className="px-3 py-1.5 text-[11px] text-zinc-500">{r.reasons.join(" · ")}</td>
                        <td className="px-3 py-1.5 text-right">
                          <button
                            onClick={() => draftPlayer(r.asset)}
                            disabled={!isMyTurn}
                            className="rounded bg-indigo-500/20 px-2 py-0.5 text-xs font-medium text-indigo-300 hover:bg-indigo-500 hover:text-white disabled:opacity-30"
                          >
                            Draft
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {complete && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
              <p className="mb-2 text-sm font-medium text-emerald-300">
                Your mock roster ({myAssets.length} picks)
              </p>
              <div className="mb-3 flex gap-2 text-xs text-zinc-400">
                {["QB", "RB", "WR", "TE"].map((pos) => (
                  <span key={pos} className="rounded border border-zinc-800 px-2 py-1">
                    {pos}: {myPositionCounts[pos] ?? 0}
                  </span>
                ))}
              </div>
              <p className="text-xs text-zinc-500">
                Total roster value:{" "}
                <span className="text-zinc-200">
                  {myAssets.reduce((s, a) => s + (a.value ?? 0), 0).toLocaleString()}
                </span>
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <h3 className="mb-2 text-sm font-medium text-zinc-300">
              Your roster ({myAssets.length})
            </h3>
            <div className="rounded-lg border border-zinc-800">
              {myAssets.length === 0 ? (
                <p className="px-3 py-3 text-xs text-zinc-600">No picks yet.</p>
              ) : (
                <ul className="divide-y divide-zinc-800/70">
                  {[...myAssets]
                    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
                    .map((a) => (
                      <li key={a.id} className="flex items-center justify-between px-3 py-1.5 text-xs">
                        <span className="text-zinc-200">
                          {a.name} <span className="text-zinc-500">{a.position}</span>
                        </span>
                        <span className="text-zinc-500">{a.value?.toLocaleString()}</span>
                      </li>
                    ))}
                </ul>
              )}
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-medium text-zinc-300">Draft log</h3>
            <div className="max-h-80 overflow-y-auto rounded-lg border border-zinc-800">
              {sim!.log.length === 0 ? (
                <p className="px-3 py-3 text-xs text-zinc-600">No picks made yet.</p>
              ) : (
                <ul className="divide-y divide-zinc-800/70">
                  {[...sim!.log].reverse().map((entry) => (
                    <li key={entry.pickNo} className="px-3 py-1.5 text-xs">
                      <span className="text-zinc-500">#{entry.pickNo}</span>{" "}
                      <span className="text-zinc-200">{entry.asset.name}</span>{" "}
                      <span className="text-zinc-500">({entry.asset.position})</span>
                      <div className="text-zinc-600">{entry.team}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
