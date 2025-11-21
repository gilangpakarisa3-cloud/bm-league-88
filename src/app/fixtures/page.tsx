
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Pencil, RefreshCw, Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { CupMatch, LeagueEntry, Player } from '@/lib/types';
import { leagueTable as initialLeagueTable } from '@/lib/data';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { ScoreForm } from '@/components/score-form';
import { Input } from '@/components/ui/input';

const generateAllFixtures = (leaguePlayers: Player[]): CupMatch[] => {
    const fixtures: CupMatch[] = [];
    // Home and away fixtures
    for (let i = 0; i < leaguePlayers.length; i++) {
        for (let j = 0; j < leaguePlayers.length; j++) {
            if (i === j) continue; // Players don't play against themselves

            const player1 = leaguePlayers[i];
            const player2 = leaguePlayers[j];
            fixtures.push({
                id: `match-home-${player1.id}-away-${player2.id}`,
                matchNumber: fixtures.length + 1,
                player1: player1,
                player2: player2,
                team1: player1.team, // for compatibility
                team2: player2.team, // for compatibility
                score1: null,
                score2: null,
                winner: null,
            });
        }
    }
    return fixtures;
};


export default function FixturesPage() {
  const [leagueTable, setLeagueTable] = useState<LeagueEntry[]>(initialLeagueTable);
  
  const generateFixtures = () => {
    const leaguePlayers = initialLeagueTable.map(entry => entry.player);
    return generateAllFixtures(leaguePlayers);
  }

  const [matches, setMatches] = useState<CupMatch[]>(generateFixtures);
  const [editingMatch, setEditingMatch] = useState<CupMatch | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const handleGenerateFixtures = () => {
    // Re-initialize league table and generate new fixtures
    setLeagueTable(initialLeagueTable);
    const newFixtures = generateFixtures();
    setMatches(newFixtures);
  };

  const handleUpdateScore = (matchId: string, scores: { score1: number, score2: number }) => {
    let updatedMatch: CupMatch | null = null;
    const originalMatch = matches.find(m => m.id === matchId);

    setMatches(prevMatches =>
      prevMatches.map(m => {
        if (m.id === matchId) {
          updatedMatch = {
            ...m,
            score1: scores.score1,
            score2: scores.score2,
            winner: scores.score1 > scores.score2 ? m.player1 : scores.score2 > scores.score1 ? m.player2 : null,
          };
          return updatedMatch;
        }
        return m;
      })
    );
    setEditingMatch(null);

    if (updatedMatch) {
      updateLeagueTable(updatedMatch, originalMatch);
    }
  };

  const updateLeagueTable = (match: CupMatch, originalMatch: CupMatch | undefined) => {
    const team1Player = match.player1;
    const team2Player = match.player2;

    if (!team1Player || !team2Player) return;

    const scoreAlreadyEntered = originalMatch?.score1 !== null && originalMatch?.score2 !== null;

    setLeagueTable(prevTable => {
        const newTable = [...prevTable];
        
        const updatePlayerStats = (
            playerId: string, 
            goalsFor: number, 
            goalsAgainst: number,
            oldGoalsFor: number,
            oldGoalsAgainst: number,
            result: 'win' | 'draw' | 'loss',
            oldResult: 'win' | 'draw' | 'loss' | null
        ) => {
            const playerIndex = newTable.findIndex(p => p.player.id === playerId);
            if (playerIndex === -1) return;

            const playerStats = {...newTable[playerIndex]};
            
            // Update Played
            if (!scoreAlreadyEntered) {
                playerStats.played += 1;
            }

            // Update Goals
            playerStats.goalsFor = playerStats.goalsFor - oldGoalsFor + goalsFor;
            playerStats.goalsAgainst = playerStats.goalsAgainst - oldGoalsAgainst + goalsAgainst;
            playerStats.goalDifference = playerStats.goalsFor - playerStats.goalsAgainst;

            // Update W/D/L and Points
            if (oldResult) {
                if (playerStats[oldResult] > 0) playerStats[oldResult] -= 1;
                playerStats.points -= oldResult === 'win' ? 3 : oldResult === 'draw' ? 1 : 0;
            }
            
            playerStats[result] += 1;
            playerStats.points += result === 'win' ? 3 : result === 'draw' ? 1 : 0;

            newTable[playerIndex] = playerStats;
        };
        
        const getResult = (score1: number | null, score2: number | null): 'win' | 'draw' | 'loss' | null => {
            if (score1 === null || score2 === null) return null;
            if (score1 > score2) return 'win';
            if (score1 < score2) return 'loss';
            return 'draw';
        }

        const newResult1 = getResult(match.score1, match.score2);
        const newResult2 = getResult(match.score2, match.score1);
        const oldResult1 = getResult(originalMatch?.score1 ?? null, originalMatch?.score2 ?? null);
        const oldResult2 = getResult(originalMatch?.score2 ?? null, originalMatch?.score1 ?? null);

        if(newResult1) updatePlayerStats(team1Player.id, match.score1!, match.score2!, originalMatch?.score1 ?? 0, originalMatch?.score2 ?? 0, newResult1, oldResult1);
        if(newResult2) updatePlayerStats(team2Player.id, match.score2!, match.score1!, originalMatch?.score2 ?? 0, originalMatch?.score1 ?? 0, newResult2, oldResult2);
        
        newTable.sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
            if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
            return a.player.name.localeCompare(b.player.name);
        });

        return newTable.map((entry, index) => ({ ...entry, rank: index + 1 }));
    });
  };

  const filteredMatches = matches.filter(match => {
    const term = searchTerm.toLowerCase();
    const player1Name = match.player1?.name.toLowerCase() || '';
    const player2Name = match.player2?.name.toLowerCase() || '';
    const team1Name = match.player1?.team.name.toLowerCase() || '';
    const team2Name = match.player2?.team.name.toLowerCase() || '';

    return player1Name.includes(term) ||
           player2Name.includes(term) ||
           team1Name.includes(term) ||
           team2Name.includes(term);
  });
  
  const unplayedMatches = filteredMatches.filter(m => m.score1 === null);
  const playedMatches = filteredMatches.filter(m => m.score1 !== null);
  const leagueStarted = matches.some(m => m.score1 !== null);

  const MatchList = ({ title, matchList }: {title: string, matchList: CupMatch[]}) => (
     <div>
        <h2 className="font-headline text-2xl font-bold tracking-tight mb-4">{title} ({matchList.length})</h2>
        {matchList.length === 0 ? (
          <div className="border rounded-lg p-8 text-center bg-card">
              <h2 className="text-xl font-medium text-muted-foreground">{searchTerm ? 'No matches found.' : 'No matches in this category.'}</h2>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {matchList.map(match => (
              <Card key={match.id} className="flex flex-col">
                <CardContent className="flex-grow flex items-center justify-around p-4">
                  <div className="flex flex-col items-center gap-2 w-2/5 text-center">
                    <span className="font-semibold text-sm truncate w-full">{match.player1?.name}</span>
                    <span className="text-xs text-muted-foreground">{match.player1?.team.name}</span>
                    {match.score1 !== null && <span className="text-2xl font-bold text-primary">{match.score1}</span>}
                  </div>
                  <div className="text-2xl font-bold text-muted-foreground w-1/5 text-center">
                    {match.score1 !== null ? '-' : 'VS'}
                  </div>
                  <div className="flex flex-col items-center gap-2 w-2/5 text-center">
                    <span className="font-semibold text-sm truncate w-full">{match.player2?.name}</span>
                    <span className="text-xs text-muted-foreground">{match.player2?.team.name}</span>
                    {match.score2 !== null && <span className="text-2xl font-bold text-primary">{match.score2}</span>}
                  </div>
                </CardContent>
                <CardFooter className="p-4 pt-0">
                  <Button variant="outline" className="w-full" onClick={() => setEditingMatch(match)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    {match.score1 !== null ? 'Edit Score' : 'Update Score'}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
     </div>
  );


  return (
    <div className="container mx-auto px-4 py-8">
       <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-12">
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <h1 className="font-headline text-4xl font-extrabold tracking-tight">
                    League Fixtures
                </h1>
                <Button onClick={handleGenerateFixtures} disabled={leagueStarted}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Generate Fixture
                </Button>
            </div>
            <div className="mb-8 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by player or team..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="space-y-12">
                <MatchList title="Remaining Matches" matchList={unplayedMatches} />
                <MatchList title="Completed Matches" matchList={playedMatches} />
            </div>
        </div>

        <Dialog open={!!editingMatch} onOpenChange={(isOpen) => !isOpen && setEditingMatch(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Match Score</DialogTitle>
              <DialogDescription>
                Enter the final score for {editingMatch?.player1?.name} vs {editingMatch?.player2?.name}.
              </DialogDescription>
            </DialogHeader>
            {editingMatch && <ScoreForm match={editingMatch} onSave={(scores) => handleUpdateScore(editingMatch.id, scores)} />}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

    