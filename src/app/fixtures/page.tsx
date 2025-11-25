
'use client';

import { useState, useMemo, useEffect, useCallback, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Pencil, RefreshCw, Search, Lock, Unlock, Calculator } from 'lucide-react';
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
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs"
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, writeBatch, query, getDocs, where, runTransaction, Timestamp, orderBy } from 'firebase/firestore';
import type { Season, Player, WithId, Match, Team, LeagueEntry } from '@/lib/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { ScoreForm } from '@/components/score-form';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTranslation } from '@/hooks/use-translation';
import { format } from 'date-fns';
import { useSharedPassword } from '@/context/password-context';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { LiveClock } from '@/components/live-clock';


// For simplicity, we'll work with a single, hardcoded league.
const LEAGUE_ID = 'main-league';


const MatchRow = memo(function MatchRow({ match, onEditMatch, isAdmin, activeSeason, teamsById }: {
    match: WithId<Match> & { player1: WithId<Player> | null, player2: WithId<Player> | null };
    onEditMatch: (match: WithId<Match>) => void;
    isAdmin: boolean;
    activeSeason: WithId<Season> | null;
    teamsById: Record<string, WithId<Team>>;
}) {
    const { t } = useTranslation();
    const team1 = match.player1 ? teamsById[match.player1.teamId] : null;
    const team2 = match.player2 ? teamsById[match.player2.teamId] : null;

    // Apply GMT+7 offset to all dates
    const gmt7Date = new Date(match.matchDate.toDate().getTime() + 7 * 60 * 60 * 1000);

    const displayDate = match.isCompleted 
        ? format(gmt7Date, 'd MMM, HH:mm') 
        : format(gmt7Date, 'd MMM');


    const PlayerInfo = ({ player, team, alignment = 'left' }: { player: WithId<Player> | null, team: WithId<Team> | null, alignment?: 'left' | 'right' }) => (
        <div className={cn("flex items-center gap-2 text-sm font-semibold truncate", {
            'justify-start': alignment === 'left',
            'justify-end': alignment === 'right',
        })}>
             {alignment === 'right' && <span className="truncate">{player?.name}</span>}
            <Avatar className="h-5 w-5">
                <AvatarImage src={team?.logoUrl} alt={team?.name} />
                <AvatarFallback>{team?.name?.charAt(0)}</AvatarFallback>
            </Avatar>
            {alignment === 'left' && <span className="truncate">{player?.name}</span>}
        </div>
    );

    return (
        <div className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-4 p-3 transition-colors rounded-md hover:bg-muted/50">
            <PlayerInfo player={match.player1} team={team1} alignment="right" />
            
            <div className="flex-none text-center">
                 {match.isCompleted ? (
                    <span className="text-lg font-bold text-primary">{match.player1Score} - {match.player2Score}</span>
                ) : (
                    <span className="text-xs font-bold text-primary">VS</span>
                )}
            </div>

            <PlayerInfo player={match.player2} team={team2} alignment="left" />
            
            <div className="flex-none">
                 <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => onEditMatch(match)}
                    disabled={
                        match.isCompleted
                            ? !isAdmin // Only admins can edit completed scores
                            : activeSeason?.status !== 'In Progress' // Anyone can update scores for a season 'In Progress'
                    }
                >
                    <Pencil className="mr-1 h-3 w-3" />
                    {match.isCompleted ? displayDate : t('unplayed_abbv', {defaultValue: 'TBD'})}
                </Button>
            </div>
        </div>
    );
});


