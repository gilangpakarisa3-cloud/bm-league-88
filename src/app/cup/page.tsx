
'use client';

import { useState, useMemo, useEffect } from 'react';
import { CupBracket } from '@/components/cup-bracket';
import { Button } from '@/components/ui/button';
import { PlusCircle, UserPlus, Play, Flag, Trophy, Pencil, Trash2, Share2, Copy, CalendarIcon } from 'lucide-react';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { collection, doc, serverTimestamp, writeBatch, query, getDocs, deleteDoc, runTransaction, where, Timestamp } from 'firebase/firestore';
import type { Season, Player, WithId, Match } from '@/lib/types';
import { RegisterPlayersForm } from '@/components/register-players-form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ScoreForm } from '@/components/score-form';
import { ShareDialog } from '@/components/share-dialog';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';


// For simplicity, we'll work with a single, hardcoded cup.
const CUP_ID = 'main-cup';

const generateBracket = (players: WithId<Player>[]) => {
    // 1. Initial setup
    let playersList = [...players].sort(() => Math.random() - 0.5); // Shuffle for seeding
    const numPlayers = playersList.length;

    if (numPlayers < 2) return [];

    const roundNames: { [key: number]: string } = {
        2: 'Final',
        4: 'Semi-finals',
        8: 'Quarter-finals',
        16: 'Round of 16',
        32: 'Round of 32',
        64: 'Round of 64',
    };

    // 2. Determine bracket size
    const bracketSize = Math.pow(2, Math.ceil(Math.log2(numPlayers)));
    const byes = bracketSize - numPlayers;
    
    // 3. Create rounds
    const rounds: { name: string, matches: Omit<Match, 'seasonId' | 'matchDate'>[] }[] = [];
    let currentRoundSize = bracketSize;
    let matchCounter = 1;

    // Add a preliminary round if necessary (when not a power of 2)
    if (byes > 0) {
      const numPreliminaryMatches = numPlayers - byes;
      const prelimMatches: Omit<Match, 'seasonId' | 'matchDate'>[] = [];
      for (let i = 0; i < numPreliminaryMatches; i++) {
        prelimMatches.push({
          player1Id: 'TBD',
          player2Id: 'TBD',
          isCompleted: false,
          round: 'Preliminary Round',
          matchNumber: matchCounter++,
        });
      }
      if (prelimMatches.length > 0) {
        rounds.push({ name: 'Preliminary Round', matches: prelimMatches });
      }
    }
    
    // Create main bracket rounds
    while (currentRoundSize >= 2) {
        const roundName = roundNames[currentRoundSize] || `Round of ${currentRoundSize}`;
        const numMatchesInRound = currentRoundSize / 2;
        const matchesInRound: Omit<Match, 'seasonId' | 'matchDate'>[] = [];
        for (let i = 0; i < numMatchesInRound; i++) {
            matchesInRound.push({
                player1Id: 'TBD',
                player2Id: 'TBD',
                isCompleted: false,
                round: roundName,
                matchNumber: matchCounter++,
            });
        }
        rounds.unshift({ name: roundName, matches: matchesInRound }); // unshift to build from final to first
        currentRoundSize /= 2;
    }


    // 4. Assign players
    const playersWithByes = playersList.slice(0, byes);
    const playersInPrelim = playersList.slice(byes);

    // Assign prelim players
    const prelimRound = rounds.find(r => r.name === 'Preliminary Round');
    if (prelimRound) {
        for(let i = 0; i < prelimRound.matches.length; i++) {
            prelimRound.matches[i].player1Id = playersInPrelim[i*2]?.id || 'TBD';
            prelimRound.matches[i].player2Id = playersInPrelim[i*2+1]?.id || 'TBD';
        }
    }

    // Assign bye players to the first main round
    const firstMainRound = rounds.find(r => r.name !== 'Preliminary Round');
    if (firstMainRound) {
        let byePlayerIndex = 0;
        for (let i = 0; i < firstMainRound.matches.length && byePlayerIndex < playersWithByes.length; i++) {
            if (firstMainRound.matches[i].player1Id === 'TBD') {
                firstMainRound.matches[i].player1Id = playersWithByes[byePlayerIndex++]?.id || 'TBD';
            } else if (firstMainRound.matches[i].player2Id === 'TBD') {
                firstMainRound.matches[i].player2Id = playersWithByes[byePlayerIndex++]?.id || 'TBD';
            }
        }
    }

    // Flatten all matches into a single array
    const allMatches = rounds.flatMap(r => r.matches);

    // Auto-advance bye players
    const byePlayerIds = new Set(playersWithByes.map(p => p.id));
    const firstRoundMatches = allMatches.filter(m => m.round === firstMainRound?.name);

    firstRoundMatches.forEach(match => {
        const isP1Bye = byePlayerIds.has(match.player1Id);
        const isP2Bye = byePlayerIds.has(match.player2Id);

        if (isP1Bye && match.player2Id === 'TBD') {
            match.player2Id = 'BYE';
            match.isCompleted = true;
        } else if (isP2Bye && match.player1Id === 'TBD') {
            match.player1Id = 'BYE';
            match.isCompleted = true;
        }
    });
    
    // This is a simplified advancement, a more robust solution would trace winners up the bracket
    // but for initial generation this places the byes correctly.
    const advanceByeWinners = () => {
        const mainRounds = rounds.filter(r => r.name !== 'Preliminary Round');
        for (let i = 0; i < mainRounds.length - 1; i++) {
            const currentRound = mainRounds[i];
            const nextRound = mainRounds[i + 1];

            currentRound.matches.forEach((match, matchIndex) => {
                if (match.isCompleted && match.player2Id === 'BYE') {
                    const winnerId = match.player1Id;
                    const nextMatchIndex = Math.floor(matchIndex / 2);
                    const slot = matchIndex % 2 === 0 ? 'player1Id' : 'player2Id';
                    if (nextRound.matches[nextMatchIndex]) {
                       (nextRound.matches[nextMatchIndex] as any)[slot] = winnerId;
                    }
                }
            });
        }
    };
    
    advanceByeWinners();

    return allMatches.sort((a, b) => (a.matchNumber || 0) - (b.matchNumber || 0));
};

