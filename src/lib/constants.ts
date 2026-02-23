/**
 * Playoff Successor Map for Bracket Logic
 * Defines where the winner and loser of a match go in the double elimination bracket.
 */
export const PLAYOFF_SUCCESSOR_MAP: Record<string, { winner: { bid: string, slot: 1 | 2 }, loser?: { bid: string, slot: 1 | 2 } }> = {
    // Upper Bracket
    'playoff-m1': { winner: { bid: 'playoff-m9', slot: 1 }, loser: { bid: 'playoff-m5', slot: 2 } },
    'playoff-m2': { winner: { bid: 'playoff-m9', slot: 2 }, loser: { bid: 'playoff-m6', slot: 2 } },
    'playoff-m3': { winner: { bid: 'playoff-m10', slot: 1 }, loser: { bid: 'playoff-m7', slot: 2 } },
    'playoff-m4': { winner: { bid: 'playoff-m10', slot: 2 }, loser: { bid: 'playoff-m8', slot: 2 } },
    'playoff-m9': { winner: { bid: 'playoff-m15', slot: 1 }, loser: { bid: 'playoff-m13', slot: 2 } },
    'playoff-m10': { winner: { bid: 'playoff-m15', slot: 2 }, loser: { bid: 'playoff-m14', slot: 2 } },
    'playoff-m15': { winner: { bid: 'playoff-m18', slot: 1 }, loser: { bid: 'playoff-m17', slot: 1 } },

    // Lower Bracket
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
};
