
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
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, query, getDocs, getDoc, where, runTransaction, Timestamp, orderBy, increment, updateDoc } from 'firebase/firestore';
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
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PLAYOFF_SUCCESSOR_MAP } from '@/lib/constants';
import { resolveLogo } from '@/lib/logo-utils';


const LEAGUE_ID = 'main-league';

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
    const isSeasonCoop = activeSeason?.type === 'Co-Op' || activeSeason?.type === 'Co-Op Hybrid';
    const isMatchBo3 = isSeasonCoop ? (match.round && match.round !== 'Group') : (match.round && match.round !== 'Group');
    
    const isEditDisabled = 
        activeSeason?.status !== 'In Progress' || 
        (match.isCompleted && !isAdmin) || 
        (match.player1Id === 'TBD' || match.player2Id === 'TBD') ||
        (hasPlayoffs && (match.round === 'Group' || !match.round) && !isAdmin);

    const PlayerInfo = ({ name, team, teamId, alignment = 'left', isWinner, wins }: { name: string, team: WithId<Team> | null, teamId: string, alignment?: 'left' | 'right', isWinner: boolean, wins?: number | null }) => {
        const logoUrl = resolveLogo(team?.logoUrl, teamId, name);
        
        return (
            <div className={cn(
                "flex items-center gap-3 sm:gap-6 transition-all duration-500 w-full overflow-hidden", 
                alignment === 'right' ? "flex-row-reverse text-right" : "flex-row text-left"
            )}>
                <div className="relative shrink-0">
                    <div className={cn(
                        "absolute -inset-1 rounded-full blur-md opacity-0 transition-opacity duration-700",
                        isWinner ? "bg-primary/40 opacity-100" : "bg-white/5"
                    )} />
                    
                    <Avatar className={cn(
                        "h-12 w-12 sm:h-16 sm:w-16 border-2 transition-all duration-700 shadow-xl relative z-10",
                        isWinner ? "border-primary scale-110" : "border-white/10"
                    )}>
                        <AvatarImage 
                            key={logoUrl} 
                            src={logoUrl} 
                            alt={team?.name || name} 
                            className="object-cover" 
                            referrerPolicy="no-referrer" 
                        />
                        <AvatarFallback className="bg-black/40 font-black text-[8px] leading-tight text-center px-0.5">
                            LOGO NULL
                        </AvatarFallback>
                    </Avatar>

                    {isMatchBo3 && wins !== undefined && (
                        <div className={cn(
                            "absolute -bottom-1 flex items-center justify-center w-6 h-6 rounded-full border-2 border-background font-black text-[10px] z-20 shadow-lg",
                            alignment === 'right' ? "-right-1 bg-primary text-black" : "-left-1 bg-primary text-black"
                        )}>
                            {wins || 0}
                        </div>
                    )}
                    
                    {isWinner && (
                        <div className="absolute -top-1 -right-1 bg-primary rounded-full p-1 z-20 shadow-lg border-2 border-background animate-bounce">
                            <Zap className="w-3 h-3 text-black fill-black" />
                        </div>
                    )}
                </div>

                <div className="flex flex-col min-w-0 flex-1">
                    <span className={cn(
                        "text-xs sm:text-xl font-black tracking-tighter uppercase italic truncate transition-colors duration-500 pr-2 leading-none", 
                        isWinner ? "text-primary" : "text-white/90"
                    )}>
                        {name}
                    </span>
                    <span className="text-[7px] sm:text-[11px] font-bold text-white/30 uppercase tracking-[0.2em] truncate pr-2 mt-1">
                        {team?.name || 'Athlete Protocol'}
                    </span>
                </div>
            </div>
        );
    }
    
    const score1 = match.player1Score ?? 0;
    const score2 = match.player2Score ?? 0;
    const wins1 = match.player1Wins ?? 0;
    const wins2 = match.player2Wins ?? 0;

    const hasValidScore = (match.isCompleted || match.status === 'Live') && (score1 !== null || match.player1Score !== null);
    const isW1 = match.isCompleted && (isMatchBo3 ? wins1 > wins2 : score1 > score2);
    const isW2 = match.isCompleted && (isMatchBo3 ? wins2 > wins1 : score2 > score1);

    const gameIdx = isMatchBo3 ? (wins1 + wins2 + 1) : 1;

    return (
        <div className="group relative overflow-hidden transition-all duration-500 border-b-2 border-white/5 last:border-0 hover:bg-primary/[0.02]">
            {/* AGGRESSIVE BACKGROUND GHOST TEXT */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none opacity-[0.03] pr-10">
                <span className="text-[120px] sm:text-[220px] font-black italic text-white uppercase tracking-tighter transition-all duration-1000 group-hover:scale-110 group-hover:opacity-[0.05]">
                    {match.isCompleted ? 'FINISHED' : match.status === 'Live' ? 'LIVE NOW' : 'BATTLE'}
                </span>
            </div>

            <div className="relative z-10 grid grid-cols-[1fr_90px_1fr] sm:grid-cols-[1fr_160px_1fr] items-center gap-2 sm:gap-10 p-5 sm:p-10">
                <div className="w-full flex items-center gap-3">
                    {isAdmin && match.status === 'Live' && (
                        <div className="flex flex-col gap-1.5 shrink-0 animate-in fade-in slide-in-from-left-2 duration-500">
                            <Button size="icon" variant="outline" className="h-7 w-7 sm:h-9 sm:w-9 rounded-lg border-primary/30 bg-primary/10 hover:bg-primary hover:text-black" onClick={() => onQuickUpdate(match.id, isMatchBo3 ? 'player1Wins' : 'player1Score', 1)}><Plus className="h-4 w-4" /></Button>
                            <Button size="icon" variant="outline" className="h-7 w-7 sm:h-9 sm:w-9 rounded-lg border-white/10 bg-white/5 hover:bg-red-500 hover:text-white" onClick={() => onQuickUpdate(match.id, isMatchBo3 ? 'player1Wins' : 'player1Score', -1)}><Minus className="h-4 w-4" /></Button>
                        </div>
                    )}
                    <PlayerInfo name={match.player1?.name || 'TBD'} team={match.team1} teamId={match.teamId1 || match.player1Id} alignment="right" isWinner={isW1} wins={isMatchBo3 ? wins1 : undefined} />
                </div>
                
                <div className="flex flex-col items-center justify-center relative">
                    {hasValidScore ? (
                        <div className="relative group/score flex flex-col items-center gap-3">
                            {/* ULTRA AGGRESSIVE SCORE BOX (COCKPIT STYLE) */}
                            <div className={cn(
                                "bg-[#0A192F] border-b-4 px-4 sm:px-8 py-2 sm:py-4 rounded-none shadow-2xl relative z-10 flex items-center gap-4 sm:gap-8 -skew-x-[12deg] transition-all duration-500",
                                match.status === 'Live' ? "border-red-500 animate-pulse shadow-[0_0_30px_rgba(239,68,68,0.3)]" : "border-primary shadow-[0_0_40px_rgba(204,253,1,0.15)] group-hover/score:scale-105"
                            )}>
                                <div className="absolute inset-0 bg-white/[0.02] pointer-events-none" />
                                <span className={cn("text-3xl sm:text-6xl font-black italic tabular-nums leading-none skew-x-[12deg] transition-colors duration-500", isW1 ? "text-primary drop-shadow-[0_0_15px_rgba(204,253,1,0.6)]" : match.status === 'Live' ? "text-white" : "text-white/40")}>
                                    {score1}
                                </span>
                                <div className="w-px h-8 sm:h-12 bg-white/10 skew-x-[12deg]" />
                                <span className={cn("text-3xl sm:text-6xl font-black italic tabular-nums leading-none skew-x-[12deg] transition-colors duration-500", isW2 ? "text-primary drop-shadow-[0_0_15px_rgba(204,253,1,0.6)]" : match.status === 'Live' ? "text-white" : "text-white/40")}>
                                    {score2}
                                </span>
                            </div>
                            
                            {match.status === 'Live' && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center">
                                    <Badge className="bg-red-500 text-white font-black text-[8px] sm:text-[10px] h-5 px-3 uppercase shadow-xl tracking-widest border-r-4 border-black/20">LIVE</Badge>
                                    {isMatchBo3 && (
                                        <Badge variant="outline" className="mt-1.5 bg-primary/10 border-primary/30 text-primary text-[7px] h-4 px-2 font-black italic">
                                            GAME {gameIdx}
                                        </Badge>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="relative flex flex-col items-center group/vs-container">
                            <div className="bg-primary px-5 sm:px-8 py-1.5 sm:py-2.5 relative overflow-hidden -skew-x-[20deg] shadow-[0_10px_30px_rgba(204,253,1,0.3)] border-r-4 border-black/20">
                                <div className="absolute top-0 right-0 w-1/2 h-full bg-black/10 -skew-x-[25deg] translate-x-1/4 pointer-events-none" />
                                <span className="text-sm sm:text-xl font-black tracking-[0.3em] text-black uppercase italic relative z-10 skew-x-[20deg] pr-1">VS</span>
                            </div>
                            {isMatchBo3 && <Badge variant="outline" className="mt-3 text-[7px] sm:text-[9px] border-primary/30 text-primary/60 font-black uppercase tracking-[0.3em] bg-black/40 px-3 h-5">BO3 SERIES</Badge>}
                        </div>
                    )}
                </div>
                
                <div className="w-full flex items-center gap-3">
                    <PlayerInfo name={match.player2?.name || 'TBD'} team={match.team2} teamId={match.teamId2 || match.player2Id} alignment="left" isWinner={isW2} wins={isMatchBo3 ? wins2 : undefined} />
                    {isAdmin && match.status === 'Live' && (
                        <div className="flex flex-col gap-1.5 shrink-0 animate-in fade-in slide-in-from-right-2 duration-500">
                            <Button size="icon" variant="outline" className="h-7 w-7 sm:h-9 sm:w-9 rounded-lg border-primary/30 bg-primary/10 hover:bg-primary hover:text-black" onClick={() => onQuickUpdate(match.id, isMatchBo3 ? 'player2Wins' : 'player2Score', 1)}><Plus className="h-4 w-4" /></Button>
                            <Button size="icon" variant="outline" className="h-7 w-7 sm:h-9 sm:w-9 rounded-lg border-white/10 bg-white/5 hover:bg-red-500 hover:text-white" onClick={() => onQuickUpdate(match.id, isMatchBo3 ? 'player2Wins' : 'player2Score', -1)}><Minus className="h-4 w-4" /></Button>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex items-center justify-between px-6 sm:px-12 py-3 sm:py-4 bg-black/60 border-t border-white/5 relative z-10">
                <div className="flex items-center gap-5">
                    <div className="flex items-center gap-2.5">
                        <Calendar className="w-3.5 h-3.5 text-primary/40" />
                        <span className="text-[9px] sm:text-[11px] font-black text-white/40 uppercase italic tracking-[0.2em]" suppressHydrationWarning>{displayDate}</span>
                    </div>
                    {match.round && match.round !== 'Group' && (
                        <Badge className="bg-primary text-black border-none text-[8px] sm:text-[10px] h-6 font-black px-4 italic -skew-x-[12deg] border-r-4 border-black/20 shadow-lg">
                            <span className="skew-x-[12deg]">{match.round}</span>
                        </Badge>
                    )}
                </div>
                
                <div className="flex items-center gap-3">
                    <Button 
                        variant="ghost" 
                        className={cn(
                            "h-9 sm:h-12 px-5 sm:px-10 text-[9px] sm:text-[12px] font-black uppercase tracking-[0.2em] border-2 -skew-x-[15deg] transition-all rounded-none",
                            hasValidScore 
                                ? "text-white/40 border-white/5 hover:border-primary/40 hover:text-primary hover:bg-primary/5" 
                                : "text-black bg-primary border-primary shadow-[0_0_25px_rgba(204,253,1,0.2)] hover:scale-105"
                        )}
                        onClick={() => onEditMatch(match)}
                        disabled={isEditDisabled}
                    >
                        <span className="skew-x-[15deg] flex items-center gap-2">
                            {match.isCompleted ? <Binary className="w-4 h-4"/> : <Activity className="w-4 h-4"/>}
                            {match.isCompleted ? 'ANALYSIS' : 'UPDATE SCORE'}
                        </span>
                    </Button>
                    
                    {isAdmin && match.isCompleted && (
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-9 w-9 sm:h-12 sm:w-12 text-amber-500/60 hover:text-amber-400 border-2 border-amber-500/10 hover:border-amber-500/40 rounded-none -skew-x-[15deg] transition-all" 
                            onClick={() => onRevertMatch(match)}
                        >
                            <Undo2 className="h-4 w-4 skew-x-[15deg]" />
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
            let p1, p2, t1, t2, tid1, tid2, p1n1, p1n2, p2n1, p2n2;
            if (isCoop) {
                const e1 = coopTableById[match.player1Id];
                const e2 = coopTableById[match.player2Id];
                p1 = e1 ? { name: e1.teamName, id: e1.id } : (match.player1Id === 'TBD' ? { name: 'TBD', id: 'TBD' } : null);
                p2 = e2 ? { name: e2.teamName, id: e2.id } : (match.player2Id === 'TBD' ? { name: 'TBD', id: 'TBD' } : null);
                tid1 = e1?.player1TeamId;
                tid2 = e2?.player1TeamId;
                t1 = tid1 ? teamsById[tid1] : null;
                t2 = tid2 ? teamsById[tid2] : null;
                p1n1 = e1?.player1Name; p1n2 = e1?.player2Name;
                p2n1 = e2?.player1Name; p2n2 = e2?.player2Name;
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
            return { ...match, player1: p1, player2: p2, team1: t1, team2: t2, teamId1: tid1, teamId2: tid2, p1n1, p1n2, p2n1, p2n2 };
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
        <div className="flex flex-col items-center justify-center py-24 gap-6">
            <div className="relative">
                <div className="absolute -inset-8 bg-primary/20 rounded-full blur-3xl animate-pulse" />
                <Zap className="w-16 h-16 text-primary animate-spin" />
            </div>
            <p className="text-xs font-black tracking-[0.5em] text-primary/60 uppercase italic animate-pulse">Syncing Tactical Data Hub...</p>
        </div>
    );

    if (!matches || matches.length === 0) return (
        <div className="border-4 border-dashed border-white/5 rounded-none p-20 text-center bg-black/20 backdrop-blur-md animate-in fade-in zoom-in-95 duration-700 max-w-4xl mx-auto">
            <Swords className="w-24 h-24 text-white/5 mx-auto mb-8" />
            <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic pr-4">{t('no_fixtures_generated_title')}</h2>
            <p className="text-white/40 mt-4 max-w-sm mx-auto font-bold uppercase text-[11px] tracking-[0.3em] leading-relaxed">{t('no_fixtures_generated_desc')}</p>
        </div>
    );
    
    return (
        <div className="space-y-12">
            {/* ULTRA AGGRESSIVE SEARCH HUB */}
            <div className="relative max-w-3xl mx-auto group/search">
                <div className="absolute -inset-6 bg-primary/5 rounded-none -skew-x-[15deg] blur-3xl opacity-0 group-hover/search:opacity-100 transition-opacity duration-1000" />
                <div className="relative flex items-center bg-black/80 border-b-4 border-white/10 shadow-[0_30px_100px_rgba(0,0,0,0.8)] backdrop-blur-3xl overflow-hidden -skew-x-[20deg] transition-all duration-500 group-hover/search:border-primary/50 group-hover/search:scale-[1.02]">
                    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 opacity-20">
                        <div className="w-full h-[3px] bg-primary/40 blur-[2px] absolute top-0 left-0 animate-scanning" />
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:25px_25px]" />
                    </div>
                    <div className="h-16 w-16 sm:h-20 sm:w-20 bg-primary flex items-center justify-center shrink-0 shadow-2xl border-r-4 border-black/20 relative z-10">
                        <div className="absolute top-0 right-0 w-1/2 h-full bg-black/10 -skew-x-[25deg] translate-x-1/4 pointer-events-none" />
                        <Search className="h-7 w-7 sm:h-9 sm:w-9 text-black skew-x-[20deg]" />
                    </div>
                    <Input 
                        type="text" 
                        placeholder="SEARCH BATTLE NODE / UNIT..." 
                        className="flex-1 h-16 sm:h-20 bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 text-xl sm:text-3xl font-black italic tracking-tighter uppercase placeholder:text-white/10 transition-all relative z-10 skew-x-[20deg] pl-8 pr-10 text-white" 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                    />
                    <div className="hidden sm:flex flex-col items-end gap-1 pr-10 skew-x-[20deg] opacity-20 group-hover/search:opacity-40 transition-opacity">
                        <div className="flex items-center gap-2">
                            <Scan className="w-4 h-4 text-primary" />
                            <span className="text-[9px] font-black text-primary uppercase tracking-[0.3em]">UPLINK_READY</span>
                        </div>
                        <span className="text-[7px] font-black text-white uppercase">ID_NODE: 88-X-9</span>
                    </div>
                </div>
            </div>

            {(upcomingCount === 0 && completedCount === 0 && liveCount === 0 && searchTerm) ? (
                <div className="text-center py-24 opacity-20 flex flex-col items-center gap-6">
                    <div className="relative">
                        <Activity className="w-16 h-16" />
                        <div className="absolute -inset-4 border-2 border-dashed border-white/20 rounded-full animate-spin-slow" />
                    </div>
                    <h2 className="text-2xl font-black uppercase italic tracking-[0.4em]">{t('no_matches_found')}</h2>
                </div>
            ) : (
                <Tabs defaultValue={liveCount > 0 ? "live" : "upcoming"} className="w-full">
                    <div className="flex justify-center mb-16">
                        <TabsList className="grid grid-cols-3 w-full max-w-3xl h-20 sm:h-24 bg-black/80 p-2 border-b-4 border-white/10 relative overflow-hidden backdrop-blur-3xl rounded-none shadow-[0_20px_80px_rgba(0,0,0,0.7)]">
                            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:15px_15px] pointer-events-none opacity-40" />
                            
                            <TabsTrigger 
                                value="live" 
                                className={cn(
                                    "relative h-full font-black uppercase tracking-[0.15em] text-[11px] sm:text-[16px] italic transition-all duration-700 group/tab overflow-hidden",
                                    "data-[state=active]:text-black data-[state=inactive]:text-white/20 data-[state=inactive]:hover:text-white/60"
                                )}
                            >
                                <span className="relative z-10 flex flex-col items-center justify-center gap-1">
                                    <div className="flex items-center gap-3">
                                        <Radio className={cn("w-4 h-4 sm:w-5 sm:h-5", liveCount > 0 && "animate-pulse text-red-500")} />
                                        LIVE <span className="text-[14px] sm:text-[18px] opacity-40 group-data-[state=active]/tab:opacity-100 font-bold bg-black/20 px-2 rounded-lg" suppressHydrationWarning>[{liveCount}]</span>
                                    </div>
                                    <span className="text-[6px] sm:text-[8px] tracking-[0.4em] opacity-40">REAL_TIME_NODE</span>
                                </span>
                                <div className={cn(
                                    "absolute inset-0 -skew-x-[20deg] transition-all duration-700 -z-0 translate-x-[-100%] group-data-[state=active]/tab:translate-x-0",
                                    "group-data-[state=active]/tab:bg-primary group-data-[state=active]/tab:shadow-[0_0_60px_rgba(204,253,1,0.5)]",
                                    "border-r-8 border-white/20 group-data-[state=active]/tab:border-black/30"
                                )} />
                            </TabsTrigger>

                            <TabsTrigger 
                                value="upcoming" 
                                className={cn(
                                    "relative h-full font-black uppercase tracking-[0.15em] text-[11px] sm:text-[16px] italic transition-all duration-700 group/tab overflow-hidden",
                                    "data-[state=active]:text-black data-[state=inactive]:text-white/20 data-[state=inactive]:hover:text-white/60"
                                )}
                            >
                                <span className="relative z-10 flex flex-col items-center justify-center gap-1">
                                    <div className="flex items-center gap-3">
                                        <Scan className="w-4 h-4 sm:w-5 sm:h-5" />
                                        QUEUE <span className="text-[14px] sm:text-[18px] opacity-40 group-data-[state=active]/tab:opacity-100 font-bold bg-black/20 px-2 rounded-lg" suppressHydrationWarning>[{upcomingCount}]</span>
                                    </div>
                                    <span className="text-[6px] sm:text-[8px] tracking-[0.4em] opacity-40">TRANSMISSION_QUE</span>
                                </span>
                                <div className={cn(
                                    "absolute inset-0 -skew-x-[20deg] transition-all duration-700 -z-0 translate-x-[-100%] group-data-[state=active]/tab:translate-x-0",
                                    "group-data-[state=active]/tab:bg-primary group-data-[state=active]/tab:shadow-[0_0_60px_rgba(204,253,1,0.5)]",
                                    "border-r-8 border-white/20 group-data-[state=active]/tab:border-black/30"
                                )} />
                            </TabsTrigger>

                            <TabsTrigger 
                                value="completed" 
                                className={cn(
                                    "relative h-full font-black uppercase tracking-[0.15em] text-[11px] sm:text-[16px] italic transition-all duration-700 group/tab overflow-hidden",
                                    "data-[state=active]:text-black data-[state=inactive]:text-white/20 data-[state=inactive]:hover:text-white/60"
                                )}
                            >
                                <span className="relative z-10 flex flex-col items-center justify-center gap-1">
                                    <div className="flex items-center gap-3">
                                        <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
                                        HISTORY <span className="text-[14px] sm:text-[18px] opacity-40 group-data-[state=active]/tab:opacity-100 font-bold bg-black/20 px-2 rounded-lg" suppressHydrationWarning>[{completedCount}]</span>
                                    </div>
                                    <span className="text-[6px] sm:text-[8px] tracking-[0.4em] opacity-40">ARCHIVE_MANIFEST</span>
                                </span>
                                <div className={cn(
                                    "absolute inset-0 -skew-x-[20deg] transition-all duration-700 -z-0 translate-x-[-100%] group-data-[state=active]/tab:translate-x-0",
                                    "group-data-[state=active]/tab:bg-primary group-data-[state=active]/tab:shadow-[0_0_60px_rgba(204,253,1,0.5)]",
                                    "border-r-8 border-white/20 group-data-[state=active]/tab:border-black/30"
                                )} />
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="live" className="mt-0 focus-visible:ring-0 outline-none">
                        <div className="space-y-16">
                            {Object.entries(groupedMatches.live).map(([rd, rms]) => (
                                <section key={`live-${rd}`} className="animate-in fade-in slide-in-from-bottom-8 duration-1000">
                                    <div className="flex flex-col items-center mb-8 gap-3">
                                        <div className="flex items-center gap-6 w-full max-w-4xl px-4">
                                            <div className="h-1.5 flex-1 bg-gradient-to-r from-transparent via-red-500/40 to-red-500 rounded-none shadow-[0_0_15px_rgba(239,68,68,0.4)]" />
                                            <div className="flex flex-col items-center shrink-0">
                                                <h3 className="text-xl sm:text-3xl font-black tracking-widest text-white uppercase italic drop-shadow-[0_0_10px_rgba(255,255,255,0.2)] pr-4">{roundNames[rd] || rd}</h3>
                                                <Badge variant="outline" className="text-[9px] font-black uppercase tracking-[0.4em] border-red-500/30 text-red-500 py-1 h-6 mt-2 animate-pulse bg-red-500/5 px-6">BROADCAST_ACTIVE</Badge>
                                            </div>
                                            <div className="h-1.5 flex-1 bg-gradient-to-l from-transparent via-red-500/40 to-red-500 rounded-none shadow-[0_0_15px_rgba(239,68,68,0.4)]" />
                                        </div>
                                    </div>
                                    <div className="border-y-4 border-red-500/20 bg-black/40 backdrop-blur-3xl relative overflow-hidden shadow-2xl">
                                        <div className="absolute inset-0 bg-[linear-gradient(rgba(239,68,68,0.03)_1px,transparent_1px)] bg-[size:100%_4px] pointer-events-none opacity-40" />
                                        <div className="relative z-10">
                                            {rms.map(m => (
                                                <MatchRow key={m.id} match={m} onEditMatch={onEditMatch} onRevertMatch={onRevertMatch} onQuickUpdate={onQuickUpdate} isAdmin={isAdmin} activeSeason={activeSeason} hasPlayoffs={hasPlayoffs} />
                                            ))}
                                        </div>
                                    </div>
                                </section>
                            ))}
                            {liveCount === 0 && (
                                <div className="text-center py-32 opacity-10 flex flex-col items-center gap-6">
                                    <Radio className="w-20 h-20" />
                                    <p className="text-lg font-black uppercase tracking-[0.6em] italic">SIGNAL_LOST: NO_LIVE_BROADCAST</p>
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="upcoming" className="mt-0 focus-visible:ring-0 outline-none">
                        <div className="space-y-16">
                            {Object.entries(groupedMatches.upcoming).map(([rd, rms]) => (
                                <section key={`upcoming-${rd}`} className="animate-in fade-in slide-in-from-bottom-8 duration-1000">
                                    <div className="flex flex-col items-center mb-8 gap-3">
                                        <div className="flex items-center gap-6 w-full max-w-4xl px-4">
                                            <div className="h-1.5 flex-1 bg-gradient-to-r from-transparent via-primary/40 to-primary rounded-none shadow-[0_0_15px_rgba(204,253,1,0.4)]" />
                                            <div className="flex flex-col items-center shrink-0">
                                                <h3 className="text-xl sm:text-3xl font-black tracking-widest text-white uppercase italic pr-4">{roundNames[rd] || rd}</h3>
                                                <Badge variant="outline" className="text-[9px] font-black uppercase tracking-[0.4em] border-primary/30 text-primary py-1 h-6 mt-2 bg-primary/5 px-6">QUEUE_MANIFEST</Badge>
                                            </div>
                                            <div className="h-1.5 flex-1 bg-gradient-to-l from-transparent via-primary/40 to-primary rounded-none shadow-[0_0_15px_rgba(204,253,1,0.4)]" />
                                        </div>
                                    </div>
                                    <div className="border-y-4 border-white/5 bg-black/40 backdrop-blur-3xl relative overflow-hidden shadow-2xl">
                                        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:30px_30px] opacity-20 pointer-events-none" />
                                        <div className="relative z-10">
                                            {rms.map(m => (
                                                <MatchRow key={m.id} match={m} onEditMatch={onEditMatch} onRevertMatch={onRevertMatch} onQuickUpdate={onQuickUpdate} isAdmin={isAdmin} activeSeason={activeSeason} hasPlayoffs={hasPlayoffs} />
                                            ))}
                                        </div>
                                    </div>
                                </section>
                            ))}
                            {upcomingCount === 0 && (
                                <div className="text-center py-32 opacity-10 flex flex-col items-center gap-6">
                                    <Trophy className="w-20 h-20" />
                                    <p className="text-lg font-black uppercase tracking-[0.6em] italic">PROTOCOL_COMPLETE: NO_PENDING_UNITS</p>
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="completed" className="mt-0 focus-visible:ring-0 outline-none">
                        <div className="space-y-16">
                            {Object.entries(groupedMatches.completed).map(([rd, rms]) => (
                                <section key={`completed-${rd}`} className="animate-in fade-in slide-in-from-bottom-8 duration-1000">
                                    <div className="flex flex-col items-center mb-8 gap-3">
                                        <div className="flex items-center gap-6 w-full max-w-4xl px-4">
                                            <div className="h-1.5 flex-1 bg-gradient-to-r from-transparent via-white/20 to-white/60 rounded-none" />
                                            <div className="flex flex-col items-center shrink-0">
                                                <h3 className="text-xl sm:text-3xl font-black tracking-widest text-white/60 uppercase italic pr-4">{roundNames[rd] || rd}</h3>
                                                <Badge variant="outline" className="text-[9px] font-black uppercase tracking-[0.4em] border-white/10 text-white/30 py-1 h-6 mt-2 px-6">LOGS_ARCHIVE</Badge>
                                            </div>
                                            <div className="h-1.5 flex-1 bg-gradient-to-l from-transparent via-white/20 to-white/60 rounded-none" />
                                        </div>
                                    </div>
                                    <div className="border-y-4 border-white/5 bg-black/40 backdrop-blur-3xl relative overflow-hidden shadow-2xl">
                                        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:30px_30px] opacity-20 pointer-events-none" />
                                        <div className="relative z-10">
                                            {rms.map(m => (
                                                <MatchRow key={m.id} match={m} onEditMatch={onEditMatch} onRevertMatch={onRevertMatch} onQuickUpdate={onQuickUpdate} isAdmin={isAdmin} activeSeason={activeSeason} hasPlayoffs={hasPlayoffs} />
                                            ))}
                                        </div>
                                    </div>
                                </section>
                            ))}
                            {completedCount === 0 && (
                                <div className="text-center py-32 opacity-10 flex flex-col items-center gap-6">
                                    <Zap className="w-20 h-20" />
                                    <p className="text-lg font-black uppercase tracking-[0.6em] italic">EMPTY_ARCHIVE: NO_MATCH_RECORDS</p>
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

        const matchUpdateData: any = {
            player1Score: values.player1Score,
            player2Score: values.player2Score,
            matchDate: matchTimestamp,
            status: values.status,
            isCompleted: isCompleted,
            player1Wins: values.player1Wins !== undefined ? values.player1Wins : null,
            player2Wins: values.player2Wins !== undefined ? values.player2Wins : null,
            player1p1Goals: values.player1p1Goals !== undefined ? values.player1p1Goals : null,
            player1p2Goals: values.player1p2Goals !== undefined ? values.player1p2Goals : null,
            player2p1Goals: values.player2p1Goals !== undefined ? values.player2p1Goals : null,
            player2p2Goals: values.player2p2Goals !== undefined ? values.player2p2Goals : null,
        };

        if (isCompleted) {
            await runTransaction(firestore, async (transaction) => {
                const seasonRef = doc(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}`);
                const sSnap = await transaction.get(seasonRef);
                const sData = sSnap.data() as Season;
                const isSeasonCoop = sData.type === 'Co-Op' || sData.type === 'Co-Op Hybrid';
                const isGroupMatch = orig.round === 'Group' || !orig.round;

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
                let e1Data: any = null;
                let e2Data: any = null;

                if (isGroupMatch) {
                    const tblName = isSeasonCoop ? 'coopLeagueTable' : 'leagueTable';
                    const tblCol = collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/${tblName}`);
                    if (isSeasonCoop) {
                        p1EntryRef = doc(tblCol, orig.player1Id);
                        p2EntryRef = doc(tblCol, orig.player2Id);
                    } else {
                        const snap1 = await getDocs(query(tblCol, where('playerId', '==', orig.player1Id)));
                        const snap2 = await getDocs(query(tblCol, where('playerId', '==', orig.player2Id)));
                        if (!snap1.empty) p1EntryRef = snap1.docs[0].ref;
                        if (!snap2.empty) p2EntryRef = snap2.docs[0].ref;
                    }
                    
                    if (p1EntryRef) e1Data = (await transaction.get(p1EntryRef)).data();
                    if (p2EntryRef) e2Data = (await transaction.get(p2EntryRef)).data();
                }

                const updateOverallStats = (pId: string, change: any) => {
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
                    const oldBo3 = isSeasonCoop && !isGroupMatch;
                    const oldS1 = oldBo3 ? (orig.player1Wins ?? 0) : (orig.player1Score ?? 0);
                    const oldS2 = oldBo3 ? (orig.player2Wins ?? 0) : (orig.player2Score ?? 0);
                    
                    if (isSeasonCoop && e1Data && e2Data) {
                        const d1 = e1Data as CoOpLeagueEntry; const d2 = e2Data as CoOpLeagueEntry;
                        const res = oldS1 > oldS2 ? 'W' : (oldS1 < oldS2 ? 'L' : 'D');
                        [d1.player1Id, d1.player2Id].forEach(id => {
                            const playerGoals = id === d1.player1Id ? (orig.player1p1Goals || 0) : (orig.player1p2Goals || 0);
                            updateOverallStats(id, { played: -1, win: res === 'W' ? -1 : 0, draw: res === 'D' ? -1 : 0, loss: res === 'L' ? -1 : 0, gf: -playerGoals, ga: -(orig.player2Score || 0) });
                        });
                        [d2.player1Id, d2.player2Id].forEach(id => {
                            const playerGoals = id === d2.player1Id ? (orig.player2p1Goals || 0) : (orig.player2p2Goals || 0);
                            updateOverallStats(id, { played: -1, win: res === 'L' ? -1 : 0, draw: res === 'D' ? -1 : 0, loss: res === 'W' ? -1 : 0, gf: -playerGoals, ga: -(orig.player1Score || 0) });
                        });
                    } else {
                        const res = oldS1 > oldS2 ? 'W' : (oldS1 < oldS2 ? 'L' : 'D');
                        updateOverallStats(orig.player1Id, { played: -1, win: res === 'W' ? -1 : 0, draw: res === 'D' ? -1 : 0, loss: res === 'L' ? -1 : 0, gf: -(orig.player1Score || 0), ga: -(orig.player2Score || 0) });
                        updateOverallStats(orig.player2Id, { played: -1, win: res === 'L' ? -1 : 0, draw: res === 'D' ? -1 : 0, loss: res === 'W' ? -1 : 0, gf: -(orig.player2Score || 0), ga: -(orig.player1Score || 0) });
                    }
                }

                const newBo3 = isSeasonCoop && !isGroupMatch;
                const newS1 = newBo3 ? (values.player1Wins ?? 0) : (values.player1Score ?? 0);
                const newS2 = newBo3 ? (values.player2Wins ?? 0) : (values.player2Score ?? 0);

                if (isSeasonCoop && e1Data && e2Data) {
                    const d1 = e1Data as CoOpLeagueEntry; const d2 = e2Data as CoOpLeagueEntry;
                    const res = newS1 > newS2 ? 'W' : (newS1 < newS2 ? 'L' : 'D');
                    [d1.player1Id, d1.player2Id].forEach(id => {
                        const playerGoals = id === d1.player1Id ? (values.player1p1Goals || 0) : (values.player1p2Goals || 0);
                        updateOverallStats(id, { played: 1, win: res === 'W' ? 1 : 0, draw: res === 'D' ? 1 : 0, loss: res === 'L' ? 1 : 0, gf: playerGoals, ga: values.player2Score });
                    });
                    [d2.player1Id, d2.player2Id].forEach(id => {
                        const playerGoals = id === d2.player1Id ? (values.player2p1Goals || 0) : (values.player2p2Goals || 0);
                        updateOverallStats(id, { played: 1, win: res === 'L' ? 1 : 0, draw: res === 'D' ? 1 : 0, loss: res === 'W' ? 1 : 0, gf: playerGoals, ga: values.player1Score });
                    });
                } else {
                    const res = newS1 > newS2 ? 'W' : (newS1 < newS2 ? 'L' : 'D');
                    updateOverallStats(orig.player1Id, { played: 1, win: res === 'W' ? 1 : 0, draw: res === 'D' ? 1 : 0, loss: res === 'L' ? 1 : 0, gf: values.player1Score, ga: values.player2Score });
                    updateOverallStats(orig.player2Id, { played: 1, win: res === 'L' ? 1 : 0, draw: res === 'D' ? 1 : 0, loss: res === 'W' ? 1 : 0, gf: values.player2Score, ga: values.player1Score });
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
                        const oldBo3 = isSeasonCoop && !isGroupMatch;
                        const os1 = oldBo3 ? (orig.player1Wins ?? 0) : (orig.player1Score ?? 0);
                        const os2 = oldBo3 ? (orig.player2Wins ?? 0) : (orig.player2Score ?? 0);
                        e1.played--; e2.played--;
                        if (os1 > os2) { e1.win--; e1.points -= 3; e2.loss--; }
                        else if (os1 < os2) { e2.win--; e2.points -= 3; e1.loss--; }
                        else { e1.draw--; e1.points -= 1; e2.draw--; e2.points -= 1; }
                        e1.goalsFor -= (orig.player1Score || 0); e1.goalsAgainst -= (orig.player2Score || 0);
                        e2.goalsFor -= (orig.player2Score || 0); e2.goalsAgainst -= (orig.player1Score || 0);
                        if (isSeasonCoop) {
                            e1.player1Goals -= (orig.player1p1Goals || 0); e1.player2Goals -= (orig.player1p2Goals || 0);
                            e2.player1Goals -= (orig.player2p1Goals || 0); e2.player2Goals -= (orig.player2p2Goals || 0);
                        }
                    }
                    e1.played++; e2.played++;
                    if (newS1 > newS2) { e1.win++; e1.points += 3; e2.loss++; }
                    else if (newS1 < newS2) { e2.win++; e2.points += 3; e1.loss++; }
                    else { e1.draw++; e1.points += 1; e2.draw++; e2.points += 1; }
                    e1.goalsFor += values.player1Score; e1.goalsAgainst += values.player2Score;
                    e2.goalsFor += values.player2Score; e2.goalsAgainst += values.player1Score;
                    if (isSeasonCoop) {
                        e1.player1Goals += values.player1p1Goals; e1.player2Goals += values.player1p2Goals;
                        e2.player1Goals += values.player2p1Goals; e2.player2Goals += values.player2p2Goals;
                    }
                    e1.goalDifference = e1.goalsFor - e1.goalsAgainst; e2.goalDifference = e2.goalsFor - e2.goalsAgainst;
                    transaction.set(p1EntryRef, e1); transaction.set(p2EntryRef, e2);
                }

                transaction.update(matchRef, matchUpdateData);
            });
        } else {
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
        const isSeasonCoop = sData.type === 'Co-Op' || sData.type === 'Co-Op Hybrid';
        const isGroupMatch = mToRev.round === 'Group' || !mToRev.round;

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
            let e1Data: any = null;
            let e2Data: any = null;

            if (isGroupMatch) {
                const tblName = isSeasonCoop ? 'coopLeagueTable' : 'leagueTable';
                const tblCol = collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/${tblName}`);
                if (isSeasonCoop) {
                    p1EntryRef = doc(tblCol, mToRev.player1Id);
                    p2EntryRef = doc(tblCol, mToRev.player2Id);
                } else {
                    const snap1 = await getDocs(query(tblCol, where('playerId', '==', mToRev.player1Id)));
                    const snap2 = await getDocs(query(tblCol, where('playerId', '==', mToRev.player2Id)));
                    if (!snap1.empty) p1EntryRef = snap1.docs[0].ref;
                    if (!snap2.empty) p2EntryRef = snap2.docs[0].ref;
                }
                
                if (p1EntryRef) e1Data = (await transaction.get(p1EntryRef)).data();
                if (p2EntryRef) e2Data = (await transaction.get(p2EntryRef)).data();
            }

            const updateOverallStats = (pId: string, change: any) => {
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

            const oldBo3 = isSeasonCoop && !isGroupMatch;
            const os1 = oldBo3 ? (mToRev.player1Wins ?? 0) : (mToRev.player1Score ?? 0);
            const os2 = oldBo3 ? (mToRev.player2Wins ?? 0) : (mToRev.player2Score ?? 0);

            if (isSeasonCoop && e1Data && e2Data) {
                const d1 = e1Data as CoOpLeagueEntry; const d2 = e2Data as CoOpLeagueEntry;
                const res = os1 > os2 ? 'W' : (os1 < os2 ? 'L' : 'D');
                [d1.player1Id, d1.player2Id].forEach(id => {
                    const playerGoals = id === d1.player1Id ? (mToRev.player1p1Goals || 0) : (mToRev.player1p2Goals || 0);
                    updateOverallStats(id, { played: -1, win: res === 'W' ? -1 : 0, draw: res === 'D' ? -1 : 0, loss: res === 'L' ? -1 : 0, gf: -playerGoals, ga: -(mToRev.player2Score || 0) });
                });
                [d2.player1Id, d2.player2Id].forEach(id => {
                    const playerGoals = id === d2.player1Id ? (mToRev.player2p1Goals || 0) : (mToRev.player2p2Goals || 0);
                    updateOverallStats(id, { played: -1, win: res === 'L' ? -1 : 0, draw: res === 'D' ? -1 : 0, loss: res === 'W' ? -1 : 0, gf: -playerGoals, ga: -(mToRev.player1Score || 0) });
                });
            } else {
                const res = os1 > os2 ? 'W' : (os1 < os2 ? 'L' : 'D');
                updateOverallStats(mToRev.player1Id, { played: -1, win: res === 'W' ? -1 : 0, draw: res === 'D' ? -1 : 0, loss: res === 'L' ? -1 : 0, gf: -(mToRev.player1Score || 0), ga: -(mToRev.player2Score || 0) });
                updateOverallStats(mToRev.player2Id, { played: -1, win: res === 'L' ? -1 : 0, draw: res === 'D' ? -1 : 0, loss: res === 'W' ? -1 : 0, gf: -(mToRev.player2Score || 0), ga: -(mToRev.player1Score || 0) });
            }

            if (p1EntryRef && p2EntryRef && e1Data && e2Data) {
                const e1 = { ...e1Data }; const e2 = { ...e2Data };
                e1.played--; e2.played--;
                const res = os1 > os2 ? 'W' : (os1 < os2 ? 'L' : 'D');
                if (res === 'W') { e1.win--; e1.points -= 3; e2.loss--; }
                else if (res === 'L') { e2.win--; e2.points -= 3; e1.loss--; }
                else { e1.draw--; e1.points -= 1; e2.draw--; e2.points -= 1; }
                e1.goalsFor -= (mToRev.player1Score || 0); e1.goalsAgainst -= (mToRev.player2Score || 0);
                e2.goalsFor -= (mToRev.player2Score || 0); e2.goalsAgainst -= (mToRev.player1Score || 0);
                if (isSeasonCoop) {
                    e1.player1Goals -= (mToRev.player1p1Goals || 0); e1.player2Goals -= (mToRev.player1p2Goals || 0);
                    e2.player1Goals -= (mToRev.player2p1Goals || 0); e2.player2Goals -= (mToRev.player2p2Goals || 0);
                }
                e1.goalDifference = e1.goalsFor - e1.goalsAgainst; e2.goalDifference = e2.goalsFor - e2.goalDifference;
                transaction.set(p1EntryRef, e1); transaction.set(p2EntryRef, e2);
            }

            if (winMatchRef) transaction.update(winMatchRef, { [`player${PLAYOFF_SUCCESSOR_MAP[mToRev.bracketId!].winner.slot}Id`]: 'TBD' });
            if (losMatchRef && PLAYOFF_SUCCESSOR_MAP[mToRev.bracketId!].loser) transaction.update(losMatchRef, { [`player${PLAYOFF_SUCCESSOR_MAP[mToRev.bracketId!].loser!.slot}Id`]: 'TBD' });

            transaction.update(matchRef, { player1Wins: null, player2Wins: null, player1Score: null, player2Score: null, player1p1Goals: null, player1p2Goals: null, player2p1Goals: null, player2p2Goals: null, isCompleted: false, status: 'Scheduled' });
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
          <div className="flex flex-col justify-center space-y-4 flex-1 w-full py-8 sm:py-10 px-8 sm:px-12 relative group/header overflow-hidden bg-black/60 backdrop-blur-3xl border-b-4 border-primary/20 rounded-none shadow-[0_20px_80px_rgba(0,0,0,0.8)] transition-all duration-500">
            {/* HUD Elements */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:25px_25px] opacity-20 pointer-events-none" />
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 opacity-10">
                <div className="w-full h-[2px] bg-primary blur-[1px] absolute top-0 left-0 animate-scanning" />
            </div>
            
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary shadow-[0_0_30px_rgba(204,253,1,0.8)]" />
            
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_10px_rgba(204,253,1,0.8)]" />
                        <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.5em] text-primary italic">Live System Uplink</span>
                    </div>
                    
                    <h1 className="font-headline text-3xl sm:text-7xl font-black tracking-tighter text-white uppercase italic drop-shadow-[0_0_50px_rgba(255,255,255,0.1)] leading-none">
                        {t('fixtures_page_title').split(' ')[0]} <span className="text-primary drop-shadow-[0_0_20px_rgba(204,253,1,0.4)]">{t('fixtures_page_title').split(' ').slice(1).join(' ')}</span>
                    </h1>
                </div>

                {activeSeason && (
                    <div className="flex flex-col items-start sm:items-end gap-2 shrink-0">
                        <Badge className="bg-primary text-black border-none font-black tracking-[0.2em] text-[10px] sm:text-xs h-8 px-6 uppercase italic shadow-[0_0_30px_rgba(204,253,1,0.3)] rounded-none -skew-x-[20deg] border-r-4 border-black/20">
                            <span className="skew-x-[20deg]">{activeSeason.status}</span>
                        </Badge>
                    </div>
                )}
            </div>

            {activeSeason && (
                <div className="relative z-10 pt-4 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <p className="text-xl sm:text-4xl font-black text-white/90 tracking-tight uppercase italic pr-4">{activeSeason.name}</p>
                    
                    {matches && matches.length > 0 && (
                        <div className="w-full sm:w-[350px] space-y-2.5">
                            <div className="flex justify-between items-end">
                                <div className="flex items-center gap-2">
                                    <Activity className="w-3.5 h-3.5 text-primary animate-pulse" />
                                    <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40">Engagement Progress</span>
                                </div>
                                <span className="text-xs font-black text-primary italic" suppressHydrationWarning>[{progressPercentage.toFixed(0)}%]</span>
                            </div>
                            <div className="relative h-1.5 w-full bg-white/5 overflow-hidden border border-white/5">
                                <div className="absolute left-0 top-0 h-full bg-primary shadow-[0_0_15px_rgba(204,253,1,0.6)] transition-all duration-1000 ease-out" style={{ width: `${progressPercentage}%` }} />
                            </div>
                            <p className="text-[8px] font-black tracking-[0.4em] uppercase text-white/20 italic text-right">
                                {completedMatchesForDisplay} / {totalMatchesForDisplay} UNITS ANALYZED
                            </p>
                        </div>
                    )}
                </div>
            )}
          </div>
          <div className="w-full md:w-auto flex justify-center md:justify-end shrink-0"><LiveClock /></div>
        </div>

        {/* ULTRA AGGRESSIVE CONTROLS HUB */}
        <div className={cn(
            "relative bg-black/80 border-b-4 border-white/10 p-2 sm:p-3 flex flex-wrap items-center gap-4 shadow-[0_30px_100px_rgba(0,0,0,0.8)] backdrop-blur-3xl transition-all duration-500 overflow-hidden",
            isAdmin ? "w-full" : "w-fit mx-auto rounded-none"
        )}>
            <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-primary/40 pointer-events-none" />
            <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-primary/40 pointer-events-none" />

            <div className="flex items-center gap-2 w-full sm:w-auto relative group/select">
                <div className="p-3 bg-primary/10 text-primary hidden xs:block shadow-lg -skew-x-[20deg] border-r-2 border-primary/30">
                    <Scan className="w-4 h-4 skew-x-[20deg]" />
                </div>
                <Select value={activeSeasonId || ''} onValueChange={activeSeasonId => setActiveSeasonId(activeSeasonId)} disabled={isLoadingSeasons}>
                    <SelectTrigger className="w-full sm:w-fit sm:min-w-[320px] h-14 bg-white/5 border-white/10 font-black uppercase italic tracking-tighter text-sm rounded-none -skew-x-[20deg] focus:border-primary/50 transition-all px-10">
                        <div className="skew-x-[20deg] flex items-center justify-center w-full">
                            <SelectValue placeholder={t('select_a_season')} />
                        </div>
                    </SelectTrigger>
                    <SelectContent className="bg-[#0A192F] border-2 border-primary/30 rounded-none overflow-hidden backdrop-blur-3xl">
                        {seasons?.map(s => (<SelectItem key={s.id} value={s.id} className="font-black uppercase italic text-xs focus:bg-primary focus:text-black py-4 px-8 border-b border-white/5 last:border-0">{s.name}</SelectItem>))}
                    </SelectContent>
                </Select>
            </div>

            <div className={cn("flex items-center gap-1", isAdmin ? "ml-auto" : "w-full justify-center sm:w-auto")}>
                <Button 
                    onClick={() => isAdmin ? setIsAdmin(false) : setPasswordPromptOpen(true)} 
                    className={cn(
                        "h-14 px-10 font-black text-[11px] uppercase tracking-[0.2em] italic rounded-none -skew-x-[20deg] border-r-8 transition-all duration-500 relative overflow-hidden group/admin", 
                        isAdmin 
                            ? "bg-primary text-black border-black shadow-[0_0_40px_rgba(204,253,1,0.5)]" 
                            : "bg-white/5 text-white/40 border-white/10 hover:border-primary/50 hover:bg-primary/10 hover:text-primary"
                    )}
                    disabled={!isPasswordLoaded}
                >
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div className={cn(
                            "w-full h-[3px] bg-current absolute top-0 left-0 transition-opacity duration-500",
                            isAdmin ? "animate-scanning opacity-30" : "opacity-0"
                        )} />
                    </div>

                    <div className="skew-x-[20deg] flex items-center relative z-10">
                        {isAdmin ? <Unlock className="mr-3 h-5 w-5" /> : <Lock className="mr-3 h-5 w-5" />}
                        {isAdmin ? t('lock_admin_mode') : t('unlock_admin')}
                    </div>
                </Button>
            </div>
        </div>

        {isLoading ? (
            <div className="flex flex-col items-center justify-center py-40 gap-8">
                <div className="relative">
                    <div className="absolute -inset-12 bg-primary/10 rounded-full border-4 border-primary/20 animate-ping" />
                    <div className="w-20 h-20 border-8 border-primary border-t-transparent rounded-full animate-spin relative z-10 shadow-[0_0_40px_rgba(204,253,1,0.3)]" />
                </div>
                <p className="font-black tracking-[0.6em] text-sm uppercase italic text-primary animate-pulse">UPLINKING_TACTICAL_HUB</p>
            </div>
        ) : (
            <FixtureContent activeSeasonId={activeSeasonId} onEditMatch={setEditingMatch} onRevertMatch={setRevertingMatch} onQuickUpdate={handleQuickUpdate} isAdmin={isAdmin} allPlayers={allPlayers || []} allTeams={allTeams || []} matches={matches} isLoadingMatches={isLoadingMatches} activeSeason={activeSeason} hasPlayoffs={hasPlayoffs} />
        )}

        <Dialog open={!!editingMatch} onOpenChange={(open) => !open && !isProcessing && setEditingMatch(null)}>
            <DialogContent className={cn("max-w-xl border-primary border-4 p-0 overflow-hidden bg-background/95 backdrop-blur-3xl rounded-none shadow-[0_0_200px_rgba(204,253,1,0.2)] max-h-[90vh] flex flex-col transition-all", isProcessing && "opacity-80 scale-95 pointer-events-none")}>
                <DialogHeader className="p-8 border-b-4 border-black/20 bg-primary text-black shrink-0 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-1/3 h-full bg-black/10 -skew-x-[25deg] translate-x-1/4 pointer-events-none" />
                    <div className="flex items-center gap-4 relative z-10">
                        {isProcessing ? <Loader2 className="w-8 h-8 animate-spin" /> : <Zap className="w-8 h-8 fill-black" />}
                        <DialogTitle className="text-3xl font-black tracking-tighter uppercase italic pr-6 leading-none">
                            {isProcessing ? "Menyinkronkan..." : "Update Match Engagement"}
                        </DialogTitle>
                    </div>
                    {editingMatch && (<DialogDescription className="text-[10px] font-black text-black/60 uppercase tracking-[0.3em] mt-3 relative z-10 italic border-t border-black/10 pt-2">{t('update_match_score_desc', { player1: editingMatch.player1?.name, player2: editingMatch.player2?.name })}</DialogDescription>)}
                </DialogHeader>
                <ScrollArea className="flex-1 p-8 overflow-y-auto">
                    {editingMatch && activeSeason && (
                        <ScoreForm 
                            match={editingMatch} 
                            onSave={(v) => handleUpdateScore(editingMatch.id, v)} 
                            seasonType={activeSeason.type} 
                            player1Info={{ 
                                name: editingMatch.player1.name, 
                                team: editingMatch.team1,
                                p1Name: editingMatch.p1n1,
                                p2Name: editingMatch.p1n2
                            }} 
                            player2Info={{ 
                                name: editingMatch.player2.name, 
                                team: editingMatch.team2,
                                p1Name: editingMatch.p2n1,
                                p2Name: editingMatch.p2n2
                            }} 
                        />
                    )}
                </ScrollArea>
                <DialogFooter className="p-6 bg-black/40 border-t-2 border-white/10 shrink-0">
                    <Button variant="ghost" onClick={() => setEditingMatch(null)} disabled={isProcessing} className="font-black uppercase tracking-[0.3em] italic text-[11px] text-white/40 hover:text-primary transition-all h-12 px-8 -skew-x-[15deg] rounded-none border-2 border-white/5">
                        <span className="skew-x-[15deg]">{t('cancel')}</span>
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <AlertDialog open={!!revertingMatch} onOpenChange={(open) => !open && !isProcessing && setRevertingMatch(null)}>
            <AlertDialogContent className="border-amber-500 border-8 bg-[#0A192F]/95 backdrop-blur-3xl rounded-none shadow-[0_0_100px_rgba(245,158,11,0.2)]">
                <AlertDialogHeader>
                    <div className="flex items-center gap-5 text-amber-500 mb-4">
                        <div className="p-4 bg-amber-500/10 rounded-none border-2 border-amber-500/40 -skew-x-[12deg]">
                            {isProcessing ? <Loader2 className="w-10 h-10 animate-spin skew-x-[12deg]" /> : <Undo2 className="w-10 h-10 skew-x-[12deg]" />}
                        </div>
                        <div className="text-left">
                            <AlertDialogTitle className="text-3xl font-black tracking-tighter uppercase italic pr-4 leading-none">{t('revert_match_confirm_title')}</AlertDialogTitle>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-500/60 mt-2">Protocol: Reset_Node_State</p>
                        </div>
                    </div>
                    {revertingMatch && (<AlertDialogDescription className="text-sm font-bold text-white/60 uppercase tracking-[0.1em] border-l-4 border-amber-500/30 pl-6 py-2 leading-relaxed text-left">{t('revert_match_confirm_desc', { player1: revertingMatch.player1Id, player2: revertingMatch.player2Id })}</AlertDialogDescription>)}
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-4 mt-10">
                    <AlertDialogCancel onClick={() => setRevertingMatch(null)} disabled={isProcessing} className="font-black uppercase tracking-[0.2em] italic rounded-none h-14 border-2 border-white/10 bg-white/5 text-white/40 hover:text-white transition-all">
                        {t('cancel')}
                    </AlertDialogCancel>
                    <AlertDialogAction onClick={() => revertingMatch && handleRevertMatch(revertingMatch)} disabled={isProcessing} className="bg-amber-500 text-black hover:bg-amber-600 font-black uppercase tracking-[0.2em] italic rounded-none h-14 border-r-8 border-black/20 shadow-xl shadow-amber-500/20">
                        {t('revert_match_action')}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <Dialog open={passwordPromptOpen} onOpenChange={passwordPromptOpen => setPasswordPromptOpen(passwordPromptOpen)}>
            <DialogContent className="max-w-[calc(100vw-32px)] sm:max-w-md border-primary border-8 bg-[#0A192F]/95 backdrop-blur-3xl rounded-none shadow-[0_0_150px_rgba(204,253,1,0.2)]">
                <DialogHeader className="space-y-4">
                    <div className="flex items-center gap-5 text-primary">
                        <div className="p-4 bg-primary/10 rounded-none border-2 border-primary/40 -skew-x-[12deg]">
                            <KeyRound className="w-10 h-10 skew-x-[12deg]" />
                        </div>
                        <div className="text-left">
                            <DialogTitle className="text-2xl sm:text-3xl font-black tracking-tighter uppercase italic pr-4 leading-none">{t('admin_auth')}</DialogTitle>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60 mt-1">Status: Restricted_Access</p>
                        </div>
                    </div>
                    <DialogDescription className="font-bold text-white/40 uppercase tracking-widest text-[10px] leading-relaxed text-left border-l-2 border-white/10 pl-4">{t('admin_auth_desc')}</DialogDescription>
                </DialogHeader>
                <div className="grid gap-8 py-10">
                    <div className="space-y-3">
                        <Label htmlFor="password-input" className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/60 ml-1 italic">ENCRYPTED_KEY_TRANSMISSION</Label>
                        <div className="relative group/input">
                            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary shadow-[0_0_15px_rgba(204,253,1,0.8)] z-20" />
                            <Input id="password-input" type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} className="h-16 bg-black/60 border-white/10 rounded-none focus:border-primary/50 text-2xl font-black tracking-[0.3em] text-primary pl-8" onKeyDown={(e) => e.key === 'Enter' && handlePasswordCheck()} />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handlePasswordCheck} className="w-full h-16 font-black tracking-[0.3em] text-lg sm:text-xl uppercase italic rounded-none shadow-2xl shadow-primary/30 text-black border-r-8 border-black/20 group/unlock relative overflow-hidden">
                        <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover/unlock:translate-x-[100%] transition-transform duration-700" />
                        <span className="relative z-10 flex items-center justify-center gap-4">
                            <Scan className="w-6 h-6" />
                            {t('unlock')}
                        </span>
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
