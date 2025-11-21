import type { Timestamp } from 'firebase/firestore';

export type WithId<T> = T & { id: string };

export type Team = {
  name: string;
  logoUrl: string;
};

export type Player = {
  name: string;
  teamId: string;
  teamName: string;
  teamLogoUrl?: string; // For display purposes
};

export type League = {
  name: string;
  currentSeasonId?: string;
}

export type Season = {
  name: string;
  status: 'Not Started' | 'In Progress' | 'Completed';
  createdAt: Timestamp;
}

export type LeagueEntry = {
  rank: number;
  playerId: string;
  teamId: string;
  playerName: string;
  teamName: string;
  played: number;
  win: number;
  draw: number;
  loss: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
};

export type CupMatch = {
  id: string;
  matchNumber: number;
  player1: Player | null;
  player2: Player | null;
  team1: Team | null;
  team2: Team | null;
  score1: number | null;
  score2: number | null;
  winner: Player | null;
  date?: Date;
};

export type CupRound = {
  name: string;
  matches: CupMatch[];
};
