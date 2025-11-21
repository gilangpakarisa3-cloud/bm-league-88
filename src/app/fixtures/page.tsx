
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MatchForm } from '@/components/match-form';
import type { Team, CupMatch } from '@/lib/types';
import { teams } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';

type NewMatch = {
  team1Id: string;
  team2Id: string;
  date: Date;
}

export default function FixturesPage() {
  const [matches, setMatches] = useState<CupMatch[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleAddMatch = (data: NewMatch) => {
    const team1 = teams.find(t => t.id === data.team1Id);
    const team2 = teams.find(t => t.id === data.team2Id);

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
      setMatches(prevMatches => [...prevMatches, newMatch]);
    }
    setIsDialogOpen(false);
  };

  return (
    <div className="container mx-auto px-4 py-8">
       <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <h1 className="font-headline text-4xl font-extrabold tracking-tight">
                Fixtures
            </h1>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
                    Select the teams and enter the match details.
                  </DialogDescription>
                </DialogHeader>
                <MatchForm onSave={handleAddMatch} />
              </DialogContent>
            </Dialog>
        </div>
        {matches.length === 0 ? (
          <div className="border rounded-lg p-8 text-center bg-card">
              <h2 className="text-xl font-medium text-muted-foreground">No matches yet</h2>
              <p className="text-sm text-muted-foreground mt-2">Get started by adding a new match.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {matches.map(match => (
              <Card key={match.id}>
                <CardHeader>
                  <CardTitle className="text-sm text-center text-muted-foreground font-medium">
                    {match.date ? format(match.date, 'eeee, MMMM d, yyyy') : 'Date TBD'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-around p-4 pt-0">
                  <div className="flex flex-col items-center gap-2 w-1/3 text-center">
                    <span className="font-semibold text-sm">{match.team1?.name}</span>
                  </div>
                  <div className="text-2xl font-bold text-muted-foreground">VS</div>
                  <div className="flex flex-col items-center gap-2 w-1/3 text-center">
                    <span className="font-semibold text-sm">{match.team2?.name}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
