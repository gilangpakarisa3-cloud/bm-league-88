
'use client';

import { useState, useMemo, useEffect, useCallback, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Pencil, Search, Unlock, Calculator, Undo2, Lock } from 'lucide-react';
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
import { useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { collection, doc, writeBatch, query, getDocs, where, runTransaction, Timestamp, orderBy, getDoc, updateDoc, increment } from 'firebase/firestore';
import type { Season, Player, WithId, Match, Team, LeagueEntry, CoOpLeagueEntry } from '@/lib/types';
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
import { Progress } from '@/components/ui/progress';


// For simplicity, we'll work with a single, hardcoded league.
const LEAGUE_ID = 'main-league';


const MatchRow = memo(function MatchRow({ match, onEditMatch, onRevertMatch, isAdmin, activeSeason }: {
    match: any; // Using any because the shape is now dynamic (Single or Co-op)
    onEditMatch: (match: any) => void;
    onRevertMatch: (match: WithId<Match>) => void;
    isAdmin: boolean;
    activeSeason: WithId<Season> | null;
}) {
    const { t } = useTranslation();
    
    const displayDate = format(match.matchDate.toDate(), 'd MMM, HH:mm');
    const isCoop = (activeSeason?.type || 'Single') === 'Co-Op';

    const isEditDisabled = activeSeason?.status !== 'In Progress' || (match.isCompleted && !isAdmin);

    const PlayerInfo = ({ name, team, alignment = 'left' }: { name: string, team: WithId<Team> | null, alignment?: 'left' | 'right' }) => (
        <div className={cn("flex items-center gap-2 text-sm font-semibold truncate", {
            'justify-start': alignment === 'left',
            'justify-end': alignment === 'right',
        })}>
             {alignment === 'right' && <span className="truncate">{name}</span>}
            <Avatar className="h-5 w-5">
                <AvatarImage src={team?.logoUrl} alt={team?.name} />
                <AvatarFallback>{team?.name?.charAt(0)}</AvatarFallback>
            </Avatar>
            {alignment === 'left' && <span className="truncate">{name}</span>}
        </div>
    );
    
    const score = isCoop ? `${match.player1Wins} - ${match.player2Wins}` : `${match.player1Score} - ${match.player2Score}`;


    return (
        <div className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-4 p-3 transition-colors rounded-md hover:bg-muted/50">
            <PlayerInfo name={match.player1.name} team={match.team1} alignment="right" />
            
            <div className="flex-none text-center">
                 {match.isCompleted ? (
                    <span className="text-lg font-bold text-primary">{score}</span>
                ) : (
                    <span className="text-xs font-bold text-primary">VS</span>
                )}
            </div>

            <PlayerInfo name={match.player2.name} team={match.team2} alignment="left" />
            
            <div className="flex-none flex items-center gap-1">
                 <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => onEditMatch(match)}
                    disabled={isEditDisabled}
                >
                    <Pencil className="mr-1 h-3 w-3" />
                    {match.isCompleted ? displayDate : t('unplayed_abbv', {defaultValue: 'TBD'})}
                </Button>
                {isAdmin && match.isCompleted && (
                     <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-amber-500 hover:text-amber-400 hover:bg-amber-500/10"
                        onClick={() => onRevertMatch(match)}
                        title={t('revert_match', { defaultValue: "Revert Match"})}
                    >
                        <Undo2 className="h-4 w-4" />
                    </Button>
                )}
            </div>
        </div>
    );
});


