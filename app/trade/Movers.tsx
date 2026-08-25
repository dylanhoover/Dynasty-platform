"use client";

import { useEffect, useState } from "react";

interface MoverPlayer {
  sleeper_id: string;
  full_name: string | null;
  position: string | null;
  value: number | null;
  trend_30day: number | null;
  owner: { rosterId: number; team: string };
}

interface MoversData {
  hasRosters: boolean;
  hasMyTeam: boolean;
  sellHigh: MoverPlayer[];
  buyLow: MoverPlayer[];
  leagueMovers: MoverPlayer[];
}

function MoverRow({ p, showOwner }: { p: MoverPlayer; showOwner?: boolean }) {
  return (
    <li className="flex items-center justify-between text-sm">
      <span className="text-zinc-200">
        {p.full_name} <span className="text-zinc-500">{p.position}</span>
        {showOwner && <span className="text-zinc-600"> — {p.owner.team}</span>}
      </span>
      <span className={(p.trend_30day ?? 0) > 0 ? "text-emerald-400" : "text-red-400"}>
        {(p.trend_30day ?? 0) > 0 ? "+" : ""}
        {p.trend_30day}
      </span>
    </li>
  );
}

export default function Movers() {
  const [data, setData] = useState<MoversData | null>(null);

  useEffect(() => {
    fetch("/api/movers")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null));
  }, []);

  if (!data) return <p className="text-sm text-zinc-500">Loading market movers…</p>;

  if (!data.hasRosters) {
    return (
      <p className="text-sm text-zinc-600">
        No rosters have players yet — buy-low/sell-high needs a completed draft first.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div>
        <h3 className="mb-2 text-sm font-medium text-zinc-300">
          Sell-high {!data.hasMyTeam && <span className="text-zinc-600">(pick your team first)</span>}
        </h3>
        <div className="rounded-lg border border-zinc-800 p-3">
          {data.sellHigh.length === 0 ? (
            <p className="text-xs text-zinc-600">No rostered players of yours are trending up right now.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {data.sellHigh.map((p) => (
                <MoverRow key={p.sleeper_id} p={p} />
              ))}
            </ul>
          )}
        </div>
      </div>
      <div>
        <h3 className="mb-2 text-sm font-medium text-zinc-300">Buy-low targets</h3>
        <div className="rounded-lg border border-zinc-800 p-3">
          {data.buyLow.length === 0 ? (
            <p className="text-xs text-zinc-600">No notable dips among leaguemates&apos; rosters right now.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {data.buyLow.map((p) => (
                <MoverRow key={p.sleeper_id} p={p} showOwner />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
