
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
  photoUrl?: string;
};

export type League = {
  name: string;
  currentSeasonId?: string;
}

export type Cup = {
  name: string;
  currentSeasonId?: string;
}

export type Season = {
  name: string;
  status: 'Not Started' | 'In Progress' | 'Completed';
  createdAt: Timestamp;
}

export type LeagueEntry = {
  id: string;
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

export type Match = {
  seasonId: string;
  player1Id: string;
  player2Id: string;
  player1Score?: number;
  player2Score?: number;
  matchDate: Timestamp;
  isCompleted: boolean;
  round?: string; // For cup matches
  matchNumber?: number; // For cup matches
}

export type CupMatch = {
  id: string;
  matchNumber: number;
  player1: WithId<Player> | null;
  player2: WithId<Player> | null;
  team1: WithId<Team> | null; // Kept for compatibility if needed, but player contains team info
  team2: WithId<Team> | null; // Kept for compatibility if needed, but player contains team info
  score1: number | null;
  score2: number | null;
  winner: WithId<Player> | null;
  round: string;
};


export type CupRound = {
  name: string;
  matches: CupMatch[];
};
