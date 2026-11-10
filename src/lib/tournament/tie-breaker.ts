export interface StandingsComparable {
  points?: number;
  goalDifference?: number;
  goalsFor?: number;
  win?: number;
  playerName?: string;
  teamName?: string;
  [key: string]: any;
}

/**
 * Standard competitive tie-breaker comparator:
 * 1. Points (descending)
 * 2. Goal Difference (descending)
 * 3. Goals For (descending)
 * 4. Win count (descending)
 * 5. Name alphabetically (ascending)
 */
export function compareStandings<T extends StandingsComparable>(a: T, b: T): number {
  const pointsA = a.points ?? 0;
  const pointsB = b.points ?? 0;
  if (pointsB !== pointsA) return pointsB - pointsA;

  const gdA = a.goalDifference ?? 0;
  const gdB = b.goalDifference ?? 0;
  if (gdB !== gdA) return gdB - gdA;

  const gfA = a.goalsFor ?? 0;
  const gfB = b.goalsFor ?? 0;
  if (gfB !== gfA) return gfB - gfA;

  const winA = a.win ?? 0;
  const winB = b.win ?? 0;
  if (winB !== winA) return winB - winA;

  const nameA = a.playerName || a.teamName || '';
  const nameB = b.playerName || b.teamName || '';
  return nameA.localeCompare(nameB);
}

/**
 * Alphabetical comparator for pre-season / unstarted state
 */
export function compareStandingsAlphabetical<T extends StandingsComparable>(a: T, b: T): number {
  const nameA = a.playerName || a.teamName || '';
  const nameB = b.playerName || b.teamName || '';
  return nameA.localeCompare(nameB);
}

/**
 * Sorts an array of standings entries and assigns 1-based ranks.
 */
export function sortAndRankStandings<T extends StandingsComparable>(
  items: T[],
  isNotStarted = false
): (T & { rank: number })[] {
  const sorted = [...items].sort(isNotStarted ? compareStandingsAlphabetical : compareStandings);
  return sorted.map((entry, index) => ({
    ...entry,
    rank: index + 1,
  }));
}