const FixtureContent = memo(function FixtureContent({
    activeSeasonId,
    onEditMatch,
    onRevertMatch,
    isAdmin,
    allPlayers,
    allTeams,
}: {
    activeSeasonId: string | null;
    onEditMatch: (match: any) => void;
    onRevertMatch: (match: WithId<Match>) => void;
    isAdmin: boolean;
    allPlayers: WithId<Player>[];
    allTeams: WithId<Team>[];
}) {
    const firestore = useFirestore();
    const { t } = useTranslation();
    const [searchTerm, setSearchTerm] = useState('');
    
    // --- Firestore Data Hooks ---
    const activeSeasonDoc = useMemoFirebase(
        () => (firestore && activeSeasonId ? doc(firestore, `leagues/${LEAGUE_ID}/seasons`, activeSeasonId) : null),
        [firestore, activeSeasonId]
    );
    const { data: activeSeason } = useDoc<Season>(activeSeasonDoc);

    const matchesCollection = useMemoFirebase(
        () =>
        firestore && activeSeasonId
            ? query(collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/matches`), orderBy('matchDate', 'asc'))
            : null,
        [firestore, activeSeasonId]
    );
    const { data: matches, isLoading: isLoadingMatches } = useCollection<Match>(matchesCollection);
    
    const singleLeagueTableCollection = useMemoFirebase(
        () => firestore && activeSeasonId && (activeSeason?.type || 'Single') === 'Single' ? collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/leagueTable`) : null,
        [firestore, activeSeasonId, activeSeason]
    );
    const { data: singleLeagueTable } = useCollection<LeagueEntry>(singleLeagueTableCollection);

    const coopLeagueTableCollection = useMemoFirebase(
        () => firestore && activeSeasonId && activeSeason?.type === 'Co-Op' ? collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/coopLeagueTable`) : null,
        [firestore, activeSeasonId, activeSeason]
    );
    const { data: coopLeagueTable } = useCollection<CoOpLeagueEntry>(coopLeagueTableCollection);
    
    
    // --- Memoized Derived State ---
    const playersById = useMemo(() => {
        return allPlayers.reduce((acc, player) => {
        acc[player.id] = player;
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

    const singleTableById = useMemo(() => {
        if (!singleLeagueTable) return {};
        return singleLeagueTable.reduce((acc, e) => { acc[e.playerId] = e; return acc; }, {} as Record<string, WithId<LeagueEntry>>);
    }, [singleLeagueTable]);

    const coopTableById = useMemo(() => {
        if (!coopLeagueTable) return {};
        return coopLeagueTable.reduce((acc, e) => { acc[e.id] = e; return acc; }, {} as Record<string, WithId<CoOpLeagueEntry>>);
    }, [coopLeagueTable]);
    
    const { upcomingMatches, completedMatches, progressPercentage, totalMatchesForDisplay, completedMatchesForDisplay } = useMemo(() => {
        if (!matches || !activeSeason) return { upcomingMatches: [], completedMatches: [], progressPercentage: 0, totalMatchesForDisplay: 0, completedMatchesForDisplay: 0 };
        
        const isCoop = (activeSeason.type || 'Single') === 'Co-Op';

        const enrichedMatches = matches
            .map(match => {
                let player1, player2, team1, team2;

                if (isCoop) {
                    const teamEntry1 = coopTableById[match.player1Id];
                    const teamEntry2 = coopTableById[match.player2Id];
                    if (!teamEntry1 || !teamEntry2) return null;

                    player1 = { name: teamEntry1.teamName, id: teamEntry1.id };
                    player2 = { name: teamEntry2.teamName, id: teamEntry2.id };
                    team1 = teamsById[teamEntry1.player1TeamId] || null;
                    team2 = teamsById[teamEntry2.player1TeamId] || null;

                } else {
                    player1 = playersById[match.player1Id] || null;
                    player2 = playersById[match.player2Id] || null;
                    if (!player1 || !player2) return null;

                    team1 = teamsById[player1.teamId] || null;
                    team2 = teamsById[player2.teamId] || null;
                }

                return { ...match, player1, player2, team1, team2 };
            }).filter(Boolean) as any[];

        const filteredMatches = enrichedMatches.filter(m => {
            if (!searchTerm.trim()) return true;
            
            const searchTerms = searchTerm.toLowerCase().split(' ').filter(Boolean);
            const p1Name = m.player1?.name.toLowerCase() || '';
            const p2Name = m.player2?.name.toLowerCase() || '';

            if (searchTerms.length > 1) {
                const term1 = searchTerms[0];
                const term2 = searchTerms[1];
                return (p1Name.includes(term1) && p2Name.includes(term2)) ||
                        (p1Name.includes(term2) && p2Name.includes(term1));
            } else {
                const term = searchTerms[0];
                return p1Name.includes(term) || p2Name.includes(term);
            }
        });

        const upcoming = filteredMatches.filter(m => !m.isCompleted);
        const completed = filteredMatches
            .filter(m => m.isCompleted)
            .sort((a, b) => b.matchDate.toMillis() - a.matchDate.toMillis());
        
        const totalForProgress = searchTerm.trim() ? filteredMatches.length : matches.length;
        const completedForProgress = searchTerm.trim() ? completed.length : matches.filter(m => m.isCompleted).length;

        const progress = totalForProgress > 0 ? (completedForProgress / totalForProgress) * 100 : 0;
        
        return { 
            upcomingMatches: upcoming, 
            completedMatches: completed, 
            progressPercentage: progress,
            totalMatchesForDisplay: totalForProgress,
            completedMatchesForDisplay: completedForProgress
        };
    }, [matches, playersById, teamsById, searchTerm, activeSeason, singleTableById, coopTableById]);


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
                    placeholder="Cari berdasarkan nama pemain/tim..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            
             <div className="my-6">
                <Progress value={progressPercentage} className="h-3" />
                <p className="text-xs text-center text-foreground font-bold mt-2">
                    {completedMatchesForDisplay} dari {totalMatchesForDisplay} pertandingan selesai ({progressPercentage.toFixed(0)}%)
                </p>
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
                                                onRevertMatch={onRevertMatch}
                                                isAdmin={isAdmin}
                                                activeSeason={activeSeason}
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
                                                onRevertMatch={onRevertMatch}
                                                isAdmin={isAdmin}
                                                activeSeason={activeSeason}
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


export default function FixturesPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { password: ADMIN_PASSWORD, isLoaded: isPasswordLoaded } = useSharedPassword();

  const [activeSeasonId, setActiveSeasonId] = useState<string | null>(null);
  const [editingMatch, setEditingMatch] = useState<any | null>(null);
  const [revertingMatch, setRevertingMatch] = useState<WithId<Match> | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [passwordPromptOpen, setPasswordPromptOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  
  // --- Firestore Data Hooks ---
  const seasonsCollection = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `leagues/${LEAGUE_ID}/seasons`), orderBy('createdAt', 'desc')) : null),
    [firestore]
  );
  const { data: seasons, isLoading: isLoadingSeasons } = useCollection<Season>(seasonsCollection);
  
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
    return allPlayers.reduce((acc, p) => {
        acc[p.id] = p;
        return acc;
    }, {} as Record<string, WithId<Player>>);
  }, [allPlayers]);
  
  // --- Effects ---
  useEffect(() => {
    if (seasons && !activeSeasonId && seasons.length > 0) {
      setActiveSeasonId(seasons[0].id);
    }
  }, [seasons, activeSeasonId]);
  
  const handlePasswordCheck = () => {
    if (!isPasswordLoaded) return;
    if (passwordInput === ADMIN_PASSWORD) {
        setIsAdmin(true);
        setPasswordPromptOpen(false);
        toast({ title: t('admin_mode_unlocked_title') });
    } else {
        toast({ variant: 'destructive', title: t('incorrect_password') });
    }
    setPasswordInput('');
  };

  const handleUpdateScore = async (matchId: string, values: any) => {
    if (!firestore || !activeSeasonId) return;

    const matchRef = doc(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/matches`, matchId);
    
    try {
        await runTransaction(firestore, async (transaction) => {
            const matchDoc = await transaction.get(matchRef);
            if (!matchDoc.exists()) throw new Error("Match document not found!");
            
            const originalMatch = matchDoc.data() as Match;

            const seasonDoc = await transaction.get(doc(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}`));
            const isCoop = (seasonDoc.data()?.type || 'Single') === 'Co-Op';
            const tableName = isCoop ? 'coopLeagueTable' : 'leagueTable';

            let p1EntryRef, p2EntryRef, p1EntryQuery, p2EntryQuery;
            let p1EntrySnap, p2EntrySnap;

            if (isCoop) {
                p1EntryRef = doc(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/${tableName}`, originalMatch.player1Id);
                p2EntryRef = doc(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/${tableName}`, originalMatch.player2Id);
                const [p1Doc, p2Doc] = await Promise.all([transaction.get(p1EntryRef), transaction.get(p2EntryRef)]);
                p1EntrySnap = { docs: p1Doc.exists() ? [p1Doc] : [] };
                p2EntrySnap = { docs: p2Doc.exists() ? [p2Doc] : [] };
            } else {
                const tableEntriesRef = collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/${tableName}`);
                p1EntryQuery = query(tableEntriesRef, where('playerId', '==', originalMatch.player1Id));
                p2EntryQuery = query(tableEntriesRef, where('playerId', '==', originalMatch.player2Id));
                const [p1Docs, p2Docs] = await Promise.all([getDocs(p1EntryQuery), getDocs(p2EntryQuery)]);
                p1EntrySnap = p1Docs;
                p2EntrySnap = p2Docs;
            }

            if (p1EntrySnap.docs.length === 0 || p2EntrySnap.docs.length === 0) {
                throw new Error(t('update_score_error_no_entries'));
            }
            
            const p1FinalEntryRef = p1EntrySnap.docs[0].ref;
            const p2FinalEntryRef = p2EntrySnap.docs[0].ref;
            
            const p1EntryData = p1EntrySnap.docs[0].data() as LeagueEntry | CoOpLeagueEntry;
            const p2EntryData = p2EntrySnap.docs[0].data() as LeagueEntry | CoOpLeagueEntry;
            
            // Revert old stats if match was already completed
            if (originalMatch.isCompleted) {
                p1EntryData.played -= 1;
                p2EntryData.played -= 1;
                
                if (isCoop) {
                    if ((originalMatch.player1Wins ?? 0) > (originalMatch.player2Wins ?? 0)) { // P1 won
                        p1EntryData.win -= 1; p1EntryData.points -= 3;
                        p2EntryData.loss -= 1;
                    } else if ((originalMatch.player2Wins ?? 0) > (originalMatch.player1Wins ?? 0)) { // P2 won
                        p2EntryData.win -= 1; p2EntryData.points -= 3;
                        p1EntryData.loss -= 1;
                    }
                } else {
                    const p1LeagueData = p1EntryData as LeagueEntry;
                    const p2LeagueData = p2EntryData as LeagueEntry;
                    p1LeagueData.goalsFor -= originalMatch.player1Score ?? 0;
                    p1LeagueData.goalsAgainst -= originalMatch.player2Score ?? 0;
                    p2LeagueData.goalsFor -= originalMatch.player2Score ?? 0;
                    p2LeagueData.goalsAgainst -= originalMatch.player1Score ?? 0;

                    if ((originalMatch.player1Score ?? 0) > (originalMatch.player2Score ?? 0)) { // P1 won
                        p1LeagueData.win -= 1; p1LeagueData.points -= 3;
                        p2LeagueData.loss -= 1;
                    } else if ((originalMatch.player2Score ?? 0) > (originalMatch.player1Score ?? 0)) { // P2 won
                        p2LeagueData.win -= 1; p2LeagueData.points -= 3;
                        p1LeagueData.loss -= 1;
                    } else { // Draw
                        p1LeagueData.draw -= 1; p1LeagueData.points -= 1;
                        p2LeagueData.draw -= 1; p2LeagueData.points -= 1;
                    }
                }
            }
            
            // Apply new stats
            p1EntryData.played += 1;
            p2EntryData.played += 1;
            
            if (isCoop) {
                if (values.player1Wins > values.player2Wins) { // P1 wins
                    p1EntryData.win += 1; p1EntryData.points += 3;
                    p2EntryData.loss += 1;
                } else if (values.player2Wins > values.player1Wins) { // P2 wins
                    p2EntryData.win += 1; p2EntryData.points += 3;
                    p1EntryData.loss += 1;
                }
            } else {
                const p1LeagueData = p1EntryData as LeagueEntry;
                const p2LeagueData = p2EntryData as LeagueEntry;
                p1LeagueData.goalsFor += values.player1Score;
                p1LeagueData.goalsAgainst += values.player2Score;
                p2LeagueData.goalsFor += values.player2Score;
                p2LeagueData.goalsAgainst += values.player1Score;

                if (values.player1Score > values.player2Score) { // P1 wins
                    p1LeagueData.win += 1; p1LeagueData.points += 3;
                    p2LeagueData.loss += 1;
                } else if (values.player2Score > values.player1Score) { // P2 wins
                    p2LeagueData.win += 1; p2LeagueData.points += 3;
                    p1LeagueData.loss += 1;
                } else { // Draw
                    p1LeagueData.draw += 1; p1LeagueData.points += 1;
                    p2LeagueData.draw += 1; p2LeagueData.points += 1;
                }
                p1LeagueData.goalDifference = p1LeagueData.goalsFor - p1LeagueData.goalsAgainst;
                p2LeagueData.goalDifference = p2LeagueData.goalsFor - p2LeagueData.goalsAgainst;
            }
            
            transaction.set(p1FinalEntryRef, p1EntryData);
            transaction.set(p2FinalEntryRef, p2EntryData);

            const [hours, minutes] = values.time.split(':').map(Number);
            const newTimestamp = Timestamp.fromDate(new Date(values.date.setHours(hours, minutes)));
            
            const matchUpdateData = { 
                ...values,
                matchDate: newTimestamp,
                isCompleted: true
            };
            transaction.update(matchRef, matchUpdateData);
        });
        toast({ title: t('score_updated_title'), description: t('score_updated_desc') });

    } catch (e) {
        console.error("Transaction failed: ", e);
        toast({ variant: 'destructive', title: t('update_failed_title'), description: (e as Error).message || t('update_score_error') });
    }

    setEditingMatch(null);
  };

  const handleRevertMatch = useCallback(async () => {
    if (!firestore || !activeSeasonId || !revertingMatch) return;
    
    const matchRef = doc(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/matches`, revertingMatch.id);

    try {
        await runTransaction(firestore, async (transaction) => {
            const matchDoc = await transaction.get(matchRef);
            if (!matchDoc.exists() || !matchDoc.data().isCompleted) {
                throw new Error(t('revert_match_error_not_completed', { defaultValue: "Match has not been completed or does not exist."}));
            }
            const matchToRevert = matchDoc.data() as Match;

            const seasonDoc = await transaction.get(doc(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}`));
            const isCoop = (seasonDoc.data()?.type || 'Single') === 'Co-Op';
            const tableName = isCoop ? 'coopLeagueTable' : 'leagueTable';

            let p1EntryRef, p2EntryRef, p1EntryQuery, p2EntryQuery;
            let p1EntrySnap, p2EntrySnap;

            if (isCoop) {
                p1EntryRef = doc(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/${tableName}`, matchToRevert.player1Id);
                p2EntryRef = doc(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/${tableName}`, matchToRevert.player2Id);
                const [p1Doc, p2Doc] = await Promise.all([transaction.get(p1EntryRef), transaction.get(p2EntryRef)]);
                p1EntrySnap = { docs: p1Doc.exists() ? [p1Doc] : [] };
                p2EntrySnap = { docs: p2Doc.exists() ? [p2Doc] : [] };
            } else {
                const tableEntriesRef = collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/${tableName}`);
                p1EntryQuery = query(tableEntriesRef, where('playerId', '==', matchToRevert.player1Id));
                p2EntryQuery = query(tableEntriesRef, where('playerId', '==', matchToRevert.player2Id));
                const [p1Docs, p2Docs] = await Promise.all([getDocs(p1EntryQuery), getDocs(p2EntryQuery)]);
                p1EntrySnap = p1Docs;
                p2EntrySnap = p2Docs;
            }

            if (p1EntrySnap.docs.length === 0 || p2EntrySnap.docs.length === 0) {
                throw new Error(t('update_score_error_no_entries'));
            }

            const p1FinalEntryRef = p1EntrySnap.docs[0].ref;
            const p2FinalEntryRef = p2EntrySnap.docs[0].ref;
            const p1EntryData = p1EntrySnap.docs[0].data() as LeagueEntry | CoOpLeagueEntry;
            const p2EntryData = p2EntrySnap.docs[0].data() as LeagueEntry | CoOpLeagueEntry;

            p1EntryData.played -= 1;
            p2EntryData.played -= 1;
            
            if(isCoop) {
                if ((matchToRevert.player1Wins ?? 0) > (matchToRevert.player2Wins ?? 0)) { // P1 won
                    p1EntryData.win -= 1; p1EntryData.points -= 3;
                    p2EntryData.loss -= 1;
                } else if ((matchToRevert.player2Wins ?? 0) > (matchToRevert.player1Wins ?? 0)) { // P2 won
                    p2EntryData.win -= 1; p2EntryData.points -= 3;
                    p1EntryData.loss -= 1;
                }
            } else {
                const p1LeagueData = p1EntryData as LeagueEntry;
                const p2LeagueData = p2EntryData as LeagueEntry;
                p1LeagueData.goalsFor -= matchToRevert.player1Score ?? 0;
                p1LeagueData.goalsAgainst -= matchToRevert.player2Score ?? 0;
                p2LeagueData.goalsFor -= matchToRevert.player2Score ?? 0;
                p2LeagueData.goalsAgainst -= matchToRevert.player1Score ?? 0;

                if ((matchToRevert.player1Score ?? 0) > (matchToRevert.player2Score ?? 0)) { // P1 won
                    p1LeagueData.win -= 1; p1LeagueData.points -= 3;
                    p2LeagueData.loss -= 1;
                } else if ((matchToRevert.player2Score ?? 0) > (matchToRevert.player1Score ?? 0)) { // P2 won
                    p2LeagueData.win -= 1; p2LeagueData.points -= 3;
                    p1LeagueData.loss -= 1;
                } else { // Draw
                    p1LeagueData.draw -= 1; p1LeagueData.points -= 1;
                    p2LeagueData.draw -= 1; p2LeagueData.points -= 1;
                }
                 p1LeagueData.goalDifference = p1LeagueData.goalsFor - p1LeagueData.goalsAgainst;
                p2LeagueData.goalDifference = p2LeagueData.goalsFor - p2LeagueData.goalsAgainst;
            }

            transaction.set(p1FinalEntryRef, p1EntryData);
            transaction.set(p2FinalEntryRef, p2EntryData);

            transaction.update(matchRef, { 
                player1Wins: null, 
                player2Wins: null,
                player1Score: null,
                player2Score: null,
                isCompleted: false 
            });
        });

        toast({ title: t('match_reverted_title', { defaultValue: 'Match Reverted' }), description: t('match_reverted_desc', { defaultValue: 'The match score and stats have been successfully reverted.' }) });
    } catch(e) {
        console.error("Revert transaction failed: ", e);
        toast({ variant: 'destructive', title: t('revert_failed_title', { defaultValue: 'Revert Failed' }), description: (e as Error).message });
    }

    setRevertingMatch(null);

  }, [firestore, activeSeasonId, revertingMatch, t, toast]);

  const handleEditMatch = (match: any) => {
    setEditingMatch(match)
  };
  
  const handleRevertConfirm = (match: WithId<Match>) => {
      setRevertingMatch(match);
  }

  const isLoading = isLoadingSeasons || isLoadingPlayers || isLoadingTeams || !isPasswordLoaded;

  const activeSeason = useMemo(() => seasons?.find((s) => s.id === activeSeasonId) || null, [seasons, activeSeasonId]);

  return (
    <div className="container mx-auto px-4 py-8">
       <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                 <div className="space-y-2">
                    <h1 className="font-headline text-4xl font-extrabold tracking-tight text-primary">{t('fixtures_page_title')}</h1>
                    {activeSeason && <p className="text-xl font-bold">{activeSeason.name} ({activeSeason.status})</p>}
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
                    <Button onClick={() => isAdmin ? setIsAdmin(false) : setPasswordPromptOpen(true)} variant="outline" disabled={!isPasswordLoaded}>
                        {isAdmin ? <Unlock className="mr-2" /> : <Lock className="mr-2" />}
                        {isAdmin ? t('lock_admin_mode') : t('unlock_admin')}
                    </Button>
                </div>
            </div>

            <div className="mb-8">
                <LiveClock />
            </div>
            
            {isLoading ? (
                <p>{t('loading_fixtures')}</p>
            ) : (
                <FixtureContent 
                    activeSeasonId={activeSeasonId}
                    onEditMatch={handleEditMatch}
                    onRevertMatch={handleRevertConfirm}
                    isAdmin={isAdmin}
                    allPlayers={allPlayers || []}
                    allTeams={allTeams || []}
                />
            )}

        </div>

        <Dialog open={!!editingMatch} onOpenChange={(isOpen) => !isOpen && setEditingMatch(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('update_match_score_title')}</DialogTitle>
              {editingMatch && (
                 <DialogDescription>
                    {t('update_match_score_desc', { 
                        player1: editingMatch.player1?.name, 
                        player2: editingMatch.player2?.name 
                    })}
                </DialogDescription>
              )}
            </DialogHeader>
            {editingMatch && activeSeason && (
                <ScoreForm 
                    match={editingMatch} 
                    onSave={(values) => handleUpdateScore(editingMatch.id, values)}
                    seasonType={activeSeason.type}
                    player1Info={{ name: editingMatch.player1.name, team: editingMatch.team1 }}
                    player2Info={{ name: editingMatch.player2.name, team: editingMatch.team2 }}
                />
            )}
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!revertingMatch} onOpenChange={(isOpen) => !isOpen && setRevertingMatch(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{t('revert_match_confirm_title', { defaultValue: 'Revert This Match?'})}</AlertDialogTitle>
                     {revertingMatch && (
                        <AlertDialogDescription>
                           {t('revert_match_confirm_desc', { 
                               defaultValue: 'Are you sure you want to revert the match between {{player1}} and {{player2}}? The score will be cleared and player stats will be adjusted.',
                               player1: playersById[revertingMatch.player1Id]?.name,
                               player2: playersById[revertingMatch.player2Id]?.name
                           })}
                        </AlertDialogDescription>
                     )}
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setRevertingMatch(null)}>{t('cancel')}</AlertDialogCancel>
                    <AlertDialogAction onClick={handleRevertMatch} className="bg-amber-500 hover:bg-amber-600">
                        {t('revert_match_action', { defaultValue: 'Yes, Revert It'})}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        
        <Dialog open={passwordPromptOpen} onOpenChange={setPasswordPromptOpen}>
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

      </div>
    </div>
  );
}