const FixtureContent = memo(function FixtureContent({
    activeSeasonId,
    onEditMatch,
    isAdmin,
    allPlayers,
    allTeams,
    activeSeason
}: {
    activeSeasonId: string | null;
    onEditMatch: (match: WithId<Match>) => void;
    isAdmin: boolean;
    allPlayers: WithId<Player>[];
    allTeams: WithId<Team>[];
    activeSeason: WithId<Season> | null;
}) {
    const firestore = useFirestore();
    const { t } = useTranslation();
    const [searchTerm, setSearchTerm] = useState('');
    
    // --- Firestore Data Hooks ---
    const matchesCollection = useMemoFirebase(
        () =>
        firestore && activeSeasonId
            ? query(collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/matches`), orderBy('matchDate', 'asc'))
            : null,
        [firestore, activeSeasonId]
    );
    const { data: matches, isLoading: isLoadingMatches } = useCollection<Match>(matchesCollection);
    
    // --- Memoized Derived State ---
    const playersById = useMemo(() => {
        return allPlayers.reduce((acc, player) => {
        acc[player.id] = player;
        return acc;
        }, {} as Record<string, WithId<Player>>);
    }, [allPlayers]);
    
    const teamsById = useMemo(() => {
        return allTeams.reduce((acc, team) => {
        acc[team.id] = team;
        return acc;
        }, {} as Record<string, WithId<Team>>);
    }, [allTeams]);
    
    const { upcomingMatches, completedMatches } = useMemo(() => {
        if (!matches) return { upcomingMatches: [], completedMatches: [] };
        
        const filteredMatches = matches
            .map(match => ({
                ...match,
                player1: playersById[match.player1Id] || null,
                player2: playersById[match.player2Id] || null,
            }))
            .filter(m => {
                if (!searchTerm.trim()) return true;
                
                const searchTerms = searchTerm.toLowerCase().split(' ').filter(Boolean);
                const p1Name = m.player1?.name.toLowerCase() || '';
                const p2Name = m.player2?.name.toLowerCase() || '';

                if (searchTerms.length > 1) {
                    // Search for matches between two specific players
                    const term1 = searchTerms[0];
                    const term2 = searchTerms[1];
                    return (p1Name.includes(term1) && p2Name.includes(term2)) ||
                           (p1Name.includes(term2) && p2Name.includes(term1));
                } else {
                    // Original search for a single player
                    const term = searchTerms[0];
                    return p1Name.includes(term) || p2Name.includes(term);
                }
            });

        const upcoming = filteredMatches.filter(m => !m.isCompleted);
        const completed = filteredMatches
            .filter(m => m.isCompleted)
            .sort((a, b) => b.matchDate.toMillis() - a.matchDate.toMillis());

        return { upcomingMatches: upcoming, completedMatches: completed };
    }, [matches, playersById, searchTerm]);


    if (isLoadingMatches) {
        return <p>{t('loading_fixtures')}</p>;
    }

    if (!matches || matches.length === 0) {
        return (
            <div className="border rounded-lg p-8 text-center bg-card">
              <h2 className="text-xl font-medium text-muted-foreground">{t('no_fixtures_generated_title')}</h2>
              <p className="text-muted-foreground mt-2">{t('no_fixtures_generated_desc')}</p>
            </div>
        );
    }
    
    return (
        <>
            <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                    type="text"
                    placeholder={t('search_by_player_or_team')}
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {(upcomingMatches.length === 0 && completedMatches.length === 0 && searchTerm) ? (
                 <div className="border rounded-lg p-8 text-center bg-card">
                    <h2 className="text-xl font-medium text-muted-foreground">{t('no_matches_found')}</h2>
                </div>
            ) : (
                <Tabs defaultValue="upcoming" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="upcoming">Sisa Pertandingan ({upcomingMatches.length})</TabsTrigger>
                        <TabsTrigger value="completed">Pertandingan Selesai ({completedMatches.length})</TabsTrigger>
                    </TabsList>
                    <TabsContent value="upcoming">
                        <Card>
                            <CardContent className="p-2">
                               {upcomingMatches.length > 0 ? (
                                    <div className="divide-y">
                                        {upcomingMatches.map(match => (
                                            <MatchRow
                                                key={match.id}
                                                match={match}
                                                onEditMatch={onEditMatch}
                                                isAdmin={isAdmin}
                                                activeSeason={activeSeason}
                                                teamsById={teamsById}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <p className="p-4 text-center text-muted-foreground">{t('no_matches_in_category')}</p>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="completed">
                        <Card>
                             <CardContent className="p-2">
                                {completedMatches.length > 0 ? (
                                    <div className="divide-y">
                                        {completedMatches.map(match => (
                                            <MatchRow
                                                key={match.id}
                                                match={match}
                                                onEditMatch={onEditMatch}
                                                isAdmin={isAdmin}
                                                activeSeason={activeSeason}
                                                teamsById={teamsById}
                                            />
                                        ))}
                                    </div>
                                 ) : (
                                    <p className="p-4 text-center text-muted-foreground">{t('no_matches_in_category')}</p>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            )}
        </>
    );
});


const AdminControls = memo(function AdminControls({
  activeSeasonId,
  activeSeason,
  hasFixtures,
  isLoadingSeasons,
  seasons,
  leagueTable,
  onSeasonChange,
  onGenerateFixtures,
  onRecalculate,
  isAdmin,
  setIsAdmin
}: {
  activeSeasonId: string | null;
  activeSeason: WithId<Season> | null;
  hasFixtures: boolean;
  isLoadingSeasons: boolean;
  seasons: WithId<Season>[];
  leagueTable: WithId<LeagueEntry>[] | null;
  onSeasonChange: (id: string) => void;
  onGenerateFixtures: () => void;
  onRecalculate: () => void;
  isAdmin: boolean;
  setIsAdmin: (isAdmin: boolean) => void;
}) {
  const { password: ADMIN_PASSWORD } = useSharedPassword();
  const [passwordPrompt, setPasswordPrompt] = useState<{ open: boolean, action?: () => void }>({ open: false });
  const [passwordInput, setPasswordInput] = useState('');
  const { toast } = useToast();
  const { t } = useTranslation();
  const [showRecalculateConfirm, setShowRecalculateConfirm] = useState(false);

  const handlePasswordCheck = () => {
    if (passwordInput === ADMIN_PASSWORD) {
      setIsAdmin(true);
      toast({ title: t('admin_mode_unlocked_title'), description: t('admin_mode_unlocked_desc') });
      if (passwordPrompt.action) {
        passwordPrompt.action();
      }
    } else {
      toast({
        variant: 'destructive',
        title: t('incorrect_password'),
        description: t('admin_permission_denied'),
      });
    }
    setPasswordPrompt({ open: false });
    setPasswordInput('');
  };

  const withAdminCheck = useCallback((action: () => void) => {
    if (isAdmin) {
      action();
    } else {
      setPasswordPrompt({ open: true, action });
    }
  }, [isAdmin]);

  const handleRecalculateClick = () => {
    withAdminCheck(() => {
        setShowRecalculateConfirm(true);
    });
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
        <Select value={activeSeasonId || ''} onValueChange={onSeasonChange} disabled={isLoadingSeasons}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder={t('select_a_season')} />
          </SelectTrigger>
          <SelectContent>
            {seasons?.map(season => (
              <SelectItem key={season.id} value={season.id}>{season.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-2">
            {isAdmin && (
                <>
                    <Button onClick={() => withAdminCheck(onGenerateFixtures)} disabled={!activeSeasonId || activeSeason?.status !== 'Not Started' || (leagueTable?.length ?? 0) < 2}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        {hasFixtures ? t('regenerate_fixtures') : t('generate_fixtures')}
                    </Button>
                    <Button onClick={handleRecalculateClick} variant="destructive" disabled={!activeSeasonId}>
                        <Calculator className="mr-2 h-4 w-4" />
                        Hitung Ulang
                    </Button>
                </>
            )}
            <Button onClick={() => isAdmin ? setIsAdmin(false) : withAdminCheck(() => {})} variant="outline">
              {isAdmin ? <Unlock className="mr-2" /> : <Lock className="mr-2" />}
              {isAdmin ? t('lock_admin_mode') : t('unlock_admin')}
            </Button>
        </div>
      </div>

      <Dialog open={passwordPrompt.open} onOpenChange={(isOpen) => !isOpen && setPasswordPrompt({ open: false })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin_auth_required_title')}</DialogTitle>
            <DialogDescription>
              {t('enter_admin_password_to_continue')}
            </DialogDescription>
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
            <Button onClick={handlePasswordCheck}>{t('submit')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={showRecalculateConfirm} onOpenChange={setShowRecalculateConfirm}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Anda yakin?</AlertDialogTitle>
                <AlertDialogDescription>
                    Tindakan ini akan menghitung ulang semua statistik (main, menang, kalah, seri, gol, poin) untuk semua pemain di musim <strong>{activeSeason?.name}</strong> berdasarkan data pertandingan yang sudah selesai. Gunakan ini untuk memperbaiki data yang tidak konsisten.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Batal</AlertDialogCancel>
                <AlertDialogAction onClick={() => { onRecalculate(); setShowRecalculateConfirm(false); }} className="bg-destructive hover:bg-destructive/90">Ya, Hitung Ulang</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
});


export default function FixturesPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { t } = useTranslation();

  const [activeSeasonId, setActiveSeasonId] = useState<string | null>(null);
  const [editingMatch, setEditingMatch] = useState<WithId<Match> | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // --- Firestore Data Hooks ---
  const seasonsCollection = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `leagues/${LEAGUE_ID}/seasons`), orderBy('createdAt', 'desc')) : null),
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
  const { data: leagueTable } = useCollection<LeagueEntry>(leagueTableCollection);
  
  const matchesCollection = useMemoFirebase(
    () =>
      firestore && activeSeasonId
        ? collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/matches`)
        : null,
    [firestore, activeSeasonId]
  );
  const { data: matches } = useCollection<Match>(matchesCollection);

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
  
  // --- Memoized Derived State ---
  const activeSeason = useMemo(() => seasons?.find((s) => s.id === activeSeasonId) || null, [seasons, activeSeasonId]);
  const hasFixtures = useMemo(() => (matches || []).length > 0, [matches]);
  
  // --- Effects ---
  useEffect(() => {
    if (seasons && !activeSeasonId && seasons.length > 0) {
      setActiveSeasonId(seasons[0].id);
    }
  }, [seasons, activeSeasonId]);
  
  const handleGenerateFixtures = useCallback(async () => {
    if (!firestore || !activeSeasonId || !leagueTable || leagueTable.length < 2 || !activeSeason) {
      toast({ variant: 'destructive', title: t('error'), description: t('generate_fixtures_error_min_players') });
      return;
    }
    
    if (activeSeason?.status !== 'Not Started') {
       toast({ variant: 'destructive', title: t('error'), description: t('generate_fixtures_error_not_started') });
       return;
    }

    const batch = writeBatch(firestore);

    // 1. Delete existing fixtures for this season
    const existingMatchesQuery = query(collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/matches`));
    const existingMatchesSnap = await getDocs(existingMatchesQuery);
    existingMatchesSnap.forEach(doc => batch.delete(doc.ref));
    
    // 2. Generate new Home and away fixtures
    for (let i = 0; i < leagueTable.length; i++) {
        for (let j = 0; j < leagueTable.length; j++) {
            if (i === j) continue; // Players don't play against themselves

            const player1Entry = leagueTable[i];
            const player2Entry = leagueTable[j];

            const matchData: Omit<Match, 'id' | 'player1Score' | 'player2Score'> = {
                seasonId: activeSeasonId,
                player1Id: player1Entry.playerId,
                player2Id: player2Entry.playerId,
                isCompleted: false,
                matchDate: Timestamp.now(), // Default to current time, user can edit
            };
            const matchRef = doc(collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/matches`));
            batch.set(matchRef, matchData);
        }
    }
    
    try {
      await batch.commit();
      toast({ title: t('fixtures_generated_title'), description: t('fixtures_generated_desc', { seasonName: activeSeason.name }) });
    } catch(e) {
      console.error(e);
      toast({ variant: 'destructive', title: t('error'), description: t('generate_fixtures_error') });
    }
  }, [firestore, activeSeasonId, leagueTable, activeSeason, t, toast]);


  const handleUpdateScore = async (matchId: string, values: { score1: number, score2: number, time: string, date: Date }) => {
    if (!firestore || !activeSeasonId) return;

    const matchRef = doc(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/matches`, matchId);
    
    try {
        await runTransaction(firestore, async (transaction) => {
            const originalMatchDoc = await transaction.get(matchRef);
            if (!originalMatchDoc.exists()) {
                throw new Error("Match document not found!");
            }
            const originalMatch = originalMatchDoc.data() as Match;

            const tableEntriesRef = collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/leagueTable`);
            const p1EntryQuery = query(tableEntriesRef, where('playerId', '==', originalMatch.player1Id));
            const p2EntryQuery = query(tableEntriesRef, where('playerId', '==', originalMatch.player2Id));
            
            const [p1EntrySnap, p2EntrySnap] = await Promise.all([
                getDocs(p1EntryQuery),
                getDocs(p2EntryQuery)
            ]);

            if (p1EntrySnap.empty || p2EntrySnap.empty) {
                throw new Error(t('update_score_error_no_entries'));
            }
            
            const p1EntryRef = p1EntrySnap.docs[0].ref;
            const p2EntryRef = p2EntrySnap.docs[0].ref;
            
            const p1EntryData = p1EntrySnap.docs[0].data() as LeagueEntry;
            const p2EntryData = p2EntrySnap.docs[0].data() as LeagueEntry;
            
            const newP1Stats = { ...p1EntryData };
            const newP2Stats = { ...p2EntryData };

            // 1. Revert old stats if match was already completed
            if (originalMatch.isCompleted) {
                const oldScores = { p1: originalMatch.player1Score ?? 0, p2: originalMatch.player2Score ?? 0 };
                newP1Stats.played -= 1;
                newP2Stats.played -= 1;
                newP1Stats.goalsFor -= oldScores.p1;
                newP1Stats.goalsAgainst -= oldScores.p2;
                newP2Stats.goalsFor -= oldScores.p2;
                newP2Stats.goalsAgainst -= oldScores.p1;
                
                if (oldScores.p1 > oldScores.p2) { // P1 won
                    newP1Stats.win -= 1;
                    newP1Stats.points -= 3;
                    newP2Stats.loss -= 1;
                } else if (oldScores.p2 > oldScores.p1) { // P2 won
                    newP2Stats.win -= 1;
                    newP2Stats.points -= 3;
                    newP1Stats.loss -= 1;
                } else { // Draw
                    newP1Stats.draw -= 1; newP1Stats.points -= 1;
                    newP2Stats.draw -= 1; newP2Stats.points -= 1;
                }
            }
            
            // 2. Apply new stats
            newP1Stats.played += 1;
            newP2Stats.played += 1;
            newP1Stats.goalsFor += values.score1;
            newP1Stats.goalsAgainst += values.score2;
            newP2Stats.goalsFor += values.score2;
            newP2Stats.goalsAgainst += values.score1;
            
            if (values.score1 > values.score2) { // P1 wins
                newP1Stats.win += 1; newP1Stats.points += 3;
                newP2Stats.loss += 1;
            } else if (values.score2 > values.score1) { // P2 wins
                newP2Stats.win += 1; newP2Stats.points += 3;
                newP1Stats.loss += 1;
            } else { // Draw
                newP1Stats.draw += 1; newP1Stats.points += 1;
                newP2Stats.draw += 1; newP2Stats.points += 1;
            }
            
            newP1Stats.goalDifference = newP1Stats.goalsFor - newP1Stats.goalsAgainst;
            newP2Stats.goalDifference = newP2Stats.goalsFor - newP2Stats.goalsAgainst;

            // 3. Set the new, correct state in the transaction, overwriting old data.
            transaction.set(p1EntryRef, newP1Stats);
            transaction.set(p2EntryRef, newP2Stats);

            const [hours, minutes] = values.time.split(':').map(Number);
            const newDate = new Date(values.date);
            // We need to subtract the GMT+7 offset before storing to keep it consistent
            // The display layer will add the offset back
            newDate.setUTCHours(hours, minutes, 0, 0); 
            const newTimestamp = Timestamp.fromDate(newDate);

            transaction.update(matchRef, { 
                player1Score: values.score1, 
                player2Score: values.score2,
                matchDate: newTimestamp,
                isCompleted: true
            });
        });
        toast({ title: t('score_updated_title'), description: t('score_updated_desc') });

    } catch (e) {
        console.error("Transaction failed: ", e);
        toast({ variant: 'destructive', title: t('update_failed_title'), description: (e as Error).message || t('update_score_error') });
    }

    setEditingMatch(null);
  };

  const handleRecalculateStats = useCallback(async () => {
    if (!firestore || !activeSeasonId || !leagueTable) {
        toast({ variant: 'destructive', title: "Gagal", description: "Musim atau tabel liga tidak ditemukan." });
        return;
    }

    toast({ title: "Memulai Perhitungan Ulang...", description: "Harap tunggu sebentar." });

    const batch = writeBatch(firestore);

    // 1. Get all completed matches for the season
    const matchesQuery = query(
        collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/matches`),
        where('isCompleted', '==', true)
    );
    const matchesSnap = await getDocs(matchesQuery);
    const completedMatches = matchesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as WithId<Match>));

    // 2. Create a fresh stats map
    const playerStatsMap: { [playerId: string]: Omit<LeagueEntry, 'id' | 'rank' | 'playerId' | 'teamId' | 'playerName' | 'teamName' | 'photoUrl'> } = {};
    
    leagueTable.forEach(entry => {
        playerStatsMap[entry.playerId] = {
            played: 0, win: 0, draw: 0, loss: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0
        };
    });

    // 3. Recalculate stats from completed matches
    completedMatches.forEach(match => {
        const p1Id = match.player1Id;
        const p2Id = match.player2Id;
        const score1 = match.player1Score ?? 0;
        const score2 = match.player2Score ?? 0;

        if (playerStatsMap[p1Id] && playerStatsMap[p2Id]) {
            const p1Stats = playerStatsMap[p1Id];
            const p2Stats = playerStatsMap[p2Id];

            p1Stats.played += 1;
            p2Stats.played += 1;
            p1Stats.goalsFor += score1;
            p1Stats.goalsAgainst += score2;
            p2Stats.goalsFor += score2;
            p2Stats.goalsAgainst += score1;

            if (score1 > score2) { // P1 wins
                p1Stats.win += 1;
                p1Stats.points += 3;
                p2Stats.loss += 1;
            } else if (score2 > score1) { // P2 wins
                p2Stats.win += 1;
                p2Stats.points += 3;
                p1Stats.loss += 1;
            } else { // Draw
                p1Stats.draw += 1;
                p1Stats.points += 1;
                p2Stats.draw += 1;
                p2Stats.points += 1;
            }
        }
    });

    // 4. Update the leagueTable documents in a batch
    leagueTable.forEach(entry => {
        const stats = playerStatsMap[entry.playerId];
        if (stats) {
            const entryRef = doc(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/leagueTable`, entry.id);
            const finalStats = {
                ...stats,
                goalDifference: stats.goalsFor - stats.goalsAgainst,
            };
            batch.update(entryRef, finalStats);
        }
    });
    
    try {
        await batch.commit();
        toast({ title: "Sukses!", description: "Statistik tabel liga telah dihitung ulang dan diperbarui." });
    } catch(e) {
        console.error("Failed to recalculate stats: ", e);
        toast({ variant: 'destructive', title: "Gagal", description: "Terjadi kesalahan saat menyimpan statistik baru." });
    }
  }, [firestore, activeSeasonId, leagueTable, toast]);


  const handleEditMatch = (match: WithId<Match>) => {
    setEditingMatch(match)
  };

  const isLoading = isLoadingSeasons || isLoadingPlayers || isLoadingTeams;

  return (
    <div className="container mx-auto px-4 py-8">
       <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-12">
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                 <div className="space-y-2">
                    <h1 className="font-headline text-4xl font-extrabold tracking-tight text-primary">{t('fixtures_page_title')}</h1>
                    {activeSeason && <p className="text-xl font-bold">{activeSeason.name} ({activeSeason.status})</p>}
                </div>
                <AdminControls
                  activeSeasonId={activeSeasonId}
                  activeSeason={activeSeason}
                  hasFixtures={hasFixtures}
                  isLoadingSeasons={isLoadingSeasons}
                  seasons={seasons || []}
                  leagueTable={leagueTable}
                  onSeasonChange={setActiveSeasonId}
                  onGenerateFixtures={handleGenerateFixtures}
                  onRecalculate={handleRecalculateStats}
                  isAdmin={isAdmin}
                  setIsAdmin={setIsAdmin}
                />
            </div>

            <section className="mb-12">
                <LiveClock />
            </section>
            
            {isLoading ? (
                <p>{t('loading_fixtures')}</p>
            ) : (
                <FixtureContent 
                    activeSeasonId={activeSeasonId}
                    onEditMatch={handleEditMatch}
                    isAdmin={isAdmin}
                    allPlayers={allPlayers || []}
                    allTeams={allTeams || []}
                    activeSeason={activeSeason}
                />
            )}

        </div>

        <Dialog open={!!editingMatch} onOpenChange={(isOpen) => !isOpen && setEditingMatch(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('update_match_score_title')}</DialogTitle>
              {editingMatch && allPlayers && (
                 <DialogDescription>
                    {t('update_match_score_desc', { 
                        player1: allPlayers.find(p => p.id === editingMatch.player1Id)?.name, 
                        player2: allPlayers.find(p => p.id === editingMatch.player2Id)?.name 
                    })}
                </DialogDescription>
              )}
            </DialogHeader>
            {editingMatch && <ScoreForm match={editingMatch} onSave={(values) => handleUpdateScore(editingMatch.id, values)} players={allPlayers || []} />}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
    
    

    

    

    

    
