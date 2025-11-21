
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
  { id: 't-epl-5', name: 'Tottenham Hotspur', logoUrl: getImage('team-logo-tottenham') },
  { id: 't-epl-6', name: 'Chelsea', logoUrl: getImage('team-logo-chelsea') },
  { id: 't-epl-7', name: 'Newcastle United', logoUrl: getImage('team-logo-newcastle') },
  { id: 't-epl-8', name: 'Manchester United', logoUrl: getImage('team-logo-manutd') },
  { id: 't-epl-9', name: 'West Ham United', logoUrl: getImage('team-logo-westham') },
  { id: 't-epl-10', name: 'Crystal Palace', logoUrl: getImage('team-logo-crystalpalace') },
  { id: 't-epl-11', name: 'Brighton & Hove Albion', logoUrl: getImage('team-logo-brighton') },
  { id: 't-epl-12', name: 'Bournemouth', logoUrl: getImage('team-logo-bournemouth') },
  { id: 't-epl-13', name: 'Fulham', logoUrl: getImage('team-logo-fulham') },
  { id: 't-epl-14', name: 'Wolverhampton Wanderers', logoUrl: getImage('team-logo-wolves') },
  { id: 't-epl-15', name: 'Everton', logoUrl: getImage('team-logo-everton') },
  { id: 't-epl-16', name: 'Brentford', logoUrl: getImage('team-logo-brentford') },
  { id: 't-epl-17', name: 'Nottingham Forest', logoUrl: getImage('team-logo-nottingham') },
  { id: 't-epl-18', name: 'Luton Town', logoUrl: getImage('team-logo-luton') },
  { id: 't-epl-19', name: 'Burnley', logoUrl: getImage('team-logo-burnley') },
  { id: 't-epl-20', name: 'Sheffield United', logoUrl: getImage('team-logo-sheffield') },

  // Spanish La Liga
  { id: 't-laliga-1', name: 'Real Madrid', logoUrl: getImage('team-logo-realmadrid') },
  { id: 't-laliga-2', name: 'Barcelona', logoUrl: getImage('team-logo-barcelona') },
  { id: 't-laliga-3', name: 'Girona', logoUrl: getImage('team-logo-girona') },
  { id: 't-laliga-4', name: 'Atlético Madrid', logoUrl: getImage('team-logo-atletico') },
  { id: 't-laliga-5', name: 'Athletic Bilbao', logoUrl: getImage('team-logo-bilbao') },
  { id: 't-laliga-6', name: 'Real Sociedad', logoUrl: getImage('team-logo-sociedad') },
  { id: 't-laliga-7', name: 'Real Betis', logoUrl: getImage('team-logo-betis') },
  { id: 't-laliga-8', name: 'Villarreal', logoUrl: getImage('team-logo-villarreal') },
  { id: 't-laliga-9', name: 'Valencia', logoUrl: getImage('team-logo-valencia') },
  { id: 't-laliga-10', name: 'Alavés', logoUrl: getImage('team-logo-alaves') },
  { id: 't-laliga-11', name: 'Osasuna', logoUrl: getImage('team-logo-osasuna') },
  { id: 't-laliga-12', name: 'Getafe', logoUrl: getImage('team-logo-getafe') },
  { id: 't-laliga-13', name: 'Celta Vigo', logoUrl: getImage('team-logo-celtavigo') },
  { id: 't-laliga-14', name: 'Sevilla', logoUrl: getImage('team-logo-sevilla') },
  { id: 't-laliga-15', name: 'Mallorca', logoUrl: getImage('team-logo-mallorca') },
  { id: 't-laliga-16', name: 'Las Palmas', logoUrl: getImage('team-logo-laspalmas') },
  { id: 't-laliga-17', name: 'Rayo Vallecano', logoUrl: getImage('team-logo-rayo') },
  { id: 't-laliga-18', name: 'Cádiz', logoUrl: getImage('team-logo-cadiz') },
  { id: 't-laliga-19', name: 'Almería', logoUrl: getImage('team-logo-almeria') },
  { id: 't-laliga-20', name: 'Granada', logoUrl: getImage('team-logo-granada') },
  
  // French Ligue 1
  { id: 't-ligue1-1', name: 'Paris Saint-Germain', logoUrl: getImage('team-logo-psg') },
  { id: 't-ligue1-2', name: 'AS Monaco', logoUrl: getImage('team-logo-monaco') },
  { id: 't-ligue1-3', name: 'Marseille', logoUrl: getImage('team-logo-marseille') },
  { id: 't-ligue1-4', name: 'Lyon', logoUrl: getImage('team-logo-lyon') },
  { id: 't-ligue1-5', name: 'Lille', logoUrl: getImage('team-logo-lille') },
  { id: 't-ligue1-6', name: 'Nice', logoUrl: getImage('team-logo-nice') },
  { id: 't-ligue1-7', name: 'Lens', logoUrl: getImage('team-logo-lens') },
  { id: 't-ligue1-8', name: 'Rennes', logoUrl: getImage('team-logo-rennes') },
  { id: 't-ligue1-9', name: 'Reims', logoUrl: getImage('team-logo-reims') },
  { id: 't-ligue1-10', name: 'Strasbourg', logoUrl: getImage('team-logo-strasbourg') },
  { id: 't-ligue1-11', name: 'Nantes', logoUrl: getImage('team-logo-nantes') },
  { id: 't-ligue1-12', name: 'Le Havre', logoUrl: getImage('team-logo-lehavre') },
  { id: 't-ligue1-13', name: 'Montpellier', logoUrl: getImage('team-logo-montpellier') },
  { id: 't-ligue1-14', name: 'Toulouse', logoUrl: getImage('team-logo-toulouse') },
  { id: 't-ligue1-15', name: 'Brest', logoUrl: getImage('team-logo-brest') },
  { id: 't-ligue1-16', name: 'Lorient', logoUrl: getImage('team-logo-lorient') },
  { id: 't-ligue1-17', name: 'Clermont Foot', logoUrl: getImage('team-logo-clermont') },
  { id: 't-ligue1-18', name: 'Metz', logoUrl: getImage('team-logo-metz') },
  { id: 't-ligue1-19', name: 'Auxerre', logoUrl: getImage('team-logo-auxerre') },
  { id: 't-ligue1-20', name: 'Angers', logoUrl: getImage('team-logo-angers') },

  // Italian Serie A
  { id: 't-seriea-1', name: 'Inter Milan', logoUrl: getImage('team-logo-inter') },
  { id: 't-seriea-2', name: 'AC Milan', logoUrl: getImage('team-logo-acmilan') },
  { id: 't-seriea-3', name: 'Juventus', logoUrl: getImage('team-logo-juventus') },
  { id: 't-seriea-4', name: 'Bologna', logoUrl: getImage('team-logo-bologna') },
  { id: 't-seriea-5', name: 'Roma', logoUrl: getImage('team-logo-roma') },
  { id: 't-seriea-6', name: 'Lazio', logoUrl: getImage('team-logo-lazio') },
  { id: 't-seriea-7', name: 'Fiorentina', logoUrl: getImage('team-logo-fiorentina') },
  { id: 't-seriea-8', name: 'Napoli', logoUrl: getImage('team-logo-napoli') },
  { id: 't-seriea-9', name: 'Torino', logoUrl: getImage('team-logo-torino') },
  { id: 't-seriea-10', name: 'Genoa', logoUrl: getImage('team-logo-genoa') },
  { id: 't-seriea-11', name: 'Monza', logoUrl: getImage('team-logo-monza') },
  { id: 't-seriea-12', name: 'Hellas Verona', logoUrl: getImage('team-logo-verona') },
  { id: 't-seriea-13', name: 'Lecce', logoUrl: getImage('team-logo-lecce') },
  { id: 't-seriea-14', name: 'Udinese', logoUrl: getImage('team-logo-udinese') },
  { id: 't-seriea-15', name: 'Cagliari', logoUrl: getImage('team-logo-cagliari') },
  { id: 't-seriea-16', name: 'Empoli', logoUrl: getImage('team-logo-empoli') },
  { id: 't-seriea-17', name: 'Sassuolo', logoUrl: getImage('team-logo-sassuolo') },
  { id: 't-seriea-18', name: 'Frosinone', logoUrl: getImage('team-logo-frosinone') },
  { id: 't-seriea-19', name: 'Salernitana', logoUrl: getImage('team-logo-salernitana') },
  { id: 't-seriea-20', name: 'Parma', logoUrl: getImage('team-logo-parma') },

  // German Bundesliga
  { id: 't-bundesliga-1', name: 'Bayer Leverkusen', logoUrl: getImage('team-logo-leverkusen') },
  { id: 't-bundesliga-2', name: 'VfB Stuttgart', logoUrl: getImage('team-logo-stuttgart') },
  { id: 't-bundesliga-3', name: 'FC Bayern Munich', logoUrl: getImage('team-logo-bayern') },
  { id: 't-bundesliga-4', name: 'RB Leipzig', logoUrl: getImage('team-logo-leipzig') },
  { id: 't-bundesliga-5', name: 'Borussia Dortmund', logoUrl: getImage('team-logo-dortmund') },
  { id: 't-bundesliga-6', name: 'Eintracht Frankfurt', logoUrl: getImage('team-logo-frankfurt') },
  { id: 't-bundesliga-7', name: 'Hoffenheim', logoUrl: getImage('team-logo-hoffenheim') },
  { id: 't-bundesliga-8', name: 'Heidenheim', logoUrl: getImage('team-logo-heidenheim') },
  { id: 't-bundesliga-9', name: 'Werder Bremen', logoUrl: getImage('team-logo-bremen') },
  { id: 't-bundesliga-10', name: 'Freiburg', logoUrl: getImage('team-logo-freiburg') },
  { id: 't-bundesliga-11', name: 'Augsburg', logoUrl: getImage('team-logo-augsburg') },
  { id: 't-bundesliga-12', name: 'Wolfsburg', logoUrl: getImage('team-logo-wolfsburg') },
  { id: 't-bundesliga-13', name: 'Mainz 05', logoUrl: getImage('team-logo-mainz') },
  { id: 't-bundesliga-14', name: 'Borussia Mönchengladbach', logoUrl: getImage('team-logo-monchengladbach') },
  { id: 't-bundesliga-15', name: 'Union Berlin', logoUrl: getImage('team-logo-unionberlin') },
  { id: 't-bundesliga-16', name: 'Bochum', logoUrl: getImage('team-logo-bochum') },
  { id: 't-bundesliga-17', name: 'Darmstadt 98', logoUrl: getImage('team-logo-darmstadt') },
  { id: 't-bundesliga-18', name: 'FC Köln', logoUrl: getImage('team-logo-koln') },
  { id: 't-bundesliga-19', name: 'Hamburger SV', logoUrl: getImage('team-logo-hamburg') },
  { id: 't-bundesliga-20', name: 'Schalke 04', logoUrl: getImage('team-logo-schalke') },
];

// --- PLAYERS ---
// Create 100 players, one for each team.
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
