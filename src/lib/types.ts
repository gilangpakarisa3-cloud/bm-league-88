
import type { ImagePlaceholder } from './placeholder-images';

export type Team = {
  id: string;
  name: string;
  logoUrl: string;
};

export type Player = {
  id: string;
  name: string;
  team: Team;
};

export type LeagueEntry = {
  rank: number;
  player: Player;
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
  team1: Team | null; // Kept for compatibility, but player1.team should be used
  team2: Team | null; // Kept for compatibility, but player2.team should be used
  score1: number | null;
  score2: number | null;
  winner: Player | null; // Winner is a player
  date?: Date;
};

export type CupRound = {
  name: string;
  matches: CupMatch[];
};
