import Link from "next/link";
import { loadLeagueContext } from "@/lib/league";
import WaiverSuggestions from "./WaiverSuggestions";

export default async function RosterPage() {
  const { league, rosters, values, myRosterId } = await loadLeagueContext();

  const myRoster = myRosterId != null ? rosters.find((r) => r.roster_id === myRosterId) : null;

  if (!myRoster) {
    return (
      <div className="flex flex-col gap-3">
        <h1 className="text-xl font-semibold text-white">Roster & Team Management</h1>
        <p className="text-sm text-zinc-500">
          You haven&apos;t marked which team is yours yet.{" "}
          <Link href="/" className="text-indigo-400 hover:underline">
            Pick your team on the Home page
          </Link>
          .
        </p>
      </div>
    );
  }

  const playerIds = myRoster.players ?? [];

  if (playerIds.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <h1 className="text-xl font-semibold text-white">Roster & Team Management</h1>
        <p className="text-sm text-zinc-500">
          Your roster is empty — this league hasn&apos;t held its startup draft yet.{" "}
          <Link href="/draft" className="text-indigo-400 hover:underline">
            Open the Draft Assistant
          </Link>{" "}
          when it&apos;s time.
        </p>
      </div>
    );
  }

  const starterIds = (myRoster.starters ?? []).filter((id) => id && id !== "0");
  const starterSet = new Set(starterIds);
  const benchIds = playerIds.filter((id) => !starterSet.has(id));

  const rows = (ids: string[]) =>
    ids
      .map((id) => values.get(id))
      .filter((p): p is NonNullable<typeof p> => !!p)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

  const positionCounts: Record<string, number> = {};
  for (const id of playerIds) {
    const pos = values.get(id)?.position;
    if (pos) positionCounts[pos] = (positionCounts[pos] ?? 0) + 1;
  }

  const totalValue = playerIds.reduce((s, id) => s + (values.get(id)?.value ?? 0), 0);

  const renderTable = (title: string, ids: string[]) => (
    <div>
      <h3 className="mb-2 text-sm font-medium text-zinc-300">
        {title} <span className="text-zinc-600">({ids.length})</span>
      </h3>
      <div className="overflow-hidden rounded-lg border border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900 text-left text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-3 py-2">Player</th>
              <th className="px-3 py-2">Pos</th>
              <th className="px-3 py-2">Team</th>
              <th className="px-3 py-2">Age</th>
              <th className="px-3 py-2">Value</th>
            </tr>
          </thead>
          <tbody>
            {rows(ids).map((p) => (
              <tr key={p.sleeper_id} className="border-t border-zinc-800/70">
                <td className="px-3 py-1.5 text-zinc-200">
                  {p.full_name}
                  {p.injury_status && (
                    <span className="ml-1.5 text-[10px] text-red-400">{p.injury_status}</span>
                  )}
                </td>
                <td className="px-3 py-1.5 text-zinc-400">{p.position}</td>
                <td className="px-3 py-1.5 text-zinc-500">{p.team ?? "FA"}</td>
                <td className="px-3 py-1.5 text-zinc-500">{p.age ?? "—"}</td>
                <td className="px-3 py-1.5 text-zinc-300">{p.value?.toLocaleString() ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Roster & Team Management</h1>
          <p className="text-sm text-zinc-500">
            {myRoster.settings.wins}-{myRoster.settings.losses}
            {myRoster.settings.ties ? `-${myRoster.settings.ties}` : ""} &middot; total dynasty
            value {totalValue.toLocaleString()}
          </p>
        </div>
        <div className="flex gap-2 text-xs text-zinc-500">
          {["QB", "RB", "WR", "TE"].map((pos) => (
            <span key={pos} className="rounded border border-zinc-800 px-2 py-1">
              {pos}: {positionCounts[pos] ?? 0}
            </span>
          ))}
        </div>
      </div>

      {renderTable("Starters", starterIds)}
      {renderTable("Bench", benchIds)}

      <div>
        <h2 className="mb-2 text-lg font-medium text-white">Waiver Wire</h2>
        <p className="mb-3 text-xs text-zinc-500">
          Sleeper&apos;s trending adds (last 24h) filtered to players not already rostered in{" "}
          {league.name}.
        </p>
        <WaiverSuggestions />
      </div>
    </div>
  );
}
