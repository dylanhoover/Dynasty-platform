export function leagueId(): string {
  const id = process.env.SLEEPER_LEAGUE_ID;
  if (!id) {
    throw new Error("SLEEPER_LEAGUE_ID is not set. Add it to .env.local and restart the dev server.");
  }
  return id;
}
