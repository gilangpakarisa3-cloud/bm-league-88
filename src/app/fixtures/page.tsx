
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, Pencil } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MatchForm } from '@/components/match-form';
import type { Team, CupMatch, LeagueEntry, Player } from '@/lib/types';
import { teams as allTeams, players, leagueTable as initialLeagueTable } from '@/lib/data';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { ScoreForm } from '@/components/score-form';
import { LeagueTable } from '@/components/league-table';

type NewMatch = {
  team1Id: string;
  team2Id: string;
  date: Date;
}

type MatchWithScore = {
  team1Id: string;
  team2Id: string;
  score1: number;
  score2: number;
}

export default function FixturesPage() {
  const [matches, setMatches] = useState<CupMatch[]>([]);
  const [leagueTable, setLeagueTable] = useState<LeagueEntry[]>(initialLeagueTable);
  const [isAddMatchOpen, setIsAddMatchOpen] = useState(false);
  const [editingMatch, setEditingMatch] = useState<CupMatch | null>(null);

  const handleAddMatch = (data: NewMatch) => {
    const team1 = allTeams.find(t => t.id === data.team1Id);
    const team2 = allTeams.find(t => t.id === data.team2Id);

    if (team1 && team2) {
      const newMatch: CupMatch = {
        id: `match-${Date.now()}`,
        matchNumber: matches.length + 1,
        team1,
        team2,
        score1: null,
        score2: null,
        winner: null,
        date: data.date,
      };
      setMatches(prevMatches => [...prevMatches, newMatch].sort((a, b) => (a.date?.getTime() || 0) - (b.date?.getTime() || 0)));
    }
    setIsAddMatchOpen(false);
  };
  
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
            playerStats.played += 1;
            playerStats.goalsFor += goalsFor;
            playerStats.goalsAgainst += goalsAgainst;
            playerStats.goalDifference = playerStats.goalsFor - playerStats.goalsAgainst;

            if (isDraw) {
                playerStats.draw += 1;
                playerStats.points += 1;
            } else if (isWinner) {
                playerStats.win += 1;
                playerStats.points += 3;
            } else {
                playerStats.loss += 1;
            }
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

  return (
    <div className="container mx-auto px-4 py-8">
       <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-12">
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <h1 className="font-headline text-4xl font-extrabold tracking-tight">
                    Fixtures
                </h1>
                <Dialog open={isAddMatchOpen} onOpenChange={setIsAddMatchOpen}>
                  <DialogTrigger asChild>
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add New Match
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Match</DialogTitle>
                      <DialogDescription>
                        Select the teams and enter the match details. Only teams with registered players are shown.
                      </DialogDescription>
                    </DialogHeader>
                    <MatchForm onSave={handleAddMatch} />
                  </DialogContent>
                </Dialog>
            </div>
            {matches.length === 0 ? (
              <div className="border rounded-lg p-8 text-center bg-card">
                  <h2 className="text-xl font-medium text-muted-foreground">No matches scheduled</h2>
                  <p className="text-sm text-muted-foreground mt-2">Get started by adding a new match.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {matches.map(match => (
                  <Card key={match.id} className="flex flex-col">
                    <CardHeader>
                      <CardTitle className="text-sm text-center text-muted-foreground font-medium">
                        {match.date ? format(match.date, 'eeee, MMMM d, yyyy') : 'Date TBD'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-grow flex items-center justify-around p-4 pt-0">
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
