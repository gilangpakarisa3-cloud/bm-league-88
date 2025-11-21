import type { LeagueEntry, CupRound, Player, Team, WithId } from './types';

// --- THIS FILE IS NOW DEPRECATED ---
// All data will be fetched from Firestore.
// This file is kept only for type definitions that might still be in use
// but will be removed soon.

// --- LEAGUE DATA ---
export const leagueTable: LeagueEntry[] = [];
export const leagueWinner: LeagueEntry | null = null;

// --- CUP DATA ---
export const cupData: CupRound[] = [];
export const cupWinner: Player | null = null;

// --- TEAM & PLAYER DATA ---
// The following arrays are now empty as data is sourced from Firestore.
export const teams: WithId<Team>[] = [];
export const players: WithId<Player>[] = [];
