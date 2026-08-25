import { getLeague } from "@/lib/sleeper";
import { leagueValueSetKey } from "@/lib/valuation";
import { loadAllAssets } from "@/lib/assets";
import { leagueId } from "@/lib/config";

export default async function RookiePickValues() {
  const league = await getLeague(leagueId());
  const valueSet = leagueValueSetKey(league);
  const picks = loadAllAssets(valueSet).filter((a) => a.isPick);

  const groups = new Map<string, typeof picks>();
  for (const p of picks) {
    const year = p.name.match(/^(\d{4})/)?.[1] ?? "Other";
    if (!groups.has(year)) groups.set(year, []);
    groups.get(year)!.push(p);
  }

  const years = [...groups.keys()].sort();

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {years.map((year) => (
        <div key={year} className="rounded-lg border border-zinc-800 p-3">
          <h4 className="mb-2 text-sm font-medium text-zinc-300">{year} picks</h4>
          <ul className="flex flex-col gap-1 text-xs">
            {groups
              .get(year)!
              .slice(0, 12)
              .map((p) => (
                <li key={p.id} className="flex justify-between">
                  <span className="text-zinc-400">{p.name.replace(/^\d{4}\s*/, "")}</span>
                  <span className="text-zinc-300">{p.value?.toLocaleString()}</span>
                </li>
              ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
