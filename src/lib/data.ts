
import type { Team, Player, LeagueEntry, CupRound } from './types';
import { PlaceHolderImages } from './placeholder-images';

const getImage = (id: string) => PlaceHolderImages.find(img => img.id === id)?.imageUrl || '';

// --- TEAMS ---
export const teams: Team[] = [
  { id: 't1', name: 'Red Dragons', logoUrl: getImage('team-logo-1') },
  { id: 't2', name: 'Blue Knights', logoUrl: getImage('team-logo-2') },
  { id: 't3', name: 'Green Giants', logoUrl: getImage('team-logo-3') },
  { id: 't4', name: 'Yellow Hornets', logoUrl: getImage('team-logo-4') },
  { id: 't5', name: 'Purple Wizards', logoUrl: getImage('team-logo-5') },
  { id: 't6', name: 'Orange Phoenix', logoUrl: getImage('team-logo-6') },
  { id: 't7', name: 'Black Panthers', logoUrl: getImage('team-logo-7') },
  { id: 't8', name: 'White Wolves', logoUrl: getImage('team-logo-8') },
];

// --- PLAYERS ---
export const players: Player[] = [
  { id: 'p1', name: 'Andi "The Ace"', team: teams[0] },
  { id: 'p2', name: 'Budi "Rocket"', team: teams[1] },
  { id: 'p3', name: 'Cahyo "Spectre"', team: teams[2] },
  { id: 'p4', name: 'Dedi "Maestro"', team: teams[3] },
  { id: 'p5', name: 'Eka "Joker"', team: teams[4] },
  { id: 'p6', name: 'Fajar "Flash"', team: teams[5] },
  { id: 'p7', name: 'Gilang "Ghost"', team: teams[6] },
  { id: 'p8', name: 'Hadi "Hunter"', team: teams[7] },
];

// --- LEAGUE DATA ---
export const leagueTable: LeagueEntry[] = [
  { rank: 1, player: players[3], played: 14, win: 12, draw: 1, loss: 1, goalsFor: 40, goalsAgainst: 10, goalDifference: 30, points: 37 },
  { rank: 2, player: players[0], played: 14, win: 10, draw: 2, loss: 2, goalsFor: 35, goalsAgainst: 15, goalDifference: 20, points: 32 },
  { rank: 3, player: players[6], played: 14, win: 9, draw: 1, loss: 4, goalsFor: 28, goalsAgainst: 20, goalDifference: 8, points: 28 },
  { rank: 4, player: players[1], played: 14, win: 7, draw: 3, loss: 4, goalsFor: 25, goalsAgainst: 22, goalDifference: 3, points: 24 },
  { rank: 5, player: players[4], played: 14, win: 5, draw: 2, loss: 7, goalsFor: 18, goalsAgainst: 25, goalDifference: -7, points: 17 },
  { rank: 6, player: players[7], played: 14, win: 4, draw: 1, loss: 9, goalsFor: 15, goalsAgainst: 30, goalDifference: -15, points: 13 },
  { rank: 7, player: players[2], played: 14, win: 2, draw: 2, loss: 10, goalsFor: 12, goalsAgainst: 32, goalDifference: -20, points: 8 },
  { rank: 8, player: players[5], played: 14, win: 1, draw: 2, loss: 11, goalsFor: 10, goalsAgainst: 39, goalDifference: -29, points: 5 },
];

export const leagueWinner = leagueTable[0];


// --- CUP DATA ---
export const cupData: CupRound[] = [
  {
    name: 'Quarter Finals',
    matches: [
      { id: 'qf1', matchNumber: 1, team1: teams[0], team2: teams[7], score1: 3, score2: 1, winner: teams[0] },
      { id: 'qf2', matchNumber: 2, team1: teams[3], team2: teams[4], score1: 2, score2: 0, winner: teams[3] },
      { id: 'qf3', matchNumber: 3, team1: teams[1], team2: teams[6], score1: 1, score2: 2, winner: teams[6] },
      { id: 'qf4', matchNumber: 4, team1: teams[2], team2: teams[5], score1: 0, score2: 4, winner: teams[5] },
    ]
  },
  {
    name: 'Semi Finals',
    matches: [
      { id: 'sf1', matchNumber: 5, team1: teams[0], team2: teams[3], score1: 1, score2: 2, winner: teams[3] },
      { id: 'sf2', matchNumber: 6, team1: teams[6], team2: teams[5], score1: 3, score2: 1, winner: teams[6] },
    ]
  },
  {
    name: 'Final',
    matches: [
      { id: 'f1', matchNumber: 7, team1: teams[3], team2: teams[6], score1: 2, score2: 1, winner: teams[3] },
    ]
  }
];

const finalMatch = cupData.find(r => r.name === 'Final')?.matches[0];
const cupWinnerTeam = finalMatch?.winner;
export const cupWinner = players.find(p => p.team.id === cupWinnerTeam?.id) || null;
