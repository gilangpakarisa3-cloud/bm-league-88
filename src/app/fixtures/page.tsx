'use client';

import { useState, useMemo, useEffect, useCallback, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Pencil, Search, Unlock, Undo2, Lock, Calendar, Swords, Clock, Zap, Activity, Trophy, LayoutGrid, KeyRound, CalendarIcon, Shield, ChevronRight, Scan } from 'lucide-react';
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
import { useCollection, useFirestore, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, doc, query, getDocs, getDoc, where, runTransaction, Timestamp, orderBy, increment } from 'firebase/firestore';
import type { Season, Player, WithId, Match, Team, LeagueEntry, CoOpLeagueEntry } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { ScoreForm } from '@/components/score-form';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTranslation } from '@/hooks/use-translation';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { useSharedPassword } from '@/context/password-context';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { LiveClock } from '@/components/live-clock';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PLAYOFF_SUCCESSOR_MAP } from '@/lib/constants';


// For simplicity, we'll work with a single, hardcoded league.
const LEAGUE_ID = 'main-league';

// Standard Round Priority for Sorting (Early to Late)
const ROUND_ORDER: Record<string, number> = {
    'Group': 1,
    'UB-Quarter': 2,
    'LB-Round 1': 3,
    'UB-Semi': 4,
    'LB-Round 2': 5,
    'LB-Round 3': 6,
    'UB-Final': 7,
    'LB-Semifinal': 8,
    'LB-Final': 9,
    'Grand-Final': 10
};

