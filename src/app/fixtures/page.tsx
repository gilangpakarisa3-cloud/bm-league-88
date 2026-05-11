
'use client';

import { useState, useMemo, useEffect, useCallback, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Pencil, Search, Unlock, Undo2, Lock, Calendar, Swords, Clock, Zap, Activity, Trophy, LayoutGrid, KeyRound, CalendarIcon, Shield, ChevronRight, Scan, CheckCircle2, Loader2, Binary, Radio, Plus, Minus } from 'lucide-react';
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
import { collection, doc, query, getDocs, getDoc, where, runTransaction, Timestamp, orderBy, increment, updateDoc } from 'firebase/firestore';
import type { Season, Player, WithId, Match, Team, LeagueEntry, CoOpLeagueEntry, MatchStatus } from '@/lib/types';
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
import { resolveLogo } from '@/lib/logo-utils';


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

const MatchRow = memo(function MatchRow({ match, onEditMatch, onRevertMatch, onQuickUpdate, isAdmin, activeSeason, hasPlayoffs }: {
    match: any;
    onEditMatch: (match: any) => void;
    onRevertMatch: (match: WithId<Match>) => void;
    onQuickUpdate: (matchId: string, field: string, delta: number) => void;
    isAdmin: boolean;
    activeSeason: WithId<Season> | null;
    hasPlayoffs: boolean;
}) {
    const { t } = useTranslation();
    const displayDate = format(match.matchDate.toDate(), 'd MMM, HH:mm', { locale: localeId });
    const isMatchBo3 = activeSeason?.type === 'Co-Op' || activeSeason?.type === 'Co-Op Hybrid' || (match.round && match.round !== 'Group');
    
    const isEditDisabled = 
        activeSeason?.status !== 'In Progress' || 
        (match.isCompleted && !isAdmin) || 
        (match.player1Id === 'TBD' || match.player2Id === 'TBD') ||
        (hasPlayoffs && (match.round === 'Group' || !match.round) && !isAdmin);

    const PlayerInfo = ({ name, team, teamId, alignment = 'left', isWinner }: { name: string, team: WithId<Team> | null, teamId: string, alignment?: 'left' | 'right', isWinner: boolean }) => {
        const logoUrl = resolveLogo(team?.logoUrl, teamId, name);
        
        return (
            <div className={cn(
                "flex items-center gap-3 sm:gap-5 transition-all duration-500 w-full overflow-hidden", 
                alignment === 'right' ? "flex-row-reverse text-right" : "flex-row text-left"
            )}>
                <div className="relative shrink-0">
                    <div className={cn(
                        "absolute -inset-1 rounded-full blur-md opacity-0 transition-opacity duration-700",
                        isWinner ? "bg-primary/40 opacity-100" : "bg-white/5"
                    )} />
                    
                    <Avatar className={cn(
                        "h-10 w-10 sm:h-14 sm:w-14 border-2 transition-all duration-700 shadow-xl relative z-10",
                        isWinner ? "border-primary scale-110" : "border-white/10"
                    )}>
                        <AvatarImage 
                            key={logoUrl} 
                            src={logoUrl} 
                            alt={team?.name || name} 
                            className="object-cover" 
                            referrerPolicy="no-referrer" 
                        />
                        <AvatarFallback className="bg-black/40 font-black text-[6px] leading-tight text-center px-0.5">
                            LOGO NULL
                        </AvatarFallback>
                    </Avatar>
                    
                    {isWinner && (
                        <div className="absolute -top-1 -right-1 bg-primary rounded-full p-1 z-20 shadow-lg border-2 border-background animate-bounce">
                            <Zap className="w-2 h-2 sm:w-3 sm:h-3 text-black fill-black" />
                        </div>
                    )}
                </div>

                <div className="flex flex-col min-w-0 flex-1">
                    <span className={cn(
                        "text-xs sm:text-lg font-black tracking-tight uppercase italic truncate transition-colors duration-500 pr-2", 
                        isWinner ? "text-primary" : "text-white/90"
                    )}>
                        {name}
                    </span>
                    <span className="text-[7px] sm:text-[10px] font-bold text-white/30 uppercase tracking-widest truncate pr-2">
                        {team?.name || 'Athlete Protocol'}
                    </span>
                </div>
            </div>
        );
    }
    
    const score1 = isMatchBo3 ? (match.player1Wins ?? 0) : (match.player1Score ?? 0);
    const score2 = isMatchBo3 ? (match.player2Wins ?? 0) : (match.player2Score ?? 0);
    const hasValidScore = (match.isCompleted || match.status === 'Live') && (score1 !== null || match.player1Score !== null);
    const isW1 = match.isCompleted && score1! > score2!;
    const isW2 = match.isCompleted && score2! > score1!;

    return (
        <div className="group relative overflow-hidden transition-all duration-500 border-b border-white/5 last:border-0 hover:bg-white/[0.03]">
            {/* Minimalist Ghost Text */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none opacity-[0.02] pr-10">
                <span className="text-[100px] sm:text-[160px] font-black italic text-white uppercase tracking-tighter transition-all duration-1000 group-hover:scale-105">
                    {match.isCompleted ? 'FINISHED' : match.status === 'Live' ? 'LIVE NOW' : 'BATTLE'}
                </span>
            </div>

            <div className="relative z-10 grid grid-cols-[1fr_80px_1fr] sm:grid-cols-[1fr_140px_1fr] items-center gap-2 sm:gap-6 p-4 sm:p-8">
                
                {/* Home Player (Left) */}
                <div className="w-full flex items-center gap-2">
                    {isAdmin && match.status === 'Live' && (
                        <div className="flex flex-col gap-1 shrink-0 animate-in fade-in slide-in-from-left-2 duration-500">
                            <Button size="icon" variant="outline" className="h-6 w-6 sm:h-8 sm:w-8 rounded-lg border-primary/30 bg-primary/10 hover:bg-primary hover:text-black" onClick={() => onQuickUpdate(match.id, isMatchBo3 ? 'player1Wins' : 'player1Score', 1)}><Plus className="h-3 w-3 sm:h-4 sm:w-4" /></Button>
                            <Button size="icon" variant="outline" className="h-6 w-6 sm:h-8 sm:w-8 rounded-lg border-white/10 bg-white/5 hover:bg-red-500 hover:text-white" onClick={() => onQuickUpdate(match.id, isMatchBo3 ? 'player1Wins' : 'player1Score', -1)}><Minus className="h-3 w-3 sm:h-4 sm:w-4" /></Button>
                        </div>
                    )}
                    <PlayerInfo name={match.player1?.name || 'TBD'} team={match.team1} teamId={match.teamId1 || match.player1Id} alignment="right" isWinner={isW1} />
                </div>
                
                {/* Unified Score Module (Center) */}
                <div className="flex flex-col items-center justify-center relative">
                    {hasValidScore ? (
                        <div className="relative group/score">
                            <div className={cn(
                                "bg-[#0A192F] border-2 px-3 sm:px-6 py-1.5 sm:py-2.5 rounded-xl shadow-2xl relative z-10 flex items-center gap-3 sm:gap-5 ring-4 ring-black/40",
                                match.status === 'Live' ? "border-red-500/50 animate-pulse" : "border-white/10"
                            )}>
                                <span className={cn("text-2xl sm:text-4xl font-black italic tabular-nums leading-none", isW1 ? "text-primary drop-shadow-[0_0_10px_rgba(204,253,1,0.5)]" : match.status === 'Live' ? "text-white" : "text-white/30")}>
                                    {score1}
                                </span>
                                <div className="w-px h-5 sm:h-8 bg-white/10" />
                                <span className={cn("text-2xl sm:text-4xl font-black italic tabular-nums leading-none", isW2 ? "text-primary drop-shadow-[0_0_10px_rgba(204,253,1,0.5)]" : match.status === 'Live' ? "text-white" : "text-white/30")}>
                                    {score2}
                                </span>
                            </div>
                            {match.status === 'Live' && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
                                    <Badge className="bg-red-500 text-white font-black text-[7px] h-4 px-2 uppercase shadow-lg">LIVE</Badge>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="relative flex flex-col items-center">
                            <div className="bg-primary/10 border-2 border-primary/20 px-3 sm:px-5 py-1 sm:py-1.5 rounded-full backdrop-blur-md shadow-lg group-hover:border-primary transition-all">
                                <span className="text-[10px] sm:text-xs font-black tracking-widest text-primary uppercase italic">VS</span>
                            </div>
                            {isMatchBo3 && <Badge variant="outline" className="mt-2 text-[6px] sm:text-[8px] border-primary/20 text-primary/60 font-black uppercase tracking-widest bg-black/40">BO3 SERIES</Badge>}
                        </div>
                    )}
                </div>
                
                {/* Away Player (Right) */}
                <div className="w-full flex items-center gap-2">
                    <PlayerInfo name={match.player2?.name || 'TBD'} team={match.team2} teamId={match.teamId2 || match.player2Id} alignment="left" isWinner={isW2} />
                    {isAdmin && match.status === 'Live' && (
                        <div className="flex flex-col gap-1 shrink-0 animate-in fade-in slide-in-from-right-2 duration-500">
                            <Button size="icon" variant="outline" className="h-6 w-6 sm:h-8 sm:w-8 rounded-lg border-primary/30 bg-primary/10 hover:bg-primary hover:text-black" onClick={() => onQuickUpdate(match.id, isMatchBo3 ? 'player2Wins' : 'player2Score', 1)}><Plus className="h-3 w-3 sm:h-4 sm:w-4" /></Button>
                            <Button size="icon" variant="outline" className="h-6 w-6 sm:h-8 sm:w-8 rounded-lg border-white/10 bg-white/5 hover:bg-red-500 hover:text-white" onClick={() => onQuickUpdate(match.id, isMatchBo3 ? 'player2Wins' : 'player2Score', -1)}><Minus className="h-3 w-3 sm:h-4 sm:w-4" /></Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Sub-Footer Meta Bar (Mobile Optimized) */}
            <div className="flex items-center justify-between px-4 sm:px-10 py-2 sm:py-3 bg-black/40 border-t border-white/5 relative z-10">
                <div className="flex items-center gap-3">
                    <Calendar className="w-3 h-3 text-white/20" />
                    <span className="text-[8px] sm:text-[10px] font-black text-white/30 uppercase italic tracking-widest" suppressHydrationWarning>{displayDate}</span>
                    {match.round && match.round !== 'Group' && (
                        <Badge className="bg-primary/10 border-primary/20 text-primary text-[7px] h-4 font-black px-1.5">{match.round}</Badge>
                    )}
                </div>
                
                <div className="flex items-center gap-2">
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className={cn(
                            "h-7 sm:h-9 px-3 sm:px-5 text-[8px] sm:text-[10px] font-black uppercase tracking-widest border transition-all",
                            hasValidScore 
                                ? "text-white/40 border-white/5 hover:border-primary/30 hover:text-primary" 
                                : "text-primary border-primary/30 hover:bg-primary hover:text-black"
                        )}
                        onClick={() => onEditMatch(match)}
                        disabled={isEditDisabled}
                    >
                        {match.isCompleted ? 'ANALYSIS' : 'UPDATE SCORE'}
                    </Button>
                    
                    {isAdmin && match.isCompleted && (
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 sm:h-9 sm:w-9 text-amber-500/60 hover:text-amber-400 border border-amber-500/10 hover:border-amber-500/30 rounded-lg transition-all" 
                            onClick={() => onRevertMatch(match)}
                        >
                            <Undo2 className="h-3.5 w-3.5" />
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
});

const FixtureContent = memo(function FixtureContent({ activeSeasonId, onEditMatch, onRevertMatch, onQuickUpdate, isAdmin, allPlayers, allTeams, matches, isLoadingMatches, activeSeason, hasPlayoffs }: { activeSeasonId: string | null; onEditMatch: (match: any) => void; onRevertMatch: (match: WithId<Match>) => void; onQuickUpdate: (matchId: string, field: string, delta: number) => void; isAdmin: boolean; allPlayers: WithId<Player>[]; allTeams: WithId<Team>[]; matches: WithId<Match>[] | null; isLoadingMatches: boolean; activeSeason: WithId<Season> | null; hasPlayoffs: boolean; }) {
    const firestore = useFirestore();
    const { t } = useTranslation();
    const [searchTerm, setSearchTerm] = useState('');
    
    const isSeasonCoop = activeSeason?.type === 'Co-Op' || activeSeason?.type === 'Co-Op Hybrid';
    const singleLeagueTableCollection = useMemoFirebase(() => firestore && activeSeasonId && !isSeasonCoop ? collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/leagueTable`) : null, [firestore, activeSeasonId, isSeasonCoop]);
    const { data: singleLeagueTable } = useCollection<LeagueEntry>(singleLeagueTableCollection);
    const coopLeagueTableCollection = useMemoFirebase(() => firestore && activeSeasonId && isSeasonCoop ? collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/coopLeagueTable`) : null, [firestore, activeSeasonId, isSeasonCoop]);
    const { data: coopLeagueTable } = useCollection<CoOpLeagueEntry>(coopLeagueTableCollection);
    
    const playersById = useMemo(() => allPlayers.reduce((acc, player) => { acc[player.id] = player; return acc; }, {} as Record<string, WithId<Player>>), [allPlayers]);
    const teamsById = useMemo(() => allTeams.reduce((acc, t) => { acc[t.id] = t; return acc; }, {} as Record<string, WithId<Team>>), [allTeams]);
    const leagueTableByPlayerId = useMemo(() => (singleLeagueTable || []).reduce((acc, entry) => { acc[entry.playerId] = entry; return acc; }, {} as Record<string, LeagueEntry>), [singleLeagueTable]);
    const coopTableById = useMemo(() => (coopLeagueTable || []).reduce((acc, e) => { acc[e.id] = e; return acc; }, {} as Record<string, WithId<CoOpLeagueEntry>>), [coopLeagueTable]);
    
    const { groupedMatches, upcomingCount, completedCount, liveCount } = useMemo(() => {
        if (!matches || !activeSeason) return { groupedMatches: { upcoming: {}, completed: {}, live: {} }, upcomingCount: 0, completedCount: 0, liveCount: 0 };
        const isCoop = activeSeason.type === 'Co-Op' || activeSeason.type === 'Co-Op Hybrid';
        const enrichedMatches = matches.map(match => {
            let p1, p2, t1, t2, tid1, tid2;
            if (isCoop) {
                const e1 = coopTableById[match.player1Id];
                const e2 = coopTableById[match.player2Id];
                p1 = e1 ? { name: e1.teamName, id: e1.id } : (match.player1Id === 'TBD' ? { name: 'TBD', id: 'TBD' } : null);
                p2 = e2 ? { name: e2.teamName, id: e2.id } : (match.player2Id === 'TBD' ? { name: 'TBD', id: 'TBD' } : null);
                tid1 = e1?.player1TeamId;
                tid2 = e2?.player1TeamId;
                t1 = tid1 ? teamsById[tid1] : null;
                t2 = tid2 ? teamsById[tid2] : null;
            } else {
                const e1 = leagueTableByPlayerId[match.player1Id];
                const e2 = leagueTableByPlayerId[match.player2Id];
                p1 = e1 ? { name: e1.playerName, id: e1.playerId } : (match.player1Id === 'TBD' ? { name: 'TBD', id: 'TBD' } : (playersById[match.player1Id] || null));
                p2 = e2 ? { name: e2.playerName, id: e2.playerId } : (match.player2Id === 'TBD' ? { name: 'TBD', id: 'TBD' } : (playersById[match.player2Id] || null));
                tid1 = e1 ? e1.teamId : playersById[match.player1Id]?.teamId;
                tid2 = e2 ? e2.teamId : playersById[match.player2Id]?.teamId;
                t1 = tid1 ? teamsById[tid1] : null;
                t2 = tid2 ? teamsById[tid2] : null;
            }
            if (!p1 || !p2) return null;
            return { ...match, player1: p1, player2: p2, team1: t1, team2: t2, teamId1: tid1, teamId2: tid2 };
        }).filter(Boolean) as any[];

        const filtered = enrichedMatches.filter(m => {
            if (searchTerm.trim()) {
                const terms = searchTerm.toLowerCase().split(' ').filter(Boolean);
                const pn1 = m.player1?.name.toLowerCase() || '';
                const pn2 = m.player2?.name.toLowerCase() || '';
                if (!terms.every(t => pn1.includes(t) || pn2.includes(t))) return false;
            }
            if (hasPlayoffs && !m.isCompleted && m.status !== 'Live' && (m.round === 'Group' || !m.round)) {
                return false;
            }
            return true;
        });
        
        const grouped = filtered.reduce((acc, m) => {
            const rd = m.round || 'Group';
            const st = m.isCompleted ? 'completed' : (m.status === 'Live' ? 'live' : 'upcoming');
            if (!acc[st][rd]) acc[st][rd] = [];
            acc[st][rd].push(m);
            return acc;
        }, { upcoming: {} as Record<string, any[]>, completed: {} as Record<string, any[]>, live: {} as Record<string, any[]> });
        
        const sortRounds = (entries: [string, any[]][]) => {
            return entries.sort(([rdA], [rdB]) => {
                return (ROUND_ORDER[rdB] || 99) - (ROUND_ORDER[rdA] || 99);
            });
        };

        const upcomingSorted: Record<string, any[]> = {};
        sortRounds(Object.entries(grouped.upcoming)).forEach(([rd, ms]) => {
            upcomingSorted[rd] = ms.sort((a, b) => b.matchDate.toMillis() - a.matchDate.toMillis());
        });

        const completedSorted: Record<string, any[]> = {};
        sortRounds(Object.entries(grouped.completed)).forEach(([rd, ms]) => {
            completedSorted[rd] = ms.sort((a, b) => b.matchDate.toMillis() - a.matchDate.toMillis());
        });

        const liveSorted: Record<string, any[]> = {};
        sortRounds(Object.entries(grouped.live)).forEach(([rd, ms]) => {
            liveSorted[rd] = ms.sort((a, b) => b.matchDate.toMillis() - a.matchDate.toMillis());
        });

        return { 
            groupedMatches: { upcoming: upcomingSorted, completed: completedSorted, live: liveSorted }, 
            upcomingCount: Object.values(grouped.upcoming).flat().length, 
            completedCount: Object.values(grouped.completed).flat().length,
            liveCount: Object.values(grouped.live).flat().length
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
            <div className="relative max-w-2xl mx-auto group/search">
                <div className="absolute -inset-4 bg-primary/5 rounded-none -skew-x-[12deg] blur-3xl opacity-0 group-hover/search:opacity-100 transition-opacity duration-1000" />
                <div className="relative flex items-center bg-black/60 border-b-4 border-white/10 shadow-[0_20px_80px_rgba(0,0,0,0.6)] backdrop-blur-3xl overflow-hidden -skew-x-[12deg] transition-all duration-500 group-hover/search:border-primary/30">
                    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 opacity-20">
                        <div className="w-full h-[2px] bg-primary/20 blur-[1px] absolute top-0 left-0 animate-scanning" />
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:20px_20px]" />
                    </div>
                    <div className="h-14 w-14 sm:h-16 sm:w-16 bg-primary flex items-center justify-center shrink-0 shadow-2xl border-r-4 border-black/20 relative z-10">
                        <div className="absolute top-0 right-0 w-1/2 h-full bg-black/10 -skew-x-[25deg] translate-x-1/4 pointer-events-none" />
                        <Search className="h-6 w-6 sm:h-7 sm:w-7 text-black skew-x-[12deg]" />
                    </div>
                    <Input 
                        type="text" 
                        placeholder="Search Battle / Team..." 
                        className="flex-1 h-14 sm:h-16 bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 text-lg sm:text-2xl font-black italic tracking-tight uppercase placeholder:text-white/10 transition-all relative z-10 skew-x-[12deg] pl-6 pr-8 text-white" 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                    />
                    <div className="hidden sm:flex items-center gap-2 pr-6 skew-x-[12deg] opacity-20 group-hover/search:opacity-40 transition-opacity">
                        <Scan className="w-4 h-4 text-primary" />
                        <span className="text-[8px] font-black text-primary uppercase tracking-widest">QUERY_LINK</span>
                    </div>
                </div>
            </div>

            {(upcomingCount === 0 && completedCount === 0 && liveCount === 0 && searchTerm) ? (
                <div className="text-center py-20 opacity-20 flex flex-col items-center gap-4">
                    <Activity className="w-12 h-12" />
                    <h2 className="text-xl font-black uppercase italic tracking-widest">{t('no_matches_found')}</h2>
                </div>
            ) : (
                <Tabs defaultValue={liveCount > 0 ? "live" : "upcoming"} className="w-full">
                    <div className="flex justify-center mb-10">
                        <TabsList className="grid grid-cols-3 w-full max-w-2xl h-16 sm:h-20 bg-black/60 p-2 border-b-4 border-white/10 relative overflow-hidden backdrop-blur-2xl rounded-none shadow-[0_10px_50px_rgba(0,0,0,0.5)]">
                            <TabsTrigger 
                                value="live" 
                                className={cn(
                                    "relative h-full font-black uppercase tracking-[0.2em] text-[10px] sm:text-xs italic transition-all duration-700 group/tab overflow-hidden",
                                    "data-[state=active]:text-black data-[state=inactive]:text-white/30 data-[state=inactive]:hover:text-white/70"
                                )}
                            >
                                <span className="relative z-10 flex items-center justify-center gap-3 pr-2">
                                    <Radio className={cn("w-4 h-4 opacity-40 group-data-[state=active]/tab:opacity-100", liveCount > 0 && "animate-pulse text-red-500")} />
                                    LIVE <span className="text-[12px] opacity-40 group-data-[state=active]/tab:opacity-100 font-bold bg-black/20 px-1.5 rounded" suppressHydrationWarning>[{liveCount}]</span>
                                </span>
                                <div className={cn(
                                    "absolute inset-0 -skew-x-[15deg] transition-all duration-700 -z-0 translate-x-[-100%] group-data-[state=active]/tab:translate-x-0",
                                    "group-data-[state=active]/tab:bg-primary group-data-[state=active]/tab:shadow-[0_0_40px_rgba(204,253,1,0.5)]",
                                    "border-r-4 border-white/10 group-data-[state=active]/tab:border-black/20"
                                )} />
                            </TabsTrigger>

                            <TabsTrigger 
                                value="upcoming" 
                                className={cn(
                                    "relative h-full font-black uppercase tracking-[0.2em] text-[10px] sm:text-xs italic transition-all duration-700 group/tab overflow-hidden",
                                    "data-[state=active]:text-black data-[state=inactive]:text-white/30 data-[state=inactive]:hover:text-white/70"
                                )}
                            >
                                <span className="relative z-10 flex items-center justify-center gap-3 pr-2">
                                    <Scan className="w-4 h-4 opacity-40 group-data-[state=active]/tab:opacity-100 group-data-[state=active]/tab:animate-pulse" />
                                    Antrian <span className="text-[12px] opacity-40 group-data-[state=active]/tab:opacity-100 font-bold bg-black/20 px-1.5 rounded" suppressHydrationWarning>[{upcomingCount}]</span>
                                </span>
                                <div className={cn(
                                    "absolute inset-0 -skew-x-[15deg] transition-all duration-700 -z-0 translate-x-[-100%] group-data-[state=active]/tab:translate-x-0",
                                    "group-data-[state=active]/tab:bg-primary group-data-[state=active]/tab:shadow-[0_0_40px_rgba(204,253,1,0.5)]",
                                    "border-r-4 border-white/10 group-data-[state=active]/tab:border-black/20"
                                )} />
                            </TabsTrigger>

                            <TabsTrigger 
                                value="completed" 
                                className={cn(
                                    "relative h-full font-black uppercase tracking-[0.2em] text-[10px] sm:text-xs italic transition-all duration-700 group/tab overflow-hidden",
                                    "data-[state=active]:text-black data-[state=inactive]:text-white/30 data-[state=inactive]:hover:text-white/70"
                                )}
                            >
                                <span className="relative z-10 flex items-center justify-center gap-3 pr-2">
                                    <CheckCircle2 className="w-4 h-4 opacity-40 group-data-[state=active]/tab:opacity-100 group-data-[state=active]/tab:animate-pulse" />
                                    Selesai <span className="text-[12px] opacity-40 group-data-[state=active]/tab:opacity-100 font-bold bg-black/20 px-1.5 rounded" suppressHydrationWarning>[{completedCount}]</span>
                                </span>
                                <div className={cn(
                                    "absolute inset-0 -skew-x-[15deg] transition-all duration-700 -z-0 translate-x-[-100%] group-data-[state=active]/tab:translate-x-0",
                                    "group-data-[state=active]/tab:bg-primary group-data-[state=active]/tab:shadow-[0_0_40px_rgba(204,253,1,0.5)]",
                                    "border-r-4 border-white/10 group-data-[state=active]/tab:border-black/20"
                                )} />
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="live" className="mt-0 focus-visible:ring-0 outline-none">
                        <div className="space-y-12">
                            {Object.entries(groupedMatches.live).map(([rd, rms]) => (
                                <section key={`live-${rd}`} className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                                    <div className="flex items-center gap-6 mb-6">
                                        <div className="h-1.5 flex-1 bg-gradient-to-r from-transparent via-red-500/30 to-transparent rounded-full" />
                                        <div className="flex flex-col items-center">
                                            <h3 className="text-base sm:text-lg font-black tracking-[0.2em] text-white uppercase italic pr-2">{roundNames[rd] || rd}</h3>
                                            <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest border-red-500/30 text-red-500 py-0 h-5 mt-1 animate-pulse">LIVE BROADCAST</Badge>
                                        </div>
                                        <div className="h-1.5 flex-1 bg-gradient-to-l from-transparent via-red-500/30 to-transparent rounded-full" />
                                    </div>
                                    <Card className="overflow-hidden border-2 border-red-500/20 bg-red-500/[0.02] backdrop-blur-xl shadow-[0_0_50px_rgba(239,68,68,0.1)] rounded-[2.5rem]">
                                        <CardContent className="p-0">
                                            {rms.map(m => (
                                                <MatchRow key={m.id} match={m} onEditMatch={onEditMatch} onRevertMatch={onRevertMatch} onQuickUpdate={onQuickUpdate} isAdmin={isAdmin} activeSeason={activeSeason} hasPlayoffs={hasPlayoffs} />
                                            ))}
                                        </CardContent>
                                    </Card>
                                </section>
                            ))}
                            {liveCount === 0 && (
                                <div className="text-center py-24 opacity-10 flex flex-col items-center gap-4">
                                    <Radio className="w-16 h-16" />
                                    <p className="text-sm font-black uppercase tracking-[0.4em] italic">No Matches Currently Live</p>
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="upcoming" className="mt-0 focus-visible:ring-0 outline-none">
                        <div className="space-y-12">
                            {Object.entries(groupedMatches.upcoming).map(([rd, rms]) => (
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
                                                <MatchRow key={m.id} match={m} onEditMatch={onEditMatch} onRevertMatch={onRevertMatch} onQuickUpdate={onQuickUpdate} isAdmin={isAdmin} activeSeason={activeSeason} hasPlayoffs={hasPlayoffs} />
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
                            {Object.entries(groupedMatches.completed).map(([rd, rms]) => (
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
                                                <MatchRow key={m.id} match={m} onEditMatch={onEditMatch} onRevertMatch={onRevertMatch} onQuickUpdate={onQuickUpdate} isAdmin={isAdmin} activeSeason={activeSeason} hasPlayoffs={hasPlayoffs} />
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
  const [isProcessing, setIsProcessing] = useState(false);
  
  const seasonsCol = useMemoFirebase(() => (firestore ? query(collection(firestore, `leagues/${LEAGUE_ID}/seasons`), orderBy('createdAt', 'desc')) : null), [firestore]);
  const { data: seasons, isLoading: isLoadingSeasons } = useCollection<Season>(seasonsCol);
  
  const playersCol = useMemoFirebase(() => (firestore ? collection(firestore, 'players') : null), [firestore]);
  const { data: allPlayers, isLoading: isLoadingPlayers } = useCollection<Player>(playersCol);
  
  const allTeamsCol = useMemoFirebase(() => (firestore ? collection(firestore, 'teams') : null), [firestore]);
  const { data: allTeams, isLoading: isLoadingTeams } = useCollection<Team>(allTeamsCol);
  
  const matchesCol = useMemoFirebase(() => firestore && activeSeasonId ? collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/matches`) : null, [firestore, activeSeasonId]);
  const { data: matches, isLoading: isLoadingMatches } = useCollection<Match>(matchesCol);
  
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

  const handleQuickUpdate = async (matchId: string, field: string, delta: number) => {
    if (!firestore || !activeSeasonId || !isAdmin) return;
    const matchRef = doc(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/matches`, matchId);
    try {
        await updateDoc(matchRef, { [field]: increment(delta) });
    } catch (e) {
        console.error("Quick update failed:", e);
    }
  };

  const handleUpdateScore = async (matchId: string, values: any) => {
    if (!firestore || !activeSeasonId || isProcessing) return;
    setIsProcessing(true);
    
    const matchRef = doc(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/matches`, matchId);
    
    try {
        const mDoc = await getDoc(matchRef);
        if (!mDoc.exists()) throw new Error("Match data not found.");
        const orig = mDoc.data() as Match;
        
        const [h, m] = values.time.split(':').map(Number); 
        const matchTimestamp = Timestamp.fromDate(new Date(values.date.setHours(h, m)));
        
        const isCompleted = values.status === 'Completed';
        const isLive = values.status === 'Live';

        const matchUpdateData: any = {
            player1Score: values.player1Score,
            player2Score: values.player2Score,
            matchDate: matchTimestamp,
            status: values.status,
            isCompleted: isCompleted,
            player1Wins: values.player1Wins !== undefined ? values.player1Wins : null,
            player2Wins: values.player2Wins !== undefined ? values.player2Wins : null,
        };

        if (isCompleted) {
            // ONLY RUN TRANSACTION FOR COMPLETED MATCHES
            await runTransaction(firestore, async (transaction) => {
                const seasonRef = doc(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}`);
                const sSnap = await transaction.get(seasonRef);
                const sData = sSnap.data() as Season;
                const isMatchBo3 = sData.type === 'Co-Op' || sData.type === 'Co-Op Hybrid' || (orig.round && orig.round !== 'Group');

                let winMatchRef = null;
                let losMatchRef = null;
                if (orig.round && orig.round !== 'Group' && orig.bracketId) {
                    const succ = PLAYOFF_SUCCESSOR_MAP[orig.bracketId];
                    if (succ) {
                        const mCol = collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/matches`);
                        const winSnap = await getDocs(query(mCol, where('bracketId', '==', succ.winner.bid)));
                        if (!winSnap.empty) winMatchRef = winSnap.docs[0].ref;
                        if (succ.loser) {
                            const losSnap = await getDocs(query(mCol, where('bracketId', '==', succ.loser.bid)));
                            if (!losSnap.empty) losMatchRef = losSnap.docs[0].ref;
                        }
                    }
                }

                let p1EntryRef = null;
                let p2EntryRef = null;
                let e1Data: LeagueEntry | null = null;
                let e2Data: LeagueEntry | null = null;

                if (orig.round === 'Group' || !orig.round) {
                    const tblName = sData.type === 'Co-Op' || sData.type === 'Co-Op Hybrid' ? 'coopLeagueTable' : 'leagueTable';
                    const tblCol = collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/${tblName}`);
                    if (sData.type === 'Co-Op' || sData.type === 'Co-Op Hybrid') {
                        p1EntryRef = doc(tblCol, orig.player1Id);
                        p2EntryRef = doc(tblCol, orig.player2Id);
                    } else {
                        const snap1 = await getDocs(query(tblCol, where('playerId', '==', orig.player1Id)));
                        const snap2 = await getDocs(query(tblCol, where('playerId', '==', orig.player2Id)));
                        if (!snap1.empty) p1EntryRef = snap1.docs[0].ref;
                        if (!snap2.empty) p2EntryRef = snap2.docs[0].ref;
                    }
                    
                    if (p1EntryRef) e1Data = (await transaction.get(p1EntryRef)).data() as LeagueEntry;
                    if (p2EntryRef) e2Data = (await transaction.get(p2EntryRef)).data() as LeagueEntry;
                }

                const getOutcome = (s1: number, s2: number) => {
                    if (s1 > s2) return { p1: 'W', p2: 'L' };
                    if (s1 < s2) return { p1: 'L', p2: 'W' };
                    return { p1: 'D', p2: 'D' };
                };

                const updateStats = (pId: string, change: any) => {
                    if (!pId || pId === 'TBD' || pId.includes('TBD')) return;
                    transaction.update(doc(firestore, 'players', pId), {
                        overallPlayed: increment(change.played || 0),
                        overallWin: increment(change.win || 0),
                        overallDraw: increment(change.draw || 0),
                        overallLoss: increment(change.loss || 0),
                        overallGoalsFor: increment(change.gf || 0),
                        overallGoalsAgainst: increment(change.ga || 0),
                    });
                };

                if (orig.isCompleted) {
                    const oldS1 = isMatchBo3 ? (orig.player1Wins ?? 0) : (orig.player1Score ?? 0);
                    const oldS2 = isMatchBo3 ? (orig.player2Wins ?? 0) : (orig.player2Score ?? 0);
                    const oldRes = getOutcome(oldS1, oldS2);
                    
                    if ((sData.type === 'Co-Op' || sData.type === 'Co-Op Hybrid') && e1Data && e2Data) {
                        const d1 = e1Data as unknown as CoOpLeagueEntry; const d2 = e2Data as unknown as CoOpLeagueEntry;
                        [d1.player1Id, d1.player2Id].forEach(id => updateStats(id, { played: -1, win: oldRes.p1 === 'W' ? -1 : 0, loss: oldRes.p1 === 'L' ? -1 : 0, gf: -(orig.player1Score || 0), ga: -(orig.player2Score || 0) }));
                        [d2.player1Id, d2.player2Id].forEach(id => updateStats(id, { played: -1, win: oldRes.p2 === 'W' ? -1 : 0, loss: oldRes.p2 === 'L' ? -1 : 0, gf: -(orig.player2Score || 0), ga: -(orig.player1Score || 0) }));
                    } else {
                        updateStats(orig.player1Id, { played: -1, win: oldRes.p1 === 'W' ? -1 : 0, draw: oldRes.p1 === 'D' ? -1 : 0, loss: oldRes.p1 === 'L' ? -1 : 0, gf: -(orig.player1Score || 0), ga: -(orig.player2Score || 0) });
                        updateStats(orig.player2Id, { played: -1, win: oldRes.p2 === 'W' ? -1 : 0, draw: oldRes.p2 === 'D' ? -1 : 0, loss: oldRes.p2 === 'L' ? -1 : 0, gf: -(orig.player2Score || 0), ga: -(orig.player1Score || 0) });
                    }
                }

                const newS1 = isMatchBo3 ? (values.player1Wins ?? 0) : (values.player1Score ?? 0);
                const newS2 = isMatchBo3 ? (values.player2Wins ?? 0) : (values.player2Score ?? 0);
                const newRes = getOutcome(newS1, newS2);

                if ((sData.type === 'Co-Op' || sData.type === 'Co-Op Hybrid') && e1Data && e2Data) {
                    const d1 = e1Data as unknown as CoOpLeagueEntry; const d2 = e2Data as unknown as CoOpLeagueEntry;
                    [d1.player1Id, d1.player2Id].forEach(id => updateStats(id, { played: 1, win: newRes.p1 === 'W' ? 1 : 0, loss: newRes.p1 === 'L' ? 1 : 0, gf: values.player1Score || 0, ga: values.player2Score || 0 }));
                    [d2.player1Id, d2.player2Id].forEach(id => updateStats(id, { played: 1, win: newRes.p2 === 'W' ? 1 : 0, loss: newRes.p2 === 'L' ? 1 : 0, gf: values.player2Score || 0, ga: values.player1Score || 0 }));
                } else {
                    updateStats(orig.player1Id, { played: 1, win: newRes.p1 === 'W' ? 1 : 0, draw: newRes.p1 === 'D' ? 1 : 0, loss: newRes.p1 === 'L' ? 1 : 0, gf: values.player1Score || 0, ga: values.player2Score || 0 });
                    updateStats(orig.player2Id, { played: 1, win: newRes.p2 === 'W' ? 1 : 0, draw: newRes.p2 === 'D' ? 1 : 0, loss: newRes.p2 === 'L' ? 1 : 0, gf: values.player2Score || 0, ga: values.player1Score || 0 });
                }

                if (winMatchRef) {
                    const winnerId = newS1 > newS2 ? orig.player1Id : orig.player2Id;
                    const succ = PLAYOFF_SUCCESSOR_MAP[orig.bracketId!];
                    transaction.update(winMatchRef, { [`player${succ.winner.slot}Id`]: winnerId });
                    if (losMatchRef && succ.loser) {
                        const loserId = winnerId === orig.player1Id ? orig.player2Id : orig.player1Id;
                        transaction.update(losMatchRef, { [`player${succ.loser.slot}Id`]: loserId });
                    }
                }

                if (p1EntryRef && p2EntryRef && e1Data && e2Data) {
                    const e1 = { ...e1Data }; const e2 = { ...e2Data };
                    if (orig.isCompleted) {
                        e1.played--; e2.played--;
                        if (sData.type === 'Co-Op' || sData.type === 'Co-Op Hybrid') {
                            if ((orig.player1Wins ?? 0) > (orig.player2Wins ?? 0)) { e1.win--; e1.points -= 3; e2.loss--; } else { e2.win--; e2.points -= 3; e1.loss--; }
                        } else {
                            e1.goalsFor -= orig.player1Score!; e1.goalsAgainst -= orig.player2Score!; e2.goalsFor -= orig.player2Score!; e2.goalsAgainst -= mDoc.data().player1Score!;
                            if (orig.player1Score! > orig.player2Score!) { e1.win--; e1.points -= 3; e2.loss--; } else if (orig.player2Score! > orig.player1Score!) { e2.win--; e2.points -= 3; e1.loss--; } else { e1.draw--; e1.points--; e2.draw--; e2.points--; }
                        }
                    }
                    e1.played++; e2.played++;
                    if (sData.type === 'Co-Op' || sData.type === 'Co-Op Hybrid') {
                        if (values.player1Wins > values.player2Wins) { e1.win++; e1.points += 3; e2.loss++; } else { e2.win++; e2.points += 3; e1.loss++; }
                    } else {
                        e1.goalsFor += values.player1Score; e1.goalsAgainst += values.player2Score; e2.goalsFor += values.player2Score; e2.goalsAgainst += values.player1Score;
                        if (values.player1Score > values.player2Score) { e1.win++; e1.points += 3; e2.loss++; } else if (values.player2Score > values.player1Score) { e2.win++; e2.points += 3; e1.loss++; } else { e1.draw++; e1.points++; e2.draw++; e2.points++; }
                        e1.goalDifference = e1.goalsFor - e1.goalsAgainst; e2.goalDifference = e2.goalsFor - e2.goalsAgainst;
                    }
                    transaction.set(p1EntryRef, e1); transaction.set(p2EntryRef, e2);
                }

                transaction.update(matchRef, matchUpdateData);
            });
        } else {
            // FOR LIVE OR SCHEDULED, JUST UPDATE THE MATCH DOC
            await updateDoc(matchRef, matchUpdateData);
        }

        toast({ title: t('score_updated_title') });
        setEditingMatch(null);
    } catch (e: any) {
        console.error(e);
        toast({ variant: 'destructive', title: "Error", description: e.message });
    } finally {
        setIsProcessing(false);
    }
  };

  const handleRevertMatch = useCallback(async (matchToRevert?: WithId<Match>) => {
    const matchToUse = matchToRevert || revertingMatch;
    if (!firestore || !activeSeasonId || !matchToUse || isProcessing) return;
    setIsProcessing(true);
    
    const matchRef = doc(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/matches`, matchToUse.id);
    const seasonRef = doc(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}`);
    
    try {
        const [mDoc, sDoc] = await Promise.all([getDoc(matchRef), getDoc(seasonRef)]);
        if (!mDoc.exists() || !sDoc.exists() || !mDoc.data().isCompleted) throw new Error("Match not completed or found.");
        
        const mToRev = mDoc.data() as Match;
        const sData = sDoc.data() as Season;
        const isMatchBo3 = sData.type === 'Co-Op' || sData.type === 'Co-Op Hybrid' || (mToRev.round && mToRev.round !== 'Group');

        await runTransaction(firestore, async (transaction) => {
            let winMatchRef = null;
            let losMatchRef = null;
            if (mToRev.round && mToRev.round !== 'Group' && mToRev.bracketId) {
                const succ = PLAYOFF_SUCCESSOR_MAP[mToRev.bracketId];
                if (succ) {
                    const mCol = collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/matches`);
                    const winSnap = await getDocs(query(mCol, where('bracketId', '==', succ.winner.bid)));
                    if (!winSnap.empty) {
                        winMatchRef = winSnap.docs[0].ref;
                        if (winSnap.docs[0].data().isCompleted) throw new Error("Tidak dapat membatalkan: Pertandingan babak selanjutnya sudah dimainkan.");
                    }
                    if (succ.loser) {
                        const losSnap = await getDocs(query(mCol, where('bracketId', '==', succ.loser.bid)));
                        if (!losSnap.empty) {
                            losMatchRef = losSnap.docs[0].ref;
                            if (losSnap.docs[0].data().isCompleted) throw new Error("Tidak dapat membatalkan: Pertandingan babak selanjutnya sudah dimainkan.");
                        }
                    }
                }
            }

            let p1EntryRef = null;
            let p2EntryRef = null;
            let e1Data: LeagueEntry | null = null;
            let e2Data: LeagueEntry | null = null;

            if (mToRev.round === 'Group' || !mToRev.round) {
                const tblName = sData.type === 'Co-Op' || sData.type === 'Co-Op Hybrid' ? 'coopLeagueTable' : 'leagueTable';
                const tblCol = collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/${tblName}`);
                if (sData.type === 'Co-Op' || sData.type === 'Co-Op Hybrid') {
                    p1EntryRef = doc(tblCol, mToRev.player1Id);
                    p2EntryRef = doc(tblCol, mToRev.player2Id);
                } else {
                    const snap1 = await getDocs(query(tblCol, where('playerId', '==', mToRev.player1Id)));
                    const snap2 = await getDocs(query(tblCol, where('playerId', '==', mToRev.player2Id)));
                    if (!snap1.empty) p1EntryRef = snap1.docs[0].ref;
                    if (!snap2.empty) p2EntryRef = snap2.docs[0].ref;
                }
                
                if (p1EntryRef) e1Data = (await transaction.get(p1EntryRef)).data() as LeagueEntry;
                if (p2EntryRef) e2Data = (await transaction.get(p2EntryRef)).data() as LeagueEntry;
            }

            const updateStats = (pId: string, change: any) => {
                if (!pId || pId === 'TBD' || pId.includes('TBD')) return;
                transaction.update(doc(firestore, 'players', pId), {
                    overallPlayed: increment(change.played || 0),
                    overallWin: increment(change.win || 0),
                    overallDraw: increment(change.draw || 0),
                    overallLoss: increment(change.loss || 0),
                    overallGoalsFor: increment(change.gf || 0),
                    overallGoalsAgainst: increment(change.ga || 0),
                });
            };

            const oldS1 = isMatchBo3 ? (mToRev.player1Wins ?? mToRev.player1Score ?? 0) : (mToRev.player1Score ?? 0);
            const oldS2 = isMatchBo3 ? (mToRev.player2Wins ?? mToRev.player2Score ?? 0) : (mToRev.player2Score ?? 0);
            const res = (oldS1 > oldS2) ? { p1: 'W', p2: 'L' } : (oldS1 < oldS2 ? { p1: 'L', p2: 'W' } : { p1: 'D', p2: 'D' });

            if ((sData.type === 'Co-Op' || sData.type === 'Co-Op Hybrid') && e1Data && e2Data) {
                const d1 = e1Data as unknown as CoOpLeagueEntry; const d2 = e2Data as unknown as CoOpLeagueEntry;
                [d1.player1Id, d1.player2Id].forEach(id => updateStats(id, { played: -1, win: res.p1 === 'W' ? -1 : 0, loss: res.p1 === 'L' ? -1 : 0, gf: -(mToRev.player1Score || 0), ga: -(mToRev.player2Score || 0) }));
                [d2.player1Id, d2.player2Id].forEach(id => updateStats(id, { played: -1, win: res.p2 === 'W' ? -1 : 0, loss: res.p2 === 'L' ? -1 : 0, gf: -(mToRev.player2Score || 0), ga: -(mToRev.player1Score || 0) }));
            } else {
                updateStats(mToRev.player1Id, { played: -1, win: res.p1 === 'W' ? -1 : 0, draw: res.p1 === 'D' ? -1 : 0, loss: res.p1 === 'L' ? -1 : 0, gf: -(mToRev.player1Score || 0), ga: -(mToRev.player2Score || 0) });
                updateStats(mToRev.player2Id, { played: -1, win: res.p2 === 'W' ? -1 : 0, draw: res.p2 === 'D' ? -1 : 0, loss: res.p2 === 'L' ? -1 : 0, gf: -(mToRev.player2Score || 0), ga: -(mToRev.player1Score || 0) });
            }

            if (p1EntryRef && p2EntryRef && e1Data && e2Data) {
                const e1 = { ...e1Data }; const e2 = { ...e2Data };
                e1.played--; e2.played--;
                if (sData.type === 'Co-Op' || sData.type === 'Co-Op Hybrid') {
                    if ((mToRev.player1Wins ?? 0) > (mToRev.player2Wins ?? 0)) { e1.win--; e1.points -= 3; e2.loss--; } else { e2.win--; e2.points -= 3; e1.loss--; }
                } else {
                    e1.goalsFor -= mToRev.player1Score!; e1.goalsAgainst -= mToRev.player2Score!; e2.goalsFor -= mToRev.player2Score!; e2.goalsAgainst -= mToRev.player1Score!;
                    if (mToRev.player1Score! > mToRev.player2Score!) { e1.win--; e1.points -= 3; e2.loss--; } else if (mToRev.player2Score! > mToRev.player1Score!) { e2.win--; e2.points -= 3; e1.loss--; } else { e1.draw--; e1.points--; e2.draw--; e2.points--; }
                    e1.goalDifference = e1.goalsFor - e1.goalsAgainst; e2.goalDifference = e2.goalsFor - e2.goalsAgainst;
                }
                transaction.set(p1EntryRef, e1); transaction.set(p2EntryRef, e2);
            }

            if (winMatchRef) transaction.update(winMatchRef, { [`player${PLAYOFF_SUCCESSOR_MAP[mToRev.bracketId!].winner.slot}Id`]: 'TBD' });
            if (losMatchRef && PLAYOFF_SUCCESSOR_MAP[mToRev.bracketId!].loser) transaction.update(losMatchRef, { [`player${PLAYOFF_SUCCESSOR_MAP[mToRev.bracketId!].loser!.slot}Id`]: 'TBD' });

            transaction.update(matchRef, { player1Wins: null, player2Wins: null, player1Score: null, player2Score: null, isCompleted: false, status: 'Scheduled' });
        });

        toast({ title: t('match_reverted_title') });
        setRevertingMatch(null);
    } catch (e: any) {
        console.error(e);
        toast({ variant: 'destructive', title: "Error", description: e.message });
    } finally {
        setIsProcessing(false);
    }
  }, [firestore, activeSeasonId, revertingMatch, isProcessing, t, toast]);

  const isLoading = isLoadingSeasons || isLoadingPlayers || isLoadingTeams || !isPasswordLoaded;
  
  return (
    <div className="max-w-[92rem] mx-auto px-2 sm:px-4 py-8 relative">
       <div className="absolute top-0 right-0 -z-10 w-[300px] sm:w-[600px] h-[300px] sm:h-[600px] bg-primary/5 rounded-full blur-[100px] sm:blur-[150px] pointer-events-none" />
       <div className="absolute bottom-0 left-0 -z-10 w-[250px] sm:w-[500px] h-[250px] sm:h-[500px] bg-accent/5 rounded-full blur-[80px] sm:blur-[120px] pointer-events-none" />

       <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-10 sm:space-y-12">
        <div className="flex flex-col md:flex-row justify-between items-stretch mb-6 sm:mb-10 gap-4 sm:gap-10 min-h-[140px] sm:min-h-[190px]">
             <div className="flex flex-col justify-center space-y-2 flex-1 w-full py-6 sm:py-8 px-8 sm:px-12 relative group/header overflow-hidden bg-black/40 backdrop-blur-3xl border-2 border-white/5 rounded-[2.5rem] shadow-2xl transition-all duration-500 hover:border-primary/20">
                <div className="absolute left-0 top-0 bottom-0 w-2 bg-primary shadow-[0_0_30px_rgba(204,253,1,0.8)]" />
                <div className="absolute top-0 right-0 w-20 h-20 border-t-4 border-r-4 border-white/5 rounded-tr-[2.5rem] pointer-events-none group-hover/header:border-primary/20 transition-colors duration-500" />
                <div className="absolute bottom-0 right-0 w-12 h-12 border-b-2 border-r-2 border-white/5 rounded-br-[2.5rem] pointer-events-none opacity-20" />
                
                <div className="relative z-10 space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="h-px w-8 sm:w-12 bg-primary/40" />
                        <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.4em] text-primary/60 italic">Signal Transmission • Active</span>
                    </div>
                    
                    <h1 className="font-headline text-3xl sm:text-7xl font-black tracking-tighter text-white uppercase italic drop-shadow-[0_0_30px_rgba(255,255,255,0.1)] leading-none">
                        {t('fixtures_page_title').split(' ')[0]} <span className="text-primary drop-shadow-[0_0_20px_rgba(204,253,1,0.4)]">{t('fixtures_page_title').split(' ').slice(1).join(' ')}</span>
                    </h1>
                </div>

                {activeSeason && (
                  <div className="space-y-2 relative z-10 pt-2">
                    <div className="flex items-center gap-3">
                        <p className="text-lg sm:text-3xl font-black text-white tracking-tight uppercase italic pr-4">{activeSeason.name}</p>
                        <Badge className="relative overflow-hidden bg-primary text-black border-none font-black tracking-widest text-[9px] sm:text-[10px] h-6 px-4 uppercase italic shadow-[0_0_20px_rgba(204,253,1,0.4)] flex items-center justify-center rounded-none -skew-x-[12deg] border-r-4 border-black/20">
                            <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent pointer-events-none" />
                            <span className="relative z-10 skew-x-[12deg]">{activeSeason.status}</span>
                        </Badge>
                    </div>
                  </div>
                )}

                {matches && matches.length > 0 && (
                    <div className="max-w-md pt-4 space-y-2 relative z-10">
                        <div className="flex justify-between items-end mb-1">
                            <span className="text-[9px] font-black uppercase tracking-widest text-primary/60 flex items-center gap-2">
                                <Activity className="w-3 h-3 animate-pulse" /> Season Progress
                            </span>
                            <span className="text-xs font-black text-primary italic" suppressHydrationWarning>[{progressPercentage.toFixed(0)}%]</span>
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

        <div className={cn(
            "relative bg-black/60 border-b-4 border-white/10 p-2 sm:p-3 flex flex-wrap items-center gap-4 shadow-[0_10px_50px_rgba(0,0,0,0.5)] backdrop-blur-2xl transition-all duration-500 overflow-hidden",
            isAdmin ? "w-full" : "w-fit mx-auto"
        )}>
            <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-primary/40 pointer-events-none" />
            <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-primary/40 pointer-events-none" />

            <div className="flex items-center gap-2 w-full sm:w-auto relative group/select">
                <div className="p-3 bg-primary/10 text-primary hidden xs:block shadow-lg -skew-x-[12deg] border-r-2 border-primary/30">
                    <Scan className="w-4 h-4 skew-x-[12deg]" />
                </div>
                <Select value={activeSeasonId || ''} onValueChange={activeSeasonId => setActiveSeasonId(activeSeasonId)} disabled={isLoadingSeasons}>
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
                            : "bg-primary text-black border-primary/20 hover:bg-primary shadow-[0_0_20px_rgba(204,253,1,0.2)]"
                    )}
                    disabled={!isPasswordLoaded}
                >
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div className={cn(
                            "w-full h-[2px] bg-current absolute top-0 left-0 transition-opacity duration-500",
                            isAdmin ? "animate-scanning opacity-20" : "opacity-0"
                        )} />
                    </div>

                    <div className="skew-x-[12deg] flex items-center relative z-10 text-black">
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
            <FixtureContent activeSeasonId={activeSeasonId} onEditMatch={setEditingMatch} onRevertMatch={setRevertingMatch} onQuickUpdate={handleQuickUpdate} isAdmin={isAdmin} allPlayers={allPlayers || []} allTeams={allTeams || []} matches={matches} isLoadingMatches={isLoadingMatches} activeSeason={activeSeason} hasPlayoffs={hasPlayoffs} />
        )}

        <Dialog open={!!editingMatch} onOpenChange={(open) => !open && !isProcessing && setEditingMatch(null)}>
            <DialogContent className={cn("max-w-xl border-primary border-4 p-0 overflow-hidden bg-background/95 rounded-3xl shadow-2xl max-h-[90vh] flex flex-col transition-all", isProcessing && "opacity-80 scale-95 pointer-events-none")}>
                <DialogHeader className="p-6 border-b border-white/5 bg-black/20 shrink-0">
                    <div className="flex items-center gap-3 text-primary mb-1">
                        {isProcessing ? <Loader2 className="w-6 h-6 animate-spin" /> : <Zap className="w-6 h-6" />}
                        <DialogTitle className="text-2xl font-black tracking-tighter uppercase italic pr-4">
                            {isProcessing ? "Menyinkronkan..." : "Update Match Engagement"}
                        </DialogTitle>
                    </div>
                    {editingMatch && (<DialogDescription className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{t('update_match_score_desc', { player1: editingMatch.player1?.name, player2: editingMatch.player2?.name })}</DialogDescription>)}
                </DialogHeader>
                <ScrollArea className="flex-1 p-6 overflow-y-auto">
                    {editingMatch && activeSeason && (
                        <ScoreForm 
                            match={editingMatch} 
                            onSave={(v) => handleUpdateScore(editingMatch.id, v)} 
                            seasonType={activeSeason.type} 
                            player1Info={{ name: editingMatch.player1.name, team: editingMatch.team1 }} 
                            player2Info={{ name: editingMatch.player2.name, team: editingMatch.team2 }} 
                        />
                    )}
                </ScrollArea>
                <DialogFooter className="p-4 bg-black/20 border-t border-white/5 shrink-0">
                    <Button variant="ghost" onClick={() => setEditingMatch(null)} disabled={isProcessing} className="font-black uppercase tracking-widest italic text-[10px] text-white/70 hover:bg-white/10 hover:text-white border border-white/10">{t('cancel')}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <AlertDialog open={!!revertingMatch} onOpenChange={(open) => !open && !isProcessing && setRevertingMatch(null)}>
            <AlertDialogContent className="border-amber-500 border-4 bg-background/95 backdrop-blur-2xl rounded-3xl">
                <AlertDialogHeader>
                    <div className="flex items-center gap-4 text-amber-500 mb-2">
                        {isProcessing ? <Loader2 className="w-8 h-8 animate-spin" /> : <Undo2 className="w-8 h-8" />}
                        <AlertDialogTitle className="text-2xl font-black tracking-tighter uppercase italic pr-4">{t('revert_match_confirm_title')}</AlertDialogTitle>
                    </div>
                    {revertingMatch && (<AlertDialogDescription className="text-sm font-bold text-white/40 uppercase tracking-widest">{t('revert_match_confirm_desc', { player1: revertingMatch.player1Id, player2: revertingMatch.player2Id })}</AlertDialogDescription>)}
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-4 mt-6">
                    <AlertDialogCancel onClick={() => setRevertingMatch(null)} disabled={isProcessing} className="font-black uppercase tracking-widest italic rounded-xl h-12">{t('cancel')}</AlertDialogCancel>
                    <AlertDialogAction onClick={() => revertingMatch && handleRevertMatch(revertingMatch)} disabled={isProcessing} className="bg-amber-500 text-black hover:bg-amber-600 font-black uppercase tracking-widest italic rounded-xl h-12">{t('revert_match_action')}</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <Dialog open={passwordPromptOpen} onOpenChange={passwordPromptOpen => setPasswordPromptOpen(passwordPromptOpen)}>
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
                    <Button onClick={handlePasswordCheck} className="w-full h-12 sm:h-14 font-black tracking-widest text-sm sm:text-lg uppercase italic rounded-none shadow-xl shadow-primary/20 text-black">{t('unlock')}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
