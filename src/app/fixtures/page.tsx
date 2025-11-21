
'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Pencil, RefreshCw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Team, CupMatch, LeagueEntry, Player } from '@/lib/types';
import { teams as allTeams, players, leagueTable as initialLeagueTable } from '@/lib/data';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ScoreForm } from '@/components/score-form';

const generateFixtures = (leaguePlayers: Player[]): CupMatch[] => {
    const fixtures: CupMatch[] = [];
    for (let i = 0; i < leaguePlayers.length; i++) {
        for (let j = i + 1; j < leaguePlayers.length; j++) {
            const player1 = leaguePlayers[i];
            const player2 = leaguePlayers[j];
            fixtures.push({
                id: `match-${player1.id}-${player2.id}`,
                matchNumber: fixtures.length + 1,
                team1: player1.team,
                team2: player2.team,
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
  
  const generateNewFixtures = () => {
    const leaguePlayers = leagueTable.map(entry => entry.player);
    return generateFixtures(leaguePlayers);
  }

  const [matches, setMatches] = useState<CupMatch[]>(generateNewFixtures);
  const [editingMatch, setEditingMatch] = useState<CupMatch | null>(null);

  const getPlayerByTeam = (teamId: string): Player | undefined => {
    return players.find(p => p.team.id === teamId);
  }
  
  const handleRefreshFixtures = () => {
    // Re-initialize league table and generate new fixtures
    setLeagueTable(initialLeagueTable);
    const newFixtures = generateFixtures(initialLeagueTable.map(entry => entry.player));
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
            winner: scores.score1 > scores.score2 ? m.team1 : scores.score2 > scores.score1 ? m.team2 : null,
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
    const team1Player = getPlayerByTeam(match.team1!.id);
    const team2Player = getPlayerByTeam(match.team2!.id);

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
                playerStats[oldResult] -= 1;
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
  
  const unplayedMatches = matches.filter(m => m.score1 === null);
  const playedMatches = matches.filter(m => m.score1 !== null);
  const leagueStarted = playedMatches.length > 0;

  const MatchList = ({ title, matchList }: {title: string, matchList: CupMatch[]}) => (
     <div>
        <h2 className="font-headline text-2xl font-bold tracking-tight mb-4">{title} ({matchList.length})</h2>
        {matchList.length === 0 ? (
          <div className="border rounded-lg p-8 text-center bg-card">
              <h2 className="text-xl font-medium text-muted-foreground">No matches in this category.</h2>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {matchList.map(match => (
              <Card key={match.id} className="flex flex-col">
                <CardContent className="flex-grow flex items-center justify-around p-4">
                  <div className="flex flex-col items-center gap-2 w-1/3 text-center">
                    <span className="font-semibold text-sm">{match.team1?.name}</span>
                    {match.score1 !== null && <span className="text-2xl font-bold text-primary">{match.score1}</span>}
                  </div>
                  <div className="text-2xl font-bold text-muted-foreground">
                    {match.score1 !== null ? '-' : 'VS'}
                  </div>
                  <div className="flex flex-col items-center gap-2 w-1/3 text-center">
                    <span className="font-semibold text-sm">{match.team2?.name}</span>
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
                <Button onClick={handleRefreshFixtures} disabled={leagueStarted}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh Fixtures
                </Button>
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
                Enter the final score for {editingMatch?.team1?.name} vs {editingMatch?.team2?.name}.
              </DialogDescription>
            </DialogHeader>
            {editingMatch && <ScoreForm match={editingMatch} onSave={(scores) => handleUpdateScore(editingMatch.id, scores)} />}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
