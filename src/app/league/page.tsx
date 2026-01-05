
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { LeagueTable } from '@/components/league-table';
import { Button } from '@/components/ui/button';
import { PlusCircle, UserPlus, Trophy, Play, Flag, Pencil, Trash2, Share2, CalendarIcon, Lock, Unlock, Users, DollarSign } from 'lucide-react';
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
import { useCollection, useFirestore, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { collection, doc, serverTimestamp, writeBatch, getDocs, query, deleteDoc, Timestamp } from 'firebase/firestore';
import type { League, Season, LeagueEntry, Player, WithId, Match, Team, SeasonRecord } from '@/lib/types';
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
import { useTranslation } from '@/hooks/use-translation';
import { useSharedPassword } from '@/context/password-context';
import { LeagueStats } from '@/components/league-stats';
import { LiveClock } from '@/components/live-clock';
import { PlayerPerformanceDialog } from '@/components/player-performance-dialog';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


// For simplicity, we'll work with a single, hardcoded league.
const LEAGUE_ID = 'main-league';


export default function LeaguePage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { password: ADMIN_PASSWORD, isLoaded: isPasswordLoaded } = useSharedPassword();

  const [activeSeasonId, setActiveSeasonId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [passwordPrompt, setPasswordPrompt] = useState<{ open: boolean, action?: () => void }>({ open: false });
  const [passwordInput, setPasswordInput] = useState('');
  const [showCreateSeason, setShowCreateSeason] = useState(false);
  const [showRegisterPlayers, setShowRegisterPlayers] = useState(false);
  const [newSeasonName, setNewSeasonName] = useState('');
  const [newSeasonFee, setNewSeasonFee] = useState<number | string>('');
  const [editingSeason, setEditingSeason] = useState<WithId<Season> | null>(null);
  const [deletingSeason, setDeletingSeason] = useState<WithId<Season> | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<WithId<LeagueEntry> | null>(null);
  const [showFinishSeasonConfirm, setShowFinishSeasonConfirm] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareText, setShareText] = useState('');
  const [dateRange, setDateRange] = useState<{from: Date | undefined, to: Date | undefined}>({ from: undefined, to: undefined });
  const [selectedPlayerForStats, setSelectedPlayerForStats] = useState<WithId<LeagueEntry> | null>(null);


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
  
  const { paidPlayersCount, prizePool } = useMemo(() => {
    if (!leagueTable || !activeSeason || !activeSeason.registrationFee) {
      return { paidPlayersCount: 0, prizePool: 0 };
    }
    const paidCount = leagueTable.filter(p => p.hasPaid).length;
    const pool = paidCount * (activeSeason.registrationFee || 0);
    return { paidPlayersCount: paidCount, prizePool: pool };
  }, [leagueTable, activeSeason]);


  // --- Effects ---
  useEffect(() => {
    // On load, select the most recent season or none if no seasons exist
    if (seasons && !activeSeasonId && seasons.length > 0) {
      const sortedSeasons = [...seasons].sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
      setActiveSeasonId(sortedSeasons[0].id);
    }
    // if the active season is deleted, reset the active season
    if (seasons && activeSeasonId && !seasons.find(s => s.id === activeSeasonId)) {
        const sortedSeasons = [...seasons].sort((a, b) => b.createdAt.toMillis() - b.createdAt.toMillis());
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
        toast({ title: t('admin_mode_unlocked_title'), description: t('admin_mode_unlocked_desc') });
    } else {
        toast({ variant: 'destructive', title: t('incorrect_password') });
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
      toast({ variant: 'destructive', title: t('error'), description: t('season_name_empty') });
      return;
    }

    const fee = typeof newSeasonFee === 'string' ? parseFloat(newSeasonFee) : newSeasonFee;
    const seasonData: Partial<Season> = {
        name: newSeasonName.trim(),
        ...(dateRange.from && { startDate: Timestamp.fromDate(dateRange.from) }),
        ...(dateRange.to && { endDate: Timestamp.fromDate(dateRange.to) }),
        registrationFee: isNaN(fee) ? 0 : fee,
    }

    if (editingSeason) {
      // Update existing season
      const seasonRef = doc(firestore, `leagues/${LEAGUE_ID}/seasons`, editingSeason.id);
      updateDocumentNonBlocking(seasonRef, seasonData);
      toast({ title: t('success'), description: t('season_updated_desc', { seasonName: newSeasonName.trim() }) });
    } else {
      // Create new season
      const seasonsRef = collection(firestore, `leagues/${LEAGUE_ID}/seasons`);
      addDocumentNonBlocking(seasonsRef, {
        ...seasonData,
        status: 'Not Started',
        createdAt: serverTimestamp(),
      });
      toast({ title: t('success'), description: t('season_created_desc', { seasonName: newSeasonName.trim() }) });
    }
    setShowCreateSeason(false);
    setNewSeasonName('');
    setNewSeasonFee('');
    setEditingSeason(null);
    setDateRange({ from: undefined, to: undefined });
  };
  
  const handleOpenEditDialog = () => {
    if (activeSeason) {
      setEditingSeason(activeSeason);
      setNewSeasonName(activeSeason.name);
      setNewSeasonFee(activeSeason.registrationFee || '');
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
    setNewSeasonFee('');
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

        toast({ title: t('season_deleted_title'), description: t('season_deleted_desc', { seasonName: deletingSeason.name }) });

    } catch (error) {
        console.error("Error deleting season: ", error);
        toast({ variant: 'destructive', title: t('deletion_failed_title'), description: t('season_deleted_error') });
    }
    
    setDeletingSeason(null);
  };
  
  const handleDeleteEntry = () => {
    if (!firestore || !activeSeasonId || !deletingEntry) return;

    const entryRef = doc(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/leagueTable`, deletingEntry.id);
    deleteDocumentNonBlocking(entryRef);

    toast({
        title: t('player_removed_title'),
        description: t('player_removed_desc', { playerName: deletingEntry.playerName }),
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
            played: 0,
            win: 0,
            draw: 0,
            loss: 0,
            goalsFor: 0,
            goalsAgainst: 0,
            goalDifference: 0,
            points: 0,
            hasPaid: false,
        };
        batch.set(leagueEntryRef, newEntry);
    });

    try {
        await batch.commit();
        toast({ title: t('success'), description: t('players_registered_desc', { count: playersToRegister.length }) });
    } catch (error) {
        console.error("Error registering players: ", error);
        toast({ variant: 'destructive', title: t('error'), description: t('register_players_error') });
    }
    
    setShowRegisterPlayers(false);
  };

  const handleUpdateSeasonStatus = (status: 'In Progress' | 'Completed') => {
    if (!firestore || !activeSeason) return;

    if (status === 'Completed') {
        // This will be triggered from the confirmation dialog now
        handleFinishSeason();
        return;
    }

    const seasonRef = doc(firestore, `leagues/${LEAGUE_ID}/seasons`, activeSeason.id);
    updateDocumentNonBlocking(seasonRef, { status });
    toast({ title: t('season_updated_title'), description: t('season_status_updated_desc', { status }) });
  };
  
   const handleFinishSeason = () => {
    if (!firestore || !activeSeason || sortedTable.length === 0) return;

    // 1. Find winner and calculate fun stats
    const winner = sortedTable[0];
    const playersWhoPlayed = sortedTable.filter(p => p.played > 0);

    const bestAttacker = [...playersWhoPlayed].sort((a, b) => b.goalsFor - a.goalsFor)[0];
    const worstDefender = [...playersWhoPlayed].sort((a, b) => b.goalsAgainst - a.goalsAgainst)[0];
    const maxWins = Math.max(...playersWhoPlayed.map(p => p.win));
    const mostWinsPlayer = playersWhoPlayed.find(p => p.win === maxWins && maxWins > 0);

    // 2. Create the season record object
    const seasonRecord: SeasonRecord = {
        seasonId: activeSeason.id,
        seasonName: activeSeason.name,
        completedAt: Timestamp.now(),
        winnerPlayerId: winner.playerId,
        winnerPlayerName: winner.playerName,
        winnerTeamName: winner.teamName,
        winnerPhotoUrl: winner.team?.logoUrl, // Using team logo as player photo
        winnerStats: {
            points: winner.points,
            win: winner.win,
            draw: winner.draw,
            loss: winner.loss,
            goalsFor: winner.goalsFor,
            goalsAgainst: winner.goalsAgainst,
            goalDifference: winner.goalDifference
        },
        funStats: {
            bestAttacker: bestAttacker ? { playerName: bestAttacker.playerName, value: bestAttacker.goalsFor } : null,
            worstDefender: worstDefender ? { playerName: worstDefender.playerName, value: worstDefender.goalsAgainst } : null,
            mostWins: mostWinsPlayer ? { playerName: mostWinsPlayer.playerName, value: mostWinsPlayer.win } : null,
        }
    };

    // 3. Save the record to the hallOfFame collection
    const hallOfFameRef = doc(firestore, `hallOfFame`, activeSeason.id);
    setDocumentNonBlocking(hallOfFameRef, seasonRecord, {});

    // 4. Update the season status
    const seasonRef = doc(firestore, `leagues/${LEAGUE_ID}/seasons`, activeSeason.id);
    updateDocumentNonBlocking(seasonRef, { status: 'Completed' });

    toast({ title: "Season Completed!", description: `${activeSeason.name} is finished. A record has been saved in the Hall of Fame.` });
  };

  const handleShareParticipants = () => {
    if (!activeSeason || !sortedTable || sortedTable.length === 0) {
      toast({
        variant: 'destructive',
        title: t('no_participants_to_share_title'),
        description: t('no_participants_to_share_desc'),
      });
      return;
    }

    const seasonName = activeSeason.name;
    const header = `*${t('share_participants_header', { seasonName })}*\n\n`;
    
    const participantsList = sortedTable
      .map((p, index) => `${index + 1}. ${p.playerName} (${p.team?.name})`)
      .join('\n');
      
    setShareText(header + participantsList);
    setShareDialogOpen(true);
  };
  
  const handlePaymentToggle = useCallback((leagueEntryId: string, currentStatus: boolean) => {
    if (!firestore || !activeSeasonId || !isAdmin) return;

    const entryRef = doc(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/leagueTable`, leagueEntryId);
    updateDocumentNonBlocking(entryRef, { hasPaid: !currentStatus });

  }, [firestore, activeSeasonId, isAdmin]);


  const formattedDateRange = useMemo(() => {
    if (!activeSeason || !activeSeason.startDate || !activeSeason.endDate) return null;
    const start = format(activeSeason.startDate.toDate(), 'd LLL');
    const end = format(activeSeason.endDate.toDate(), 'd LLL yyyy');
    return `${start} - ${end}`;
  }, [activeSeason]);

  const { seasonProgress, completedMatchesCount } = useMemo(() => {
    if (!matches || matches.length === 0) return { seasonProgress: 0, completedMatchesCount: 0 };
    const completed = matches.filter(m => m.isCompleted).length;
    const progress = (completed / matches.length) * 100;
    return { seasonProgress: progress, completedMatchesCount: completed };
  }, [matches]);


  return (
    <div className="container mx-auto px-4 py-8">
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div className="space-y-2">
            <h1 className="font-headline text-4xl font-extrabold tracking-tight text-primary">{t('league_standings_page_title')}</h1>
            {activeSeason && (
              <>
                <p className="text-xl font-bold">{activeSeason.name} ({activeSeason.status})</p>
                {formattedDateRange && <p className="text-sm font-medium text-primary">{formattedDateRange}</p>}
                 {matches && matches.length > 0 && (
                  <div className="w-full pt-1">
                    <Progress value={seasonProgress} className="h-2" />
                    <p className="text-xs font-bold mt-1.5">
                      {completedMatchesCount} dari {matches.length} pertandingan ({seasonProgress.toFixed(0)}%)
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
             <Select value={activeSeasonId || ''} onValueChange={setActiveSeasonId} disabled={isLoadingSeasons}>
                <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder={t('select_a_season')} />
                </SelectTrigger>
                <SelectContent>
                    {seasons?.map(season => (
                        <SelectItem key={season.id} value={season.id}>{season.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            {isAdmin && (
              <div className="flex gap-2">
                <Button onClick={() => withAdminCheck(handleOpenCreateDialog)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    {t('new')}
                </Button>
                <Button onClick={() => withAdminCheck(handleOpenEditDialog)} variant="outline" size="icon" disabled={!activeSeason || activeSeason.status !== 'Not Started'}>
                    <Pencil className="h-4 w-4" />
                    <span className="sr-only">{t('edit_season')}</span>
                </Button>
                <Button onClick={() => activeSeason && withAdminCheck(() => setDeletingSeason(activeSeason))} variant="destructive" size="icon" disabled={!activeSeason}>
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">{t('delete_season')}</span>
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="mb-8 flex flex-wrap gap-4 items-center justify-between">
            <LiveClock />
            <div className="flex flex-wrap gap-2 justify-end">
                {isAdmin && (
                    <>
                        <Button onClick={() => withAdminCheck(() => setShowRegisterPlayers(true))} disabled={!activeSeason || activeSeason.status !== 'Not Started'}>
                            <UserPlus className="mr-2 h-4 w-4" />
                            {t('register_players')}
                        </Button>
                        <Button 
                            onClick={() => withAdminCheck(() => handleUpdateSeasonStatus('In Progress'))} 
                            variant="outline" 
                            disabled={!activeSeason || activeSeason.status !== 'Not Started' || !hasFixtures || (leagueTable || []).length < 2}
                            title={!hasFixtures ? t('generate_fixtures_first_tooltip') : ""}>
                            <Play className="mr-2 h-4 w-4" />
                            {t('start_season')}
                        </Button>
                        <Button onClick={() => withAdminCheck(() => setShowFinishSeasonConfirm(true))} variant="outline" disabled={!activeSeason || activeSeason.status !== 'In Progress'}>
                            <Flag className="mr-2 h-4 w-4" />
                            {t('finish_season')}
                        </Button>
                    </>
                )}
                <Button onClick={() => isAdmin ? setIsAdmin(false) : withAdminCheck(() => setIsAdmin(true))} variant="outline">
                    {isAdmin ? <Unlock className="mr-2" /> : <Lock className="mr-2" />}
                    {isAdmin ? t('lock_admin') : t('unlock_admin')}
                </Button>
                <Button onClick={handleShareParticipants} variant="outline" size="sm" disabled={!leagueTable || leagueTable.length === 0}>
                    <Share2 className="mr-2 h-4 w-4" />
                    {t('share_participants')}
                </Button>
                <Button asChild variant="outline" size="sm">
                    <Link href={`/league/winner?seasonId=${activeSeasonId}`}>
                        <Trophy className="mr-2 h-4 w-4" />
                        {t('view_champion')}
                    </Link>
                </Button>
            </div>
        </div>


        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
            <div className="lg:col-span-3">
                <LeagueTable 
                    tableData={sortedTable} 
                    isLoading={isLoadingTable || isLoadingMatches || isLoadingPlayers || isLoadingTeams || !isPasswordLoaded}
                    onRemovePlayer={(entry) => withAdminCheck(() => setDeletingEntry(entry))}
                    onSelectPlayer={setSelectedPlayerForStats}
                    seasonStatus={activeSeason?.status}
                    isAdmin={isAdmin}
                />
            </div>
            <div className="lg:col-span-1 space-y-4">
                <h2 className="font-headline text-2xl font-bold text-center text-primary">Statistik Musim</h2>
                <LeagueStats tableData={sortedTable} isLoading={isLoadingTable || isLoadingPlayers} />

                {activeSeason?.registrationFee && activeSeason.registrationFee > 0 && sortedTable.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <DollarSign className="w-5 h-5 text-primary" />
                                Keuangan Musim
                            </CardTitle>
                            <CardDescription>Lacak pembayaran registrasi dan total hadiah.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="border bg-card p-4 rounded-lg text-center">
                                <p className="text-sm text-muted-foreground">Total Prizepool</p>
                                <p className="text-3xl font-bold text-primary">
                                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(prizePool)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    ({paidPlayersCount} dari {sortedTable.length} pemain telah membayar)
                                </p>
                            </div>
                            <div>
                                <h4 className="text-sm font-semibold mb-2">Status Pembayaran</h4>
                                <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                                    {sortedTable.map(player => (
                                        <div key={player.id} className="flex items-center justify-between bg-muted/50 p-2 rounded-md">
                                            <div className='flex items-center gap-2'>
                                                <Avatar className="h-6 w-6">
                                                    <AvatarImage src={player.team?.logoUrl} alt={player.playerName} />
                                                    <AvatarFallback><User className="w-4 h-4" /></AvatarFallback>
                                                </Avatar>
                                                <Label htmlFor={`paid-${player.id}`} className="text-sm font-medium">
                                                    {player.playerName}
                                                </Label>
                                            </div>
                                            <Checkbox
                                                id={`paid-${player.id}`}
                                                checked={!!player.hasPaid}
                                                onCheckedChange={() => handlePaymentToggle(player.id, !!player.hasPaid)}
                                                disabled={!isAdmin}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
      </div>
      
      {/* Password Dialog */}
      <Dialog open={passwordPrompt.open} onOpenChange={(isOpen) => !isOpen && setPasswordPrompt({ open: false })}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{t('admin_auth')}</DialogTitle>
                <DialogDescription>{t('admin_auth_desc')}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="password-input" className="text-right">
                  {t('password')}
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
              <Button onClick={handlePasswordCheck}>{t('unlock')}</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Create/Edit Season Dialog */}
      <Dialog open={showCreateSeason} onOpenChange={(isOpen) => { if (!isOpen) { setShowCreateSeason(false); setEditingSeason(null); }}}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSeason ? t('edit_season') : t('create_new_season')}</DialogTitle>
            <DialogDescription>{editingSeason ? t('edit_season_desc') : t('create_season_desc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
                <Label htmlFor="season-name">{t('season_name')}</Label>
                <Input 
                    id="season-name"
                    placeholder="e.g., 2024/25 Season"
                    value={newSeasonName}
                    onChange={(e) => setNewSeasonName(e.target.value)}
                />
            </div>
             <div className="space-y-2">
                <Label htmlFor="season-fee">Biaya Pendaftaran (IDR)</Label>
                <Input 
                    id="season-fee"
                    type="number"
                    placeholder="e.g., 15000"
                    value={newSeasonFee}
                    onChange={(e) => setNewSeasonFee(e.target.value)}
                />
            </div>
            <div className="space-y-2">
                <Label>{t('date_range')}</Label>
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
                        <span>{t('pick_a_date_range')}</span>
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
                {editingSeason ? t('save_changes') : t('create_season')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
       {/* Delete Season Confirmation Dialog */}
        <AlertDialog open={!!deletingSeason} onOpenChange={(isOpen) => !isOpen && setDeletingSeason(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{t('are_you_sure')}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {t('delete_season_confirm_desc', { seasonName: deletingSeason?.name })}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteSeason} className="bg-destructive hover:bg-destructive/90">{t('delete')}</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        {/* Delete Player Entry Confirmation Dialog */}
        <AlertDialog open={!!deletingEntry} onOpenChange={(isOpen) => !isOpen && setDeletingEntry(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{t('remove_player_from_season_title')}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {t('remove_player_from_season_desc', { playerName: deletingEntry?.playerName })}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteEntry} className="bg-destructive hover:bg-destructive/90">{t('remove')}</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        {/* Finish Season Confirmation Dialog */}
        <AlertDialog open={showFinishSeasonConfirm} onOpenChange={setShowFinishSeasonConfirm}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{t('are_you_sure')}</AlertDialogTitle>
                    <AlertDialogDescription>
                       Tindakan ini akan menyelesaikan musim <strong>{activeSeason?.name}</strong>. Setelah selesai, status tidak dapat diubah kembali dan catatan akan dibuat di Daftar Juara.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                    <AlertDialogAction onClick={() => { handleUpdateSeasonStatus('Completed'); setShowFinishSeasonConfirm(false); }}>Ya, Selesaikan</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>


      {/* Register Players Dialog */}
      <Dialog open={showRegisterPlayers} onOpenChange={setShowRegisterPlayers}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('register_players')}</DialogTitle>
            <DialogDescription>{t('register_players_desc', { seasonName: activeSeason?.name })}</DialogDescription>
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
          title={t('share_league_participants')}
          shareText={shareText}
        />
      
      {/* Player Performance Dialog */}
      <PlayerPerformanceDialog
        player={selectedPlayerForStats}
        matches={matches || []}
        allPlayers={allPlayers || []}
        allTeams={allTeams || []}
        totalPlayersInSeason={leagueTable?.length || 0}
        open={!!selectedPlayerForStats}
        onOpenChange={() => setSelectedPlayerForStats(null)}
      />

    </div>
  );
}
