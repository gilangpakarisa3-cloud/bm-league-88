'use client';

import { useState, useMemo, useEffect } from 'react';
import { CupBracket } from '@/components/cup-bracket';
import { Button } from '@/components/ui/button';
import { PlusCircle, UserPlus, Play, Flag, Trophy } from 'lucide-react';
import Link from 'next/link';
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
import { useCollection, useFirestore, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import type { Season, Player, WithId, Match } from '@/lib/types';
import { RegisterPlayersForm } from '@/components/register-players-form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

// For simplicity, we'll work with a single, hardcoded cup.
const CUP_ID = 'main-cup';

// Function to generate rounds for a power-of-2 number of players
const generateBracket = (players: WithId<Player>[]) => {
  const matches: Omit<Match, 'seasonId' | 'matchDate'>[] = [];
  const numPlayers = players.length;
  const rounds = Math.log2(numPlayers);

  if (Math.ceil(rounds) !== Math.floor(rounds)) {
    // Not a power of 2, handle seeding or byes if necessary.
    // For now, we'll just truncate to the nearest power of 2 for simplicity.
    // In a real app, you would want a more robust solution.
    console.error("Number of players is not a power of 2. Bracket may be incomplete.");
  }
  
  const roundNames: { [key: number]: string } = {
    [2]: 'Final',
    [4]: 'Semi-finals',
    [8]: 'Quarter-finals',
    [16]: 'Round of 16',
    [32]: 'Round of 32',
  };

  const getRoundName = (numTeams: number) => {
    return roundNames[numTeams] || `Round of ${numTeams}`;
  }

  // Round 1
  const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
  let matchNumber = 1;
  const round1Name = getRoundName(numPlayers);

  for (let i = 0; i < numPlayers; i += 2) {
    matches.push({
      player1Id: shuffledPlayers[i].id,
      player2Id: shuffledPlayers[i + 1].id,
      isCompleted: false,
      round: round1Name,
      matchNumber: matchNumber++,
    });
  }
  
  let currentRoundPlayers = numPlayers / 2;
  let currentRoundName = round1Name;
  
  while(currentRoundPlayers >= 2) {
    const nextRoundName = getRoundName(currentRoundPlayers);
    for (let i = 0; i < currentRoundPlayers; i += 2) {
       matches.push({
         player1Id: 'TBD', // Winner of a previous match
         player2Id: 'TBD', // Winner of a previous match
         isCompleted: false,
         round: nextRoundName,
         matchNumber: matchNumber++,
       });
    }
    currentRoundPlayers /= 2;
  }


  return matches;
};

export default function CupPage() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const [activeSeasonId, setActiveSeasonId] = useState<string | null>(null);
  const [showCreateSeason, setShowCreateSeason] = useState(false);
  const [showRegisterPlayers, setShowRegisterPlayers] = useState(false);
  const [newSeasonName, setNewSeasonName] = useState('');
  
  // --- Firestore Data Hooks ---
  const seasonsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, `cups/${CUP_ID}/seasons`) : null),
    [firestore]
  );
  const { data: seasons, isLoading: isLoadingSeasons } = useCollection<Season>(seasonsCollection);

  const participantsCollection = useMemoFirebase(
    () =>
      firestore && activeSeasonId
        ? collection(firestore, `cups/${CUP_ID}/seasons/${activeSeasonId}/cupParticipants`)
        : null,
    [firestore, activeSeasonId]
  );
  const { data: participants, isLoading: isLoadingParticipants } = useCollection<Player>(participantsCollection);
  
  const matchesCollection = useMemoFirebase(
    () =>
      firestore && activeSeasonId
        ? collection(firestore, `cups/${CUP_ID}/seasons/${activeSeasonId}/matches`)
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

  // --- Effects ---
  useEffect(() => {
    if (seasons && !activeSeasonId) {
      const sortedSeasons = [...seasons].sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
      if (sortedSeasons.length > 0) {
        setActiveSeasonId(sortedSeasons[0].id);
      }
    }
  }, [seasons, activeSeasonId]);
  
  // --- Event Handlers ---
  const handleCreateSeason = () => {
    if (!firestore || !newSeasonName.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Season name cannot be empty.' });
      return;
    }
    const seasonsRef = collection(firestore, `cups/${CUP_ID}/seasons`);
    addDocumentNonBlocking(seasonsRef, {
      name: newSeasonName.trim(),
      status: 'Not Started',
      createdAt: serverTimestamp(),
    });
    toast({ title: 'Success', description: `Season '${newSeasonName.trim()}' created.` });
    setShowCreateSeason(false);
    setNewSeasonName('');
  };

  const handleRegisterPlayers = async (selectedPlayerIds: string[]) => {
    if (!firestore || !activeSeasonId || !allPlayers) return;

    const playersToRegister = allPlayers.filter(p => selectedPlayerIds.includes(p.id));
    if (playersToRegister.length === 0) return;
    
    const isPowerOfTwo = (n: number) => (n > 0) && ((n & (n - 1)) === 0);
    if (!isPowerOfTwo(playersToRegister.length)) {
      toast({ variant: "destructive", title: "Invalid Number of Players", description: "The number of players for a cup must be a power of 2 (e.g., 4, 8, 16)." });
      return;
    }

    const batch = writeBatch(firestore);
    
    // Register participants
    playersToRegister.forEach(player => {
        const participantRef = doc(firestore, `cups/${CUP_ID}/seasons/${activeSeasonId}/cupParticipants`, player.id);
        batch.set(participantRef, player);
    });

    // Generate and save bracket matches
    const newMatches = generateBracket(playersToRegister);
    newMatches.forEach(match => {
        const matchRef = doc(collection(firestore, `cups/${CUP_ID}/seasons/${activeSeasonId}/matches`));
        batch.set(matchRef, { ...match, seasonId: activeSeasonId, matchDate: serverTimestamp() });
    });

    try {
        await batch.commit();
        toast({ title: 'Success', description: `${playersToRegister.length} players registered and bracket generated.` });
    } catch (error) {
        console.error("Error registering players/generating bracket: ", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not complete registration.' });
    }
    
    setShowRegisterPlayers(false);
  };
  
  const handleUpdateSeasonStatus = (status: 'In Progress' | 'Completed') => {
    if (!firestore || !activeSeason) return;

    const seasonRef = doc(firestore, `cups/${CUP_ID}/seasons`, activeSeason.id);
    updateDocumentNonBlocking(seasonRef, { status });
    toast({ title: 'Season Updated', description: `Season status changed to '${status}'.` });
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
       <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
         <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <div className="space-y-2">
                <h1 className="font-headline text-4xl font-extrabold tracking-tight">Cup Tournament</h1>
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
                <Button onClick={() => setShowCreateSeason(true)} className="w-full sm:w-auto">
                <PlusCircle className="mr-2 h-4 w-4" />
                New Season
                </Button>
            </div>
        </div>

        {activeSeason && (
            <div className="mb-8 flex flex-wrap gap-2">
                <Button onClick={() => setShowRegisterPlayers(true)} disabled={activeSeason.status !== 'Not Started' || (participants || []).length > 0}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Register Players
                </Button>
                <Button onClick={() => handleUpdateSeasonStatus('In Progress')} variant="outline" disabled={activeSeason.status !== 'Not Started' || (participants || []).length < 2}>
                    <Play className="mr-2 h-4 w-4" />
                    Start Cup
                </Button>
                <Button onClick={() => handleUpdateSeasonStatus('Completed')} variant="outline" disabled={activeSeason.status !== 'In Progress'}>
                    <Flag className="mr-2 h-4 w-4" />
                    Finish Cup
                </Button>
                 <Button asChild variant="outline">
                    <Link href={`/cup/winner?seasonId=${activeSeasonId}`}>
                        <Trophy className="mr-2 h-4 w-4" />
                        View Champion
                    </Link>
                </Button>
            </div>
        )}

        <CupBracket 
          matches={matches || []} 
          players={allPlayers || []}
          isLoading={isLoadingMatches || isLoadingPlayers} 
        />
      </div>

       {/* Create Season Dialog */}
      <Dialog open={showCreateSeason} onOpenChange={setShowCreateSeason}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Cup Season</DialogTitle>
            <DialogDescription>Enter a name for the new cup season (e.g., "2024/25 Cup").</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input 
                placeholder="Cup season name"
                value={newSeasonName}
                onChange={(e) => setNewSeasonName(e.target.value)}
            />
            <Button onClick={handleCreateSeason} className="w-full">Create Season</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Register Players Dialog */}
      <Dialog open={showRegisterPlayers} onOpenChange={setShowRegisterPlayers}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Register Players for Cup</DialogTitle>
            <DialogDescription>Select players to include in the '{activeSeason?.name}' cup. The number of players must be a power of 2 (e.g., 4, 8, 16).</DialogDescription>
          </DialogHeader>
          <RegisterPlayersForm
            allPlayers={allPlayers || []}
            registeredPlayers={participants || []}
            onRegister={handleRegisterPlayers}
            isLoading={isLoadingPlayers}
          />
        </DialogContent>
      </Dialog>

    </div>
  );
}
