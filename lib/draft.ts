/** Snake-draft math: which draft slot (1-indexed) is on the clock for a given overall pick number. */
export function pickSlot(pickNo: number, teams: number): number {
  const round = Math.ceil(pickNo / teams);
  const posInRound = ((pickNo - 1) % teams) + 1;
  return round % 2 === 1 ? posInRound : teams - posInRound + 1;
}

export function slotToUserId(draftOrder: Record<string, number>, slot: number): string | null {
  for (const [userId, s] of Object.entries(draftOrder)) {
    if (s === slot) return userId;
  }
  return null;
}

/** Every future pick number (up to `rounds`) that belongs to this user, snake-adjusted. */
export function upcomingPicksForUser(
  draftOrder: Record<string, number>,
  teams: number,
  rounds: number,
  userId: string,
  picksMade: number
): number[] {
  const slot = draftOrder[userId];
  if (!slot) return [];
  const picks: number[] = [];
  for (let pickNo = picksMade + 1; pickNo <= teams * rounds; pickNo++) {
    if (pickSlot(pickNo, teams) === slot) picks.push(pickNo);
  }
  return picks;
}
