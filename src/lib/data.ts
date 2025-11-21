import type { LeagueEntry, CupRound, Player } from './types';

// --- THIS FILE IS NOW DEPRECATED FOR TEAMS AND PLAYERS ---
// Data will be fetched from Firestore.
// This file is kept for legacy data structures like LeagueEntry and CupRound
// which will also be migrated to Firestore soon.


// --- LEAGUE DATA ---
// This is now just a placeholder structure.
export const leagueTable: LeagueEntry[] = [];

export const leagueWinner: LeagueEntry | null = null;


// --- CUP DATA ---
// All cup data is cleared
export const cupData: CupRound[] = [];
export const cupWinner: Player | null = null;
