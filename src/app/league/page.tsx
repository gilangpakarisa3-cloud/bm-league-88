'use client';

import { useState, useMemo, useEffect } from 'react';
import { LeagueTable } from '@/components/league-table';
import { Button } from '@/components/ui/button';
import { PlusCircle, UserPlus, Trophy, Play, Flag, Pencil, Trash2, Share2, CalendarIcon, Lock, Unlock } from 'lucide-react';
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
import { useCollection, useFirestore, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc, serverTimestamp, writeBatch, getDocs, query, deleteDoc, Timestamp } from 'firebase/firestore';
import type { League, Season, LeagueEntry, Player, WithId, Match, Team } from '@/lib/types';
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
import { ShareDialog } from '@/components/share-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';


// For simplicity, we'll work with a single, hardcoded league.
const LEAGUE_ID = 'main-league';
const ADMIN_PASSWORD = 'Office88';

export default function LeaguePage() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const [activeSeasonId, setActiveSeasonId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [passwordPrompt, setPasswordPrompt] = useState<{ open: boolean, action?: () => void }>({ open: false });
  const [passwordInput, setPasswordInput] = useState('');
  const [showCreateSeason, setShowCreateSeason] = useState(false);
  const [showRegisterPlayers, setShowRegisterPlayers] = useState(false);
  const [newSeasonName, setNewSeasonName] = useState('');
  const [editingSeason, setEditingSeason] = useState<WithId<Season> | null>(null);
  const [deletingSeason, setDeletingSeason] = useState<WithId<Season> | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<WithId<LeagueEntry> | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareText, setShareText] = useState('');
  const [dateRange, setDateRange] = useState<{from: Date | undefined, to: Date | undefined}>({ from: undefined, to: undefined });

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
  
  const playersCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'players') : null),
    [firestore]
  );
  const { data: allPlayers, isLoading: isLoadingPlayers } = useCollection<Player>(playersCollection);
  
  const teamsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'teams') : null),
    [firestore]
  );
  const { data: allTeams, isLoading: isLoadingTeams } = useCollection<Team>(teamsCollection);

  const matchesCollection = useMemoFirebase(
    () =>
      firestore && activeSeasonId
        ? collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/matches`)
        : null,
    [firestore, activeSeasonId]
  );
  const { data: matches, isLoading: isLoadingMatches } = useCollection<Match>(matchesCollection);

  // --- Memoized Derived State ---
  const activeSeason = useMemo(() => seasons?.find((s) => s.id === activeSeasonId) || null, [seasons, activeSeasonId]);
  
  const playersById = useMemo(() => {
    if (!allPlayers) return {};
    return allPlayers.reduce((acc, p) => {
        acc[p.id] = p;
        return acc;
    }, {} as Record<string, WithId<Player>>);
  }, [allPlayers]);

  const teamsById = useMemo(() => {
    if (!allTeams) return {};
    return allTeams.reduce((acc, t) => {
        acc[t.id] = t;
        return acc;
    }, {} as Record<string, WithId<Team>>);
  }, [allTeams]);


  const sortedTable = useMemo(() => {
    if (!leagueTable) return [];
    
    const enrichedTable = leagueTable.map(entry => ({
        ...entry,
        player: playersById[entry.playerId],
        team: teamsById[entry.teamId],
    }));

    // if season is not started yet, sort by name
    if (activeSeason?.status === 'Not Started') {
        return [...enrichedTable].sort((a, b) => a.playerName.localeCompare(b.playerName)).map((entry, index) => ({...entry, rank: index + 1}));
    }
    return [...enrichedTable].sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
        if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
        return a.playerName.localeCompare(b.playerName);
    }).map((entry, index) => ({...entry, rank: index + 1}));
  }, [leagueTable, activeSeason, playersById, teamsById]);

  const hasFixtures = useMemo(() => (matches || []).length > 0, [matches]);

  // --- Effects ---
  useEffect(() => {
    // On load, select the most recent season or none if no seasons exist
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

  // --- Password & Admin Logic ---
  const handlePasswordCheck = () => {
    if (passwordInput === ADMIN_PASSWORD) {
        setIsAdmin(true);
        if (passwordPrompt.action) {
            passwordPrompt.action();
        }
        toast({ title: 'Admin Mode Unlocked', description: 'You can now perform administrative actions.' });
    } else {
        toast({ variant: 'destructive', title: 'Incorrect Password' });
    }
    setPasswordPrompt({ open: false });
    setPasswordInput('');
  };

  const withAdminCheck = (action: () => void) => {
    if (isAdmin) {
        action();
    } else {
        setPasswordPrompt({ open: true, action });
    }
  };

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
      const seasonRef = doc(firestore, `leagues/${LEAGUE_ID}/seasons`, editingSeason.id);
      updateDocumentNonBlocking(seasonRef, seasonData);
      toast({ title: 'Success', description: `Season name updated to '${newSeasonName.trim()}'.` });
    } else {
      // Create new season
      const seasonsRef = collection(firestore, `leagues/${LEAGUE_ID}/seasons`);
      addDocumentNonBlocking(seasonsRef, {
        ...seasonData,
        status: 'Not Started',
        createdAt: serverTimestamp(),
      });
      toast({ title: 'Success', description: `Season '${newSeasonName.trim()}' created.` });
    }
    setShowCreateSeason(false);
    setNewSeasonName('');
    setEditingSeason(null);
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
        // 1. Delete subcollections (leagueTable, matches)
        const subcollections = ['leagueTable', 'matches'];
        for (const sub of subcollections) {
            const subcollectionRef = collection(firestore, `leagues/${LEAGUE_ID}/seasons/${deletingSeason.id}/${sub}`);
            const snapshot = await getDocs(subcollectionRef);
            const batch = writeBatch(firestore);
            snapshot.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
        }

        // 2. Delete the season document itself
        const seasonRef = doc(firestore, `leagues/${LEAGUE_ID}/seasons`, deletingSeason.id);
        await deleteDoc(seasonRef);

        toast({ title: 'Season Deleted', description: `'${deletingSeason.name}' and all its data have been removed.` });

    } catch (error) {
        console.error("Error deleting season: ", error);
        toast({ variant: 'destructive', title: 'Deletion Failed', description: 'Could not delete the season and its data.' });
    }
    
    setDeletingSeason(null);
  };
  
  const handleDeleteEntry = () => {
    if (!firestore || !activeSeasonId || !deletingEntry) return;

    const entryRef = doc(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/leagueTable`, deletingEntry.id);
    deleteDocumentNonBlocking(entryRef);

    toast({
        title: 'Player Removed',
        description: `${deletingEntry.playerName} has been removed from the season.`,
    });
    setDeletingEntry(null);
  };

  const handleRegisterPlayers = async (selectedPlayerIds: string[]) => {
    if (!firestore || !activeSeasonId || !allPlayers) return;

    const playersToRegister = allPlayers.filter(p => selectedPlayerIds.includes(p.id));
    if (playersToRegister.length === 0) return;

    const batch = writeBatch(firestore);
    
    playersToRegister.forEach(player => {
        const leagueEntryRef = doc(collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/leagueTable`));
        const newEntry: Omit<LeagueEntry, 'id' | 'rank'> = {
            playerId: player.id,
            teamId: player.teamId,
            playerName: player.name,
            teamName: player.teamName,
            photoUrl: player.photoUrl,
            played: 0,
            win: 0,
            draw: 0,
            loss: 0,
            goalsFor: 0,
            goalsAgainst: 0,
            goalDifference: 0,
            points: 0
        };
        batch.set(leagueEntryRef, newEntry);
    });

    try {
        await batch.commit();
        toast({ title: 'Success', description: `${playersToRegister.length} players registered to the season.` });
    } catch (error) {
        console.error("Error registering players: ", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not register players.' });
    }
    
    setShowRegisterPlayers(false);
  };

  const handleUpdateSeasonStatus = (status: 'In Progress' | 'Completed') => {
    if (!firestore || !activeSeason) return;

    const seasonRef = doc(firestore, `leagues/${LEAGUE_ID}/seasons`, activeSeason.id);
    updateDocumentNonBlocking(seasonRef, { status });
    toast({ title: 'Season Updated', description: `Season status changed to '${status}'.` });
  };
  
  const handleShareParticipants = () => {
    if (!activeSeason || !sortedTable || sortedTable.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No participants to share',
        description: 'Register players for this season first.',
      });
      return;
    }

    const seasonName = activeSeason.name;
    const header = `*Liga Tarkam Participants - ${seasonName}*\n\n`;
    
    const participantsList = sortedTable
      .map((p, index) => `${index + 1}. ${p.playerName} (${p.team?.name})`)
      .join('\n');
      
    setShareText(header + participantsList);
    setShareDialogOpen(true);
  };

  const formattedDateRange = useMemo(() => {
    if (!activeSeason || !activeSeason.startDate || !activeSeason.endDate) return null;
    const start = format(activeSeason.startDate.toDate(), 'd LLL');
    const end = format(activeSeason.endDate.toDate(), 'd LLL yyyy');
    return `${start} - ${end}`;
  }, [activeSeason]);


  return (
    <div className="container mx-auto px-4 py-8">
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div className="space-y-1">
            <h1 className="font-headline text-4xl font-extrabold tracking-tight text-primary">League Standings</h1>
            {activeSeason && (
              <>
                <p className="text-xl font-bold">{activeSeason.name} ({activeSeason.status})</p>
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
                {isAdmin ? (
                    <>
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
                    </>
                ) : null}
                 <Button onClick={() => isAdmin ? setIsAdmin(false) : withAdminCheck(() => setIsAdmin(true))} variant="outline">
                    {isAdmin ? <Unlock className="mr-2" /> : <Lock className="mr-2" />}
                    {isAdmin ? 'Lock Admin' : 'Unlock Admin'}
                </Button>
            </div>
          </div>
        </div>

        {activeSeason && isAdmin && (
            <div className="mb-8 flex flex-wrap gap-2">
                <Button onClick={() => withAdminCheck(() => setShowRegisterPlayers(true))} disabled={activeSeason.status !== 'Not Started'}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Register Players
                </Button>
                <Button 
                    onClick={() => withAdminCheck(() => handleUpdateSeasonStatus('In Progress'))} 
                    variant="outline" 
                    disabled={activeSeason.status !== 'Not Started' || !hasFixtures || (leagueTable || []).length < 2}
                    title={!hasFixtures ? "Fixtures must be generated before starting the season." : ""}>
                    <Play className="mr-2 h-4 w-4" />
                    Start Season
                </Button>
                <Button onClick={() => withAdminCheck(() => handleUpdateSeasonStatus('Completed'))} variant="outline" disabled={activeSeason.status !== 'In Progress'}>
                    <Flag className="mr-2 h-4 w-4" />
                    Finish Season
                </Button>
                
            </div>
        )}
        
        <div className="flex flex-wrap gap-2 mb-8">
            <Button onClick={handleShareParticipants} variant="outline" disabled={!leagueTable || leagueTable.length === 0}>
                <Share2 className="mr-2 h-4 w-4" />
                Share Participants
            </Button>
                <Button asChild variant="outline">
                <Link href={`/league/winner?seasonId=${activeSeasonId}`}>
                    <Trophy className="mr-2 h-4 w-4" />
                    View Champion
                </Link>
            </Button>
        </div>


        <LeagueTable 
            tableData={sortedTable} 
            isLoading={isLoadingTable || isLoadingMatches || isLoadingPlayers || isLoadingTeams}
            onRemovePlayer={(entry) => withAdminCheck(() => setDeletingEntry(entry))}
            seasonStatus={activeSeason?.status}
            isAdmin={isAdmin}
        />
      </div>
      
      {/* Password Dialog */}
      <Dialog open={passwordPrompt.open} onOpenChange={(isOpen) => !isOpen && setPasswordPrompt({ open: false })}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Admin Authentication</DialogTitle>
                <DialogDescription>Please enter the admin password to unlock administrative actions.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="password-input" className="text-right">
                  Password
                </Label>
                <Input
                  id="password-input"
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="col-span-3"
                  onKeyDown={(e) => e.key === 'Enter' && handlePasswordCheck()}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handlePasswordCheck}>Unlock</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Create/Edit Season Dialog */}
      <Dialog open={showCreateSeason} onOpenChange={(isOpen) => { if (!isOpen) { setShowCreateSeason(false); setEditingSeason(null); }}}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSeason ? 'Edit Season' : 'Create New Season'}</DialogTitle>
            <DialogDescription>{editingSeason ? 'Update the details for this season.' : 'Enter the details for the new season.'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
                <Label htmlFor="season-name">Season Name</Label>
                <Input 
                    id="season-name"
                    placeholder="e.g., 2024/25 Season"
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
                        This action cannot be undone. This will permanently delete the <strong>{deletingSeason?.name}</strong> season, including all its league table entries and matches.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteSeason} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        {/* Delete Player Entry Confirmation Dialog */}
        <AlertDialog open={!!deletingEntry} onOpenChange={(isOpen) => !isOpen && setDeletingEntry(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Remove Player from Season?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Are you sure you want to remove <strong>{deletingEntry?.playerName}</strong> from this season? This cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteEntry} className="bg-destructive hover:bg-destructive/90">Remove</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

      {/* Register Players Dialog */}
      <Dialog open={showRegisterPlayers} onOpenChange={setShowRegisterPlayers}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Register Players</DialogTitle>
            <DialogDescription>Select players to include in the '{activeSeason?.name}' season.</DialogDescription>
          </DialogHeader>
          <RegisterPlayersForm
            allPlayers={allPlayers || []}
            registeredPlayers={leagueTable || []}
            onRegister={handleRegisterPlayers}
            isLoading={isLoadingPlayers}
          />
        </DialogContent>
      </Dialog>
      
       {/* Share Dialog */}
       <ShareDialog
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          title="Share League Participants"
          shareText={shareText}
        />

    </div>
  );
}
