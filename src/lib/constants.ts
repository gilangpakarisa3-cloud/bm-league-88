/**
 * Playoff Successor Map for Bracket Logic
 * Defines where the winner and loser of a match go in the double elimination bracket.
 */
export const PLAYOFF_SUCCESSOR_MAP: Record<string, { winner: { bid: string, slot: 1 | 2 }, loser?: { bid: string, slot: 1 | 2 } }> = {
    // Upper Bracket (Double Elimination)
    'playoff-m1': { winner: { bid: 'playoff-m9', slot: 1 }, loser: { bid: 'playoff-m5', slot: 2 } },
    'playoff-m2': { winner: { bid: 'playoff-m9', slot: 2 }, loser: { bid: 'playoff-m6', slot: 2 } },
    'playoff-m3': { winner: { bid: 'playoff-m10', slot: 1 }, loser: { bid: 'playoff-m7', slot: 2 } },
    'playoff-m4': { winner: { bid: 'playoff-m10', slot: 2 }, loser: { bid: 'playoff-m8', slot: 2 } },
    'playoff-m9': { winner: { bid: 'playoff-m15', slot: 1 }, loser: { bid: 'playoff-m13', slot: 2 } },
    'playoff-m10': { winner: { bid: 'playoff-m15', slot: 2 }, loser: { bid: 'playoff-m14', slot: 2 } },
    'playoff-m15': { winner: { bid: 'playoff-m18', slot: 1 }, loser: { bid: 'playoff-m17', slot: 1 } },

    // Lower Bracket (Double Elimination)
    'playoff-m5': { winner: { bid: 'playoff-m11', slot: 1 } },
    'playoff-m6': { winner: { bid: 'playoff-m11', slot: 2 } },
    'playoff-m7': { winner: { bid: 'playoff-m12', slot: 1 } },
    'playoff-m8': { winner: { bid: 'playoff-m12', slot: 2 } },
    'playoff-m11': { winner: { bid: 'playoff-m13', slot: 1 } },
    'playoff-m12': { winner: { bid: 'playoff-m14', slot: 1 } },
    'playoff-m13': { winner: { bid: 'playoff-m16', slot: 1 } },
    'playoff-m14': { winner: { bid: 'playoff-m16', slot: 2 } },
    'playoff-m16': { winner: { bid: 'playoff-m17', slot: 2 } },
    'playoff-m17': { winner: { bid: 'playoff-m18', slot: 2 } },

    // Co-Op Hybrid (Single Elimination Top 4)
    'playoff-sf1': { winner: { bid: 'playoff-final', slot: 1 } },
    'playoff-sf2': { winner: { bid: 'playoff-final', slot: 2 } },
};

/**
 * Playoff Successor Map for 8-Team Single Hybrid Single Elimination Bracket (Pure Knockout, Kalah = Gugur)
 * - QF 1 & QF 2 winners advance to Semifinal 1 (playoff-sf1)
 * - QF 3 & QF 4 winners advance to Semifinal 2 (playoff-sf2)
 * - SF 1 & SF 2 winners advance to Grand Final (playoff-final)
 * - Losers are eliminated immediately (no lower bracket)
 */
export const SINGLE_HYBRID_SUCCESSOR_MAP: Record<string, { winner: { bid: string, slot: 1 | 2 }, loser?: { bid: string, slot: 1 | 2 } }> = {
    'playoff-m1': { winner: { bid: 'playoff-sf1', slot: 1 } },
    'playoff-m2': { winner: { bid: 'playoff-sf1', slot: 2 } },
    'playoff-m3': { winner: { bid: 'playoff-sf2', slot: 1 } },
    'playoff-m4': { winner: { bid: 'playoff-sf2', slot: 2 } },
    'playoff-sf1': { winner: { bid: 'playoff-final', slot: 1 } },
    'playoff-sf2': { winner: { bid: 'playoff-final', slot: 2 } },
};

export function getPlayoffSuccessorMap(seasonType?: string) {
    if (seasonType === 'Single Hybrid') return SINGLE_HYBRID_SUCCESSOR_MAP;
    return PLAYOFF_SUCCESSOR_MAP;
}
