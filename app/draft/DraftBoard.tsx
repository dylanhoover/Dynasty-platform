"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { buildPositionBoards, type CorePosition } from "@/lib/positionBoard";

interface AvailablePlayer {
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

interface DraftData {
  draft: {
    status: string;
    rounds: number;
    teams: number;
    currentPickNo: number;
    onTheClockTeam: string | null;
    isMyTurn: boolean;
  } | null;
  myUpcoming: number[];
  recentPicks: {
    pickNo: number;
    round: number;
    team: string;
    playerName: string;
    position: string | null;
  }[];
  available: AvailablePlayer[];
  recommendations: { sleeper_id: string; score: number; reasons: string[] }[];
  hasMyTeam: boolean;
  timeline: Timeline;
  timelineSource: "auto" | "manual";
  suggestedTimeline: Timeline;
  teamOutlook: "Contend" | "Retool" | "Rebuild" | "Pre-Draft" | null;
  positionCounts: Record<string, number>;
  topAvailablePositionCounts: Record<string, number>;
  watchlist: string[];
}

const POSITIONS = ["ALL", "QB", "RB", "WR", "TE"] as const;
type Timeline = "win_now" | "balanced" | "rebuild";
const TIMELINE_OPTIONS: { value: Timeline; label: string }[] = [
  { value: "rebuild", label: "Build for future" },
  { value: "balanced", label: "Balanced" },
  { value: "win_now", label: "Win now" },
];

export default function DraftBoard() {
  const [data, setData] = useState<DraftData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [positionFilter, setPositionFilter] = useState<(typeof POSITIONS)[number]>("ALL");
  const [search, setSearch] = useState("");
  const [boardSearch, setBoardSearch] = useState("");
  const [watching, setWatching] = useState<Set<string>>(new Set());
  const [sortMode, setSortMode] = useState<"value" | "plan">("value");
  const defaultedSortMode = useRef(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [localTimeline, setLocalTimeline] = useState<Timeline | null>(null);
  const [alertsEnabled, setAlertsEnabled] = useState(
    () => typeof window !== "undefined" && localStorage.getItem("draftAlertsEnabled") === "1"
  );
  const wasMyTurn = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch("/api/draft", { cache: "no-store" });
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        const json = (await res.json()) as DraftData;
        if (cancelled) return;
        setData(json);
        setWatching(new Set(json.watchlist));
        setError(null);
      } catch {
        if (!cancelled) setError("Couldn't reach the draft API. It'll retry automatically.");
      }
    };

    load();
    const interval = setInterval(load, 8000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [refreshTrigger]);

