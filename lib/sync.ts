import { db, getLastSync, setLastSync } from "./db";
import { getAllPlayers, playerDisplayName, type SleeperPlayer } from "./sleeper";
import { fetchValues, valueSetKey, type LeagueValueSettings } from "./fantasycalc";

const PLAYERS_TTL_MS = 24 * 60 * 60 * 1000; // 1 day
const VALUES_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

export async function ensurePlayersSynced(force = false) {
  const last = getLastSync("players");
  if (!force && last && Date.now() - last < PLAYERS_TTL_MS) return { synced: false };

  const all = await getAllPlayers();
  const insert = db.prepare(`
    INSERT INTO players (sleeper_id, full_name, position, team, age, years_exp, status, injury_status, injury_body_part, news_updated, updated_at)
    VALUES (@sleeper_id, @full_name, @position, @team, @age, @years_exp, @status, @injury_status, @injury_body_part, @news_updated, @updated_at)
    ON CONFLICT(sleeper_id) DO UPDATE SET
      full_name=excluded.full_name, position=excluded.position, team=excluded.team,
      age=excluded.age, years_exp=excluded.years_exp, status=excluded.status,
      injury_status=excluded.injury_status, injury_body_part=excluded.injury_body_part,
      news_updated=excluded.news_updated, updated_at=excluded.updated_at
  `);

  const relevant = (p: SleeperPlayer) =>
    p.position && ["QB", "RB", "WR", "TE"].includes(p.position);

  const now = Date.now();
  const tx = db.transaction((players: SleeperPlayer[]) => {
    for (const p of players) {
      insert.run({
        sleeper_id: p.player_id,
        full_name: playerDisplayName(p),
        position: p.position,
        team: p.team,
        age: p.age ?? null,
        years_exp: p.years_exp ?? null,
        status: p.status ?? null,
        injury_status: p.injury_status ?? null,
        injury_body_part: p.injury_body_part ?? null,
        news_updated: p.news_updated ?? null,
        updated_at: now,
      });
    }
  });

  tx(Object.values(all).filter(relevant));
  setLastSync("players");
  return { synced: true, count: Object.keys(all).length };
}

export async function ensureValuesSynced(settings: LeagueValueSettings, force = false) {
  const key = valueSetKey(settings);
  const last = getLastSync(`values:${key}`);
  if (!force && last && Date.now() - last < VALUES_TTL_MS) return { synced: false, key };

  const entries = await fetchValues(settings);
  const insert = db.prepare(`
    INSERT INTO dynasty_values (sleeper_id, value_set, fc_name, value, overall_rank, position_rank, trend_30day, redraft_value, is_pick, updated_at)
    VALUES (@sleeper_id, @value_set, @fc_name, @value, @overall_rank, @position_rank, @trend_30day, @redraft_value, @is_pick, @updated_at)
    ON CONFLICT(sleeper_id, value_set) DO UPDATE SET
      fc_name=excluded.fc_name, value=excluded.value, overall_rank=excluded.overall_rank,
      position_rank=excluded.position_rank, trend_30day=excluded.trend_30day,
      redraft_value=excluded.redraft_value, is_pick=excluded.is_pick, updated_at=excluded.updated_at
  `);

  const now = Date.now();
  const tx = db.transaction(() => {
    db.prepare("DELETE FROM dynasty_values WHERE value_set = ?").run(key);
    for (const e of entries) {
      if (!e.player.sleeperId) continue;
      insert.run({
        sleeper_id: e.player.sleeperId,
        value_set: key,
        fc_name: e.player.name,
        value: e.value,
        overall_rank: e.overallRank,
        position_rank: e.positionRank,
        trend_30day: e.trend30Day,
        redraft_value: e.redraftValue,
        is_pick: e.player.position === "PICK" ? 1 : 0,
        updated_at: now,
      });
    }
  });

  tx();
  setLastSync(`values:${key}`);
  return { synced: true, key, count: entries.length };
}
