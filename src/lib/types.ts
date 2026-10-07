
import type { Timestamp } from 'firebase/firestore';

export type WithId<T> = T & { id: string };

export type Team = {
  name: string;
  logoUrl: string;
  tier?: number;
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
  avatarUrl?: string;
  photoUrl?: string;
  teamLogoUrl?: string;
  ovr?: number;
  division?: string;
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
  type?: 'Single' | 'Co-Op' | 'Hybrid' | 'Co-Op Hybrid' | 'Single Hybrid';
  themeKey?: 'auto' | 'emerald' | 'crimson' | 'gold' | 'azure' | 'amethyst' | 'cerulean';
  hybridGroupMeetings?: 1 | 2;
  startDate?: Timestamp;
  endDate?: Timestamp;
  registrationFee?: number;
  sponsorshipAmount?: number;
  // Multi-Division Configuration
  hasDivisions?: boolean;
  division1Name?: string;
  division2Name?: string;
  division2Format?: 'Single' | 'Single Hybrid' | 'Hybrid';
  division2HasPlayoff?: boolean; // For Divisi 2: apakah memakai babak playoff atau sistem liga penuh murni
  promotionSpots?: number; // default: 2
  relegationSpots?: number; // default: 2
  isDiv2Merged?: boolean; // true if auto-merged into Div 1 because Div 2 had <= 2 players
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
  division?: 'div-1' | 'div-2';
};

export type CoOpLeagueEntry = {
  id: string;
  teamName: string;
  player1Id: string;
  player1Name: string;
  player1TeamId: string;
  player1TeamName: string;
  player1Goals: number;
  player2Id: string;
  player2Name: string;
  player2TeamId: string;
  player2TeamName: string;
  player2Goals: number;
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
  division?: 'div-1' | 'div-2';
}

export type MatchRound = "Group" | "Quarterfinal" | "Semifinal" | "UB-Quarter" | "UB-Semi" | "UB-Final" | "LB-Round 1" | "LB-Round 2" | "LB-Round 3" | "LB-Round 4" | "LB-Round 5" | "LB-Final" | "Grand-Final";

export type MatchStatus = 'Scheduled' | 'Live' | 'Completed' | 'Postponed';

export type Match = {
  seasonId: string;
  player1Id: string; 
  player2Id: string; 
  player1Wins: number | null;
  player2Wins: number | null;
  player1Score: number | null;
  player2Score: number | null;
  player1p1Goals?: number | null;
  player1p2Goals?: number | null;
  player2p1Goals?: number | null;
  player2p2Goals?: number | null;
  matchDate: Timestamp;
  isCompleted: boolean;
  status?: MatchStatus;
  round?: MatchRound;
  bracketId?: string; // e.g., 'playoff-m1'
  division?: 'div-1' | 'div-2';
}

export type CupRound = MatchRound;
export type CupMatch = Match;

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

export type AdminConfig = {
    password?: string;
    isDeactivated?: boolean;
};
