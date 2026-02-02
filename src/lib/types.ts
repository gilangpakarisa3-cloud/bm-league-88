
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
  overallPlayed: number;
  overallWin: number;
  overallDraw: number;
  overallLoss: number;
  overallGoalsFor: number;
  overallGoalsAgainst: number;
};

export type PlayerWithTeam = WithId<Player> & { teamId: string, teamName: string };

export type League = {
  name: string;
  currentSeasonId?: string;
}

export type Season = {
  name: string;
  status: 'Not Started' | 'In Progress' | 'Completed';
  createdAt: Timestamp;
  type?: 'Single' | 'Co-Op' | 'Hybrid';
  hybridGroupMeetings?: 1 | 2;
  startDate?: Timestamp;
  endDate?: Timestamp;
  registrationFee?: number;
  sponsorshipAmount?: number;
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
  hasPaid?: boolean;
  group?: 'A' | 'B';
};

export type CoOpLeagueEntry = {
  teamName: string;
  player1Id: string;
  player1Name: string;
  player1TeamId: string;
  player1TeamName: string;
  player2Id: string;
  player2Name: string;
  player2TeamId: string;
  player2TeamName: string;
  played: number;
  win: number;
  loss: number;
  points: number;
}

export type Match = {
  seasonId: string;
  player1Id: string; // For Co-Op, this will be the CoOp team ID
  player2Id: string; // For Co-Op, this will be the CoOp team ID
  player1Wins: number | null;
  player2Wins: number | null;
  player1Score: number | null;
  player2Score: number | null;
  matchDate: Timestamp;
  isCompleted: boolean;
  round?: 'Group' | 'Quarter-Final' | 'Semi-Final' | 'Final';
}

export type Notice = {
  rules: string[];
  schedule: string;
};

export type SeasonRecord = {
    seasonId: string;
    seasonName: string;
    completedAt: Timestamp;
    winnerPlayerId: string;
    winnerPlayerName: string;
    winnerTeamName: string;
    winnerPhotoUrl?: string;
    winnerStats: {
        points: number;
        win: number;
        draw: number;
        loss: number;
        goalsFor: number;
        goalsAgainst: number;
        goalDifference: number;
    };
    funStats: {
        bestAttacker: { playerName: string; value: number } | null;
        worstDefender: { playerName: string; value: number } | null;
        mostWins: { playerName: string; value: number } | null;
    };
}

    