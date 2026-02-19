'use client';

import { useState, useMemo, useEffect, useCallback, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Pencil, Search, Unlock, Calculator, Undo2, Lock, Swords } from 'lucide-react';
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
import { collection, doc, writeBatch, query, getDocs, where, runTransaction, Timestamp, orderBy, getDoc, updateDoc, increment, DocumentReference } from 'firebase/firestore';
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
    
    // Best of 3 logic for Hybrid mode: Final is always Bo3. QF/SF are Bo3 only if group stage was Home & Away.
    const isBestOfThree = activeSeason?.type === 'Co-Op' || 
        (activeSeason?.type === 'Hybrid' && (
            match.round === 'Final' || 
            (activeSeason.hybridGroupMeetings === 2 && (match.round === 'Quarter-Final' || match.round === 'Semi-Final'))
        ));

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
    
    const score = isBestOfThree ? `${match.player1Wins} - ${match.player2Wins}` : `${match.player1Score} - ${match.player2Score}`;
    
    // A match has a valid score if it's completed and the relevant score fields are not null.
    const hasValidScore = match.isCompleted && (isBestOfThree ? match.player1Wins !== null : match.player1Score !== null);


    return (
        <div className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-4 p-3 transition-colors rounded-md hover:bg-muted/50">
            <PlayerInfo name={match.player1.name} team={match.team1} alignment="right" />
            
            <div className="flex-none text-center">
                 {hasValidScore ? (
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
                    {hasValidScore ? displayDate : t('unplayed_abbv', {defaultValue: 'TBD'})}
                </Button>
                {isAdmin && hasValidScore && (
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
            ? collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/matches`)
            : null,
        [firestore, activeSeasonId]
    );
    const { data: matches, isLoading: isLoadingMatches } = useCollection<Match>(matchesCollection);
    
    const singleLeagueTableCollection = useMemoFirebase(
        () => firestore && activeSeasonId && (activeSeason?.type || 'Single') !== 'Co-Op' ? collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/leagueTable`) : null,
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

    const leagueTableByPlayerId = useMemo(() => {
        if (!singleLeagueTable) return {};
        return singleLeagueTable.reduce((acc, entry) => {
            acc[entry.playerId] = entry;
            return acc;
        }, {} as Record<string, LeagueEntry>);
    }, [singleLeagueTable]);

    const coopTableById = useMemo(() => {
        if (!coopLeagueTable) return {};
        return coopLeagueTable.reduce((acc, e) => { acc[e.id] = e; return acc; }, {} as Record<string, WithId<CoOpLeagueEntry>>);
    }, [coopLeagueTable]);
    
    const { groupedMatches, progressPercentage, totalMatchesForDisplay, completedMatchesForDisplay } = useMemo(() => {
        if (!matches || !activeSeason) return { groupedMatches: { upcoming: {}, completed: {} }, progressPercentage: 0, totalMatchesForDisplay: 0, completedMatchesForDisplay: 0 };
        
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
                    const entry1 = leagueTableByPlayerId[match.player1Id];
                    const entry2 = leagueTableByPlayerId[match.player2Id];
                    
                    // Fallback to master player list only if entry not found (shouldn't happen for active seasons)
                    player1 = entry1 ? { name: entry1.playerName, id: entry1.playerId } : (playersById[match.player1Id] || null);
                    player2 = entry2 ? { name: entry2.playerName, id: entry2.playerId } : (playersById[match.player2Id] || null);
                    
                    if (!player1 || !player2) return null;

                    // Use the team assigned in the league entry for historical consistency
                    const teamId1 = entry1 ? entry1.teamId : (playersById[match.player1Id]?.teamId);
                    const teamId2 = entry2 ? entry2.teamId : (playersById[match.player2Id]?.teamId);

                    team1 = teamsById[teamId1] || null;
                    team2 = teamsById[teamId2] || null;
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
        
        const sortedFilteredMatches = [...filteredMatches].sort((a,b) => a.matchDate.toMillis() - b.matchDate.toMillis());

        const allGrouped = sortedFilteredMatches.reduce((acc, match) => {
            const round = match.round || 'Group'; // Default to group if undefined
            const status = match.isCompleted ? 'completed' : 'upcoming';
    
            if (!acc[status][round]) {
                acc[status][round] = [];
            }
            acc[status][round].push(match);
            return acc;
        }, { upcoming: {} as Record<string, any[]>, completed: {} as Record<string, any[]> });
        
        // Sort completed matches within each group by date descending
        Object.keys(allGrouped.completed).forEach(round => {
            allGrouped.completed[round].sort((a,b) => b.matchDate.toMillis() - a.matchDate.toMillis());
        });

        const upcomingCount = Object.values(allGrouped.upcoming).reduce((sum, arr) => sum + arr.length, 0);
        const completedCount = Object.values(allGrouped.completed).reduce((sum, arr) => sum + arr.length, 0);
        
        const totalForProgress = searchTerm.trim() ? (upcomingCount + completedCount) : matches.length;
        const completedForProgress = searchTerm.trim() ? completedCount : matches.filter(m => m.isCompleted).length;

        const progress = totalForProgress > 0 ? (completedForProgress / totalForProgress) * 100 : 0;
        
        return { 
            groupedMatches: allGrouped,
            progressPercentage: progress,
            totalMatchesForDisplay: totalForProgress,
            completedMatchesForDisplay: completedForProgress
        };
    }, [matches, playersById, teamsById, searchTerm, activeSeason, coopTableById, leagueTableByPlayerId]);

    const upcomingCount = Object.values(groupedMatches.upcoming).reduce((sum, arr) => sum + arr.length, 0);
    const completedCount = Object.values(groupedMatches.completed).reduce((sum, arr) => sum + arr.length, 0);

    const roundNames: Record<string, string> = {
        'Group': 'Fase Grup',
        'Quarter-Final': 'Perempat Final',
        'Semi-Final': 'Semi Final',
        'Final': 'Final'
    }

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


            {(upcomingCount === 0 && completedCount === 0 && searchTerm) ? (
                 <div className="border rounded-lg p-8 text-center bg-card">
                    <h2 className="text-xl font-medium text-muted-foreground">{t('no_matches_found')}</h2>
                </div>
            ) : (
                <Tabs defaultValue="upcoming" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="upcoming">Sisa Pertandingan ({upcomingCount})</TabsTrigger>
                        <TabsTrigger value="completed">Pertandingan Selesai ({completedCount})</TabsTrigger>
                    </TabsList>
                    <TabsContent value="upcoming">
                        <Card>
                            <CardContent className="p-0">
                               {upcomingCount > 0 ? (
                                    <div className="space-y-4">
                                        {Object.entries(groupedMatches.upcoming).map(([round, roundMatches]) => (
                                            <div key={`upcoming-${round}`}>
                                                <h3 className="text-lg font-bold p-4 pb-0 text-primary">{roundNames[round] || round}</h3>
                                                <div className="divide-y p-2">
                                                    {roundMatches.map(match => (
                                                        <MatchRow key={match.id} match={match} onEditMatch={onEditMatch} onRevertMatch={onRevertMatch} isAdmin={isAdmin} activeSeason={activeSeason} />
                                                    ))}
                                                </div>
                                            </div>
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
                             <CardContent className="p-0">
                                {completedCount > 0 ? (
                                    <div className="space-y-4">
                                        {Object.entries(groupedMatches.completed).map(([round, roundMatches]) => (
                                            <div key={`completed-${round}`}>
                                                <h3 className="text-lg font-bold p-4 pb-0 text-primary">{roundNames[round] || round}</h3>
                                                <div className="divide-y p-2">
                                                    {roundMatches.map(match => (
                                                        <MatchRow key={match.id} match={match} onEditMatch={onEditMatch} onRevertMatch={onRevertMatch} isAdmin={isAdmin} activeSeason={activeSeason} />
                                                    ))}
                                                </div>
                                            </div>
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
            const seasonData = seasonDoc.data() as Season;
            const isCoop = (seasonData.type || 'Single') === 'Co-Op';
            const tableName = isCoop ? 'coopLeagueTable' : 'leagueTable';

            // Best of 3 check for dynamic cleanup
            const isMatchBo3 = seasonData.type === 'Co-Op' || 
                (seasonData.type === 'Hybrid' && (
                    originalMatch.round === 'Final' || 
                    (seasonData.hybridGroupMeetings === 2 && (originalMatch.round === 'Quarter-Final' || originalMatch.round === 'Semi-Final'))
                ));

            // Skip table updates for knockout rounds
            if (originalMatch.round && originalMatch.round !== 'Group') {
                const [hours, minutes] = values.time.split(':').map(Number);
                const newTimestamp = Timestamp.fromDate(new Date(values.date.setHours(hours, minutes)));
                
                const matchUpdateData = { 
                    ...values,
                    matchDate: newTimestamp,
                    isCompleted: true,
                    // Clean up unused score fields
                    ...(isMatchBo3 ? { player1Score: null, player2Score: null } : { player1Wins: null, player2Wins: null })
                };
                transaction.update(matchRef, matchUpdateData);
                return;
            }

            let p1EntryRef, p2EntryRef, p1EntryQuery, p2EntryQuery;
            let p1EntrySnap, p2EntrySnap;

            if (isCoop) {
                p1EntryRef = doc(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/${tableName}`, originalMatch.player1Id);
                p2EntryRef = doc(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/${tableName}`, originalMatch.player2Id);
                // Fix syntax error here
                const p1Doc = await transaction.get(p1EntryRef);
                const p2Doc = await transaction.get(p2EntryRef);
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
                    p2EntryData.win += 1; p2EntryData.points += 3;
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
                isCompleted: true,
                // Clean up unused score fields
                ...(isMatchBo3 ? { player1Score: null, player2Score: null } : { player1Wins: null, player2Wins: null })
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
        // --- 1. Cascading Revert Logic ---
        // If we revert a result that lead to next rounds, those rounds must be deleted.
        let roundsToDelete: string[] = [];
        const currentRound = revertingMatch.round || 'Group';
        
        if (currentRound === 'Group') {
            roundsToDelete = ['Quarter-Final', 'Semi-Final', 'Final'];
        } else if (currentRound === 'Quarter-Final') {
            roundsToDelete = ['Semi-Final', 'Final'];
        } else if (currentRound === 'Semi-Final') {
            roundsToDelete = ['Final'];
        }

        let matchesToDeleteRefs: DocumentReference[] = [];
        if (roundsToDelete.length > 0) {
            const matchesColRef = collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/matches`);
            const q = query(matchesColRef, where('round', 'in', roundsToDelete));
            const snap = await getDocs(q);
            matchesToDeleteRefs = snap.docs.map(d => d.ref);
        }

        await runTransaction(firestore, async (transaction) => {
            const matchDoc = await transaction.get(matchRef);
            if (!matchDoc.exists() || !matchDoc.data().isCompleted) {
                throw new Error(t('revert_match_error_not_completed', { defaultValue: "Match has not been completed or does not exist."}));
            }
            const matchToRevert = matchDoc.data() as Match;

            // Delete future rounds if any
            matchesToDeleteRefs.forEach(ref => {
                transaction.delete(ref);
            });

            // Skip table updates for knockout rounds
            if (matchToRevert.round && matchToRevert.round !== 'Group') {
                transaction.update(matchRef, { 
                    player1Wins: null, 
                    player2Wins: null,
                    player1Score: null,
                    player2Score: null,
                    isCompleted: false 
                });
                return;
            }

            const seasonDoc = await transaction.get(doc(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}`));
            const isCoop = (seasonDoc.data()?.type || 'Single') === 'Co-Op';
            const tableName = isCoop ? 'coopLeagueTable' : 'leagueTable';

            let p1EntryRef, p2EntryRef, p1EntryQuery, p2EntryQuery;
            let p1EntrySnap, p2EntrySnap;

            if (isCoop) {
                p1EntryRef = doc(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/${tableName}`, matchToRevert.player1Id);
                p2EntryRef = doc(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/${tableName}`, matchToRevert.player2Id);
                const p1Doc = await transaction.get(p1EntryRef);
                const p2Doc = await transaction.get(p2EntryRef);
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

        toast({ title: t('match_reverted_title', { defaultValue: 'Match Reverted' }), description: t('match_reverted_desc', { defaultValue: 'Skor pertandingan dikembalikan dan babak selanjutnya yang terdampak telah dihapus.' }) });
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
                 <div className="flex items-center gap-2 w-full sm:w-auto">
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
                    <Button onClick={() => isAdmin ? setIsAdmin(false) : setPasswordPromptOpen(true)} variant="outline" size="sm" className={cn(isAdmin && "bg-primary/10 text-primary border-primary/50")} disabled={!isPasswordLoaded}>
                        {isAdmin ? <Unlock className="mr-2 h-4 w-4" /> : <Lock className="mr-2 h-4 w-4" />}
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
                    hybridGroupMeetings={activeSeason.hybridGroupMeetings}
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
                               defaultValue: 'Are you sure you want to revert the match between {{player1}} and {{player2}}? The score will be cleared, player stats adjusted, and subsequent knockout rounds will be deleted.',
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
