import Link from "next/link";
import { loadLeagueContext, ownerName } from "@/lib/league";
import { classifyTeams } from "@/lib/valuation";
import { getDraft } from "@/lib/sleeper";
import SetMyTeamButton from "./components/SetMyTeamButton";

const classColors: Record<string, string> = {
  Contend: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  Retool: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  Rebuild: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  "Pre-Draft": "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
};

export default async function HomePage() {
  const { league, rosters, usersById, values, myRosterId } = await loadLeagueContext();
  const summaries = classifyTeams(rosters, values);
  const summaryByRoster = new Map(summaries.map((s) => [s.rosterId, s]));
  const isPreDraft = summaries[0]?.classification === "Pre-Draft";
  const draft = league.draft_id ? await getDraft(league.draft_id) : null;

  const rows = rosters
    .map((r) => ({
      roster: r,
      summary: summaryByRoster.get(r.roster_id)!,
    }))
    .sort((a, b) => b.summary.totalValue - a.summary.totalValue);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">{league.name}</h1>
        <p className="mt-1 text-sm text-zinc-400">
          {league.season} season &middot; {league.total_rosters} teams &middot;{" "}
          {league.roster_positions.filter((p) => p === "SUPER_FLEX").length > 0
            ? "Superflex"
            : "1QB"}{" "}
          dynasty
        </p>
      </div>

      {draft && (draft.status === "pre_draft" || draft.status === "drafting" || draft.status === "paused") && (
        <div className="flex items-center justify-between rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-indigo-200">
              {draft.status === "pre_draft"
                ? "Startup draft not started yet"
                : draft.status === "paused"
                  ? "Draft paused"
                  : "Draft is live"}
            </p>
            <p className="text-xs text-indigo-300/70">
              {draft.settings.rounds} rounds
              {draft.start_time
                ? ` · scheduled ${new Date(draft.start_time).toLocaleString()}`
                : ""}
            </p>
          </div>
          <Link
            href="/draft"
            className="rounded-md bg-indigo-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-400"
          >
            Open Draft Assistant
          </Link>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900 text-left text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-2.5">Team</th>
              <th className="px-4 py-2.5">Record</th>
              <th className="px-4 py-2.5">Dynasty Value</th>
              <th className="px-4 py-2.5">Core Age</th>
              <th className="px-4 py-2.5">Outlook</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ roster, summary }) => {
              const isMine = myRosterId === roster.roster_id;
              return (
                <tr
                  key={roster.roster_id}
                  className={`border-t border-zinc-800 ${isMine ? "bg-zinc-900/60" : ""}`}
                >
                  <td className="px-4 py-2.5 font-medium text-zinc-200">
                    {ownerName(roster, usersById)}
                    {isMine && (
                      <span className="ml-2 rounded bg-indigo-500/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-indigo-300">
                        You
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-zinc-400">
                    {roster.settings.wins}-{roster.settings.losses}
                    {roster.settings.ties ? `-${roster.settings.ties}` : ""}
                  </td>
                  <td className="px-4 py-2.5 text-zinc-300">
                    {isPreDraft ? "—" : summary.totalValue.toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 text-zinc-400">
                    {summary.coreAge ? summary.coreAge.toFixed(1) : "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`rounded border px-2 py-0.5 text-xs font-medium ${classColors[summary.classification]}`}
                    >
                      {summary.classification}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {!isMine && <SetMyTeamButton rosterId={roster.roster_id} />}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-zinc-600">
        Dynasty value from FantasyCalc, matched to this league&apos;s format. Outlook is a lean
        heuristic (record + asset value + core age) — a starting signal, not gospel.
      </p>
    </div>
  );
}
