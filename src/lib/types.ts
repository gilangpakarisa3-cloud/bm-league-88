
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
  team1: Team | null;
  team2: Team | null;
  score1: number | null;
  score2: number | null;
  winner: Team | null;
};

export type CupRound = {
  name: string;
  matches: CupMatch[];
};
