"use client";

import { useEffect, useState } from "react";

interface TradeTeam {
  rosterId: number;
  team: string;
  received: string[];
  sent: string[];
}

interface Trade {
  transactionId: string;
  created: number;
  teams: TradeTeam[];
}

export default function TradeActivity() {
  const [trades, setTrades] = useState<Trade[] | null>(null);

  useEffect(() => {
    fetch("/api/trades")
      .then((r) => r.json())
      .then((json) => setTrades(json.trades))
      .catch(() => setTrades([]));
  }, []);

  if (trades === null) {
    return <p className="text-sm text-zinc-500">Loading trade history…</p>;
  }
  if (trades.length === 0) {
    return (
      <p className="text-sm text-zinc-600">
        No completed trades in this league yet — they&apos;ll show up here once your league starts
        making moves.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {trades.map((trade) => (
        <div key={trade.transactionId} className="rounded-lg border border-zinc-800 p-3">
          <p className="mb-2 text-[11px] text-zinc-600">
            {new Date(trade.created).toLocaleString()}
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {trade.teams.map((t) => (
              <div key={t.rosterId}>
                <p className="text-sm font-medium text-zinc-200">{t.team}</p>
                {t.received.length > 0 && (
                  <p className="text-xs text-emerald-400">Received: {t.received.join(", ")}</p>
                )}
                {t.sent.length > 0 && (
                  <p className="text-xs text-red-400">Sent: {t.sent.join(", ")}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
