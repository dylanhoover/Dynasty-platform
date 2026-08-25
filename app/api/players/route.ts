import { NextResponse } from "next/server";
import { getLeague } from "@/lib/sleeper";
import { leagueId } from "@/lib/config";
import { leagueValueSetKey } from "@/lib/valuation";
import { loadAllAssets } from "@/lib/assets";
import { ensurePlayersSynced, ensureValuesSynced } from "@/lib/sync";
import { leagueValueSettings } from "@/lib/fantasycalc";

export async function GET() {
  const league = await getLeague(leagueId());
  await ensurePlayersSynced();
  await ensureValuesSynced(leagueValueSettings(league));
  const valueSet = leagueValueSetKey(league);
  const assets = loadAllAssets(valueSet);
  return NextResponse.json({ assets });
}
