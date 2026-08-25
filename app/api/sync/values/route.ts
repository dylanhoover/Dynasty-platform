import { NextResponse } from "next/server";
import { ensureValuesSynced } from "@/lib/sync";
import { getLeague } from "@/lib/sleeper";
import { leagueValueSettings } from "@/lib/fantasycalc";
import { leagueId } from "@/lib/config";

export async function POST(request: Request) {
  const force = new URL(request.url).searchParams.get("force") === "1";
  const league = await getLeague(leagueId());
  const settings = leagueValueSettings(league);
  const result = await ensureValuesSynced(settings, force);
  return NextResponse.json(result);
}
