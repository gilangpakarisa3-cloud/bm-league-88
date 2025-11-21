'use client';

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Pencil, RefreshCw, Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc, writeBatch, query, getDocs, where, runTransaction } from 'firebase/firestore';
import type { Season, LeagueEntry, Player, WithId, Match } from '@/lib/types';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { ScoreForm } from '@/components/score-form';


// For simplicity, we'll work with a single, hardcoded league.
const LEAGUE_ID = 'main-league';


export default function FixturesPage() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const [activeSeasonId, setActiveSeasonId] = useState<string | null>(null);
  const [editingMatch, setEditingMatch] = useState<WithId<Match> | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // --- Firestore Data Hooks ---
  const seasonsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, `leagues/${LEAGUE_ID}/seasons`) : null),
    [firestore]
  );
  const { data: seasons, isLoading: isLoadingSeasons } = useCollection<Season>(seasonsCollection);
  
  const leagueTableCollection = useMemoFirebase(
    () =>
      firestore && activeSeasonId
        ? collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/leagueTable`)
        : null,
    [firestore, activeSeasonId]
  );
  const { data: leagueTable, isLoading: isLoadingTable } = useCollection<LeagueEntry>(leagueTableCollection);
  
  const matchesCollection = useMemoFirebase(
    () =>
      firestore && activeSeasonId
        ? collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/matches`)
        : null,
    [firestore, activeSeasonId]
  );
  const { data: matches, isLoading: isLoadingMatches } = useCollection<Match>(matchesCollection);
  
  const playersCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'players') : null),
    [firestore]
  );
  const { data: allPlayers, isLoading: isLoadingPlayers } = useCollection<Player>(playersCollection);

  // --- Memoized Derived State ---
  const activeSeason = useMemo(() => seasons?.find((s) => s.id === activeSeasonId) || null, [seasons, activeSeasonId]);

  const playersById = useMemo(() => {
    if (!allPlayers) return {};
    return allPlayers.reduce((acc, player) => {
      acc[player.id] = player;
      return acc;
    }, {} as Record<string, WithId<Player>>);
  }, [allPlayers]);
  
  // --- Effects ---
  useEffect(() => {
    if (seasons && !activeSeasonId && seasons.length > 0) {
      const sortedSeasons = [...seasons].sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
      setActiveSeasonId(sortedSeasons[0].id);
    }
  }, [seasons, activeSeasonId]);
  
  const handleGenerateFixtures = async () => {
    if (!firestore || !activeSeasonId || !leagueTable || leagueTable.length < 2) {
      toast({ variant: 'destructive', title: 'Error', description: 'Cannot generate fixtures. A season must be selected with at least 2 registered players.' });
      return;
    }
    
    if (activeSeason?.status !== 'In Progress') {
       toast({ variant: 'destructive', title: 'Error', description: 'Fixtures can only be generated for a season that is "In Progress".' });
       return;
    }

    const batch = writeBatch(firestore);
    
    // Home and away fixtures
    for (let i = 0; i < leagueTable.length; i++) {
        for (let j = 0; j < leagueTable.length; j++) {
            if (i === j) continue; // Players don't play against themselves

            const player1Entry = leagueTable[i];
            const player2Entry = leagueTable[j];

            const matchData: Omit<Match, 'id'> = {
                seasonId: activeSeasonId,
                player1Id: player1Entry.playerId,
                player2Id: player2Entry.playerId,
                isCompleted: false,
                matchDate: activeSeason.createdAt, // Placeholder date, can be updated later
            };
            const matchRef = doc(collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/matches`));
            batch.set(matchRef, matchData);
        }
    }
    
    try {
      await batch.commit();
      toast({ title: 'Fixtures Generated!', description: `Home and away fixtures have been created for ${activeSeason.name}.` });
    } catch(e) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not generate fixtures.' });
    }
  };


  const handleUpdateScore = async (matchId: string, scores: { score1: number, score2: number }) => {
    if (!firestore || !activeSeasonId) return;

    const matchRef = doc(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/matches`, matchId);
    const originalMatch = matches?.find(m => m.id === matchId);
    if (!originalMatch) return;
    
    const wasCompleted = originalMatch.isCompleted;
    const oldScores = { p1: originalMatch.player1Score ?? 0, p2: originalMatch.player2Score ?? 0 };

    try {
        await runTransaction(firestore, async (transaction) => {
            const tableEntriesRef = collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/leagueTable`);
            
            const p1EntryQuery = query(tableEntriesRef, where('playerId', '==', originalMatch.player1Id));
            const p2EntryQuery = query(tableEntriesRef, where('playerId', '==', originalMatch.player2Id));
            
            const [p1EntrySnap, p2EntrySnap] = await Promise.all([
                getDocs(p1EntryQuery),
                getDocs(p2EntryQuery)
            ]);

            if (p1EntrySnap.empty || p2EntrySnap.empty) {
                throw new Error("Could not find league entries for one or both players.");
            }
            
            const p1EntryRef = p1EntrySnap.docs[0].ref;
            const p2EntryRef = p2EntrySnap.docs[0].ref;
            
            const p1EntryData = p1EntrySnap.docs[0].data() as LeagueEntry;
            const p2EntryData = p2EntrySnap.docs[0].data() as LeagueEntry;
            
            // --- Calculate changes ---
            const newP1 = { ...p1EntryData };
            const newP2 = { ...p2EntryData };

            // 1. Revert old stats if match was already completed
            if (wasCompleted) {
                newP1.goalsFor -= oldScores.p1;
                newP1.goalsAgainst -= oldScores.p2;
                newP2.goalsFor -= oldScores.p2;
                newP2.goalsAgainst -= oldScores.p1;
                
                if (oldScores.p1 > oldScores.p2) { // P1 won
                    newP1.win -= 1;
                    newP1.points -= 3;
                    newP2.loss -= 1;
                } else if (oldScores.p2 > oldScores.p1) { // P2 won
                    newP2.win -= 1;
                    newP2.points -= 3;
                    newP1.loss -= 1;
                } else { // Draw
                    newP1.draw -= 1; newP1.points -= 1;
                    newP2.draw -= 1; newP2.points -= 1;
                }
            } else {
                 // If it's a new result, increment played count
                 newP1.played += 1;
                 newP2.played += 1;
            }
            
            // 2. Apply new stats
            newP1.goalsFor += scores.score1;
            newP1.goalsAgainst += scores.score2;
            newP2.goalsFor += scores.score2;
            newP2.goalsAgainst += scores.score1;
            
            if (scores.score1 > scores.score2) { // P1 wins
                newP1.win += 1; newP1.points += 3;
                newP2.loss += 1;
            } else if (scores.score2 > scores.score1) { // P2 wins
                newP2.win += 1; newP2.points += 3;
                newP1.loss += 1;
            } else { // Draw
                newP1.draw += 1; newP1.points += 1;
                newP2.draw += 1; newP2.points += 1;
            }
            
            newP1.goalDifference = newP1.goalsFor - newP1.goalsAgainst;
            newP2.goalDifference = newP2.goalsFor - newP2.goalsAgainst;

            // 3. Update documents in transaction
            transaction.update(p1EntryRef, newP1);
            transaction.update(p2EntryRef, newP2);
            transaction.update(matchRef, { 
                player1Score: scores.score1, 
                player2Score: scores.score2,
                isCompleted: true
            });
        });
        
        toast({ title: 'Score Updated', description: 'The match score and league table have been updated.' });

    } catch (e) {
        console.error("Transaction failed: ", e);
        toast({ variant: 'destructive', title: 'Update Failed', description: (e as Error).message || 'Could not update the score.' });
    }

    setEditingMatch(null);
  };
  
  const matchesWithPlayers = useMemo(() => {
    if (!matches || !allPlayers) return [];
    return matches
      .map(match => ({
        ...match,
        player1: playersById[match.player1Id] || null,
        player2: playersById[match.player2Id] || null,
      }))
      .filter(m => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        const p1Name = m.player1?.name.toLowerCase() || '';
        const p2Name = m.player2?.name.toLowerCase() || '';
        const p1Team = m.player1?.teamName.toLowerCase() || '';
        const p2Team = m.player2?.teamName.toLowerCase() || '';
        return p1Name.includes(term) || p2Name.includes(term) || p1Team.includes(term) || p2Team.includes(term);
      });
  }, [matches, allPlayers, playersById, searchTerm]);

  const unplayedMatches = matchesWithPlayers.filter(m => !m.isCompleted);
  const playedMatches = matchesWithPlayers.filter(m => m.isCompleted);
  const leagueStarted = activeSeason?.status === 'In Progress' && (matches || []).length > 0;

  const MatchList = ({ title, matchList }: { title: string, matchList: (WithId<Match> & { player1: WithId<Player> | null, player2: WithId<Player> | null })[] }) => (
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
                    <span className="text-xs text-muted-foreground">{match.player1?.teamName}</span>
                    {match.isCompleted && <span className="text-2xl font-bold text-primary">{match.player1Score}</span>}
                  </div>
                  <div className="text-2xl font-bold text-muted-foreground w-1/5 text-center">
                    {match.isCompleted ? '-' : 'VS'}
                  </div>
                  <div className="flex flex-col items-center gap-2 w-2/5 text-center">
                    <span className="font-semibold text-sm truncate w-full">{match.player2?.name}</span>
                    <span className="text-xs text-muted-foreground">{match.player2?.teamName}</span>
                    {match.isCompleted && <span className="text-2xl font-bold text-primary">{match.player2Score}</span>}
                  </div>
                </CardContent>
                <CardFooter className="p-4 pt-0">
                  <Button variant="outline" className="w-full" onClick={() => setEditingMatch(match)} disabled={activeSeason?.status !== 'In Progress'}>
                    <Pencil className="mr-2 h-4 w-4" />
                    {match.isCompleted ? 'Edit Score' : 'Update Score'}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
     </div>
  );

  const isLoading = isLoadingSeasons || isLoadingTable || isLoadingMatches || isLoadingPlayers;

  return (
    <div className="container mx-auto px-4 py-8">
       <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-12">
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                 <div className="space-y-2">
                    <h1 className="font-headline text-4xl font-extrabold tracking-tight">League Fixtures</h1>
                    {activeSeason && <p className="text-muted-foreground">{activeSeason.name} ({activeSeason.status})</p>}
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <Select value={activeSeasonId || ''} onValueChange={setActiveSeasonId} disabled={isLoadingSeasons}>
                        <SelectTrigger className="w-full sm:w-[180px]">
                            <SelectValue placeholder="Select a season" />
                        </SelectTrigger>
                        <SelectContent>
                            {seasons?.map(season => (
                                <SelectItem key={season.id} value={season.id}>{season.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                     <Button onClick={handleGenerateFixtures} disabled={!activeSeasonId || leagueStarted || activeSeason?.status !== 'In Progress'}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Generate Fixture
                    </Button>
                </div>
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
            {isLoading ? (
                <p>Loading fixtures...</p>
            ) : (
                 <div className="space-y-12">
                    <MatchList title="Remaining Matches" matchList={unplayedMatches} />
                    <MatchList title="Completed Matches" matchList={playedMatches} />
                </div>
            )}
        </div>

        <Dialog open={!!editingMatch} onOpenChange={(isOpen) => !isOpen && setEditingMatch(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Match Score</DialogTitle>
              <DialogDescription>
                Enter the final score for {editingMatch && playersById[editingMatch.player1Id]?.name} vs {editingMatch && playersById[editingMatch.player2Id]?.name}.
              </DialogDescription>
            </DialogHeader>
            {editingMatch && <ScoreForm match={editingMatch} onSave={(scores) => handleUpdateScore(editingMatch.id, scores)} players={allPlayers || []} />}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
