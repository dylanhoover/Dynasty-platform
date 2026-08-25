"use client";

import { useEffect, useState } from "react";

interface Suggestion {
  sleeperId: string;
  addCount: number;
  name: string;
  position: string | null;
  team: string | null;
  value: number | null;
}

export default function WaiverSuggestions() {
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);

  useEffect(() => {
    fetch("/api/waivers")
      .then((r) => r.json())
      .then((json) => setSuggestions(json.suggestions))
      .catch(() => setSuggestions([]));
  }, []);

  if (suggestions === null) {
    return <p className="text-sm text-zinc-500">Loading waiver trends…</p>;
  }
  if (suggestions.length === 0) {
    return <p className="text-sm text-zinc-600">No trending adds outside your league&apos;s rosters right now.</p>;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-800">
      <table className="w-full text-sm">
        <thead className="bg-zinc-900 text-left text-xs uppercase tracking-wide text-zinc-500">
          <tr>
            <th className="px-3 py-2">Player</th>
            <th className="px-3 py-2">Pos</th>
            <th className="px-3 py-2">Team</th>
            <th className="px-3 py-2">Dynasty Value</th>
            <th className="px-3 py-2">Adds (24h)</th>
          </tr>
        </thead>
        <tbody>
          {suggestions.slice(0, 20).map((s) => (
            <tr key={s.sleeperId} className="border-t border-zinc-800/70">
              <td className="px-3 py-1.5 text-zinc-200">{s.name}</td>
              <td className="px-3 py-1.5 text-zinc-400">{s.position}</td>
              <td className="px-3 py-1.5 text-zinc-500">{s.team ?? "FA"}</td>
              <td className="px-3 py-1.5 text-zinc-300">{s.value?.toLocaleString() ?? "—"}</td>
              <td className="px-3 py-1.5 text-emerald-400">{s.addCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
