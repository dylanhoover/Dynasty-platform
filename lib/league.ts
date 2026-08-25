import { getLeague, getRosters, getUsers } from "./sleeper";
import { leagueValueSettings, valueSetKey } from "./fantasycalc";
import { ensurePlayersSynced, ensureValuesSynced } from "./sync";
import { loadPlayerValues } from "./valuation";
import { getSetting } from "./db";
import { leagueId } from "./config";

export async function loadLeagueContext() {
  const id = leagueId();
  const [league, rosters, users] = await Promise.all([
    getLeague(id),
    getRosters(id),
    getUsers(id),
  ]);

  await ensurePlayersSynced();
  const settings = leagueValueSettings(league);
  await ensureValuesSynced(settings);
  const valueSet = valueSetKey(settings);
  const values = loadPlayerValues(valueSet);

  const myRosterId = getSetting("my_roster_id");
  const usersById = new Map(users.map((u) => [u.user_id, u]));

  return {
    league,
    rosters,
    users,
    usersById,
    values,
    valueSet,
    settings,
    myRosterId: myRosterId ? Number(myRosterId) : null,
  };
}

export function ownerName(
  roster: { owner_id: string | null },
  usersById: Map<string, { display_name: string; metadata: { team_name?: string } | null }>
) {
  if (!roster.owner_id) return "Unowned";
  const u = usersById.get(roster.owner_id);
  return u?.metadata?.team_name || u?.display_name || "Unknown";
}
