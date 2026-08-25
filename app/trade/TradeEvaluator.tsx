"use client";

import { useEffect, useMemo, useState } from "react";

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

type Side = "A" | "B";

export default function TradeEvaluator() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sideA, setSideA] = useState<string[]>([]);
  const [sideB, setSideB] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/players")
      .then((r) => r.json())
      .then((json) => setAssets(json.assets))
      .finally(() => setLoading(false));
  }, []);

  const byId = useMemo(() => new Map(assets.map((a) => [a.id, a])), [assets]);

  const results = useMemo(() => {
    if (!search) return [];
    const q = search.toLowerCase();
    return assets.filter((a) => a.name.toLowerCase().includes(q)).slice(0, 20);
  }, [assets, search]);

  const addTo = (side: Side, id: string) => {
    if (side === "A") setSideA((prev) => (prev.includes(id) ? prev : [...prev, id]));
    else setSideB((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  const removeFrom = (side: Side, id: string) => {
    if (side === "A") setSideA((prev) => prev.filter((x) => x !== id));
    else setSideB((prev) => prev.filter((x) => x !== id));
  };

  const totalA = sideA.reduce((s, id) => s + (byId.get(id)?.value ?? 0), 0);
  const totalB = sideB.reduce((s, id) => s + (byId.get(id)?.value ?? 0), 0);
  const bigger = Math.max(totalA, totalB, 1);
  const diffPct = Math.abs(totalA - totalB) / bigger;

  let verdict = "Even trade";
  if (diffPct > 0.05) {
    verdict = `Favors ${totalA > totalB ? "Side A" : "Side B"} (${(diffPct * 100).toFixed(0)}% gap)`;
  }

  if (loading) return <p className="text-sm text-zinc-500">Loading player pool…</p>;

  return (
    <div className="flex flex-col gap-5">
      <div className="relative">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search a player or pick (e.g. 2027 1st)…"
          className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600"
        />
        {results.length > 0 && (
          <div className="absolute z-10 mt-1 w-full rounded-md border border-zinc-800 bg-zinc-900 shadow-lg">
            {results.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between px-3 py-1.5 text-sm hover:bg-zinc-800"
              >
                <span className="text-zinc-200">
                  {a.name} <span className="text-zinc-500">{a.position}</span>{" "}
                  <span className="text-zinc-600">{a.value?.toLocaleString()}</span>
                </span>
                <span className="flex gap-1">
                  <button
                    onClick={() => addTo("A", a.id)}
                    className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300 hover:bg-indigo-500 hover:text-white"
                  >
                    + A
                  </button>
                  <button
                    onClick={() => addTo("B", a.id)}
                    className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300 hover:bg-indigo-500 hover:text-white"
                  >
                    + B
                  </button>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {(["A", "B"] as Side[]).map((side) => {
          const ids = side === "A" ? sideA : sideB;
          const total = side === "A" ? totalA : totalB;
          return (
            <div key={side} className="rounded-lg border border-zinc-800 p-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-medium text-zinc-300">Side {side}</h3>
                <span className="text-sm text-zinc-200">{total.toLocaleString()}</span>
              </div>
              {ids.length === 0 ? (
                <p className="text-xs text-zinc-600">Add players or picks from the search above.</p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {ids.map((id) => {
                    const a = byId.get(id);
                    if (!a) return null;
                    return (
                      <li key={id} className="flex items-center justify-between text-sm">
                        <span className="text-zinc-200">
                          {a.name} <span className="text-zinc-500">{a.position}</span>
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="text-zinc-500">{a.value?.toLocaleString()}</span>
                          <button
                            onClick={() => removeFrom(side, id)}
                            className="text-zinc-600 hover:text-red-400"
                          >
                            ✕
                          </button>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      {(sideA.length > 0 || sideB.length > 0) && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-center">
          <p className="text-sm font-medium text-zinc-200">{verdict}</p>
          <p className="text-xs text-zinc-500">
            {totalA.toLocaleString()} vs {totalB.toLocaleString()} dynasty value
          </p>
        </div>
      )}
    </div>
  );
}
