"use client";

import { useEffect, useMemo, useState } from "react";

interface NewsItem {
  title: string;
  link: string;
  source: string;
  pubDate: string | null;
}

interface InjuryPlayer {
  sleeper_id: string;
  full_name: string | null;
  position: string | null;
  team: string | null;
  injury_status: string | null;
  value: number | null;
  owner: string | null;
  isMine: boolean;
}

interface NewsData {
  articles: NewsItem[];
  injuries: InjuryPlayer[];
}

export default function ResearchFeed() {
  const [data, setData] = useState<NewsData | null>(null);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    fetch("/api/news")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData({ articles: [], injuries: [] }));
  }, []);

  const filteredArticles = useMemo(() => {
    if (!data) return [];
    if (!filter) return data.articles;
    const q = filter.toLowerCase();
    return data.articles.filter((a) => a.title.toLowerCase().includes(q));
  }, [data, filter]);

  if (!data) return <p className="text-sm text-zinc-500">Loading research feed…</p>;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="lg:col-span-1">
        <h2 className="mb-2 text-lg font-medium text-white">Injury Report</h2>
        <p className="mb-3 text-xs text-zinc-500">
          Top-value players currently flagged by Sleeper, across the whole player pool.
        </p>
        <div className="rounded-lg border border-zinc-800">
          {data.injuries.length === 0 ? (
            <p className="px-3 py-3 text-xs text-zinc-600">No notable injuries flagged right now.</p>
          ) : (
            <ul className="divide-y divide-zinc-800/70">
              {data.injuries.map((p) => (
                <li key={p.sleeper_id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span className="text-zinc-200">
                    {p.full_name} <span className="text-zinc-500">{p.position}</span>
                    {p.isMine && (
                      <span className="ml-1.5 rounded bg-indigo-500/20 px-1 text-[10px] text-indigo-300">
                        You
                      </span>
                    )}
                    {p.owner && !p.isMine && (
                      <div className="text-[10px] text-zinc-600">{p.owner}</div>
                    )}
                  </span>
                  <span className="text-xs text-red-400">{p.injury_status}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="lg:col-span-2">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-medium text-white">News</h2>
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter headlines…"
            className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-zinc-200 placeholder:text-zinc-600"
          />
        </div>
        <ul className="flex flex-col divide-y divide-zinc-800/70 rounded-lg border border-zinc-800">
          {filteredArticles.length === 0 ? (
            <p className="px-3 py-3 text-xs text-zinc-600">No headlines match.</p>
          ) : (
            filteredArticles.map((a) => (
              <li key={a.link} className="px-3 py-2 text-sm">
                <a
                  href={a.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-200 hover:text-indigo-300 hover:underline"
                >
                  {a.title}
                </a>
                <div className="mt-0.5 text-[10px] text-zinc-600">
                  {a.source}
                  {a.pubDate ? ` · ${new Date(a.pubDate).toLocaleString()}` : ""}
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
