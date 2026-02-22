'use client';

import { useState, useMemo, useEffect, useCallback, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Pencil, Search, Unlock, Undo2, Lock, Calendar, Swords, Clock, Zap, Activity, Trophy, LayoutGrid, KeyRound } from 'lucide-react';
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
import { collection, doc, query, getDocs, where, runTransaction, Timestamp, orderBy, increment } from 'firebase/firestore';
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


// For simplicity, we'll work with a single, hardcoded league.
const LEAGUE_ID = 'main-league';

/**
 * Playoff Successor Map for Bracket Logic
 */
const PLAYOFF_SUCCESSOR_MAP: Record<string, { winner: { bid: string, slot: 1 | 2 }, loser?: { bid: string, slot: 1 | 2 } }> = {
    // Upper Bracket
    'playoff-m1': { winner: { bid: 'playoff-m9', slot: 1 }, loser: { bid: 'playoff-m5', slot: 2 } },
    'playoff-m2': { winner: { bid: 'playoff-m9', slot: 2 }, loser: { bid: 'playoff-m6', slot: 2 } },
    'playoff-m3': { winner: { bid: 'playoff-m10', slot: 1 }, loser: { bid: 'playoff-m7', slot: 2 } },
    'playoff-m4': { winner: { bid: 'playoff-m10', slot: 2 }, loser: { bid: 'playoff-m8', slot: 2 } },
    'playoff-m9': { winner: { bid: 'playoff-m15', slot: 1 }, loser: { bid: 'playoff-m13', slot: 2 } },
    'playoff-m10': { winner: { bid: 'playoff-m15', slot: 2 }, loser: { bid: 'playoff-m14', slot: 2 } },
    'playoff-m15': { winner: { bid: 'playoff-m18', slot: 1 }, loser: { bid: 'playoff-m17', slot: 1 } },

    // Lower Bracket
    'playoff-m5': { winner: { bid: 'playoff-m11', slot: 1 } },
    'playoff-m6': { winner: { bid: 'playoff-m11', slot: 2 } },
    'playoff-m7': { winner: { bid: 'playoff-m12', slot: 1 } },
    'playoff-m8': { winner: { bid: 'playoff-m12', slot: 2 } },
    'playoff-m11': { winner: { bid: 'playoff-m13', slot: 1 } },
    'playoff-m12': { winner: { bid: 'playoff-m14', slot: 1 } },
    'playoff-m13': { winner: { bid: 'playoff-m16', slot: 1 } },
    'playoff-m14': { winner: { bid: 'playoff-m16', slot: 2 } },
    'playoff-m16': { winner: { bid: 'playoff-m17', slot: 2 } },
    'playoff-m17': { winner: { bid: 'playoff-m18', slot: 2 } },
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
    
    // Group matches should be locked if playoffs have already started
    const isEditDisabled = 
        activeSeason?.status !== 'In Progress' || 
        (match.isCompleted && !isAdmin) || 
        (match.player1Id === 'TBD' && match.player2Id === 'TBD') ||
        (hasPlayoffs && (match.round === 'Group' || !match.round) && !isAdmin);

    const PlayerInfo = ({ name, team, alignment = 'left', isWinner }: { name: string, team: WithId<Team> | null, alignment?: 'left' | 'right', isWinner: boolean }) => (
        <div className={cn(
            "flex items-center gap-2 sm:gap-4 text-[10px] sm:text-base font-black tracking-tighter uppercase italic overflow-hidden transition-all duration-500", 
            { 'justify-end': alignment === 'right', 'justify-start': alignment === 'left', 'text-primary': isWinner, 'text-white/60': !isWinner && match.isCompleted, 'text-white': !match.isCompleted }
        )}>
             {alignment === 'right' && <span className="truncate flex-1 text-right pr-2">{name}</span>}
            <div className="relative shrink-0">
                <div className={cn(
                    "absolute -inset-1 rounded-full blur-md opacity-0 transition-opacity duration-500",
                    isWinner ? "bg-primary/30 opacity-100" : "bg-white/5"
                )} />
                <Avatar className={cn(
                    "h-8 w-8 sm:h-12 sm:w-12 border-2 transition-all duration-500 shadow-xl relative z-10",
                    isWinner ? "border-primary scale-110" : "border-white/10"
                )}>
                    <AvatarImage src={team?.logoUrl} alt={team?.name} className="object-cover" />
                    <AvatarFallback className="bg-white/5 font-black text-xs">{team?.name?.charAt(0) || (name === 'TBD' ? '?' : name.charAt(0))}</AvatarFallback>
                </Avatar>
            </div>
            {alignment === 'left' && <span className="truncate flex-1 text-left pl-2">{name}</span>}
        </div>
    );
    
    const score1 = isBestOfThree ? match.player1Wins : match.player1Score;
    const score2 = isBestOfThree ? match.player2Wins : match.player2Score;
    const hasValidScore = match.isCompleted && score1 !== null && score2 !== null;
    const isW1 = hasValidScore && score1 > score2;
    const isW2 = hasValidScore && score2 > score1;

    return (
        <div className="group relative grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2 sm:gap-8 p-4 sm:p-6 transition-all duration-500 border-b border-white/5 last:border-0 hover:bg-white/[0.04]">
            <div className="absolute inset-y-0 left-0 w-1 sm:w-1.5 bg-primary opacity-0 group-hover:opacity-100 transition-all duration-500 shadow-[0_0_15px_rgba(204,253,1,0.6)]" />
            
            <PlayerInfo name={match.player1?.name || 'TBD'} team={match.team1} alignment="right" isWinner={isW1} />
            
            <div className="flex flex-col items-center justify-center min-w-[70px] sm:min-w-[100px] relative">
                 {hasValidScore ? (
                    <div className="relative group/score">
                        <div className="absolute -inset-4 bg-primary/5 rounded-full blur-xl opacity-0 group-hover/score:opacity-100 transition-opacity" />
                        <div className="bg-black/40 border-2 border-primary/30 px-3 sm:px-5 py-1.5 rounded-xl shadow-2xl relative z-10 flex items-center gap-2 sm:gap-3">
                            <span className={cn("text-xl sm:text-3xl font-black italic tabular-nums", isW1 ? "text-primary drop-shadow-[0_0_10px_rgba(204,253,1,0.4)]" : "text-white/40")}>{score1}</span>
                            <span className="text-white/10 font-black text-xs sm:text-sm">-</span>
                            <span className={cn("text-xl sm:text-3xl font-black italic tabular-nums", isW2 ? "text-primary drop-shadow-[0_0_10px_rgba(204,253,1,0.4)]" : "text-white/40")}>{score2}</span>
                        </div>
                    </div>
                ) : (
                    <div className="bg-primary/10 border-2 border-primary/20 px-3 py-1 rounded-lg backdrop-blur-sm">
                        <span className="text-[10px] sm:text-xs font-black tracking-[0.3em] text-primary uppercase italic pr-1">vs</span>
                    </div>
                )}
            </div>
            
            <PlayerInfo name={match.player2?.name || 'TBD'} team={match.team2} alignment="left" isWinner={isW2} />
            
            <div className="flex items-center gap-2 justify-end shrink-0">
                 <Button 
                    variant="ghost" 
                    size="sm" 
                    className={cn(
                        "h-8 sm:h-10 px-3 sm:px-4 text-[8px] sm:text-[10px] font-black uppercase tracking-widest transition-all duration-300 border", 
                        hasValidScore 
                            ? "text-white/40 hover:text-primary border-white/5 hover:border-primary/30" 
                            : "text-primary hover:bg-primary/10 border-primary/20 shadow-lg shadow-primary/5"
                    )} 
                    onClick={() => onEditMatch(match)} 
                    disabled={isEditDisabled}
                >
                    {hasValidScore ? (
                        <div className="flex items-center gap-2 italic">
                            <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                            {displayDate}
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 italic">
                            <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                            {isEditDisabled && hasPlayoffs && !match.isCompleted ? 'LOCKED' : t('unplayed_abbv', {defaultValue: 'TBD'})}
                        </div>
                    )}
                </Button>
                {isAdmin && hasValidScore && (
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 sm:h-10 sm:w-10 text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 border border-amber-500/20" 
                        onClick={() => onRevertMatch(match)} 
                        title={t('revert_match', { defaultValue: "Revert Match"})}
                    >
                        <Undo2 className="h-4 w-4 sm:h-5 sm:w-5" />
                    </Button>
                )}
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
            if (!searchTerm.trim()) return true;
            const terms = searchTerm.toLowerCase().split(' ').filter(Boolean);
            const pn1 = m.player1?.name.toLowerCase() || '';
            const pn2 = m.player2?.name.toLowerCase() || '';
            return terms.every(t => pn1.includes(t) || pn2.includes(t));
        });
        
        const sorted = [...filtered].sort((a,b) => a.matchDate.toMillis() - b.matchDate.toMillis());
        const grouped = sorted.reduce((acc, m) => {
            const rd = m.round || 'Group';
            const st = m.isCompleted ? 'completed' : 'upcoming';
            if (!acc[st][rd]) acc[st][rd] = [];
            acc[st][rd].push(m);
            return acc;
        }, { upcoming: {} as Record<string, any[]>, completed: {} as Record<string, any[]> });
        
        Object.keys(grouped.completed).forEach(r => grouped.completed[r].sort((a,b) => b.matchDate.toMillis() - a.matchDate.toMillis()));
        return { groupedMatches: grouped, upcomingCount: Object.values(grouped.upcoming).flat().length, completedCount: Object.values(grouped.completed).flat().length };
    }, [matches, playersById, teamsById, searchTerm, activeSeason, coopTableById, leagueTableByPlayerId]);

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
                    className="pl-14 h-14 bg-black/40 border-2 border-white/5 focus:border-primary/50 rounded-2xl text-lg font-black italic tracking-tight uppercase placeholder:text-white/20 transition-all shadow-2xl relative z-10" 
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
                                    <Card className="overflow-hidden border-2 border-white/5 bg-card/40 backdrop-blur-xl shadow-[0_0_50px_rgba(0,0,0,0.3)] rounded-3xl">
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
                                    <Card className="overflow-hidden border-2 border-white/5 bg-card/40 backdrop-blur-xl shadow-[0_0_50px_rgba(0,0,0,0.3)] rounded-3xl">
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
    
    runTransaction(firestore, async (transaction) => {
        const mDoc = await transaction.get(matchRef);
        if (!mDoc.exists()) throw new Error("Match not found!");
        const orig = mDoc.data() as Match;
        const sDoc = await transaction.get(doc(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}`));
        const sData = sDoc.data() as Season;
        
        // Standardize Bo3 detection: Co-Op mode OR Playoff round in Hybrid mode
        const isMatchBo3 = sData.type === 'Co-Op' || (orig.round && orig.round !== 'Group');

        const getOutcome = (p1Score: number, p2Score: number) => {
            if (p1Score > p2Score) return { p1: 'W', p2: 'L' };
            if (p1Score < p2Score) return { p1: 'L', p2: 'W' };
            return { p1: 'D', p2: 'D' };
        };

        const updatePlayerStats = async (pId: string, change: { played: number, win: number, draw: number, loss: number, gf: number, ga: number }) => {
            if (!pId || pId === 'TBD') return;
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

        // 1. Revert old stats from Player collection if match was already completed
        if (orig.isCompleted) {
            const oldS1 = isMatchBo3 ? (orig.player1Wins ?? orig.player1Score ?? 0) : (orig.player1Score ?? 0);
            const oldS2 = isMatchBo3 ? (orig.player2Wins ?? orig.player2Score ?? 0) : (orig.player2Score ?? 0);
            const outcome = getOutcome(oldS1, oldS2);
            const isCoop = sData.type === 'Co-Op';
            
            const processRevert = async (pId: string, res: string, gf: number, ga: number) => {
                await updatePlayerStats(pId, { 
                    played: -1, 
                    win: res === 'W' ? -1 : 0, 
                    draw: res === 'D' ? -1 : 0, 
                    loss: res === 'L' ? -1 : 0, 
                    gf: -(gf || 0), 
                    ga: -(ga || 0) 
                });
            };

            if (isCoop) {
                const [e1, e2] = await Promise.all([
                    transaction.get(doc(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/coopLeagueTable`, orig.player1Id)),
                    transaction.get(doc(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/coopLeagueTable`, orig.player2Id))
                ]);
                if (e1.exists() && e2.exists()) {
                    const d1 = e1.data() as CoOpLeagueEntry; const d2 = e2.data() as CoOpLeagueEntry;
                    await processRevert(d1.player1Id, outcome.p1, orig.player1Score || 0, orig.player2Score || 0);
                    await processRevert(d1.player2Id, outcome.p1, orig.player1Score || 0, orig.player2Score || 0);
                    await processRevert(d2.player1Id, outcome.p2, orig.player2Score || 0, orig.player1Score || 0);
                    await processRevert(d2.player2Id, outcome.p2, orig.player2Score || 0, orig.player1Score || 0);
                }
            } else {
                await processRevert(orig.player1Id, outcome.p1, orig.player1Score || 0, orig.player2Score || 0);
                await processRevert(orig.player2Id, outcome.p2, orig.player2Score || 0, orig.player1Score || 0);
            }
        }

        // 2. Apply new stats to Player collection
        const isBestOfThree = sData.type === 'Co-Op' || (orig.round && orig.round !== 'Group');
        const newS1 = isMatchBo3 ? (values.player1Wins ?? values.player1Score ?? 0) : (values.player1Score ?? 0);
        const newS2 = isBestOfThree ? (values.player2Wins ?? values.player2Score ?? 0) : (values.player2Score ?? 0);
        const newOutcome = getOutcome(newS1, newS2);
        const isCoopNow = sData.type === 'Co-Op';

        const processApply = async (pId: string, res: string, gf: number, ga: number) => {
            await updatePlayerStats(pId, { 
                played: 1, 
                win: res === 'W' ? 1 : 0, 
                draw: res === 'D' ? 1 : 0, 
                loss: res === 'L' ? 1 : 0, 
                gf: gf || 0, 
                ga: ga || 0 
            });
        };

        if (isCoopNow) {
            const [e1, e2] = await Promise.all([
                transaction.get(doc(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/coopLeagueTable`, values.player1Id || orig.player1Id)),
                transaction.get(doc(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/coopLeagueTable`, values.player2Id || orig.player2Id))
            ]);
            if (e1.exists() && e2.exists()) {
                const d1 = e1.data() as CoOpLeagueEntry; const d2 = e2.data() as CoOpLeagueEntry;
                await processApply(d1.player1Id, newOutcome.p1, values.player1Score || 0, values.player2Score || 0);
                await processApply(d1.player2Id, newOutcome.p1, values.player1Score || 0, values.player2Score || 0);
                await processApply(d2.player1Id, newOutcome.p2, values.player2Score || 0, values.player1Score || 0);
                await processApply(d2.player2Id, newOutcome.p2, values.player1Score || 0, values.player1Score || 0);
            }
        } else {
            await processApply(orig.player1Id, newOutcome.p1, values.player1Score || 0, values.player2Score || 0);
            await processApply(orig.player2Id, newOutcome.p2, values.player2Score || 0, values.player1Score || 0);
        }

        // 3. Bracket & Table Logic
        if (orig.round && orig.round !== 'Group' && orig.bracketId) {
            const winnerId = newS1 > newS2 ? orig.player1Id : orig.player2Id;
            const loserId = winnerId === orig.player1Id ? orig.player2Id : orig.player1Id;
            const succ = PLAYOFF_SUCCESSOR_MAP[orig.bracketId];
            if (succ) {
                const mCol = collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/matches`);
                const qWin = query(mCol, where('bracketId', '==', succ.winner.bid));
                const winSnap = await getDocs(qWin);
                if (!winSnap.empty) transaction.update(winSnap.docs[0].ref, { [`player${succ.winner.slot}Id`]: winnerId });
                if (succ.loser) {
                    const qLos = query(mCol, where('bracketId', '==', succ.loser.bid));
                    const losSnap = await getDocs(qLos);
                    if (!losSnap.empty) transaction.update(losSnap.docs[0].ref, { [`player${succ.loser.slot}Id`]: loserId });
                }
            }
        } else if (orig.round === 'Group' || !orig.round) {
            const tblName = sData.type === 'Co-Op' ? 'coopLeagueTable' : 'leagueTable';
            let p1S, p2S;
            if (sData.type === 'Co-Op') {
                const [d1, d2] = await Promise.all([transaction.get(doc(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/${tblName}`, orig.player1Id)), transaction.get(doc(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/${tblName}`, orig.player2Id))]);
                p1S = { docs: d1.exists() ? [d1] : [] }; p2S = { docs: d2.exists() ? [d2] : [] };
            } else {
                const col = collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/${tblName}`);
                const [snap1, snap2] = await Promise.all([getDocs(query(col, where('playerId', '==', orig.player1Id))), getDocs(query(col, where('playerId', '==', orig.player2Id)))]);
                p1S = snap1; p2S = snap2;
            }
            if (p1S.docs.length && p2S.docs.length) {
                const e1 = p1S.docs[0].data() as LeagueEntry; const e2 = p2S.docs[0].data() as LeagueEntry;
                if (orig.isCompleted) {
                    e1.played--; e2.played--;
                    if (sData.type === 'Co-Op') {
                        const oW1 = orig.player1Wins ?? 0; const oW2 = orig.player2Wins ?? 0;
                        if (oW1 > oW2) { e1.win--; e1.points -= 3; e2.loss--; } else { e2.win--; e2.points -= 3; e1.loss--; }
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
                    if (values.player1Score > values.player2Score) { e1.win++; e1.points += 3; e2.loss++; } else if (values.player2Score > values.player1Score) { e2.win++; e2.points += 3; e1.loss++; } else { e1.draw++; e1.points++; e2.draw++; e2.points++; }
                    e1.goalDifference = e1.goalsFor - e1.goalsAgainst; e2.goalDifference = e2.goalsFor - e2.goalsAgainst;
                }
                transaction.set(p1S.docs[0].ref, e1); transaction.set(p2S.docs[0].ref, e2);
            }
        }
        const [h, m] = values.time.split(':').map(Number); const ts = Timestamp.fromDate(new Date(values.date.setHours(h, m)));
        transaction.update(matchRef, { ...values, matchDate: ts, isCompleted: true, ...(isMatchBo3 ? { player1Score: values.player1Score || 0, player2Score: values.player2Score || 0 } : { player1Wins: null, player2Wins: null }) });
    })
    .then(() => {
        toast({ title: t('score_updated_title') });
    })
    .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
            path: matchRef.path,
            operation: 'update',
            requestResourceData: values,
        });
        errorEmitter.emit('permission-error', permissionError);
    });
    setEditingMatch(null);
  };

  const handleRevertMatch = useCallback(async () => {
    if (!firestore || !activeSeasonId || !revertingMatch) return;
    const matchRef = doc(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/matches`, revertingMatch.id);
    
    runTransaction(firestore, async (transaction) => {
        const mDoc = await transaction.get(matchRef); if (!mDoc.exists() || !mDoc.data().isCompleted) throw new Error("Match not completed.");
        const mToRev = mDoc.data() as Match;
        const sDoc = await transaction.get(doc(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}`));
        const sData = sDoc.data() as Season;
        const isMatchBo3 = sData.type === 'Co-Op' || (mToRev.round && mToRev.round !== 'Group');

        const getOutcome = (p1Score: number, p2Score: number) => {
            if (p1Score > p2Score) return { p1: 'W', p2: 'L' };
            if (p1Score < p2Score) return { p1: 'L', p2: 'W' };
            return { p1: 'D', p2: 'D' };
        };

        const updatePlayerStats = async (pId: string, change: { played: number, win: number, draw: number, loss: number, gf: number, ga: number }) => {
            if (!pId || pId === 'TBD') return;
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

        // 1. Revert Stats from Player collection
        const oldS1 = isMatchBo3 ? (mToRev.player1Wins ?? mToRev.player1Score ?? 0) : (mToRev.player1Score ?? 0);
        const oldS2 = isMatchBo3 ? (mToRev.player2Wins ?? mToRev.player2Score ?? 0) : (mToRev.player2Score ?? 0);
        const outcome = getOutcome(oldS1, oldS2);
        const isCoop = sData.type === 'Co-Op';

        const processRevert = async (pId: string, res: string, gf: number, ga: number) => {
            await updatePlayerStats(pId, { 
                played: -1, 
                win: res === 'W' ? -1 : 0, 
                draw: res === 'D' ? -1 : 0, 
                loss: res === 'L' ? -1 : 0, 
                gf: -(gf || 0), 
                ga: -(ga || 0) 
            });
        };

        if (isCoop) {
            const [e1, e2] = await Promise.all([
                transaction.get(doc(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/coopLeagueTable`, mToRev.player1Id)),
                transaction.get(doc(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/coopLeagueTable`, mToRev.player2Id))
            ]);
            if (e1.exists() && e2.exists()) {
                const d1 = e1.data() as CoOpLeagueEntry; const d2 = e2.data() as CoOpLeagueEntry;
                await processRevert(d1.player1Id, outcome.p1, mToRev.player1Score || 0, mToRev.player2Score || 0);
                await processRevert(d1.player2Id, outcome.p1, mToRev.player1Score || 0, mToRev.player2Score || 0);
                await processRevert(d2.player1Id, outcome.p2, mToRev.player2Score || 0, mToRev.player1Score || 0);
                await processRevert(d2.player2Id, outcome.p2, mToRev.player2Score || 0, mToRev.player1Score || 0);
            }
        } else {
            await processRevert(mToRev.player1Id, outcome.p1, mToRev.player1Score || 0, mToRev.player2Score || 0);
            await processRevert(mToRev.player2Id, outcome.p2, mToRev.player2Score || 0, mToRev.player1Score || 0);
        }

        // 2. Revert League Table
        if (mToRev.round === 'Group' || !mToRev.round) {
            const tbl = isCoop ? 'coopLeagueTable' : 'leagueTable';
            let p1S, p2S;
            if (isCoop) {
                const [d1, d2] = await Promise.all([transaction.get(doc(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/${tbl}`, mToRev.player1Id)), transaction.get(doc(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/${tbl}`, mToRev.player2Id))]);
                p1S = { docs: d1.exists() ? [d1] : [] }; p2S = { docs: d2.exists() ? [d2] : [] };
            } else {
                const qCol = collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/${tbl}`);
                const [sn1, sn2] = await Promise.all([getDocs(query(qCol, where('playerId', '==', mToRev.player1Id))), getDocs(query(qCol, where('playerId', '==', mToRev.player2Id)))]); p1S = sn1; p2S = sn2;
            }
            if (p1S.docs.length && p2S.docs.length) {
                const e1 = p1S.docs[0].data() as LeagueEntry; const e2 = p2S.docs[0].data() as LeagueEntry;
                e1.played--; e2.played--;
                if (isCoop) { 
                    const oW1 = mToRev.player1Wins ?? 0; const oW2 = mToRev.player2Wins ?? 0;
                    if (oW1 > oW2) { e1.win--; e1.points -= 3; e2.loss--; } else { e2.win--; e2.points -= 3; e1.loss--; } 
                } else {
                    e1.goalsFor -= mToRev.player1Score!; e1.goalsAgainst -= mToRev.player2Score!; e2.goalsFor -= mToRev.player2Score!; e2.goalsAgainst -= mToRev.player1Score!;
                    if (mToRev.player1Score! > mToRev.player2Score!) { e1.win--; e1.points -= 3; e2.loss--; } else if (mToRev.player2Score! > mToRev.player1Score!) { e2.win--; e2.points -= 3; e1.loss--; } else { e1.draw--; e1.points--; e2.draw--; e2.points--; }
                    e1.goalDifference = e1.goalsFor - e1.goalsAgainst; e2.goalDifference = e2.goalsFor - e2.goalsAgainst;
                }
                transaction.set(p1S.docs[0].ref, e1); transaction.set(p2S.docs[0].ref, e2);
            }
        }
        transaction.update(matchRef, { player1Wins: null, player2Wins: null, player1Score: null, player2Score: null, isCompleted: false });
    })
    .then(() => {
        toast({ title: t('match_reverted_title') });
    })
    .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
            path: matchRef.path,
            operation: 'update',
        });
        errorEmitter.emit('permission-error', permissionError);
    });
    setRevertingMatch(null);
  }, [firestore, activeSeasonId, revertingMatch, t, toast]);

  const isLoading = isLoadingSeasons || isLoadingPlayers || isLoadingTeams || !isPasswordLoaded;
  
  return (
    <div className="container mx-auto px-2 sm:px-4 py-8 relative">
       {/* Background decorative glows */}
       <div className="absolute top-0 right-0 -z-10 w-[300px] sm:w-[600px] h-[300px] sm:h-[600px] bg-primary/5 rounded-full blur-[100px] sm:blur-[150px] pointer-events-none" />
       <div className="absolute bottom-0 left-0 -z-10 w-[250px] sm:w-[500px] h-[250px] sm:h-[500px] bg-accent/5 rounded-full blur-[80px] sm:blur-[120px] pointer-events-none" />

       <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-10 sm:space-y-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 border-b border-white/10 pb-10">
             <div className="flex flex-col justify-center space-y-1 flex-1 w-full py-4 border-l-4 border-primary/20 pl-4 sm:pl-8">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary/10 rounded-xl text-primary shadow-[0_0_15px_rgba(204,253,1,0.2)]">
                        <Swords className="w-6 h-6 sm:w-8 sm:h-8" />
                    </div>
                    <h1 className="font-headline text-3xl sm:text-6xl font-black tracking-tighter text-white uppercase italic pr-4">
                        {t('fixtures_page_title')}
                    </h1>
                </div>
                {activeSeason && (
                  <div className="space-y-0.5">
                    <p className="text-lg sm:text-3xl font-black text-white/90 tracking-tight uppercase italic pr-4">{activeSeason.name}</p>
                    <Badge className="bg-primary/20 text-primary border-primary/30 font-black tracking-[0.2em] text-[10px] uppercase h-6 px-3">{activeSeason.status}</Badge>
                  </div>
                )}
                {matches && matches.length > 0 && (
                    <div className="max-w-md pt-1 space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-white/40">
                            <span className="flex items-center gap-2"><Activity className="w-3 h-3" /> Season Completion</span>
                            <span className="text-primary">{progressPercentage.toFixed(0)}%</span>
                        </div>
                        <Progress value={progressPercentage} className="h-2 bg-white/5" />
                        <p className="text-[10px] font-black mt-1 tracking-widest text-primary/60 uppercase italic">
                            {completedMatchesForDisplay} / {totalMatchesForDisplay} Battles Finished
                        </p>
                    </div>
                )}
             </div>
            <div className="w-full md:w-auto flex justify-center md:justify-end shrink-0"><LiveClock /></div>
        </div>

        <div className={cn(
            "bg-black/40 border-2 border-white/5 rounded-2xl p-2 sm:p-4 mb-6 sm:mb-10 flex flex-wrap items-center gap-4 shadow-2xl backdrop-blur-xl transition-all duration-500", 
            isAdmin ? "w-full" : "w-fit mx-auto"
        )}>
            <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="p-2.5 bg-primary/10 rounded-xl text-primary hidden xs:block shadow-[0_0_15px_rgba(204,253,1,0.2)]">
                    <LayoutGrid className="w-4 h-4" />
                </div>
                <Select value={activeSeasonId || ''} onValueChange={setActiveSeasonId} disabled={isLoadingSeasons}>
                    <SelectTrigger className="flex-1 sm:w-[240px] h-12 bg-black/40 border-white/10 font-black uppercase italic tracking-tight text-xs rounded-xl focus:border-primary/50 transition-all">
                        <SelectValue placeholder={t('select_a_season')} />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0A192F] border-primary/30 rounded-xl overflow-hidden">
                        {seasons?.map(s => (<SelectItem key={s.id} value={s.id} className="font-black uppercase italic text-xs focus:bg-primary focus:text-black py-3">{s.name}</SelectItem>))}
                    </SelectContent>
                </Select>
            </div>

            <div className={cn("flex items-center gap-2", isAdmin ? "ml-auto" : "w-full justify-center sm:w-auto")}>
                <Button 
                    onClick={() => isAdmin ? setIsAdmin(false) : setPasswordPromptOpen(true)} 
                    variant="outline" 
                    size="sm" 
                    className={cn(
                        "h-12 px-6 font-black uppercase tracking-widest text-[10px] italic transition-all duration-500 rounded-xl", 
                        isAdmin ? "bg-primary/10 text-primary border-primary/50 shadow-[0_0_20px_rgba(204,253,1,0.1)]" : "border-white/10 hover:border-primary/50"
                    )} 
                    disabled={!isPasswordLoaded}
                >
                    {isAdmin ? <Unlock className="mr-2 h-4 w-4" /> : <Lock className="mr-2 h-4 w-4" />}
                    {isAdmin ? t('lock_admin_mode') : t('unlock_admin')}
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

        {/* Dialogs Style Revise */}
        <Dialog open={!!editingMatch} onOpenChange={(open) => !open && setEditingMatch(null)}>
            <DialogContent className="max-w-xl border-primary border-4 p-0 overflow-hidden bg-[#0A192F]/98 backdrop-blur-2xl rounded-3xl shadow-[0_0_100px_rgba(204,253,1,0.15)] max-h-[90vh] flex flex-col">
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
            <AlertDialogContent className="border-amber-500 border-4 bg-[#0A192F]/98 backdrop-blur-2xl rounded-3xl">
                <AlertDialogHeader>
                    <div className="flex items-center gap-4 text-amber-500 mb-2">
                        <Undo2 className="w-8 h-8" />
                        <AlertDialogTitle className="text-2xl font-black tracking-tighter uppercase italic pr-4">{t('revert_match_confirm_title')}</AlertDialogTitle>
                    </div>
                    {revertingMatch && (<AlertDialogDescription className="text-sm font-bold text-white/40 uppercase tracking-widest">{t('revert_match_confirm_desc', { player1: playersById[revertingMatch.player1Id]?.name, player2: playersById[revertingMatch.player2Id]?.name })}</AlertDialogDescription>)}
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-4 mt-6">
                    <AlertDialogCancel onClick={() => setRevertingMatch(null)} className="font-black uppercase tracking-widest italic rounded-xl h-12">{t('cancel')}</AlertDialogCancel>
                    <AlertDialogAction onClick={handleRevertMatch} className="bg-amber-500 text-black hover:bg-amber-600 font-black uppercase tracking-widest italic rounded-xl h-12">{t('revert_match_action')}</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <Dialog open={passwordPromptOpen} onOpenChange={setPasswordPromptOpen}>
            <DialogContent className="max-w-md border-primary border-4 bg-[#0A192F]/98 backdrop-blur-2xl rounded-3xl">
                <DialogHeader>
                    <div className="flex items-center gap-4 text-primary mb-2">
                        <KeyRound className="w-8 h-8" />
                        <DialogTitle className="text-2xl font-black tracking-tighter uppercase italic pr-4">{t('admin_auth')}</DialogTitle>
                    </div>
                    <DialogDescription className="text-sm font-bold text-white/40 uppercase tracking-widest">{t('admin_auth_desc')}</DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-8">
                    <div className="space-y-2">
                        <Label htmlFor="password-input" className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60">{t('password')}</Label>
                        <Input id="password-input" type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} className="h-14 bg-white/5 border-white/10 rounded-xl focus:border-primary/50 text-lg font-black" onKeyDown={(e) => e.key === 'Enter' && handlePasswordCheck()} />
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handlePasswordCheck} className="w-full h-14 font-black uppercase tracking-widest italic text-lg shadow-xl shadow-primary/20">{t('unlock')}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
