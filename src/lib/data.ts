
import type { Team, Player, LeagueEntry, CupRound } from './types';
import { PlaceHolderImages } from './placeholder-images';

const getImage = (id: string) => PlaceHolderImages.find(img => img.id === id)?.imageUrl || '';

// --- TEAMS ---
export const teams: Team[] = [
  // English Premier League
  { id: 't-epl-1', name: 'Arsenal', logoUrl: '' },
  { id: 't-epl-2', name: 'Manchester City', logoUrl: '' },
  { id: 't-epl-3', name: 'Liverpool', logoUrl: '' },
  { id: 't-epl-4', name: 'Aston Villa', logoUrl: '' },
  { id: 't-epl-5', name: 'Tottenham Hotspur', logoUrl: '' },
  { id: 't-epl-6', name: 'Chelsea', logoUrl: '' },
  { id: 't-epl-7', name: 'Newcastle United', logoUrl: '' },
  { id: 't-epl-8', name: 'Manchester United', logoUrl: '' },
  { id: 't-epl-9', name: 'West Ham United', logoUrl: '' },
  { id: 't-epl-10', name: 'Crystal Palace', logoUrl: '' },
  { id: 't-epl-11', name: 'Brighton & Hove Albion', logoUrl: '' },
  { id: 't-epl-12', name: 'Bournemouth', logoUrl: '' },
  { id: 't-epl-13', name: 'Fulham', logoUrl: '' },
  { id: 't-epl-14', name: 'Wolverhampton Wanderers', logoUrl: '' },
  { id: 't-epl-15', name: 'Everton', logoUrl: '' },
  { id: 't-epl-16', name: 'Brentford', logoUrl: '' },
  { id: 't-epl-17', name: 'Nottingham Forest', logoUrl: '' },
  { id: 't-epl-18', name: 'Luton Town', logoUrl: '' },
  { id: 't-epl-19', name: 'Burnley', logoUrl: '' },
  { id: 't-epl-20', name: 'Sheffield United', logoUrl: '' },

  // Spanish La Liga
  { id: 't-laliga-1', name: 'Real Madrid', logoUrl: '' },
  { id: 't-laliga-2', name: 'Barcelona', logoUrl: '' },
  { id: 't-laliga-3', name: 'Girona', logoUrl: '' },
  { id: 't-laliga-4', name: 'Atlético Madrid', logoUrl: '' },
  { id: 't-laliga-5', name: 'Athletic Bilbao', logoUrl: '' },
  { id: 't-laliga-6', name: 'Real Sociedad', logoUrl: '' },
  { id: 't-laliga-7', name: 'Real Betis', logoUrl: '' },
  { id: 't-laliga-8', name: 'Villarreal', logoUrl: '' },
  { id: 't-laliga-9', name: 'Valencia', logoUrl: '' },
  { id: 't-laliga-10', name: 'Alavés', logoUrl: '' },
  { id: 't-laliga-11', name: 'Osasuna', logoUrl: '' },
  { id: 't-laliga-12', name: 'Getafe', logoUrl: '' },
  { id: 't-laliga-13', name: 'Celta Vigo', logoUrl: '' },
  { id: 't-laliga-14', name: 'Sevilla', logoUrl: '' },
  { id: 't-laliga-15', name: 'Mallorca', logoUrl: '' },
  { id: 't-laliga-16', name: 'Las Palmas', logoUrl: '' },
  { id: 't-laliga-17', name: 'Rayo Vallecano', logoUrl: '' },
  { id: 't-laliga-18', name: 'Cádiz', logoUrl: '' },
  { id: 't-laliga-19', name: 'Almería', logoUrl: '' },
  { id: 't-laliga-20', name: 'Granada', logoUrl: '' },
  
  // French Ligue 1
  { id: 't-ligue1-1', name: 'Paris Saint-Germain', logoUrl: '' },
  { id: 't-ligue1-2', name: 'AS Monaco', logoUrl: '' },
  { id: 't-ligue1-3', name: 'Marseille', logoUrl: '' },
  { id: 't-ligue1-4', name: 'Lyon', logoUrl: '' },
  { id: 't-ligue1-5', name: 'Lille', logoUrl: '' },
  { id: 't-ligue1-6', name: 'Nice', logoUrl: '' },
  { id: 't-ligue1-7', name: 'Lens', logoUrl: '' },
  { id: 't-ligue1-8', name: 'Rennes', logoUrl: '' },
  { id: 't-ligue1-9', name: 'Reims', logoUrl: '' },
  { id: 't-ligue1-10', name: 'Strasbourg', logoUrl: '' },
  { id: 't-ligue1-11', name: 'Nantes', logoUrl: '' },
  { id: 't-ligue1-12', name: 'Le Havre', logoUrl: '' },
  { id: 't-ligue1-13', name: 'Montpellier', logoUrl: '' },
  { id: 't-ligue1-14', name: 'Toulouse', logoUrl: '' },
  { id: 't-ligue1-15', name: 'Brest', logoUrl: '' },
  { id: 't-ligue1-16', name: 'Lorient', logoUrl: '' },
  { id: 't-ligue1-17', name: 'Clermont Foot', logoUrl: '' },
  { id: 't-ligue1-18', name: 'Metz', logoUrl: '' },
  { id: 't-ligue1-19', name: 'Auxerre', logoUrl: '' },
  { id: 't-ligue1-20', name: 'Angers', logoUrl: '' },

  // Italian Serie A
  { id: 't-seriea-1', name: 'Inter Milan', logoUrl: '' },
  { id: 't-seriea-2', name: 'AC Milan', logoUrl: '' },
  { id: 't-seriea-3', name: 'Juventus', logoUrl: '' },
  { id: 't-seriea-4', name: 'Bologna', logoUrl: '' },
  { id: 't-seriea-5', name: 'Roma', logoUrl: '' },
  { id: 't-seriea-6', name: 'Lazio', logoUrl: '' },
  { id: 't-seriea-7', name: 'Fiorentina', logoUrl: '' },
  { id: 't-seriea-8', name: 'Napoli', logoUrl: '' },
  { id: 't-seriea-9', name: 'Torino', logoUrl: '' },
  { id: 't-seriea-10', name: 'Genoa', logoUrl: '' },
  { id: 't-seriea-11', name: 'Monza', logoUrl: '' },
  { id: 't-seriea-12', name: 'Hellas Verona', logoUrl: '' },
  { id: 't-seriea-13', name: 'Lecce', logoUrl: '' },
  { id: 't-seriea-14', name: 'Udinese', logoUrl: '' },
  { id: 't-seriea-15', name: 'Cagliari', logoUrl: '' },
  { id: 't-seriea-16', name: 'Empoli', logoUrl: '' },
  { id: 't-seriea-17', name: 'Sassuolo', logoUrl: '' },
  { id: 't-seriea-18', name: 'Frosinone', logoUrl: '' },
  { id: 't-seriea-19', name: 'Salernitana', logoUrl: '' },
  { id: 't-seriea-20', name: 'Parma', logoUrl: '' },

  // German Bundesliga
  { id: 't-bundesliga-1', name: 'Bayer Leverkusen', logoUrl: '' },
  { id: 't-bundesliga-2', name: 'VfB Stuttgart', logoUrl: '' },
  { id: 't-bundesliga-3', name: 'FC Bayern Munich', logoUrl: '' },
  { id_ts: 't-bundesliga-4', name: 'RB Leipzig', logoUrl: '' },
  { id: 't-bundesliga-5', name: 'Borussia Dortmund', logoUrl: '' },
  { id: 't-bundesliga-6', name: 'Eintracht Frankfurt', logoUrl: '' },
  { id: 't-bundesliga-7', name: 'Hoffenheim', logoUrl: '' },
  { id: 't-bundesliga-8', name: 'Heidenheim', logoUrl: '' },
  { id: 't-bundesliga-9', name: 'Werder Bremen', logoUrl: '' },
  { id: 't-bundesliga-10', name: 'Freiburg', logoUrl: '' },
  { id: 't-bundesliga-11', name: 'Augsburg', logoUrl: '' },
  { id: 't-bundesliga-12', name: 'Wolfsburg', logoUrl: '' },
  { id: 't-bundesliga-13', name: 'Mainz 05', logoUrl: '' },
  { id: 't-bundesliga-14', name: 'Borussia Mönchengladbach', logoUrl: '' },
  { id: 't-bundesliga-15', name: 'Union Berlin', logoUrl: '' },
  { id: 't-bundesliga-16', name: 'Bochum', logoUrl: '' },
  { id: 't-bundesliga-17', name: 'Darmstadt 98', logoUrl: '' },
  { id: 't-bundesliga-18', name: 'FC Köln', logoUrl: '' },
  { id: 't-bundesliga-19', name: 'Hamburger SV', logoUrl: '' },
  { id: 't-bundesliga-20', name: 'Schalke 04', logoUrl: '' },
];

// --- PLAYERS ---
// Create 100 players, one for each team.
export const players: Player[] = teams.map((team, index) => ({
    id: `p${index + 1}`,
    name: `Player ${index + 1}`,
    team: team
}));

// --- LEAGUE DATA ---
// Initialize league table with the first 15 players
export const leagueTable: LeagueEntry[] = players.slice(0, 15).map((player, index) => ({
  rank: index + 1,
  player: player,
  played: 0,
  win: 0,
  draw: 0,
  loss: 0,
  goalsFor: 0,
  goalsAgainst: 0,
  goalDifference: 0,
  points: 0,
}));

export const leagueWinner: LeagueEntry | null = null;


// --- CUP DATA ---
// All cup data is cleared
export const cupData: CupRound[] = [];
export const cupWinner: Player | null = null;
