
'use client';

import { useState, useMemo, useEffect, useCallback, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Pencil, RefreshCw, Search, Lock, Unlock } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCollection, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, writeBatch, query, getDocs, where, runTransaction, Timestamp } from 'firebase/firestore';
import type { Season, LeagueEntry, Player, WithId, Match, Team } from '@/lib/types';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { ScoreForm } from '@/components/score-form';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTranslation } from '@/hooks/use-translation';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';


// For simplicity, we'll work with a single, hardcoded league.
const LEAGUE_ID = 'main-league';
const ADMIN_PASSWORD = 'Office88';

const FixtureContent = memo(function FixtureContent({
    activeSeasonId,
    onEditMatch,
    isAdmin,
}: {
    activeSeasonId: string | null;
    onEditMatch: (match: WithId<Match>) => void;
    isAdmin: boolean;
}) {
    const firestore = useFirestore();
    const { t } = useTranslation();
    const [searchTerm, setSearchTerm] = useState('');
    
    // --- Firestore Data Hooks ---
    const activeSeasonRef = useMemoFirebase(
      () => firestore && activeSeasonId ? doc(firestore, `leagues/${LEAGUE_ID}/seasons`, activeSeasonId) : null,
      [firestore, activeSeasonId]
    );
    const {data: activeSeason, isLoading: isLoadingSeason} = useDoc<Season>(activeSeasonRef);

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
    
    const teamsCollection = useMemoFirebase(
        () => (firestore ? collection(firestore, 'teams') : null),
        [firestore]
    );
    const { data: allTeams, isLoading: isLoadingTeams } = useCollection<Team>(teamsCollection);

    // --- Memoized Derived State ---
    const playersById = useMemo(() => {
        if (!allPlayers) return {};
        return allPlayers.reduce((acc, player) => {
        acc[player.id] = player;
        return acc;
        }, {} as Record<string, WithId<Player>>);
    }, [allPlayers]);
    
    const teamsById = useMemo(() => {
        if (!allTeams) return {};
        return allTeams.reduce((acc, team) => {
        acc[team.id] = team;
        return acc;
        }, {} as Record<string, WithId<Team>>);
    }, [allTeams]);
    
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
            const p1Team = m.player1 ? (teamsById[m.player1.teamId]?.name.toLowerCase() || '') : '';
            const p2Team = m.player2 ? (teamsById[m.player2.teamId]?.name.toLowerCase() || '') : '';
            return p1Name.includes(term) || p2Name.includes(term) || p1Team.includes(term) || p2Team.includes(term);
        });
    }, [matches, allPlayers, playersById, teamsById, searchTerm]);

    const unplayedMatches = matchesWithPlayers.filter(m => !m.isCompleted);
    const playedMatches = matchesWithPlayers.filter(m => m.isCompleted);
    const hasFixtures = (matches || []).length > 0;

    const MatchList = ({ matchList }: { matchList: (WithId<Match> & { player1: WithId<Player> | null, player2: WithId<Player> | null })[] }) => (
        <>
           {matchList.length === 0 ? (
             <div className="border rounded-lg p-8 text-center bg-card mt-4">
                 <h2 className="text-xl font-medium text-muted-foreground">{searchTerm ? t('no_matches_found') : t('no_matches_in_category')}</h2>
             </div>
           ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
               {matchList.map(match => {
                   const team1 = match.player1 ? teamsById[match.player1.teamId] : null;
                   const team2 = match.player2 ? teamsById[match.player2.teamId] : null;
                   
                   const dateFormat = match.isCompleted ? 'eeee, d MMMM yyyy - HH:mm' : 'eeee, d MMMM yyyy';
   
                   return (
                     <Card key={match.id} className="flex flex-col">
                       <CardHeader className="p-4 pb-2">
                           <p className="text-xs text-muted-foreground text-center font-medium">
                               {match.matchDate ? format(match.matchDate.toDate(), dateFormat, { locale: id }) : 'Date not set'}
                           </p>
                       </CardHeader>
                       <CardContent className="flex-grow flex items-center justify-around p-4">
                         <div className="flex flex-col items-center gap-2 w-2/5 text-center">
                           <Avatar className="h-10 w-10">
                               <AvatarImage src={match.player1?.photoUrl} alt={match.player1?.name} />
                               <AvatarFallback>{match.player1?.name.charAt(0)}</AvatarFallback>
                           </Avatar>
                           <span className="font-semibold text-sm truncate w-full">{match.player1?.name}</span>
                           <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                               {team1 && <Avatar className="h-4 w-4">
                                   <AvatarImage src={team1?.logoUrl} alt={team1?.name} />
                                   <AvatarFallback>{team1?.name.charAt(0)}</AvatarFallback>
                               </Avatar>}
                               {team1?.name}
                           </span>
                           {match.isCompleted && <span className="text-2xl font-bold text-primary">{match.player1Score}</span>}
                         </div>
                         <div className="text-2xl font-bold text-muted-foreground w-1/5 text-center">
                           {match.isCompleted ? '-' : 'VS'}
                         </div>
                         <div className="flex flex-col items-center gap-2 w-2/5 text-center">
                           <Avatar className="h-10 w-10">
                               <AvatarImage src={match.player2?.photoUrl} alt={match.player2?.name} />
                               <AvatarFallback>{match.player2?.name.charAt(0)}</AvatarFallback>
                           </Avatar>
                           <span className="font-semibold text-sm truncate w-full">{match.player2?.name}</span>
                           <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                              {team2 && <Avatar className="h-4 w-4">
                                   <AvatarImage src={team2?.logoUrl} alt={team2?.name} />
                                   <AvatarFallback>{team2?.name.charAt(0)}</AvatarFallback>
                               </Avatar>}
                               {team2?.name}
                           </span>
                           {match.isCompleted && <span className="text-2xl font-bold text-primary">{match.player2Score}</span>}
                         </div>
                       </CardContent>
                       <CardFooter className="p-4 pt-0">
                          <Button
                           variant={match.isCompleted ? 'outline' : 'default'}
                           className="w-full"
                           onClick={() => onEditMatch(match)}
                           disabled={!isAdmin && activeSeason?.status !== 'In Progress'}
                         >
                           <Pencil className="mr-2 h-4 w-4" />
                           {match.isCompleted ? t('edit_score') : t('update_score')}
                         </Button>
                       </CardFooter>
                     </Card>
                   )
               })}
             </div>
           )}
        </>
     );

    const isLoading = isLoadingSeason || isLoadingMatches || isLoadingPlayers || isLoadingTeams;

    return (
        <>
            <div className="mb-8 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder={t('search_by_player_or_team')}
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {isLoading ? (
                <p>{t('loading_fixtures')}</p>
            ) : hasFixtures ? (
                <Tabs defaultValue="remaining">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="remaining">{t('remaining_matches')} ({unplayedMatches.length})</TabsTrigger>
                        <TabsTrigger value="completed">{t('completed_matches')} ({playedMatches.length})</TabsTrigger>
                    </TabsList>
                    <TabsContent value="remaining">
                        <MatchList matchList={unplayedMatches} />
                    </TabsContent>
                    <TabsContent value="completed">
                        <MatchList matchList={playedMatches} />
                    </TabsContent>
                </Tabs>
            ) : (
                <div className="border rounded-lg p-8 text-center bg-card">
                  <h2 className="text-xl font-medium text-muted-foreground">{t('no_fixtures_generated_title')}</h2>
                  <p className="text-muted-foreground mt-2">{t('no_fixtures_generated_desc')}</p>
                </div>
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
  isAdmin: boolean;
  setIsAdmin: (isAdmin: boolean) => void;
}) {
  const [passwordPrompt, setPasswordPrompt] = useState<{ open: boolean, action?: () => void }>({ open: false });
  const [passwordInput, setPasswordInput] = useState('');
  const { toast } = useToast();
  const { t } = useTranslation();

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
        <Button onClick={() => withAdminCheck(onGenerateFixtures)} disabled={!activeSeasonId || activeSeason?.status !== 'Not Started' || (leagueTable?.length ?? 0) < 2}>
          <RefreshCw className="mr-2 h-4 w-4" />
          {hasFixtures ? t('regenerate_fixtures') : t('generate_fixtures')}
        </Button>
        <Button onClick={() => isAdmin ? setIsAdmin(false) : withAdminCheck(() => {})} variant="outline">
          {isAdmin ? <Unlock className="mr-2" /> : <Lock className="mr-2" />}
          {isAdmin ? t('lock_admin_mode') : t('unlock_admin')}
        </Button>
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
  const { data: allPlayers } = useCollection<Player>(playersCollection);
  
  // --- Memoized Derived State ---
  const activeSeason = useMemo(() => seasons?.find((s) => s.id === activeSeasonId) || null, [seasons, activeSeasonId]);
  const hasFixtures = useMemo(() => (matches || []).length > 0, [matches]);
  
  // --- Effects ---
  useEffect(() => {
    if (seasons && !activeSeasonId && seasons.length > 0) {
      const sortedSeasons = [...seasons].sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
      setActiveSeasonId(sortedSeasons[0].id);
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
                matchDate: activeSeason.startDate || activeSeason.createdAt, // Use start date if available
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


  const handleUpdateScore = async (matchId: string, scores: { score1: number, score2: number, time: string }) => {
    if (!firestore || !activeSeasonId) return;

    const matchRef = doc(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/matches`, matchId);
    const originalMatch = matches?.find(m => m.id === matchId);
    if (!originalMatch) return;
    
    const wasCompleted = originalMatch.isCompleted;
    const oldScores = { p1: originalMatch.player1Score ?? 0, p2: originalMatch.player2Score ?? 0 };

    const [hours, minutes] = scores.time.split(':').map(Number);
    const newDate = originalMatch.matchDate.toDate();
    newDate.setHours(hours, minutes);
    const newTimestamp = Timestamp.fromDate(newDate);

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
                throw new Error(t('update_score_error_no_entries'));
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

  const handleEditMatch = (match: WithId<Match>) => {
    setEditingMatch(match)
  };

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
                  isAdmin={isAdmin}
                  setIsAdmin={setIsAdmin}
                />
            </div>
            
            <FixtureContent 
                activeSeasonId={activeSeasonId}
                onEditMatch={handleEditMatch}
                isAdmin={isAdmin}
            />

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
            {editingMatch && <ScoreForm match={editingMatch} onSave={(scores) => handleUpdateScore(editingMatch.id, scores)} players={allPlayers || []} />}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

    