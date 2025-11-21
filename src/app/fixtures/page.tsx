
'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';
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
import { LeagueTable } from '@/components/league-table';

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
  const leaguePlayers = useMemo(() => initialLeagueTable.map(entry => entry.player), []);
  const initialMatches = useMemo(() => generateFixtures(leaguePlayers), [leaguePlayers]);

  const [matches, setMatches] = useState<CupMatch[]>(initialMatches);
  const [leagueTable, setLeagueTable] = useState<LeagueEntry[]>(initialLeagueTable);
  const [editingMatch, setEditingMatch] = useState<CupMatch | null>(null);

  const getPlayerByTeam = (teamId: string): Player | undefined => {
    return players.find(p => p.team.id === teamId);
  }

  const handleUpdateScore = (matchId: string, scores: { score1: number, score2: number }) => {
    let updatedMatch: CupMatch | null = null;
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
      updateLeagueTable(updatedMatch);
    }
  };

  const updateLeagueTable = (match: CupMatch) => {
    const team1Player = getPlayerByTeam(match.team1!.id);
    const team2Player = getPlayerByTeam(match.team2!.id);

    if (!team1Player || !team2Player) return;

    setLeagueTable(prevTable => {
        const newTable = [...prevTable];
        
        const updatePlayerStats = (playerId: string, isWinner: boolean, isDraw: boolean, goalsFor: number, goalsAgainst: number) => {
            const playerIndex = newTable.findIndex(p => p.player.id === playerId);
            if (playerIndex === -1) return;

            const playerStats = {...newTable[playerIndex]};
            
            const existingMatch = matches.find(m => m.id === match.id);
            const scoreAlreadyEntered = existingMatch?.score1 !== null && existingMatch?.score2 !== null;

            if (!scoreAlreadyEntered) {
                playerStats.played += 1;
            }

            playerStats.goalsFor = (playerStats.goalsFor - (existingMatch?.score1 ?? 0)) + goalsFor;
            playerStats.goalsAgainst = (playerStats.goalsAgainst - (existingMatch?.score2 ?? 0)) + goalsAgainst;
            
            if (isDraw) {
                if(!scoreAlreadyEntered) {
                    playerStats.draw += 1;
                    playerStats.points += 1;
                }
            } else if (isWinner) {
                if(!scoreAlreadyEntered) {
                    playerStats.win += 1;
                    playerStats.points += 3;
                } else {
                    // This handles if the result was a draw before and now is a win
                    if(existingMatch?.score1 === existingMatch?.score2) {
                        playerStats.draw -=1;
                        playerStats.win += 1;
                        playerStats.points += 2; // from 1 for a draw to 3 for a win
                    }
                }
            } else { // loss
                if(!scoreAlreadyEntered) {
                    playerStats.loss += 1;
                } else {
                    // This handles if the result was a draw before and now is a loss
                    if(existingMatch?.score1 === existingMatch?.score2) {
                        playerStats.draw -=1;
                        playerStats.loss += 1;
                        playerStats.points -= 1; // from 1 for a draw to 0 for a loss
                    }
                    // This handles if the result was a win before and now is a loss
                    if(existingMatch && existingMatch.score1 !== null && existingMatch.score2 !== null && existingMatch.score1 > existingMatch.score2) {
                         playerStats.win -=1;
                         playerStats.loss += 1;
                         playerStats.points -= 3;
                    }
                }
            }

            playerStats.goalDifference = playerStats.goalsFor - playerStats.goalsAgainst;
            newTable[playerIndex] = playerStats;
        };
        
        const isDraw = match.score1 === match.score2;
        const team1Won = match.score1! > match.score2!;

        updatePlayerStats(team1Player.id, team1Won, isDraw, match.score1!, match.score2!);
        updatePlayerStats(team2Player.id, !team1Won, isDraw, match.score2!, match.score1!);

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
            </div>
            <div className="space-y-12">
                <MatchList title="Remaining Matches" matchList={unplayedMatches} />
                <MatchList title="Completed Matches" matchList={playedMatches} />
            </div>
        </div>
        
        <div>
           <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <h2 className="font-headline text-3xl font-bold tracking-tight">
                    Live League Table
                </h2>
            </div>
            <LeagueTable tableData={leagueTable} />
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

    