export default function CupPage() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const [activeSeasonId, setActiveSeasonId] = useState<string | null>(null);
  const [showCreateSeason, setShowCreateSeason] = useState(false);
  const [showRegisterPlayers, setShowRegisterPlayers] = useState(false);
  const [newSeasonName, setNewSeasonName] = useState('');
  const [editingSeason, setEditingSeason] = useState<WithId<Season> | null>(null);
  const [deletingSeason, setDeletingSeason] = useState<WithId<Season> | null>(null);
  const [editingMatch, setEditingMatch] = useState<WithId<Match> | null>(null);
  const [passwordProtectedMatch, setPasswordProtectedMatch] = useState<WithId<Match> | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareText, setShareText] = useState('');
  const [dateRange, setDateRange] = useState<{from: Date | undefined, to: Date | undefined}>({ from: undefined, to: undefined });
  
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
  
  const allPlayersCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'players') : null),
    [firestore]
  );
  const { data: allPlayersData, isLoading: isLoadingPlayers } = useCollection<Player>(allPlayersCollection);
  
  const allPlayers = useMemo(() => {
    if (!allPlayersData) return [];
    // Add a placeholder for BYE so we can look it up
    const byePlayer: WithId<Player> = { id: 'BYE', name: 'BYE', teamId: '', teamName: '' };
    return [...allPlayersData, byePlayer];
  }, [allPlayersData]);


  // --- Memoized Derived State ---
  const activeSeason = useMemo(() => seasons?.find((s) => s.id === activeSeasonId) || null, [seasons, activeSeasonId]);
  
  const sortedMatches = useMemo(() => {
    if (!matches) return [];
    return [...matches].sort((a,b) => (a.matchNumber || 0) - (b.matchNumber || 0));
  }, [matches])

  const formattedDateRange = useMemo(() => {
    if (!activeSeason || !activeSeason.startDate || !activeSeason.endDate) return null;
    const start = format(activeSeason.startDate.toDate(), 'd LLL');
    const end = format(activeSeason.endDate.toDate(), 'd LLL yyyy');
    return `${start} - ${end}`;
  }, [activeSeason]);

  // --- Effects ---
  useEffect(() => {
    // When seasons load, if no season is active, select the most recent one.
    if (seasons && !activeSeasonId && seasons.length > 0) {
      const sortedSeasons = [...seasons].sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
      setActiveSeasonId(sortedSeasons[0].id);
    }
    // if the active season is deleted, reset the active season
    if (seasons && activeSeasonId && !seasons.find(s => s.id === activeSeasonId)) {
        const sortedSeasons = [...seasons].sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
        setActiveSeasonId(sortedSeasons.length > 0 ? sortedSeasons[0].id : null);
    }
  }, [seasons, activeSeasonId]);
  
  // --- Event Handlers ---
  const handleSeasonDialogSubmit = () => {
    if (!firestore || !newSeasonName.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Season name cannot be empty.' });
      return;
    }
    
    const seasonData: Partial<Season> = {
        name: newSeasonName.trim(),
        ...(dateRange.from && { startDate: Timestamp.fromDate(dateRange.from) }),
        ...(dateRange.to && { endDate: Timestamp.fromDate(dateRange.to) }),
    }

    if (editingSeason) {
      // Update existing season
      const seasonRef = doc(firestore, `cups/${CUP_ID}/seasons`, editingSeason.id);
      updateDocumentNonBlocking(seasonRef, seasonData);
      toast({ title: 'Success', description: `Season name updated to '${newSeasonName.trim()}'.` });
    } else {
      // Create new season
      const seasonsRef = collection(firestore, `cups/${CUP_ID}/seasons`);
      addDocumentNonBlocking(seasonsRef, {
        ...seasonData,
        status: 'Not Started',
        createdAt: serverTimestamp(),
      });
      toast({ title: 'Success', description: `Season '${newSeasonName.trim()}' created.` });
    }
    setShowCreateSeason(false);
    setEditingSeason(null);
    setNewSeasonName('');
    setDateRange({ from: undefined, to: undefined });
  };

  const handleOpenEditDialog = () => {
    if (activeSeason) {
      setEditingSeason(activeSeason);
      setNewSeasonName(activeSeason.name);
      setDateRange({
        from: activeSeason.startDate?.toDate(),
        to: activeSeason.endDate?.toDate(),
      });
      setShowCreateSeason(true);
    }
  };

  const handleOpenCreateDialog = () => {
    setEditingSeason(null);
    setNewSeasonName('');
    setDateRange({ from: undefined, to: undefined });
    setShowCreateSeason(true);
  }

  const handleDeleteSeason = async () => {
    if (!firestore || !deletingSeason) return;

    try {
      // 1. Delete subcollections (matches, cupParticipants)
      const subcollections = ['matches', 'cupParticipants'];
      for (const sub of subcollections) {
        const subcollectionRef = collection(firestore, `cups/${CUP_ID}/seasons/${deletingSeason.id}/${sub}`);
        const snapshot = await getDocs(subcollectionRef);
        const batch = writeBatch(firestore);
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
      }

      // 2. Delete the season document itself
      const seasonRef = doc(firestore, `cups/${CUP_ID}/seasons`, deletingSeason.id);
      await deleteDoc(seasonRef);

      toast({ title: 'Season Deleted', description: `'${deletingSeason.name}' and all its data have been removed.` });
    } catch (error) {
      console.error("Error deleting season: ", error);
      toast({ variant: 'destructive', title: 'Deletion Failed', description: 'Could not delete the season and its data.' });
    }

    setDeletingSeason(null);
  };


  const handleRegisterPlayers = async (selectedPlayerIds: string[]) => {
    if (!firestore || !activeSeasonId || !allPlayers) return;

    const playersToRegister = allPlayers.filter(p => selectedPlayerIds.includes(p.id));
    
    // Prevent re-registering players who are already in.
    const alreadyRegisteredIds = new Set((participants || []).map(p => p.id));
    const newPlayersToRegister = playersToRegister.filter(p => !alreadyRegisteredIds.has(p.id));

    if (newPlayersToRegister.length === 0) {
        toast({ title: 'No new players to register.'});
        setShowRegisterPlayers(false);
        return;
    }
    
    if (activeSeason?.status !== 'Not Started') {
      toast({ variant: 'destructive', title: 'Registration Closed', description: 'Cannot register players for a cup that is in progress or completed.' });
      return;
    }

    const batch = writeBatch(firestore);
    
    // Register participants
    newPlayersToRegister.forEach(player => {
        const participantRef = doc(firestore, `cups/${CUP_ID}/seasons/${activeSeasonId}/cupParticipants`, player.id);
        batch.set(participantRef, player);
    });

    // --- Generate Bracket Logic ---
    // First, clear any existing matches for this season to re-generate them.
    const existingMatchesQuery = query(collection(firestore, `cups/${CUP_ID}/seasons/${activeSeasonId}/matches`));
    const existingMatchesSnap = await getDocs(existingMatchesQuery);
    existingMatchesSnap.forEach(doc => batch.delete(doc.ref));

    // Then, generate new matches with all currently registered participants.
    const allRegisteredPlayers = [...(participants || []), ...newPlayersToRegister];
    const uniquePlayers = allRegisteredPlayers.filter((p, i, a) => a.findIndex(t => t.id === p.id) === i);
    
    const newMatches = generateBracket(uniquePlayers);
    newMatches.forEach(match => {
        const matchRef = doc(collection(firestore, `cups/${CUP_ID}/seasons/${activeSeasonId}/matches`));
        batch.set(matchRef, { ...match, seasonId: activeSeasonId, matchDate: serverTimestamp() });
    });

    try {
        await batch.commit();
        toast({ title: 'Success', description: `${newPlayersToRegister.length} players registered and bracket (re)generated.` });
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
  
  const handleUpdateScore = async (matchId: string, scores: { score1: number; score2: number }) => {
    if (!firestore || !activeSeasonId || !matches) return;
  
    const matchRef = doc(firestore, `cups/${CUP_ID}/seasons/${activeSeasonId}/matches`, matchId);
    const currentMatch = matches.find(m => m.id === matchId);
    if (!currentMatch) return;
  
    const winnerId = scores.score1 > scores.score2 ? currentMatch.player1Id : currentMatch.player2Id;
    
    // Create a deterministic order for rounds
     const roundOrder = ['Final', 'Semi-finals', 'Quarter-finals', 'Round of 16', 'Round of 32', 'Round of 64', 'Preliminary Round'];
    const roundsInBracket = [...new Set(sortedMatches.map(m => m.round || ''))]
        .filter(Boolean)
        .sort((a,b) => roundOrder.indexOf(b) - roundOrder.indexOf(a)).reverse();
    
    try {
      await runTransaction(firestore, async (transaction) => {
        // 1. Update the current match score
        transaction.update(matchRef, {
          player1Score: scores.score1,
          player2Score: scores.score2,
          isCompleted: true,
        });
  
        // 2. Find and update the next match if this isn't the final
        if (currentMatch.round !== 'Final') {
          const currentRoundIndex = roundsInBracket.indexOf(currentMatch.round || '');
          const nextRoundName = roundsInBracket[currentRoundIndex + 1];

          if (nextRoundName) {
              const currentRoundMatches = sortedMatches.filter(m => m.round === currentMatch.round);
              const nextRoundMatches = sortedMatches.filter(m => m.round === nextRoundName);

              // Find the match this winner should advance to.
              const matchIndexInCurrentRound = currentRoundMatches.findIndex(m => m.id === currentMatch.id);
              
              // Find the player who is advancing from the preliminary round
              const prelimMatches = sortedMatches.filter(m => m.round === 'Preliminary Round');
              const numByePlayers = (2 ** Math.ceil(Math.log2(participants?.length || 2))) - (participants?.length || 0);
              
              let nextMatchIndex;
              // If we are in the preliminary round, the winner plays against a bye player
              if (currentMatch.round === 'Preliminary Round') {
                nextMatchIndex = numByePlayers + matchIndexInCurrentRound;
              } else {
                nextMatchIndex = Math.floor(matchIndexInCurrentRound / 2);
              }

              const nextMatch = nextRoundMatches[nextMatchIndex];

              if (nextMatch) {
                  const nextMatchRef = doc(firestore, `cups/${CUP_ID}/seasons/${activeSeasonId}/matches`, nextMatch.id);
                  let isPlayer1Slot = matchIndexInCurrentRound % 2 === 0;

                  // If advancing from prelim, slot might be P2
                  if(currentMatch.round !== 'Preliminary Round' && nextMatch.player1Id !== 'TBD' && nextMatch.player2Id === 'TBD') {
                    isPlayer1Slot = false;
                  } else if (currentMatch.round === 'Preliminary Round') {
                    isPlayer1Slot = false; // prelim winners always go to p2 slot of first main round matches
                  }


                  if (isPlayer1Slot) {
                      transaction.update(nextMatchRef, { player1Id: winnerId });
                  } else {
                      transaction.update(nextMatchRef, { player2Id: winnerId });
                  }
              }
          }
        }
      });
  
      toast({ title: "Score Updated", description: "Match result saved and bracket updated." });
    } catch (e) {
      console.error("Failed to update score and advance winner: ", e);
      toast({ variant: 'destructive', title: 'Update Failed', description: (e as Error).message });
    }
  
    setEditingMatch(null);
  };
  
  const handleShareParticipants = () => {
    if (!activeSeason || !participants || participants.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No participants to share',
        description: 'Register players for this season first.',
      });
      return;
    }

    const seasonName = activeSeason.name;
    const header = `*Cup Participants - ${seasonName}*\n\n`;
    
    const participantsList = participants
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((p, index) => `${index + 1}. ${p.name} (${p.teamName})`)
      .join('\n');
      
    setShareText(header + participantsList);
    setShareDialogOpen(true);
  };

  const handlePasswordCheck = () => {
    if (passwordInput === 'Office88') {
      if (passwordProtectedMatch) {
        setEditingMatch(passwordProtectedMatch);
      }
      setPasswordProtectedMatch(null);
      setPasswordInput('');
    } else {
      toast({
        variant: 'destructive',
        title: 'Incorrect Password',
        description: 'You do not have permission to edit a completed match.',
      });
    }
  };

  const handleMatchClick = (match: WithId<Match>) => {
    if (match.player1Id === 'TBD' || match.player2Id === 'TBD') {
        toast({ title: 'Match Not Ready', description: 'This match is waiting for players to advance.'});
        return;
    }
    if (match.isCompleted && match.player2Id !== 'BYE') {
      setPasswordProtectedMatch(match);
    } else if (match.player2Id !== 'BYE') {
      setEditingMatch(match);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
       <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
         <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <div className="space-y-1">
                <h1 className="font-headline text-4xl font-extrabold tracking-tight">Cup Tournament</h1>
                {activeSeason && (
                  <>
                    <p className="text-xl font-bold text-muted-foreground">{activeSeason.name} ({activeSeason.status})</p>
                    {formattedDateRange && <p className="text-sm font-medium text-primary">{formattedDateRange}</p>}
                  </>
                )}
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
                 <div className="flex gap-2">
                    <Button onClick={handleOpenCreateDialog} className="w-full sm:w-auto">
                      <PlusCircle className="mr-2 h-4 w-4" />
                      New
                    </Button>
                    <Button onClick={handleOpenEditDialog} variant="outline" size="icon" disabled={!activeSeason || activeSeason.status !== 'Not Started'}>
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Edit Season</span>
                    </Button>
                    <Button onClick={() => activeSeason && setDeletingSeason(activeSeason)} variant="destructive" size="icon" disabled={!activeSeason}>
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete Season</span>
                    </Button>
                </div>
            </div>
        </div>

        {activeSeason && (
            <div className="mb-8 flex flex-wrap gap-2">
                <Button onClick={() => setShowRegisterPlayers(true)} disabled={activeSeason.status !== 'Not Started'}>
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
                 <Button onClick={handleShareParticipants} variant="outline" disabled={!participants || participants.length === 0}>
                    <Share2 className="mr-2 h-4 w-4" />
                    Share Participants
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
          matches={sortedMatches || []} 
          players={allPlayers || []}
          isLoading={isLoadingMatches || isLoadingPlayers} 
          onUpdateMatch={handleMatchClick}
          seasonStatus={activeSeason?.status}
        />
      </div>

       {/* Create/Edit Season Dialog */}
      <Dialog open={showCreateSeason} onOpenChange={(isOpen) => { if (!isOpen) { setShowCreateSeason(false); setEditingSeason(null); }}}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSeason ? 'Edit Cup Season' : 'Create New Cup Season'}</DialogTitle>
            <DialogDescription>{editingSeason ? 'Update the details for this cup season.' : 'Enter the details for the new cup season.'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
             <div className="space-y-2">
                <Label htmlFor="season-name">Season Name</Label>
                <Input 
                    id="season-name"
                    placeholder="e.g., 2024/25 Cup"
                    value={newSeasonName}
                    onChange={(e) => setNewSeasonName(e.target.value)}
                />
            </div>
            <div className="space-y-2">
                <Label>Date Range</Label>
                <Popover>
                    <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateRange.from && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange.from ? (
                        dateRange.to ? (
                            <>
                            {format(dateRange.from, "LLL dd, y")} -{" "}
                            {format(dateRange.to, "LLL dd, y")}
                            </>
                        ) : (
                            format(dateRange.from, "LLL dd, y")
                        )
                        ) : (
                        <span>Pick a date range</span>
                        )}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={dateRange.from}
                        selected={dateRange}
                        onSelect={(range) => setDateRange(range || { from: undefined, to: undefined })}
                        numberOfMonths={2}
                    />
                    </PopoverContent>
                </Popover>
            </div>
            <Button onClick={handleSeasonDialogSubmit} className="w-full">
              {editingSeason ? 'Save Changes' : 'Create Season'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
       {/* Delete Season Confirmation Dialog */}
        <AlertDialog open={!!deletingSeason} onOpenChange={(isOpen) => !isOpen && setDeletingSeason(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the <strong>{deletingSeason?.name}</strong> season, including all its matches and registered players.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteSeason} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

      {/* Register Players Dialog */}
      <Dialog open={showRegisterPlayers} onOpenChange={setShowRegisterPlayers}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Register Players for Cup</DialogTitle>
            <DialogDescription>Select players to include in the '{activeSeason?.name}' cup. The bracket will be regenerated based on the final player list.</DialogDescription>
          </DialogHeader>
          <RegisterPlayersForm
            allPlayers={allPlayersData || []}
            registeredPlayers={participants || []}
            onRegister={handleRegisterPlayers}
            isLoading={isLoadingPlayers}
          />
        </DialogContent>
      </Dialog>

        {/* Password Dialog */}
        <Dialog open={!!passwordProtectedMatch} onOpenChange={(isOpen) => !isOpen && setPasswordProtectedMatch(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Admin Authentication Required</DialogTitle>
              <DialogDescription>
                You are trying to edit a completed match. Please enter the admin password to continue.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="password-input-cup" className="text-right">
                  Password
                </Label>
                <Input
                  id="password-input-cup"
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="col-span-3"
                  onKeyDown={(e) => e.key === 'Enter' && handlePasswordCheck()}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handlePasswordCheck}>Submit</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      
       {/* Update Score Dialog */}
        <Dialog open={!!editingMatch} onOpenChange={(isOpen) => !isOpen && setEditingMatch(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Match Score</DialogTitle>
              <DialogDescription>
                Enter the final score. The winner will advance automatically.
              </DialogDescription>
            </DialogHeader>
            {editingMatch && allPlayers && (
              <ScoreForm 
                match={editingMatch} 
                onSave={(scores) => handleUpdateScore(editingMatch.id, scores)} 
                players={allPlayers} 
              />
            )}
          </DialogContent>
        </Dialog>
        
        {/* Share Dialog */}
        <ShareDialog
            open={shareDialogOpen}
            onOpenChange={setShareDialogOpen}
            title="Share Cup Participants"
            shareText={shareText}
        />

    </div>
  );
}
