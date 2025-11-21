
import type { Team, Player, LeagueEntry, CupRound } from './types';
import { PlaceHolderImages } from './placeholder-images';

const getImage = (id: string) => PlaceHolderImages.find(img => img.id === id)?.imageUrl || '';

// --- TEAMS ---
export const teams: Team[] = [
  // English Premier League
  { id: 't-epl-1', name: 'Arsenal', logoUrl: getImage('team-logo-arsenal') },
  { id: 't-epl-2', name: 'Manchester City', logoUrl: getImage('team-logo-mancity') },
  { id: 't-epl-3', name: 'Liverpool', logoUrl: getImage('team-logo-liverpool') },
  { id: 't-epl-4', name: 'Aston Villa', logoUrl: getImage('team-logo-astonvilla') },

  // Spanish La Liga
  { id: 't-laliga-1', name: 'Real Madrid', logoUrl: getImage('team-logo-realmadrid') },
  { id: 't-laliga-2', name: 'Barcelona', logoUrl: getImage('team-logo-barcelona') },
  { id: 't-laliga-3', name: 'Girona', logoUrl: getImage('team-logo-girona') },
  { id: 't-laliga-4', name: 'Atlético Madrid', logoUrl: getImage('team-logo-atletico') },

  // French Ligue 1
  { id: 't-ligue1-1', name: 'Paris Saint-Germain', logoUrl: getImage('team-logo-psg') },
  { id: 't-ligue1-2', name: 'AS Monaco', logoUrl: getImage('team-logo-monaco') },
  { id: 't-ligue1-3', name: 'Marseille', logoUrl: getImage('team-logo-marseille') },
  { id: 't-ligue1-4', name: 'Lyon', logoUrl: getImage('team-logo-lyon') },

  // Italian Serie A
  { id: 't-seriea-1', name: 'Inter Milan', logoUrl: getImage('team-logo-inter') },
  { id: 't-seriea-2', name: 'AC Milan', logoUrl: getImage('team-logo-acmilan') },
  { id: 't-seriea-3', name: 'Juventus', logoUrl: getImage('team-logo-juventus') },
  { id: 't-seriea-4', name: 'Bologna', logoUrl: getImage('team-logo-bologna') },

  // German Bundesliga
  { id: 't-bundesliga-1', name: 'Bayer Leverkusen', logoUrl: getImage('team-logo-leverkusen') },
  { id: 't-bundesliga-2', name: 'VfB Stuttgart', logoUrl: getImage('team-logo-stuttgart') },
  { id: 't-bundesliga-3', name: 'FC Bayern Munich', logoUrl: getImage('team-logo-bayern') },
  { id: 't-bundesliga-4', name: 'RB Leipzig', logoUrl: getImage('team-logo-leipzig') },
];

// --- PLAYERS ---
// Create 20 players, one for each team.
export const players: Player[] = teams.map((team, index) => ({
    id: `p${index + 1}`,
    name: `Player ${index + 1}`,
    team: team
}));

// --- LEAGUE DATA ---
// Generate mock league data for the first 8 teams
export const leagueTable: LeagueEntry[] = teams.slice(0, 8).map((team, index) => {
    const player = players.find(p => p.team.id === team.id)!;
    return {
        rank: index + 1,
        player: player,
        played: 14,
        win: Math.floor(Math.random() * 10),
        draw: Math.floor(Math.random() * 5),
        loss: Math.floor(Math.random() * 5),
        goalsFor: Math.floor(Math.random() * 40),
        goalsAgainst: Math.floor(Math.random() * 40),
        goalDifference: Math.floor(Math.random() * 30) - 15,
        points: Math.floor(Math.random() * 30)
    };
}).sort((a, b) => b.points - a.points).map((entry, index) => ({ ...entry, rank: index + 1 }));


export const leagueWinner = leagueTable[0];


// --- CUP DATA ---
// Using first 8 teams for the cup
const cupTeams = teams.slice(0, 8);
export const cupData: CupRound[] = [
  {
    name: 'Quarter Finals',
    matches: [
      { id: 'qf1', matchNumber: 1, team1: cupTeams[0], team2: cupTeams[7], score1: 3, score2: 1, winner: cupTeams[0] },
      { id: 'qf2', matchNumber: 2, team1: cupTeams[3], team2: cupTeams[4], score1: 2, score2: 0, winner: cupTeams[3] },
      { id: 'qf3', matchNumber: 3, team1: cupTeams[1], team2: cupTeams[6], score1: 1, score2: 2, winner: cupTeams[6] },
      { id: 'qf4', matchNumber: 4, team1: cupTeams[2], team2: cupTeams[5], score1: 0, score2: 4, winner: cupTeams[5] },
    ]
  },
  {
    name: 'Semi Finals',
    matches: [
      { id: 'sf1', matchNumber: 5, team1: cupTeams[0], team2: cupTeams[3], score1: 1, score2: 2, winner: cupTeams[3] },
      { id: 'sf2', matchNumber: 6, team1: cupTeams[6], team2: cupTeams[5], score1: 3, score2: 1, winner: cupTeams[6] },
    ]
  },
  {
    name: 'Final',
    matches: [
      { id: 'f1', matchNumber: 7, team1: cupTeams[3], team2: cupTeams[6], score1: 2, score2: 1, winner: cupTeams[3] },
    ]
  }
];

const finalMatch = cupData.find(r => r.name === 'Final')?.matches[0];
const cupWinnerTeam = finalMatch?.winner;
export const cupWinner = players.find(p => p.team.id === cupWinnerTeam?.id) || null;