const MatchRow = memo(function MatchRow({ match, onEditMatch, onRevertMatch, isAdmin, activeSeason, hasPlayoffs }: {
    match: any;
    onEditMatch: (match: any) => void;
    onRevertMatch: (match: WithId<Match>) => void;
    isAdmin: boolean;
    activeSeason: WithId<Season> | null;
    hasPlayoffs: boolean;
}) {
    const { t } = useTranslation();
    const displayDate = format(match.matchDate.toDate(), 'd MMM, HH:mm', { locale: localeId });
    const isBestOfThree = activeSeason?.type === 'Co-Op' || (match.round && match.round !== 'Group');
    
    const isEditDisabled = 
        activeSeason?.status !== 'In Progress' || 
        (match.isCompleted && !isAdmin) || 
        (match.player1Id === 'TBD' || match.player2Id === 'TBD') ||
        (hasPlayoffs && (match.round === 'Group' || !match.round) && !isAdmin);

    const PlayerInfo = ({ name, team, alignment = 'left', isWinner }: { name: string, team: WithId<Team> | null, alignment?: 'left' | 'right', isWinner: boolean }) => (
        <div className={cn(
            "flex items-center gap-3 sm:gap-6 group/player transition-all duration-500 w-full", 
            alignment === 'right' ? "flex-row-reverse text-right justify-start" : "flex-row text-left justify-start"
        )}>
            <div className="relative shrink-0">
                <div className={cn(
                    "absolute -inset-1.5 rounded-full blur-md opacity-0 transition-opacity duration-700",
                    isWinner ? "bg-primary/40 opacity-100" : "bg-white/5 group-hover/player:opacity-20"
                )} />
                
                <Avatar className={cn(
                    "h-10 w-10 sm:h-16 sm:w-16 border-2 transition-all duration-700 shadow-2xl relative z-10",
                    isWinner ? "border-primary scale-110 rotate-0" : "border-white/10 group-hover/player:border-primary/40 -rotate-3 group-hover/player:rotate-0"
                )}>
                    <AvatarImage src={team?.logoUrl} alt={team?.name} className="object-cover" />
                    <AvatarFallback className="bg-black/40 font-black text-xs">
                        <Shield className="w-5 h-5 text-white/10" />
                    </AvatarFallback>
                </Avatar>
                
                {isWinner && (
                    <div className="absolute -top-1 -right-1 bg-primary rounded-full p-1 z-20 shadow-lg border-2 border-background animate-bounce">
                        <Zap className="w-3 h-3 text-black fill-black" />
                    </div>
                )}
            </div>

            <div className="flex flex-col gap-0.5 overflow-hidden">
                <span className={cn(
                    "text-xs sm:text-xl font-black tracking-tighter uppercase italic truncate transition-colors duration-500",
                    isWinner ? "text-primary" : "text-white/80 group-hover/player:text-white"
                )}>
                    {name}
                </span>
                <span className="text-[7px] sm:text-[9px] font-black text-white/20 uppercase tracking-[0.2em] truncate group-hover/player:text-primary/40 transition-colors">
                    {team?.name || 'Athlete Protocol'}
                </span>
            </div>
        </div>
    );
    
    const score1 = isBestOfThree ? match.player1Wins : match.player1Score;
    const score2 = isBestOfThree ? match.player2Wins : match.player2Score;
    const hasValidScore = match.isCompleted && score1 !== null && score2 !== null;
    const isW1 = hasValidScore && score1 > score2;
    const isW2 = hasValidScore && score2 > score1;

    return (
        <div className="group relative overflow-hidden transition-all duration-500 border-b border-white/5 last:border-0 hover:bg-primary/[0.02]">
            {/* Immersive Ghost Text */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden pr-4 sm:pr-8">
                <span className="text-[100px] sm:text-[180px] font-black italic text-white/[0.02] uppercase tracking-tighter transition-all duration-1000 group-hover:text-primary/[0.03] group-hover:scale-110 leading-none">
                    {hasValidScore ? 'FINISHED' : 'MATCHDAY'}
                </span>
            </div>

            {/* HUD Status Line */}
            <div className={cn(
                "absolute inset-y-0 left-0 w-1 sm:w-1.5 transition-all duration-700",
                hasValidScore ? "bg-white/5 group-hover:bg-primary/40" : "bg-primary/20 group-hover:bg-primary shadow-[0_0_20px_rgba(204,253,1,0.4)]"
            )} />

            <div className="relative z-10 grid grid-cols-[1fr_auto_1fr] md:grid-cols-[1fr_200px_1fr] items-center gap-2 sm:gap-4 p-5 sm:p-10">
                
                {/* Home Player */}
                <div className="justify-self-end w-full">
                    <PlayerInfo name={match.player1?.name || 'TBD'} team={match.team1} alignment="right" isWinner={isW1} />
                </div>
                
                {/* Score/VS Module */}
                <div className="flex flex-col items-center justify-center min-w-[80px] sm:min-w-[140px] relative">
                    {hasValidScore ? (
                        <div className="relative group/score">
                            <div className="absolute -inset-6 bg-primary/10 rounded-full blur-2xl opacity-0 group-hover/score:opacity-100 transition-opacity duration-1000" />
                            <div className="bg-[#0A192F]/60 border-2 border-primary/30 px-4 sm:px-6 py-2 rounded-2xl shadow-2xl relative z-10 flex items-center gap-3 sm:gap-4 ring-4 ring-black/20">
                                <span className={cn("text-2xl sm:text-4xl font-black italic tabular-nums leading-none", isW1 ? "text-primary drop-shadow-[0_0_15px_rgba(204,253,1,0.6)]" : "text-white/20")}>{score1}</span>
                                <div className="w-px h-6 bg-white/10" />
                                <span className={cn("text-2xl sm:text-4xl font-black italic tabular-nums leading-none", isW2 ? "text-primary drop-shadow-[0_0_15px_rgba(204,253,1,0.6)]" : "text-white/20")}>{score2}</span>
                            </div>
                        </div>
                    ) : (
                        <div className="relative flex flex-col items-center">
                            <div className="bg-primary/10 border border-primary/30 px-4 py-1.5 rounded-full backdrop-blur-md shadow-lg group-hover:border-primary transition-colors">
                                <span className="text-[10px] sm:text-xs font-black tracking-[0.4em] text-primary uppercase italic pr-1">VS</span>
                            </div>
                            {isBestOfThree && <Badge variant="outline" className="mt-2 text-[6px] sm:text-[8px] border-primary/20 text-primary/60 font-black uppercase tracking-widest bg-black/40">BO3 SERIES</Badge>}
                        </div>
                    )}
                </div>
                
                {/* Away Player */}
                <div className="justify-self-start w-full">
                    <PlayerInfo name={match.player2?.name || 'TBD'} team={match.team2} alignment="left" isWinner={isW2} />
                </div>
                
                {/* Desktop Actions - Positioned to side to keep center grid balanced */}
                <div className="hidden md:flex items-center gap-3 justify-end absolute right-10 top-1/2 -translate-y-1/2">
                    <div className="flex flex-col items-end mr-2">
                        <span className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em] mb-1">Signal</span>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className={cn(
                                "h-11 px-6 text-[10px] font-black uppercase tracking-widest transition-all duration-500 border rounded-xl", 
                                hasValidScore 
                                    ? "text-white/40 hover:text-primary border-white/5 hover:border-primary/30 bg-white/[0.02]" 
                                    : "text-primary hover:bg-primary hover:text-black border-primary/30 shadow-lg shadow-primary/5"
                            )} 
                            onClick={() => onEditMatch(match)} 
                            disabled={isEditDisabled}
                        >
                            {hasValidScore ? (
                                <div className="flex items-center gap-2 italic">
                                    <Clock className="h-3.5 w-3.5" />
                                    {displayDate}
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 italic">
                                    <Zap className="h-3.5 w-3.5 fill-current" />
                                    {isEditDisabled ? (
                                        (match.player1Id === 'TBD' || match.player2Id === 'TBD') ? 'Awaiting Signal' : 
                                        (hasPlayoffs && (match.round === 'Group' || !match.round) ? 'LOCKED' : 'READY')
                                    ) : 'LOG SCORE'}
                                </div>
                            )}
                        </Button>
                    </div>
                    
                    {isAdmin && hasValidScore && (
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-11 w-11 text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 border-2 border-amber-500/20 rounded-xl transition-all" 
                            onClick={() => onRevertMatch(match)} 
                            title={t('revert_match')}
                        >
                            <Undo2 className="h-5 w-5" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Mobile Actions Bar */}
            <div className="md:hidden flex items-center justify-between p-4 bg-black/40 border-t border-white/5 relative z-10">
                <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-white/20" />
                    <span className="text-[10px] font-black text-white/40 uppercase italic tracking-wider">{displayDate}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className={cn(
                            "h-9 px-4 text-[9px] font-black uppercase tracking-widest border rounded-lg",
                            hasValidScore ? "text-white/40 border-white/10" : "text-primary border-primary/30"
                        )}
                        onClick={() => onEditMatch(match)}
                        disabled={isEditDisabled}
                    >
                        {hasValidScore ? 'View Stats' : 'Update'}
                    </Button>
                    {isAdmin && hasValidScore && (
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-9 w-9 text-amber-500 border border-amber-500/20 rounded-lg" 
                            onClick={() => onRevertMatch(match)}
                        >
                            <Undo2 className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
});

const FixtureContent = memo(function FixtureContent({ activeSeasonId, onEditMatch, onRevertMatch, isAdmin, allPlayers, allTeams, matches, isLoadingMatches, activeSeason, hasPlayoffs }: { activeSeasonId: string | null; onEditMatch: (match: any) => void; onRevertMatch: (match: WithId<Match>) => void; isAdmin: boolean; allPlayers: WithId<Player>[]; allTeams: WithId<Team>[]; matches: WithId<Match>[] | null; isLoadingMatches: boolean; activeSeason: WithId<Season> | null; hasPlayoffs: boolean; }) {
    const firestore = useFirestore();
    const { t } = useTranslation();
    const [searchTerm, setSearchTerm] = useState('');
    
    const singleLeagueTableCollection = useMemoFirebase(() => firestore && activeSeasonId && (activeSeason?.type || 'Single') !== 'Co-Op' ? collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/leagueTable`) : null, [firestore, activeSeasonId, activeSeason]);
    const { data: singleLeagueTable } = useCollection<LeagueEntry>(singleLeagueTableCollection);
    const coopLeagueTableCollection = useMemoFirebase(() => firestore && activeSeasonId && activeSeason?.type === 'Co-Op' ? collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/coopLeagueTable`) : null, [firestore, activeSeasonId, activeSeason]);
    const { data: coopLeagueTable } = useCollection<CoOpLeagueEntry>(coopLeagueTableCollection);
    
    const playersById = useMemo(() => allPlayers.reduce((acc, player) => { acc[player.id] = player; return acc; }, {} as Record<string, WithId<Player>>), [allPlayers]);
    const teamsById = useMemo(() => allTeams.reduce((acc, t) => { acc[t.id] = t; return acc; }, {} as Record<string, WithId<Team>>), [allTeams]);
    const leagueTableByPlayerId = useMemo(() => (singleLeagueTable || []).reduce((acc, entry) => { acc[entry.playerId] = entry; return acc; }, {} as Record<string, LeagueEntry>), [singleLeagueTable]);
    const coopTableById = useMemo(() => (coopLeagueTable || []).reduce((acc, e) => { acc[e.id] = e; return acc; }, {} as Record<string, WithId<CoOpLeagueEntry>>), [coopLeagueTable]);
    
    const { groupedMatches, upcomingCount, completedCount } = useMemo(() => {
        if (!matches || !activeSeason) return { groupedMatches: { upcoming: {}, completed: {} }, upcomingCount: 0, completedCount: 0 };
        const isCoop = (activeSeason.type || 'Single') === 'Co-Op';
        const enrichedMatches = matches.map(match => {
            let p1, p2, t1, t2;
            if (isCoop) {
                const e1 = coopTableById[match.player1Id];
                const e2 = coopTableById[match.player2Id];
                p1 = e1 ? { name: e1.teamName, id: e1.id } : (match.player1Id === 'TBD' ? { name: 'TBD', id: 'TBD' } : null);
                p2 = e2 ? { name: e2.teamName, id: e2.id } : (match.player2Id === 'TBD' ? { name: 'TBD', id: 'TBD' } : null);
                t1 = e1 ? teamsById[e1.player1TeamId] : null;
                t2 = e2 ? teamsById[e2.player1TeamId] : null;
            } else {
                const e1 = leagueTableByPlayerId[match.player1Id];
                const e2 = leagueTableByPlayerId[match.player2Id];
                p1 = e1 ? { name: e1.playerName, id: e1.playerId } : (match.player1Id === 'TBD' ? { name: 'TBD', id: 'TBD' } : (playersById[match.player1Id] || null));
                p2 = e2 ? { name: e2.playerName, id: e2.playerId } : (match.player2Id === 'TBD' ? { name: 'TBD', id: 'TBD' } : (playersById[match.player2Id] || null));
                t1 = teamsById[e1 ? e1.teamId : playersById[match.player1Id]?.teamId] || null;
                t2 = teamsById[e2 ? e2.teamId : playersById[match.player2Id]?.teamId] || null;
            }
            if (!p1 || !p2) return null;
            return { ...match, player1: p1, player2: p2, team1: t1, team2: t2 };
        }).filter(Boolean) as any[];

        const filtered = enrichedMatches.filter(m => {
            // Search filter
            if (searchTerm.trim()) {
                const terms = searchTerm.toLowerCase().split(' ').filter(Boolean);
                const pn1 = m.player1?.name.toLowerCase() || '';
                const pn2 = m.player2?.name.toLowerCase() || '';
                if (!terms.every(t => pn1.includes(t) || pn2.includes(t))) return false;
            }

            // User requirement: Hide unplayed group matches if playoffs have already started
            if (hasPlayoffs && !m.isCompleted && (m.round === 'Group' || !m.round)) {
                return false;
            }

            return true;
        });
        
        const grouped = filtered.reduce((acc, m) => {
            const rd = m.round || 'Group';
            const st = m.isCompleted ? 'completed' : 'upcoming';
            if (!acc[st][rd]) acc[st][rd] = [];
            acc[st][rd].push(m);
            return acc;
        }, { upcoming: {} as Record<string, any[]>, completed: {} as Record<string, any[]> });
        
        // Sort Rounds by standard order (Fase Awal ke Fase Akhir)
        const sortRounds = (entries: [string, any[]][]) => {
            return entries.sort(([rdA], [rdB]) => {
                return (ROUND_ORDER[rdA] || 99) - (ROUND_ORDER[rdB] || 99);
            });
        };

        const upcomingSorted: Record<string, any[]> = {};
        sortRounds(Object.entries(grouped.upcoming)).forEach(([rd, ms]) => {
            upcomingSorted[rd] = ms.sort((a, b) => a.matchDate.toMillis() - b.matchDate.toMillis());
        });

        const completedSorted: Record<string, any[]> = {};
        sortRounds(Object.entries(grouped.completed)).forEach(([rd, ms]) => {
            completedSorted[rd] = ms.sort((a, b) => a.matchDate.toMillis() - b.matchDate.toMillis());
        });

        return { 
            groupedMatches: { upcoming: upcomingSorted, completed: completedSorted }, 
            upcomingCount: Object.values(grouped.upcoming).flat().length, 
            completedCount: Object.values(grouped.completed).flat().length 
        };
    }, [matches, playersById, teamsById, searchTerm, activeSeason, coopTableById, leagueTableByPlayerId, hasPlayoffs]);

    const roundNames: Record<string, string> = { 
        'Group': 'Fase Grup', 
        'UB-Quarter': 'UB - Perempat Final', 
        'UB-Semi': 'UB - Semi Final', 
        'UB-Final': 'Upper Bracket Final', 
        'LB-Round 1': 'LB-R1 (vs Loser M1-M4)', 
        'LB-Round 2': 'LB-R2 (Win M5-M8)', 
        'LB-Round 3': 'LB-R3 (vs Loser UB Semi)', 
        'LB-Semifinal': 'LB - Semifinal', 
        'LB-Final': 'LB - vs Loser UB Final', 
        'Grand-Final': 'Grand Final' 
    };

    if (isLoadingMatches) return (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Zap className="w-12 h-12 text-primary animate-pulse" />
            <p className="text-sm font-black tracking-[0.3em] text-primary/60 uppercase italic">{t('loading_fixtures')}</p>
        </div>
    );

    if (!matches || matches.length === 0) return (
        <div className="border-4 border-dashed border-white/5 rounded-3xl p-16 text-center bg-card/20 backdrop-blur-md animate-in fade-in zoom-in-95 duration-700">
            <Swords className="w-20 h-20 text-white/5 mx-auto mb-6" />
            <h2 className="text-2xl font-black text-white tracking-tighter uppercase italic pr-2">{t('no_fixtures_generated_title')}</h2>
            <p className="text-white/40 mt-3 max-w-sm mx-auto font-bold uppercase text-[10px] tracking-widest">{t('no_fixtures_generated_desc')}</p>
        </div>
    );
    
    return (
        <div className="space-y-10">
            <div className="relative max-w-2xl mx-auto group">
                <div className="absolute -inset-1 bg-primary/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-primary/50 group-focus-within:text-primary transition-colors" />
                <Input 
                    type="text" 
                    placeholder="Search Battle / Team..." 
                    className="pl-14 h-14 bg-background/40 border-2 border-white/5 focus:border-primary/50 rounded-2xl text-lg font-black italic tracking-tight uppercase placeholder:text-white/20 transition-all shadow-2xl relative z-10" 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                />
            </div>

            {(upcomingCount === 0 && completedCount === 0 && searchTerm) ? (
                <div className="text-center py-20 opacity-20 flex flex-col items-center gap-4">
                    <Activity className="w-12 h-12" />
                    <h2 className="text-xl font-black uppercase italic tracking-widest">{t('no_matches_found')}</h2>
                </div>
            ) : (
                <Tabs defaultValue="upcoming" className="w-full">
                    <div className="flex justify-center mb-10">
                        <TabsList className="grid grid-cols-2 w-full max-w-md h-14 bg-black/40 p-1.5 border-2 border-white/5 rounded-2xl shadow-2xl">
                            <TabsTrigger value="upcoming" className="font-black tracking-tighter h-full rounded-xl data-[state=active]:bg-primary data-[state=active]:text-black uppercase italic text-xs transition-all duration-500">
                                Sisa Laga ({upcomingCount})
                            </TabsTrigger>
                            <TabsTrigger value="completed" className="font-black tracking-tighter h-full rounded-xl data-[state=active]:bg-primary data-[state=active]:text-black uppercase italic text-xs transition-all duration-500">
                                Selesai ({completedCount})
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="upcoming" className="mt-0 focus-visible:ring-0 outline-none">
                        <div className="space-y-12">
                            {Object.entries(groupedMatches.upcoming)
                                .map(([rd, rms]) => (
                                <section key={`upcoming-${rd}`} className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                                    <div className="flex items-center gap-6 mb-6">
                                        <div className="h-1.5 flex-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent rounded-full" />
                                        <div className="flex flex-col items-center">
                                            <h3 className="text-base sm:text-lg font-black tracking-[0.2em] text-white uppercase italic pr-2">{roundNames[rd] || rd}</h3>
                                            <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest border-primary/30 text-primary py-0 h-5 mt-1">Live Queue</Badge>
                                        </div>
                                        <div className="h-1.5 flex-1 bg-gradient-to-l from-transparent via-primary/30 to-transparent rounded-full" />
                                    </div>
                                    <Card className="overflow-hidden border-2 border-white/5 bg-card/40 backdrop-blur-xl shadow-[0_0_50px_rgba(0,0,0,0.3)] rounded-[2.5rem]">
                                        <CardContent className="p-0">
                                            {rms.map(m => (
                                                <MatchRow key={m.id} match={m} onEditMatch={onEditMatch} onRevertMatch={onRevertMatch} isAdmin={isAdmin} activeSeason={activeSeason} hasPlayoffs={hasPlayoffs} />
                                            ))}
                                        </CardContent>
                                    </Card>
                                </section>
                            ))}
                            {upcomingCount === 0 && (
                                <div className="text-center py-24 opacity-10 flex flex-col items-center gap-4">
                                    <Trophy className="w-16 h-16" />
                                    <p className="text-sm font-black uppercase tracking-[0.4em] italic">{t('no_matches_in_category')}</p>
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="completed" className="mt-0 focus-visible:ring-0 outline-none">
                        <div className="space-y-12">
                            {Object.entries(groupedMatches.completed)
                                .map(([rd, rms]) => (
                                <section key={`completed-${rd}`} className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                                    <div className="flex items-center gap-6 mb-6">
                                        <div className="h-1.5 flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent rounded-full" />
                                        <div className="flex flex-col items-center">
                                            <h3 className="text-base sm:text-lg font-black tracking-[0.2em] text-white/60 uppercase italic pr-2">{roundNames[rd] || rd}</h3>
                                            <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest border-white/10 text-white/30 py-0 h-5 mt-1">History Log</Badge>
                                        </div>
                                        <div className="h-1.5 flex-1 bg-gradient-to-l from-transparent via-white/10 to-transparent rounded-full" />
                                    </div>
                                    <Card className="overflow-hidden border-2 border-white/5 bg-card/40 backdrop-blur-xl shadow-[0_0_50px_rgba(0,0,0,0.3)] rounded-[2.5rem]">
                                        <CardContent className="p-0">
                                            {rms.map(m => (
                                                <MatchRow key={m.id} match={m} onEditMatch={onEditMatch} onRevertMatch={onRevertMatch} isAdmin={isAdmin} activeSeason={activeSeason} hasPlayoffs={hasPlayoffs} />
                                            ))}
                                        </CardContent>
                                    </Card>
                                </section>
                            ))}
                            {completedCount === 0 && (
                                <div className="text-center py-24 opacity-10 flex flex-col items-center gap-4">
                                    <Zap className="w-16 h-16" />
                                    <p className="text-sm font-black uppercase tracking-[0.4em] italic">{t('no_matches_in_category')}</p>
                                </div>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
            )}
        </div>
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
  
  const seasonsCol = useMemoFirebase(() => (firestore ? query(collection(firestore, `leagues/${LEAGUE_ID}/seasons`), orderBy('createdAt', 'desc')) : null), [firestore]);
  const { data: seasons, isLoading: isLoadingSeasons } = useCollection<Season>(seasonsCol);
  
  const playersCol = useMemoFirebase(() => (firestore ? collection(firestore, 'players') : null), [firestore]);
  const { data: allPlayers, isLoading: isLoadingPlayers } = useCollection<Player>(playersCol);
  
  const teamsCol = useMemoFirebase(() => (firestore ? collection(firestore, 'teams') : null), [firestore]);
  const { data: allTeams, isLoading: isLoadingTeams } = useCollection<Team>(teamsCol);
  
  const matchesCol = useMemoFirebase(() => firestore && activeSeasonId ? collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/matches`) : null, [firestore, activeSeasonId]);
  const { data: matches, isLoading: isLoadingMatches } = useCollection<Match>(matchesCol);
  
  const playersById = useMemo(() => (allPlayers || []).reduce((acc, p) => { acc[p.id] = p; return acc; }, {} as Record<string, WithId<Player>>), [allPlayers]);
  const activeSeason = useMemo(() => seasons?.find((s) => s.id === activeSeasonId) || null, [seasons, activeSeasonId]);
  
  const hasPlayoffs = useMemo(() => matches?.some(m => m.round && m.round !== 'Group') || false, [matches]);

  const { progressPercentage, totalMatchesForDisplay, completedMatchesForDisplay } = useMemo(() => {
    if (!matches || matches.length === 0) return { progressPercentage: 0, totalMatchesForDisplay: 0, completedMatchesForDisplay: 0 };
    const comp = matches.filter(m => m.isCompleted).length;
    return { progressPercentage: (comp / matches.length) * 100, totalMatchesForDisplay: matches.length, completedMatchesForDisplay: comp };
  }, [matches]);

  useEffect(() => { if (seasons && !activeSeasonId && seasons.length > 0) setActiveSeasonId(seasons[0].id); }, [seasons, activeSeasonId]);
  
  const handlePasswordCheck = () => {
    if (!isPasswordLoaded) return;
    if (passwordInput === ADMIN_PASSWORD) { setIsAdmin(true); setPasswordPromptOpen(false); toast({ title: t('admin_mode_unlocked_title') }); } else { toast({ variant: 'destructive', title: t('incorrect_password') }); }
    setPasswordInput('');
  };

  const handleUpdateScore = async (matchId: string, values: any) => {
    if (!firestore || !activeSeasonId) return;
    const matchRef = doc(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/matches`, matchId);
    const seasonRef = doc(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}`);
    
    try {
        // Step 1: Gather ALL necessary data outside the transaction
        const [mDoc, sDoc] = await Promise.all([getDoc(matchRef), getDoc(seasonRef)]);
        if (!mDoc.exists() || !sDoc.exists()) throw new Error("Match or Season data not found.");
        
        const orig = mDoc.data() as Match;
        const sData = sDoc.data() as Season;
        const isMatchBo3 = sData.type === 'Co-Op' || (orig.round && orig.round !== 'Group');
        
        let winMatchRef = null;
        let losMatchRef = null;
        if (orig.round && orig.round !== 'Group' && orig.bracketId) {
            const succ = PLAYOFF_SUCCESSOR_MAP[orig.bracketId];
            if (succ) {
                const mCol = collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/matches`);
                const [winSnap, losSnap] = await Promise.all([
                    getDocs(query(mCol, where('bracketId', '==', succ.winner.bid))),
                    succ.loser ? getDocs(query(mCol, where('bracketId', '==', succ.loser.bid))) : Promise.resolve(null)
                ]);
                if (winSnap && !winSnap.empty) winMatchRef = winSnap.docs[0].ref;
                if (losSnap && !losSnap.empty) losMatchRef = losSnap.docs[0].ref;
            }
        }

        let p1EntryRef = null;
        let p2EntryRef = null;
        if (orig.round === 'Group' || !orig.round) {
            const tblName = sData.type === 'Co-Op' ? 'coopLeagueTable' : 'leagueTable';
            const tblCol = collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/${tblName}`);
            if (sData.type === 'Co-Op') {
                p1EntryRef = doc(tblCol, orig.player1Id);
                p2EntryRef = doc(tblCol, orig.player2Id);
            } else {
                const [snap1, snap2] = await Promise.all([
                    getDocs(query(tblCol, where('playerId', '==', orig.player1Id))),
                    getDocs(query(tblCol, where('playerId', '==', orig.player2Id)))
                ]);
                if (!snap1.empty) p1EntryRef = snap1.docs[0].ref;
                if (!snap2.empty) p2EntryRef = snap2.docs[0].ref;
            }
        }

        // Prepare clean update data for the match doc update later
        const [h, m] = values.time.split(':').map(Number); 
        const matchTimestamp = Timestamp.fromDate(new Date(values.date.setHours(h, m)));
        const matchUpdateData: any = {
            player1Score: values.player1Score,
            player2Score: values.player2Score,
            matchDate: matchTimestamp,
            isCompleted: true,
            player1Wins: isMatchBo3 ? (values.player1Wins ?? 0) : null,
            player2Wins: isMatchBo3 ? (values.player2Wins ?? 0) : null,
        };

        // Step 2: Transaction - Reads FIRST, then WRITES
        runTransaction(firestore, async (transaction) => {
            // A. TRANSACTION READS
            let e1Data = null;
            let e2Data = null;
            if (p1EntryRef && p2EntryRef) {
                const [e1Snap, e2Snap] = await Promise.all([transaction.get(p1EntryRef), transaction.get(p2EntryRef)]);
                if (e1Snap.exists()) e1Data = e1Snap.data() as LeagueEntry;
                if (e2Snap.exists()) e2Data = e2Snap.data() as LeagueEntry;
            }

            // B. TRANSACTION WRITES
            const updatePlayerStats = (pId: string, change: { played: number, win: number, draw: number, loss: number, gf: number, ga: number }) => {
                if (!pId || pId === 'TBD' || pId.includes('TBD')) return;
                const pRef = doc(firestore, 'players', pId);
                transaction.update(pRef, {
                    overallPlayed: increment(change.played || 0),
                    overallWin: increment(change.win || 0),
                    overallDraw: increment(change.draw || 0),
                    overallLoss: increment(change.loss || 0),
                    overallGoalsFor: increment(change.gf || 0),
                    overallGoalsAgainst: increment(change.ga || 0),
                });
            };

            const getOutcome = (s1: number, s2: number) => {
                if (s1 > s2) return { p1: 'W', p2: 'L' };
                if (s1 < s2) return { p1: 'L', p2: 'W' };
                return { p1: 'D', p2: 'D' };
            };

            // 1. Revert stats if previously completed
            if (orig.isCompleted) {
                const oldS1 = isMatchBo3 ? (orig.player1Wins ?? 0) : (orig.player1Score ?? 0);
                const oldS2 = isMatchBo3 ? (orig.player2Wins ?? 0) : (orig.player2Score ?? 0);
                const outcome = getOutcome(oldS1, oldS2);
                
                if (sData.type === 'Co-Op' && e1Data && e2Data) {
                    const d1 = e1Data as unknown as CoOpLeagueEntry; const d2 = e2Data as unknown as CoOpLeagueEntry;
                    updatePlayerStats(d1.player1Id, { played: -1, win: outcome.p1 === 'W' ? -1 : 0, draw: 0, loss: outcome.p1 === 'L' ? -1 : 0, gf: -(orig.player1Score || 0), ga: -(orig.player2Score || 0) });
                    updatePlayerStats(d1.player2Id, { played: -1, win: outcome.p1 === 'W' ? -1 : 0, draw: 0, loss: outcome.p1 === 'L' ? -1 : 0, gf: -(orig.player1Score || 0), ga: -(orig.player2Score || 0) });
                    updatePlayerStats(d2.player1Id, { played: -1, win: outcome.p2 === 'W' ? -1 : 0, draw: 0, loss: outcome.p2 === 'L' ? -1 : 0, gf: -(orig.player2Score || 0), ga: -(orig.player1Score || 0) });
                    updatePlayerStats(d2.player2Id, { played: -1, win: outcome.p2 === 'W' ? -1 : 0, draw: 0, loss: outcome.p2 === 'L' ? -1 : 0, gf: -(orig.player2Score || 0), ga: -(orig.player1Score || 0) });
                } else {
                    updatePlayerStats(orig.player1Id, { played: -1, win: outcome.p1 === 'W' ? -1 : 0, draw: outcome.p1 === 'D' ? -1 : 0, loss: outcome.p1 === 'L' ? -1 : 0, gf: -(orig.player1Score || 0), ga: -(orig.player2Score || 0) });
                    updatePlayerStats(orig.player2Id, { played: -1, win: outcome.p2 === 'W' ? -1 : 0, draw: outcome.p2 === 'D' ? -1 : 0, loss: outcome.p2 === 'L' ? -1 : 0, gf: -(orig.player2Score || 0), ga: -(orig.player1Score || 0) });
                }
            }

            // 2. Apply new stats
            const newS1 = isMatchBo3 ? (values.player1Wins ?? 0) : (values.player1Score ?? 0);
            const newS2 = isMatchBo3 ? (values.player2Wins ?? 0) : (values.player2Score ?? 0);
            const newOutcome = getOutcome(newS1, newS2);

            if (sData.type === 'Co-Op' && e1Data && e2Data) {
                const d1 = e1Data as unknown as CoOpLeagueEntry; const d2 = e2Data as unknown as CoOpLeagueEntry;
                updatePlayerStats(d1.player1Id, { played: 1, win: newOutcome.p1 === 'W' ? 1 : 0, draw: 0, loss: newOutcome.p1 === 'L' ? 1 : 0, gf: values.player1Score || 0, ga: values.player2Score || 0 });
                updatePlayerStats(d1.player2Id, { played: 1, win: newOutcome.p1 === 'W' ? 1 : 0, draw: 0, loss: newOutcome.p1 === 'L' ? 1 : 0, gf: values.player1Score || 0, ga: values.player2Score || 0 });
                updatePlayerStats(d2.player1Id, { played: 1, win: newOutcome.p2 === 'W' ? 1 : 0, draw: 0, loss: newOutcome.p2 === 'L' ? 1 : 0, gf: values.player2Score || 0, ga: values.player1Score || 0 });
                updatePlayerStats(d2.player2Id, { played: 1, win: newOutcome.p2 === 'W' ? 1 : 0, draw: 0, loss: newOutcome.p2 === 'L' ? 1 : 0, gf: values.player2Score || 0, ga: values.player1Score || 0 });
            } else {
                updatePlayerStats(orig.player1Id, { played: 1, win: newOutcome.p1 === 'W' ? 1 : 0, draw: newOutcome.p1 === 'D' ? 1 : 0, loss: newOutcome.p1 === 'L' ? 1 : 0, gf: values.player1Score || 0, ga: values.player2Score || 0 });
                updatePlayerStats(orig.player2Id, { played: 1, win: newOutcome.p2 === 'W' ? 1 : 0, draw: newOutcome.p2 === 'D' ? 1 : 0, loss: newOutcome.p2 === 'L' ? 1 : 0, gf: values.player2Score || 0, ga: values.player1Score || 0 });
            }

            // 3. Bracket logic
            if (winMatchRef) {
                const winnerId = newS1 > newS2 ? orig.player1Id : orig.player2Id;
                const succ = PLAYOFF_SUCCESSOR_MAP[orig.bracketId!];
                transaction.update(winMatchRef, { [`player${succ.winner.slot}Id`]: winnerId });
                if (losMatchRef && succ.loser) {
                    const loserId = winnerId === orig.player1Id ? orig.player2Id : orig.player1Id;
                    transaction.update(losMatchRef, { [`player${succ.loser.slot}Id`]: loserId });
                }
            }

            // 4. Table logic
            if (p1EntryRef && p2EntryRef && e1Data && e2Data) {
                const e1 = { ...e1Data }; const e2 = { ...e2Data };
                if (orig.isCompleted) {
                    e1.played--; e2.played--;
                    if (sData.type === 'Co-Op') {
                        if ((orig.player1Wins ?? 0) > (orig.player2Wins ?? 0)) { e1.win--; e1.points -= 3; e2.loss--; } else { e2.win--; e2.points -= 3; e1.loss--; }
                    } else {
                        e1.goalsFor -= orig.player1Score!; e1.goalsAgainst -= orig.player2Score!; e2.goalsFor -= orig.player2Score!; e2.goalsAgainst -= orig.player1Score!;
                        if (orig.player1Score! > orig.player2Score!) { e1.win--; e1.points -= 3; e2.loss--; } else if (orig.player2Score! > orig.player1Score!) { e2.win--; e2.points -= 3; e1.loss--; } else { e1.draw--; e1.points--; e2.draw--; e2.points--; }
                    }
                }
                e1.played++; e2.played++;
                if (sData.type === 'Co-Op') {
                    if (values.player1Wins > values.player2Wins) { e1.win++; e1.points += 3; e2.loss++; } else { e2.win++; e2.points += 3; e1.loss++; }
                } else {
                    e1.goalsFor += values.player1Score; e1.goalsAgainst += values.player2Score; e2.goalsFor += values.player2Score; e2.goalsAgainst += values.player1Score;
                    if (values.player1Score > values.player2Score) { e1.win++; e1.points += 3; e2.loss++; } else if (values.player2Score > values.player1Score) { e2.win++; e2.points += 3; e1.loss--; } else { e1.draw++; e1.points++; e2.draw++; e2.points++; }
                    e1.goalDifference = e1.goalsFor - e1.goalsAgainst; e2.goalDifference = e2.goalsFor - e2.goalsAgainst;
                }
                transaction.set(p1EntryRef, e1); transaction.set(p2EntryRef, e2);
            }

            // 5. Update match doc
            transaction.update(matchRef, matchUpdateData);
        })
        .then(() => {
            toast({ title: t('score_updated_title') });
            setEditingMatch(null);
        })
        .catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({
                path: matchRef.path,
                operation: 'update',
                requestResourceData: matchUpdateData,
            });
            errorEmitter.emit('permission-error', permissionError);
        });

    } catch (e: any) {
        toast({ variant: 'destructive', title: "Error", description: e.message });
    }
  };

  const handleRevertMatch = useCallback(async (matchToRevert?: WithId<Match>) => {
    const matchToUse = matchToRevert || revertingMatch;
    if (!firestore || !activeSeasonId || !matchToUse) return;
    const matchRef = doc(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/matches`, matchToUse.id);
    const seasonRef = doc(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}`);
    
    try {
        const [mDoc, sDoc] = await Promise.all([getDoc(matchRef), getDoc(seasonRef)]);
        if (!mDoc.exists() || !sDoc.exists() || !mDoc.data().isCompleted) throw new Error("Match not completed or found.");
        
        const mToRev = mDoc.data() as Match;
        const sData = sDoc.data() as Season;
        const isMatchBo3 = sData.type === 'Co-Op' || (mToRev.round && mToRev.round !== 'Group');

        // Identify successor matches to reset TBD
        let winMatchRef = null;
        let losMatchRef = null;
        if (mToRev.round && mToRev.round !== 'Group' && mToRev.bracketId) {
            const succ = PLAYOFF_SUCCESSOR_MAP[mToRev.bracketId];
            if (succ) {
                const mCol = collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/matches`);
                const [winSnap, losSnap] = await Promise.all([
                    getDocs(query(mCol, where('bracketId', '==', succ.winner.bid))),
                    succ.loser ? getDocs(query(mCol, where('bracketId', '==', succ.loser.bid))) : Promise.resolve(null)
                ]);
                if (winSnap && !winSnap.empty) {
                    winMatchRef = winSnap.docs[0].ref;
                    if (winSnap.docs[0].data().isCompleted) throw new Error("Tidak dapat membatalkan: Pertandingan babak selanjutnya sudah dimainkan.");
                }
                if (losSnap && !losSnap.empty) {
                    losMatchRef = losSnap.docs[0].ref;
                    if (losSnap.docs[0].data().isCompleted) throw new Error("Tidak dapat membatalkan: Pertandingan babak selanjutnya sudah dimainkan.");
                }
            }
        }

        let p1EntryRef = null;
        let p2EntryRef = null;
        if (mToRev.round === 'Group' || !mToRev.round) {
            const tblName = sData.type === 'Co-Op' ? 'coopLeagueTable' : 'leagueTable';
            const tblCol = collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/${tblName}`);
            if (sData.type === 'Co-Op') {
                p1EntryRef = doc(tblCol, mToRev.player1Id);
                p2EntryRef = doc(tblCol, mToRev.player2Id);
            } else {
                const [snap1, snap2] = await Promise.all([
                    getDocs(query(tblCol, where('playerId', '==', mToRev.player1Id))),
                    getDocs(query(tblCol, where('playerId', '==', mToRev.player2Id)))
                ]);
                if (!snap1.empty) p1EntryRef = snap1.docs[0].ref;
                if (!snap2.empty) p2EntryRef = snap2.docs[0].ref;
            }
        }

        runTransaction(firestore, async (transaction) => {
            // A. READS
            let e1Data = null;
            let e2Data = null;
            if (p1EntryRef && p2EntryRef) {
                const [e1Snap, e2Snap] = await Promise.all([transaction.get(p1EntryRef), transaction.get(p2EntryRef)]);
                if (e1Snap.exists()) e1Data = e1Snap.data() as LeagueEntry;
                if (e2Snap.exists()) e2Data = e2Snap.data() as LeagueEntry;
            }

            // B. WRITES
            const updatePlayerStats = (pId: string, change: { played: number, win: number, draw: number, loss: number, gf: number, ga: number }) => {
                if (!pId || pId === 'TBD' || pId.includes('TBD')) return;
                const pRef = doc(firestore, 'players', pId);
                transaction.update(pRef, {
                    overallPlayed: increment(change.played || 0),
                    overallWin: increment(change.win || 0),
                    overallDraw: increment(change.draw || 0),
                    overallLoss: increment(change.loss || 0),
                    overallGoalsFor: increment(change.gf || 0),
                    overallGoalsAgainst: increment(change.ga || 0),
                });
            };

            const getOutcome = (s1: number, s2: number) => {
                if (s1 > s2) return { p1: 'W', p2: 'L' };
                if (s1 < s2) return { p1: 'L', p2: 'W' };
                return { p1: 'D', p2: 'D' };
            };

            const oldS1 = isMatchBo3 ? (mToRev.player1Wins ?? 0) : (mToRev.player1Score ?? 0);
            const oldS2 = isMatchBo3 ? (mToRev.player2Wins ?? 0) : (mToRev.player2Score ?? 0);
            const outcome = getOutcome(oldS1, oldS2);

            if (sData.type === 'Co-Op' && e1Data && e2Data) {
                const d1 = e1Data as unknown as CoOpLeagueEntry; const d2 = e2Data as unknown as CoOpLeagueEntry;
                updatePlayerStats(d1.player1Id, { played: -1, win: outcome.p1 === 'W' ? -1 : 0, draw: 0, loss: outcome.p1 === 'L' ? -1 : 0, gf: -(mToRev.player1Score || 0), ga: -(mToRev.player2Score || 0) });
                updatePlayerStats(d1.player2Id, { played: -1, win: outcome.p1 === 'W' ? -1 : 0, draw: 0, loss: outcome.p1 === 'L' ? -1 : 0, gf: -(mToRev.player1Score || 0), ga: -(mToRev.player2Score || 0) });
                updatePlayerStats(d2.player1Id, { played: -1, win: outcome.p2 === 'W' ? -1 : 0, draw: 0, loss: outcome.p2 === 'L' ? -1 : 0, gf: -(mToRev.player2Score || 0), ga: -(mToRev.player1Score || 0) });
                updatePlayerStats(d2.player2Id, { played: -1, win: outcome.p2 === 'W' ? -1 : 0, draw: 0, loss: outcome.p2 === 'L' ? -1 : 0, gf: -(mToRev.player2Score || 0), ga: -(mToRev.player1Score || 0) });
            } else {
                updatePlayerStats(mToRev.player1Id, { played: -1, win: outcome.p1 === 'W' ? -1 : 0, draw: outcome.p1 === 'D' ? -1 : 0, loss: outcome.p1 === 'L' ? -1 : 0, gf: -(mToRev.player1Score || 0), ga: -(mToRev.player2Score || 0) });
                updatePlayerStats(mToRev.player2Id, { played: -1, win: outcome.p2 === 'W' ? -1 : 0, draw: outcome.p2 === 'D' ? -1 : 0, loss: outcome.p2 === 'L' ? -1 : 0, gf: -(mToRev.player2Score || 0), ga: -(mToRev.player1Score || 0) });
            }

            if (p1EntryRef && p2EntryRef && e1Data && e2Data) {
                const e1 = { ...e1Data }; const e2 = { ...e2Data };
                e1.played--; e2.played--;
                if (sData.type === 'Co-Op') {
                    if ((mToRev.player1Wins ?? 0) > (mToRev.player2Wins ?? 0)) { e1.win--; e1.points -= 3; e2.loss--; } else { e2.win--; e2.points -= 3; e1.loss--; }
                } else {
                    e1.goalsFor -= mToRev.player1Score!; e1.goalsAgainst -= mToRev.player2Score!; e2.goalsFor -= mToRev.player2Score!; e2.goalsAgainst -= mToRev.player1Score!;
                    if (mToRev.player1Score! > mToRev.player2Score!) { e1.win--; e1.points -= 3; e2.loss--; } else if (mToRev.player2Score! > mToRev.player1Score!) { e2.win--; e2.points -= 3; e1.loss--; } else { e1.draw--; e1.points--; e2.draw--; e2.points--; }
                    e1.goalDifference = e1.goalsFor - e1.goalsAgainst; e2.goalDifference = e2.goalsFor - e2.goalsAgainst;
                }
                transaction.set(p1EntryRef, e1); transaction.set(p2EntryRef, e2);
            }

            // Reset successor matches if they exist
            if (winMatchRef) {
                const succ = PLAYOFF_SUCCESSOR_MAP[mToRev.bracketId!];
                transaction.update(winMatchRef, { [`player${succ.winner.slot}Id`]: 'TBD' });
            }
            if (losMatchRef) {
                const succ = PLAYOFF_SUCCESSOR_MAP[mToRev.bracketId!];
                if (succ.loser) {
                    transaction.update(losMatchRef, { [`player${succ.loser.slot}Id`]: 'TBD' });
                }
            }

            transaction.update(matchRef, { player1Wins: null, player2Wins: null, player1Score: null, player2Score: null, isCompleted: false });
        })
        .then(() => {
            toast({ title: t('match_reverted_title') });
            setRevertingMatch(null);
        })
        .catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({
                path: matchRef.path,
                operation: 'update',
            });
            errorEmitter.emit('permission-error', permissionError);
        });
    } catch (e: any) {
        toast({ variant: 'destructive', title: "Error", description: e.message });
    }
  }, [firestore, activeSeasonId, revertingMatch, t, toast]);

  const isLoading = isLoadingSeasons || isLoadingPlayers || isLoadingTeams || !isPasswordLoaded;
  
  return (
    <div className="max-w-[92rem] mx-auto px-2 sm:px-4 py-8 relative">
       {/* Background decorative glows */}
       <div className="absolute top-0 right-0 -z-10 w-[300px] sm:w-[600px] h-[300px] sm:h-[600px] bg-primary/5 rounded-full blur-[100px] sm:blur-[150px] pointer-events-none" />
       <div className="absolute bottom-0 left-0 -z-10 w-[250px] sm:w-[500px] h-[250px] sm:h-[500px] bg-accent/5 rounded-full blur-[80px] sm:blur-[120px] pointer-events-none" />

       <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-10 sm:space-y-12">
        <div className="flex flex-col md:flex-row justify-between items-stretch mb-6 sm:mb-10 gap-4 sm:gap-10 min-h-[140px] sm:min-h-[190px]">
             <div className="flex flex-col justify-center space-y-2 flex-1 w-full py-5 pl-6 sm:pl-8 relative group/header overflow-hidden">
                {/* HUD Accent Line with Glow */}
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary shadow-[0_0_25px_rgba(204,253,1,0.8)]" />
                
                <div className="relative z-10 space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="h-px w-8 sm:w-12 bg-primary/40" />
                        <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.4em] text-primary/60 italic">Signal Transmission • Active</span>
                    </div>
                    
                    <h1 className="font-headline text-3xl sm:text-7xl font-black tracking-tighter text-white uppercase italic pr-4 drop-shadow-[0_0_30px_rgba(255,255,255,0.1)] leading-none">
                        {t('fixtures_page_title').split(' ')[0]} <span className="text-primary drop-shadow-[0_0_20px_rgba(204,253,1,0.4)]">{t('fixtures_page_title').split(' ').slice(1).join(' ')}</span>
                    </h1>
                </div>

                {activeSeason && (
                  <div className="space-y-2 relative z-10 pt-2">
                    <div className="flex items-center gap-3">
                        <p className="text-lg sm:text-3xl font-black text-white tracking-tight uppercase italic pr-4">{activeSeason.name}</p>
                        <Badge className="bg-primary text-black border-none font-black tracking-widest text-[9px] sm:text-[10px] h-6 px-3 uppercase italic shadow-[0_0_15px_rgba(204,253,1,0.3)]">{activeSeason.status}</Badge>
                    </div>
                  </div>
                )}

                {matches && matches.length > 0 && (
                    <div className="max-w-md pt-4 space-y-2 relative z-10">
                        <div className="flex justify-between items-end mb-1">
                            <span className="text-[9px] font-black uppercase tracking-widest text-primary/60 flex items-center gap-2">
                                <Activity className="w-3 h-3 animate-pulse" /> Season Progress
                            </span>
                            <span className="text-xs font-black text-primary italic" suppressHydrationWarning>{progressPercentage.toFixed(0)}%</span>
                        </div>
                        <div className="relative h-2 sm:h-2.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 shadow-inner">
                            <div 
                                className="absolute left-0 top-0 h-full bg-primary shadow-[0_0_15px_rgba(204,253,1,0.6)] transition-all duration-1000 ease-out" 
                                style={{ width: `${progressPercentage}%` }}
                            />
                        </div>
                        <p className="text-[9px] sm:text-[10px] font-black tracking-[0.2em] uppercase text-white/20 italic">
                            {completedMatchesForDisplay} / {totalMatchesForDisplay} Engagements Finalized
                        </p>
                    </div>
                )}
             </div>
            <div className="w-full md:w-auto flex justify-center md:justify-end shrink-0"><LiveClock /></div>
        </div>

        {/* MODERN HUD CONTROL BAR */}
        <div className={cn(
            "relative bg-black/60 border-b-4 border-white/10 p-2 sm:p-3 flex flex-wrap items-center gap-4 shadow-[0_10px_50px_rgba(0,0,0,0.5)] backdrop-blur-2xl transition-all duration-500 overflow-hidden",
            isAdmin ? "w-full" : "w-fit mx-auto"
        )}>
            {/* Decorative Corner Accents */}
            <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-primary/40 pointer-events-none" />
            <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-primary/40 pointer-events-none" />

            <div className="flex items-center gap-2 w-full sm:w-auto relative group/select">
                <div className="p-3 bg-primary/10 text-primary hidden xs:block shadow-lg -skew-x-[12deg] border-r-2 border-primary/30">
                    <Scan className="w-4 h-4 skew-x-[12deg]" />
                </div>
                <Select value={activeSeasonId || ''} onValueChange={setActiveSeasonId} disabled={isLoadingSeasons}>
                    <SelectTrigger className="w-full sm:w-fit sm:min-w-[320px] h-12 bg-white/5 border-white/10 font-black uppercase italic tracking-tight text-xs rounded-none -skew-x-[12deg] focus:border-primary/50 transition-all px-8">
                        <div className="skew-x-[12deg] flex items-center justify-center w-full">
                            <SelectValue placeholder={t('select_a_season')} />
                        </div>
                    </SelectTrigger>
                    <SelectContent className="bg-[#0A192F] border-primary/30 rounded-none overflow-hidden">
                        {seasons?.map(s => (<SelectItem key={s.id} value={s.id} className="font-black uppercase italic text-xs focus:bg-primary focus:text-black py-3">{s.name}</SelectItem>))}
                    </SelectContent>
                </Select>
            </div>

            <div className={cn("flex items-center gap-1", isAdmin ? "ml-auto" : "w-full justify-center sm:w-auto")}>
                <Button 
                    onClick={() => isAdmin ? setIsAdmin(false) : setPasswordPromptOpen(true)} 
                    className={cn(
                        "h-12 px-8 font-black text-[10px] uppercase tracking-widest italic rounded-none -skew-x-[12deg] border-r-4 transition-all duration-500 relative overflow-hidden group/admin", 
                        isAdmin 
                            ? "bg-primary text-black border-black shadow-[0_0_30px_rgba(204,253,1,0.4)]" 
                            : "bg-primary/60 text-black border-primary/20 hover:bg-primary shadow-[0_0_20px_rgba(204,253,1,0.2)]"
                    )}
                    disabled={!isPasswordLoaded}
                >
                    {/* Dynamic Scanning Animation Layer */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div className={cn(
                            "w-full h-[2px] bg-current absolute top-0 left-0 transition-opacity duration-500",
                            isAdmin ? "animate-scanning opacity-20" : "opacity-0"
                        )} />
                    </div>

                    <div className="skew-x-[12deg] flex items-center relative z-10">
                        {isAdmin ? <Unlock className="mr-2 h-4 w-4" /> : <Lock className="mr-2 h-4 w-4" />}
                        {isAdmin ? t('lock_admin_mode') : t('unlock_admin')}
                    </div>
                </Button>
            </div>
        </div>

        {isLoading ? (
            <div className="flex flex-col items-center justify-center py-32 gap-6 opacity-50">
                <div className="relative">
                    <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-ping" />
                    <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin relative z-10" />
                </div>
                <p className="font-black tracking-[0.4em] text-xs uppercase italic text-primary animate-pulse">{t('loading_fixtures')}</p>
            </div>
        ) : (
            <FixtureContent activeSeasonId={activeSeasonId} onEditMatch={setEditingMatch} onRevertMatch={setRevertingMatch} isAdmin={isAdmin} allPlayers={allPlayers || []} allTeams={allTeams || []} matches={matches} isLoadingMatches={isLoadingMatches} activeSeason={activeSeason} hasPlayoffs={hasPlayoffs} />
        )}

        {/* Dialogs */}
        <Dialog open={!!editingMatch} onOpenChange={(open) => !open && setEditingMatch(null)}>
            <DialogContent className="max-w-xl border-primary border-4 p-0 overflow-hidden bg-background/95 backdrop-blur-2xl rounded-3xl shadow-[0_0_100px_rgba(204,253,1,0.15)] max-h-[90vh] flex flex-col">
                <DialogHeader className="p-6 border-b border-white/5 bg-black/20 shrink-0">
                    <div className="flex items-center gap-3 text-primary mb-1">
                        <Zap className="w-6 h-6" />
                        <DialogTitle className="text-2xl font-black tracking-tighter uppercase italic pr-4">{t('update_match_score_title')}</DialogTitle>
                    </div>
                    {editingMatch && (<DialogDescription className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{t('update_match_score_desc', { player1: editingMatch.player1?.name, player2: editingMatch.player2?.name })}</DialogDescription>)}
                </DialogHeader>
                <ScrollArea className="flex-1 p-6 overflow-y-auto">
                    {editingMatch && activeSeason && (<ScoreForm match={editingMatch} onSave={(v) => handleUpdateScore(editingMatch.id, v)} seasonType={activeSeason.type} hybridGroupMeetings={activeSeason.hybridGroupMeetings} player1Info={{ name: editingMatch.player1.name, team: editingMatch.team1 }} player2Info={{ name: editingMatch.player2.name, team: editingMatch.team2 }} />)}
                </ScrollArea>
                <DialogFooter className="p-4 bg-black/20 border-t border-white/5 shrink-0">
                    <Button variant="ghost" onClick={() => setEditingMatch(null)} className="font-black uppercase tracking-widest italic text-[10px] text-white/70 hover:bg-white/10 hover:text-white border border-white/10">{t('cancel')}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <AlertDialog open={!!revertingMatch} onOpenChange={(open) => !open && setRevertingMatch(null)}>
            <AlertDialogContent className="border-amber-500 border-4 bg-background/95 backdrop-blur-2xl rounded-3xl">
                <AlertDialogHeader>
                    <div className="flex items-center gap-4 text-amber-500 mb-2">
                        <Undo2 className="w-8 h-8" />
                        <AlertDialogTitle className="text-2xl font-black tracking-tighter uppercase italic pr-4">{t('revert_match_confirm_title')}</AlertDialogTitle>
                    </div>
                    {revertingMatch && (<AlertDialogDescription className="text-sm font-bold text-white/40 uppercase tracking-widest">{t('revert_match_confirm_desc', { player1: playersById[revertingMatch.player1Id]?.name, player2: playersById[revertingMatch.player2Id]?.name })}</AlertDialogDescription>)}
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-4 mt-6">
                    <AlertDialogCancel onClick={() => setRevertingMatch(null)} className="font-black uppercase tracking-widest italic rounded-xl h-12">{t('cancel')}</AlertDialogCancel>
                    <AlertDialogAction onClick={() => revertingMatch && handleRevertMatch(revertingMatch)} className="bg-amber-500 text-black hover:bg-amber-600 font-black uppercase tracking-widest italic rounded-xl h-12">{t('revert_match_action')}</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <Dialog open={passwordPromptOpen} onOpenChange={setPasswordPromptOpen}>
            <DialogContent className="max-w-[calc(100vw-32px)] sm:max-w-md border-primary border-4 bg-[#0A192F]/95 backdrop-blur-2xl rounded-none shadow-[0_0_50px_rgba(204,253,1,0.2)]">
                <DialogHeader>
                    <div className="flex items-center gap-4 text-primary mb-2">
                        <KeyRound className="w-8 h-8" />
                        <DialogTitle className="text-xl sm:text-2xl font-black tracking-tighter uppercase italic pr-4">{t('admin_auth')}</DialogTitle>
                    </div>
                    <DialogDescription className="font-bold text-white/40 uppercase tracking-widest text-[8px] sm:text-[10px]">{t('admin_auth_desc')}</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4 sm:py-6">
                    <div className="space-y-2">
                        <Label htmlFor="password-input" className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-primary/60">{t('password')}</Label>
                        <Input id="password-input" type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} className="h-12 sm:h-14 bg-white/5 border-white/10 rounded-none focus:border-primary/50 text-lg font-black" onKeyDown={(e) => e.key === 'Enter' && handlePasswordCheck()} />
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handlePasswordCheck} className="w-full h-12 sm:h-14 font-black tracking-widest text-sm sm:text-lg uppercase italic rounded-none shadow-xl shadow-primary/20">{t('unlock')}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