  useEffect(() => {
    const isMyTurn = data?.draft?.isMyTurn ?? false;
    if (isMyTurn && !wasMyTurn.current && alertsEnabled) {
      try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
        osc.onended = () => ctx.close();
      } catch {
        // audio not available; banner + notification still cover it
      }
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification("You're on the clock!", {
          body: "It's your turn to pick in the draft.",
        });
      }
    }
    wasMyTurn.current = isMyTurn;
  }, [data?.draft?.isMyTurn, alertsEnabled]);

  const toggleAlerts = async () => {
    const next = !alertsEnabled;
    setAlertsEnabled(next);
    localStorage.setItem("draftAlertsEnabled", next ? "1" : "0");
    if (next && typeof Notification !== "undefined" && Notification.permission === "default") {
      await Notification.requestPermission();
    }
  };

  const changeTimeline = async (timeline: Timeline) => {
    setLocalTimeline(timeline);
    await fetch("/api/settings/timeline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timeline }),
    });
    setRefreshTrigger((n) => n + 1);
  };

  const resetTimeline = async () => {
    setLocalTimeline(null);
    await fetch("/api/settings/timeline", { method: "DELETE" });
    setRefreshTrigger((n) => n + 1);
  };

  const toggleWatch = async (sleeperId: string) => {
    const isWatching = watching.has(sleeperId);
    setWatching((prev) => {
      const next = new Set(prev);
      if (isWatching) next.delete(sleeperId);
      else next.add(sleeperId);
      return next;
    });
    await fetch("/api/watchlist", {
      method: isWatching ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sleeperId }),
    });
  };

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.available.filter((p) => {
      if (positionFilter !== "ALL" && p.position !== positionFilter) return false;
      if (search && !(p.full_name ?? "").toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [data, positionFilter, search]);

  const watchlistPlayers = useMemo(() => {
    if (!data) return [];
    return data.available.filter((p) => watching.has(p.sleeper_id));
  }, [data, watching]);

  const recommended = useMemo(() => {
    if (!data) return [];
    const byId = new Map(data.available.map((p) => [p.sleeper_id, p]));
    return data.recommendations
      .map((r) => ({ ...r, player: byId.get(r.sleeper_id) }))
      .filter((r): r is typeof r & { player: AvailablePlayer } => !!r.player);
  }, [data]);

  useEffect(() => {
    if (data && data.hasMyTeam && !defaultedSortMode.current) {
      defaultedSortMode.current = true;
      setSortMode("plan");
    }
  }, [data]);

  const planFiltered = useMemo(() => {
    return recommended.filter((r) => {
      if (positionFilter !== "ALL" && r.player.position !== positionFilter) return false;
      if (search && !(r.player.full_name ?? "").toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [recommended, positionFilter, search]);

  const positionBoards = useMemo(() => {
    if (!data) return null;
    const basis = data.hasMyTeam ? recommended.map((r) => r.player) : data.available;
    return buildPositionBoards(basis);
  }, [data, recommended]);

  if (error && !data) {
    return <p className="text-sm text-red-400">{error}</p>;
  }
  if (!data) {
    return <p className="text-sm text-zinc-500">Loading draft board…</p>;
  }
  if (!data.draft) {
    return <p className="text-sm text-zinc-500">This league has no draft set up yet.</p>;
  }

  const { draft } = data;

  return (
    <div className="flex flex-col gap-5">
      {draft.isMyTurn && (
        <div className="animate-pulse rounded-lg border border-emerald-500/50 bg-emerald-500/15 px-4 py-3 text-center">
          <p className="text-sm font-semibold text-emerald-300">
            You&apos;re on the clock — pick {draft.currentPickNo}!
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-3">
        <div>
          <p className="text-sm font-medium text-zinc-200">
            {draft.status === "pre_draft"
              ? "Draft has not started"
              : draft.status === "complete"
                ? "Draft complete"
                : `Pick ${draft.currentPickNo} of ${draft.teams * draft.rounds}`}
          </p>
          {draft.status !== "pre_draft" && draft.status !== "complete" && (
            <p className="text-xs text-zinc-500">
              On the clock: <span className="text-indigo-300">{draft.onTheClockTeam ?? "?"}</span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {data.myUpcoming.length > 0 && (
            <div className="text-xs text-zinc-400">
              Your next picks:{" "}
              <span className="text-zinc-200">{data.myUpcoming.join(", ")}</span>
            </div>
          )}
          <button
            onClick={toggleAlerts}
            className={`rounded-md border px-2.5 py-1 text-xs font-medium ${
              alertsEnabled
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                : "border-zinc-800 bg-zinc-900 text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {alertsEnabled ? "🔔 Alerts on" : "🔕 Alerts off"}
          </button>
        </div>
      </div>

      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-medium text-zinc-300">Recommended for you</h3>
          {data.hasMyTeam && (
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <span>Team timeline:</span>
                <div className="flex overflow-hidden rounded-md border border-zinc-800">
                  {TIMELINE_OPTIONS.map((opt) => {
                    const active = (localTimeline ?? data.timeline) === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => changeTimeline(opt.value)}
                        className={`px-2.5 py-1 text-xs font-medium ${
                          active
                            ? "bg-indigo-500 text-white"
                            : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              {localTimeline === null && data.timelineSource === "auto" ? (
                <p className="text-[11px] text-zinc-600">
                  Auto-suggested — your team outlook looks like{" "}
                  <span className="text-zinc-400">{data.teamOutlook}</span>
                </p>
              ) : (
                <button
                  onClick={resetTimeline}
                  className="text-[11px] text-zinc-600 hover:text-indigo-400 hover:underline"
                >
                  Reset to auto ({TIMELINE_OPTIONS.find((o) => o.value === data.suggestedTimeline)?.label})
                </button>
              )}
            </div>
          )}
        </div>
        {!data.hasMyTeam ? (
          <p className="text-xs text-zinc-600">
            <Link href="/" className="text-indigo-400 hover:underline">
              Pick your team on the Home page
            </Link>{" "}
            to get picks tailored to your roster, not just raw value.
          </p>
        ) : recommended.length === 0 ? (
          <p className="text-xs text-zinc-600">
            No recommendations right now — the draft may be complete.
          </p>
        ) : (
          <>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {recommended.slice(0, 5).map((r, i) => (
              <div
                key={r.sleeper_id}
                className="flex w-56 shrink-0 flex-col gap-1 rounded-lg border border-indigo-500/30 bg-indigo-500/5 p-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-indigo-300">#{i + 1}</span>
                  <button
                    onClick={() => toggleWatch(r.sleeper_id)}
                    className={`text-xs ${
                      watching.has(r.sleeper_id) ? "text-amber-400" : "text-zinc-600 hover:text-zinc-400"
                    }`}
                  >
                    ★
                  </button>
                </div>
                <p className="text-sm font-medium text-zinc-100">{r.player.full_name}</p>
                <p className="text-xs text-zinc-500">
                  {r.player.position} &middot; {r.player.team ?? "FA"} &middot;{" "}
                  {r.player.value?.toLocaleString()}
                </p>
                <ul className="mt-1 flex flex-col gap-0.5">
                  {r.reasons.map((reason) => (
                    <li key={reason} className="text-[10px] text-zinc-500">
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-zinc-600">
              Full ranked plan for every remaining pick is in the table below — switch to{" "}
              <span className="text-zinc-400">My Draft Plan</span> sort.
            </p>
          </>
        )}
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        {Object.entries(data.topAvailablePositionCounts).map(([pos, count]) => (
          <span
            key={pos}
            className="rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-zinc-400"
          >
            {pos}: <span className="text-zinc-200">{count}</span> in top 100 (
            {data.positionCounts[pos] ?? 0} total left)
          </span>
        ))}
      </div>

      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-medium text-zinc-300">Position Draft Boards</h3>
            <p className="text-xs text-zinc-600">
              {data.hasMyTeam
                ? "Ranked by your personalized draft plan, one list per position — pull straight from these."
                : "Ranked by dynasty value, one list per position — pull straight from these."}
            </p>
          </div>
          <input
            value={boardSearch}
            onChange={(e) => setBoardSearch(e.target.value)}
            placeholder="Filter these lists…"
            className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-zinc-200 placeholder:text-zinc-600"
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(["QB", "RB", "WR", "TE"] as CorePosition[]).map((pos) => {
            const entries = (positionBoards?.[pos] ?? []).filter(
              (e) =>
                !boardSearch || (e.fullName ?? "").toLowerCase().includes(boardSearch.toLowerCase())
            );
            return (
              <div key={pos} className="rounded-lg border border-zinc-800">
                <div className="border-b border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  {pos} <span className="text-zinc-600">({entries.length})</span>
                </div>
                <ul className="max-h-80 overflow-y-auto divide-y divide-zinc-800/70">
                  {entries.length === 0 ? (
                    <li className="px-3 py-3 text-xs text-zinc-600">No matches.</li>
                  ) : (
                    entries.slice(0, 60).map((e) => (
                      <li
                        key={e.sleeperId}
                        className="flex items-center justify-between px-3 py-1.5 text-xs"
                      >
                        <span className="text-zinc-200">
                          <span className="text-zinc-600">{e.rank}.</span> {e.fullName}{" "}
                          <span className="text-zinc-600">{e.team ?? "FA"}</span>
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="text-zinc-500">{e.value?.toLocaleString()}</span>
                          <button
                            onClick={() => toggleWatch(e.sleeperId)}
                            className={`text-xs ${
                              watching.has(e.sleeperId)
                                ? "text-amber-400"
                                : "text-zinc-700 hover:text-zinc-400"
                            }`}
                          >
                            ★
                          </button>
                        </span>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex overflow-hidden rounded-md border border-zinc-800">
              <button
                onClick={() => setSortMode("value")}
                className={`px-3 py-1 text-xs font-medium ${
                  sortMode === "value"
                    ? "bg-zinc-700 text-white"
                    : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
                }`}
              >
                Best Available
              </button>
              <button
                onClick={() => setSortMode("plan")}
                disabled={!data.hasMyTeam}
                title={data.hasMyTeam ? undefined : "Pick your team on the Home page first"}
                className={`px-3 py-1 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40 ${
                  sortMode === "plan"
                    ? "bg-indigo-500 text-white"
                    : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
                }`}
              >
                My Draft Plan
              </button>
            </div>
          </div>
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

          <div className="max-h-[70vh] overflow-y-auto rounded-lg border border-zinc-800">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-zinc-900 text-left text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Player</th>
                  <th className="px-3 py-2">Pos</th>
                  <th className="px-3 py-2">Team</th>
                  <th className="px-3 py-2">Age</th>
                  <th className="px-3 py-2">Value</th>
                  <th className="px-3 py-2">{sortMode === "plan" ? "Why" : "30d"}</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {sortMode === "plan"
                  ? planFiltered.slice(0, 150).map((r, i) => (
                      <tr
                        key={r.sleeper_id}
                        className="border-t border-zinc-800/70 hover:bg-zinc-900/50"
                      >
                        <td className="px-3 py-1.5 text-zinc-500">{i + 1}</td>
                        <td className="px-3 py-1.5 text-zinc-200">
                          {r.player.full_name}
                          {r.player.injury_status && (
                            <span className="ml-1.5 text-[10px] text-red-400">
                              {r.player.injury_status}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-zinc-400">{r.player.position}</td>
                        <td className="px-3 py-1.5 text-zinc-500">{r.player.team ?? "FA"}</td>
                        <td className="px-3 py-1.5 text-zinc-500">{r.player.age ?? "—"}</td>
                        <td className="px-3 py-1.5 text-zinc-200">
                          {r.player.value?.toLocaleString()}
                        </td>
                        <td className="px-3 py-1.5 text-[11px] text-zinc-500">
                          {r.reasons.join(" · ")}
                        </td>
                        <td className="px-3 py-1.5 text-right">
                          <button
                            onClick={() => toggleWatch(r.sleeper_id)}
                            className={`text-xs ${
                              watching.has(r.sleeper_id)
                                ? "text-amber-400"
                                : "text-zinc-600 hover:text-zinc-400"
                            }`}
                          >
                            ★
                          </button>
                        </td>
                      </tr>
                    ))
                  : filtered.slice(0, 150).map((p) => (
                      <tr key={p.sleeper_id} className="border-t border-zinc-800/70 hover:bg-zinc-900/50">
                        <td className="px-3 py-1.5 text-zinc-500">{p.overall_rank ?? "—"}</td>
                        <td className="px-3 py-1.5 text-zinc-200">
                          {p.full_name}
                          {p.injury_status && (
                            <span className="ml-1.5 text-[10px] text-red-400">{p.injury_status}</span>
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-zinc-400">{p.position}</td>
                        <td className="px-3 py-1.5 text-zinc-500">{p.team ?? "FA"}</td>
                        <td className="px-3 py-1.5 text-zinc-500">{p.age ?? "—"}</td>
                        <td className="px-3 py-1.5 text-zinc-200">{p.value?.toLocaleString()}</td>
                        <td
                          className={`px-3 py-1.5 ${
                            (p.trend_30day ?? 0) > 0
                              ? "text-emerald-400"
                              : (p.trend_30day ?? 0) < 0
                                ? "text-red-400"
                                : "text-zinc-600"
                          }`}
                        >
                          {p.trend_30day ? (p.trend_30day > 0 ? "+" : "") + p.trend_30day : "—"}
                        </td>
                        <td className="px-3 py-1.5 text-right">
                          <button
                            onClick={() => toggleWatch(p.sleeper_id)}
                            className={`text-xs ${
                              watching.has(p.sleeper_id) ? "text-amber-400" : "text-zinc-600 hover:text-zinc-400"
                            }`}
                          >
                            ★
                          </button>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <h3 className="mb-2 text-sm font-medium text-zinc-300">Watchlist</h3>
            <div className="rounded-lg border border-zinc-800">
              {watchlistPlayers.length === 0 ? (
                <p className="px-3 py-3 text-xs text-zinc-600">
                  Star players from the list to queue them here.
                </p>
              ) : (
                <ul className="divide-y divide-zinc-800/70">
                  {watchlistPlayers
                    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
                    .map((p) => (
                      <li key={p.sleeper_id} className="flex items-center justify-between px-3 py-1.5 text-xs">
                        <span className="text-zinc-200">
                          {p.full_name} <span className="text-zinc-500">{p.position}</span>
                        </span>
                        <button
                          onClick={() => toggleWatch(p.sleeper_id)}
                          className="text-zinc-600 hover:text-red-400"
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                </ul>
              )}
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-medium text-zinc-300">Recent picks</h3>
            <div className="rounded-lg border border-zinc-800">
              {data.recentPicks.length === 0 ? (
                <p className="px-3 py-3 text-xs text-zinc-600">No picks made yet.</p>
              ) : (
                <ul className="divide-y divide-zinc-800/70">
                  {data.recentPicks.map((pk) => (
                    <li key={pk.pickNo} className="px-3 py-1.5 text-xs">
                      <span className="text-zinc-500">#{pk.pickNo}</span>{" "}
                      <span className="text-zinc-200">{pk.playerName}</span>{" "}
                      <span className="text-zinc-500">({pk.position})</span>
                      <div className="text-zinc-600">{pk.team}</div>
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
