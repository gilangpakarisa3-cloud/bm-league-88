'use client';

import { useState, useMemo, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Search, Swords, Clock, Zap, Activity, Trophy, LayoutGrid, CalendarIcon, Shield, ChevronRight, Scan, CheckCircle2, Loader2, Binary, Radio, Plus, Minus, Crown, Share2, Calendar } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { getSeasonTheme } from '@/lib/season-theme';
import { useTranslation } from '@/hooks/use-translation';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Season, Player, WithId, Match, Team, LeagueEntry, CoOpLeagueEntry } from '@/lib/types';
import { MatchRow } from './match-row';

const LEAGUE_ID = 'main-league';

const ROUND_ORDER: Record<string, number> = {
    'Group': 1,
    'Quarterfinal': 2,
    'UB-Quarter': 2,
    'LB-Round 1': 3,
    'Semifinal': 4,
    'UB-Semi': 4,
    'LB-Round 2': 5,
    'LB-Round 3': 6,
    'UB-Final': 7,
    'LB-Semifinal': 8,
    'LB-Final': 9,
    'Grand-Final': 10
};

export const FixtureContent = memo(function FixtureContent({ activeSeasonId, onEditMatch, onRevertMatch, onQuickUpdate, onShareMatch, isAdmin, allPlayers, allTeams, matches, isLoadingMatches, activeSeason, hasPlayoffs }: { activeSeasonId: string | null; onEditMatch: (match: any) => void; onRevertMatch: (match: WithId<Match>) => void; onQuickUpdate: (matchId: string, field: string, delta: number) => void; onShareMatch: (match: any) => void; isAdmin: boolean; allPlayers: WithId<Player>[]; allTeams: WithId<Team>[]; matches: WithId<Match>[] | null; isLoadingMatches: boolean; activeSeason: WithId<Season> | null; hasPlayoffs: boolean; }) {
    const firestore = useFirestore();
    const { t } = useTranslation();
    const [searchTerm, setSearchTerm] = useState('');
    const [divisionFilter, setDivisionFilter] = useState<'all' | 'div-1' | 'div-2'>('all');
    const theme = useMemo(() => getSeasonTheme(activeSeason), [activeSeason]);
    
    const isSeasonCoop = activeSeason?.type === 'Co-Op' || activeSeason?.type === 'Co-Op Hybrid';
    const singleLeagueTableCollection = useMemoFirebase(() => firestore && activeSeasonId && !isSeasonCoop ? collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/leagueTable`) : null, [firestore, activeSeasonId, isSeasonCoop]);
    const { data: singleLeagueTable } = useCollection<LeagueEntry>(singleLeagueTableCollection);
    const coopLeagueTableCollection = useMemoFirebase(() => firestore && activeSeasonId && isSeasonCoop ? collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/coopLeagueTable`) : null, [firestore, activeSeasonId, isSeasonCoop]);
    const { data: coopLeagueTable } = useCollection<CoOpLeagueEntry>(coopLeagueTableCollection);
    
    const playersById = useMemo(() => allPlayers.reduce((acc, player) => { acc[player.id] = player; return acc; }, {} as Record<string, WithId<Player>>), [allPlayers]);
    const teamsById = useMemo(() => allTeams.reduce((acc, t) => { acc[t.id] = t; return acc; }, {} as Record<string, WithId<Team>>), [allTeams]);
    const leagueTableByPlayerId = useMemo(() => (singleLeagueTable || []).reduce((acc, entry) => { acc[entry.playerId] = entry; return acc; }, {} as Record<string, LeagueEntry>), [singleLeagueTable]);
    const coopTableById = useMemo(() => (coopLeagueTable || []).reduce((acc, e) => { acc[e.id] = e; return acc; }, {} as Record<string, WithId<CoOpLeagueEntry>>), [coopLeagueTable]);
    
    const div1MatchCount = useMemo(() => matches?.filter(m => m.division !== 'div-2').length || 0, [matches]);
    const div2MatchCount = useMemo(() => matches?.filter(m => m.division === 'div-2').length || 0, [matches]);

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
            if (activeSeason?.hasDivisions && divisionFilter !== 'all') {
                if (divisionFilter === 'div-1' && m.division === 'div-2') return false;
                if (divisionFilter === 'div-2' && m.division !== 'div-2') return false;
            }
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
    }, [matches, playersById, teamsById, searchTerm, activeSeason, coopTableById, leagueTableByPlayerId, hasPlayoffs, divisionFilter]);

    const roundNames: Record<string, string> = { 
        'Group': 'Fase Grup', 
        'Quarterfinal': 'Perempat Final (Top 8)',
        'Semifinal': 'Semifinal',
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
                <div 
                  className="absolute -inset-8 rounded-full blur-3xl animate-pulse" 
                  style={{ backgroundColor: `${theme.primaryHex}33` }}
                />
                <Zap className="w-16 h-16 animate-spin" style={{ color: theme.primaryHex }} />
            </div>
            <p className="text-xs font-black tracking-[0.5em] uppercase italic animate-pulse" style={{ color: theme.primaryHex }}>Syncing Tactical Data Hub...</p>
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
        <div className="space-y-8 sm:space-y-12">
            {/* MULTI-DIVISION FILTER SWITCHER */}
            {activeSeason?.hasDivisions && (
                <div className="flex justify-center -mb-2 sm:-mb-4 animate-in fade-in zoom-in-95 duration-500">
                    <div className="inline-flex p-1.5 rounded-full bg-black/70 border border-white/10 backdrop-blur-2xl gap-1.5 sm:gap-2 shadow-[0_15px_40px_rgba(0,0,0,0.8)]">
                        <button
                            type="button"
                            onClick={() => setDivisionFilter('all')}
                            className={cn(
                                "px-3.5 sm:px-6 py-2 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all duration-300 italic",
                                divisionFilter === 'all'
                                    ? "bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.4)]"
                                    : "text-white/50 hover:text-white"
                            )}
                        >
                            Semua ({matches?.length || 0})
                        </button>
                        <button
                            type="button"
                            onClick={() => setDivisionFilter('div-1')}
                            className={cn(
                                "px-3.5 sm:px-6 py-2 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all duration-300 italic flex items-center gap-1.5",
                                divisionFilter === 'div-1'
                                    ? "bg-emerald-400 text-black shadow-[0_0_20px_rgba(52,211,153,0.4)]"
                                    : "text-emerald-400/70 hover:text-emerald-300"
                            )}
                        >
                            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
                            {activeSeason.division1Name || 'Divisi 1'} ({div1MatchCount})
                        </button>
                        <button
                            type="button"
                            onClick={() => setDivisionFilter('div-2')}
                            className={cn(
                                "px-3.5 sm:px-6 py-2 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all duration-300 italic flex items-center gap-1.5",
                                divisionFilter === 'div-2'
                                    ? "bg-amber-400 text-black shadow-[0_0_20px_rgba(251,191,36,0.4)]"
                                    : "text-amber-400/70 hover:text-amber-300"
                            )}
                        >
                            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-400 inline-block animate-pulse" />
                            {activeSeason.division2Name || 'Divisi 2'} ({div2MatchCount})
                        </button>
                    </div>
                </div>
            )}

            {/* AERODYNAMIC COCKPIT SEARCH HUB */}
            <div className="relative max-w-3xl mx-auto group/search">
                <div 
                  className="absolute -inset-2 rounded-full blur-2xl opacity-0 group-hover/search:opacity-40 transition-opacity duration-700 pointer-events-none" 
                  style={{ backgroundColor: theme.primaryHex }}
                />
                <div 
                  className="relative flex items-center bg-black/70 border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.8)] backdrop-blur-3xl overflow-hidden rounded-full p-2 pl-3 transition-all duration-500"
                  style={{ borderColor: `${theme.primaryHex}35` }}
                >
                    <div 
                      className="h-12 w-12 sm:h-14 sm:w-14 rounded-full flex items-center justify-center shrink-0 relative z-10 transition-transform duration-300 group-hover/search:scale-105"
                      style={{ 
                        background: `linear-gradient(135deg, ${theme.primaryHex}, ${theme.secondaryHex})`,
                        color: theme.themeKey === 'crimson' ? '#ffffff' : '#000000',
                        boxShadow: `0 0 25px ${theme.glowRgba}`
                      }}
                    >
                        <Search className="h-5 w-5 sm:h-6 sm:w-6" />
                    </div>
                    <Input 
                        type="text" 
                        placeholder="SEARCH BATTLE NODE / UNIT..." 
                        className="flex-1 h-12 sm:h-14 bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 text-base sm:text-xl font-black italic tracking-tight uppercase placeholder:text-white/20 transition-all relative z-10 px-4 sm:px-6 text-white" 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                    />
                    <div className="hidden sm:flex flex-col items-end gap-0.5 pr-6 opacity-40 group-hover/search:opacity-80 transition-opacity">
                        <div className="flex items-center gap-1.5">
                            <span 
                              className="w-2 h-2 rounded-full animate-pulse" 
                              style={{ backgroundColor: theme.primaryHex, boxShadow: `0 0 8px ${theme.glowRgba}` }}
                            />
                            <span className="text-[9px] font-black uppercase tracking-[0.25em]" style={{ color: theme.primaryHex }}>UPLINK_READY</span>
                        </div>
                        <span className="text-[7px] font-black text-white/60 tracking-wider uppercase font-mono">{theme.sysTag}</span>
                    </div>
                </div>
            </div>

            {(upcomingCount === 0 && completedCount === 0 && liveCount === 0 && searchTerm) ? (
                <div className="text-center py-20 flex flex-col items-center gap-5 rounded-3xl bg-black/40 border border-white/10 p-10 max-w-xl mx-auto backdrop-blur-xl">
                    <div className="relative">
                        <Activity className="w-14 h-14 text-white/30" />
                        <div 
                          className="absolute -inset-3 border border-dashed rounded-full animate-spin-slow" 
                          style={{ borderColor: `${theme.primaryHex}55` }}
                        />
                    </div>
                    <h2 className="text-xl font-black uppercase italic tracking-[0.3em] text-white/60">{t('no_matches_found')}</h2>
                </div>
            ) : (
                <Tabs defaultValue={liveCount > 0 ? "live" : "upcoming"} className="w-full">
                    <div className="flex justify-center mb-12">
                        <TabsList className="grid grid-cols-3 w-full max-w-2xl h-16 sm:h-18 bg-black/70 p-2 border border-white/10 relative overflow-hidden backdrop-blur-3xl rounded-full shadow-[0_20px_60px_rgba(0,0,0,0.8)]">
                            <TabsTrigger 
                                value="live" 
                                className={cn(
                                    "relative h-full font-black uppercase tracking-[0.15em] text-[11px] sm:text-sm italic transition-all duration-500 rounded-full",
                                    theme.tabsActiveBg,
                                    "data-[state=inactive]:text-white/40 data-[state=inactive]:hover:text-white"
                                )}
                            >
                                <span className="relative z-10 flex items-center justify-center gap-2">
                                    <Radio className={cn("w-4 h-4", liveCount > 0 && "animate-pulse text-red-500")} />
                                    <span>LIVE</span>
                                    <span className="text-xs font-black px-2 py-0.5 rounded-full bg-black/30" suppressHydrationWarning>{liveCount}</span>
                                </span>
                            </TabsTrigger>

                            <TabsTrigger 
                                value="upcoming" 
                                className={cn(
                                    "relative h-full font-black uppercase tracking-[0.15em] text-[11px] sm:text-sm italic transition-all duration-500 rounded-full",
                                    theme.tabsActiveBg,
                                    "data-[state=inactive]:text-white/40 data-[state=inactive]:hover:text-white"
                                )}
                            >
                                <span className="relative z-10 flex items-center justify-center gap-2">
                                    <Scan className="w-4 h-4" />
                                    <span>QUEUE</span>
                                    <span className="text-xs font-black px-2 py-0.5 rounded-full bg-black/30" suppressHydrationWarning>{upcomingCount}</span>
                                </span>
                            </TabsTrigger>

                            <TabsTrigger 
                                value="completed" 
                                className={cn(
                                    "relative h-full font-black uppercase tracking-[0.15em] text-[11px] sm:text-sm italic transition-all duration-500 rounded-full",
                                    theme.tabsActiveBg,
                                    "data-[state=inactive]:text-white/40 data-[state=inactive]:hover:text-white"
                                )}
                            >
                                <span className="relative z-10 flex items-center justify-center gap-2">
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span>HISTORY</span>
                                    <span className="text-xs font-black px-2 py-0.5 rounded-full bg-black/30" suppressHydrationWarning>{completedCount}</span>
                                </span>
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="live" className="mt-0 focus-visible:ring-0 outline-none">
                        <div className="space-y-12">
                            {Object.entries(groupedMatches.live).map(([rd, rms]) => (
                                <section key={`live-${rd}`} className="animate-in fade-in slide-in-from-bottom-6 duration-700">
                                    <div className="flex flex-col items-center mb-6 gap-2">
                                        <div className="flex items-center gap-6 w-full max-w-4xl px-4">
                                            <div className="h-0.5 flex-1 bg-gradient-to-r from-transparent via-red-500/40 to-red-500 rounded-full shadow-[0_0_15px_rgba(239,68,68,0.4)]" />
                                            <div className="flex flex-col items-center shrink-0">
                                                <h3 className="text-xl sm:text-2xl font-black tracking-widest text-white uppercase italic drop-shadow-[0_0_10px_rgba(255,255,255,0.2)] pr-2">{roundNames[rd] || rd}</h3>
                                                <Badge variant="outline" className="text-[9px] font-black uppercase tracking-[0.3em] border-red-500/30 text-red-500 py-0.5 h-6 mt-1 animate-pulse bg-red-500/10 px-5 rounded-full">BROADCAST_ACTIVE</Badge>
                                            </div>
                                            <div className="h-0.5 flex-1 bg-gradient-to-l from-transparent via-red-500/40 to-red-500 rounded-full shadow-[0_0_15px_rgba(239,68,68,0.4)]" />
                                        </div>
                                    </div>
                                    <div className="space-y-4 sm:space-y-5">
                                        {rms.map(m => (
                                            <MatchRow key={m.id} match={m} onEditMatch={onEditMatch} onRevertMatch={onRevertMatch} onQuickUpdate={onQuickUpdate} onShareMatch={onShareMatch} isAdmin={isAdmin} activeSeason={activeSeason} hasPlayoffs={hasPlayoffs} />
                                        ))}
                                    </div>
                                </section>
                            ))}
                            {liveCount === 0 && (
                                <div className="text-center py-24 opacity-30 flex flex-col items-center gap-4 rounded-3xl bg-black/30 border border-white/5 p-8 max-w-xl mx-auto">
                                    <Radio className="w-16 h-16 text-white/40" />
                                    <p className="text-sm font-black uppercase tracking-[0.4em] italic text-white/60">SIGNAL_LOST: NO_LIVE_BROADCAST</p>
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="upcoming" className="mt-0 focus-visible:ring-0 outline-none">
                        <div className="space-y-12">
                            {Object.entries(groupedMatches.upcoming).map(([rd, rms]) => (
                                <section key={`upcoming-${rd}`} className="animate-in fade-in slide-in-from-bottom-6 duration-700">
                                    <div className="flex flex-col items-center mb-6 gap-2">
                                        <div className="flex items-center gap-6 w-full max-w-4xl px-4">
                                            <div 
                                              className="h-0.5 flex-1 rounded-full" 
                                              style={{ 
                                                background: `linear-gradient(to right, transparent, ${theme.primaryHex}66, ${theme.primaryHex})`,
                                                boxShadow: `0 0 15px ${theme.glowRgba}`
                                              }} 
                                            />
                                            <div className="flex flex-col items-center shrink-0">
                                                <h3 className="text-xl sm:text-2xl font-black tracking-widest text-white uppercase italic pr-2">{roundNames[rd] || rd}</h3>
                                                <Badge 
                                                  variant="outline" 
                                                  className="text-[9px] font-black uppercase tracking-[0.3em] py-0.5 h-6 mt-1 px-5 rounded-full border shadow-sm"
                                                  style={{
                                                    borderColor: `${theme.primaryHex}40`,
                                                    color: theme.primaryHex,
                                                    backgroundColor: `${theme.primaryHex}15`
                                                  }}
                                                >
                                                  UPCOMING_FIXTURES
                                                </Badge>
                                            </div>
                                            <div 
                                              className="h-0.5 flex-1 rounded-full" 
                                              style={{ 
                                                background: `linear-gradient(to left, transparent, ${theme.primaryHex}66, ${theme.primaryHex})`,
                                                boxShadow: `0 0 15px ${theme.glowRgba}`
                                              }} 
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-4 sm:space-y-5">
                                        {rms.map(m => (
                                            <MatchRow key={m.id} match={m} onEditMatch={onEditMatch} onRevertMatch={onRevertMatch} onQuickUpdate={onQuickUpdate} onShareMatch={onShareMatch} isAdmin={isAdmin} activeSeason={activeSeason} hasPlayoffs={hasPlayoffs} />
                                        ))}
                                    </div>
                                </section>
                            ))}
                            {upcomingCount === 0 && (
                                <div className="text-center py-24 opacity-30 flex flex-col items-center gap-4 rounded-3xl bg-black/30 border border-white/5 p-8 max-w-xl mx-auto">
                                    <Trophy className="w-16 h-16 text-white/40" />
                                    <p className="text-sm font-black uppercase tracking-[0.4em] italic text-white/60">PROTOCOL_COMPLETE: NO_PENDING_UNITS</p>
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="completed" className="mt-0 focus-visible:ring-0 outline-none">
                        <div className="space-y-12">
                            {Object.entries(groupedMatches.completed).map(([rd, rms]) => (
                                <section key={`completed-${rd}`} className="animate-in fade-in slide-in-from-bottom-6 duration-700">
                                    <div className="flex flex-col items-center mb-6 gap-2">
                                        <div className="flex items-center gap-6 w-full max-w-4xl px-4">
                                            <div className="h-0.5 flex-1 bg-gradient-to-r from-transparent via-white/20 to-white/60 rounded-full" />
                                            <div className="flex flex-col items-center shrink-0">
                                                <h3 className="text-xl sm:text-2xl font-black tracking-widest text-white/70 uppercase italic pr-2">{roundNames[rd] || rd}</h3>
                                                <Badge variant="outline" className="text-[9px] font-black uppercase tracking-[0.3em] border-white/10 text-white/40 py-0.5 h-6 mt-1 px-5 rounded-full">LOGS_ARCHIVE</Badge>
                                            </div>
                                            <div className="h-0.5 flex-1 bg-gradient-to-l from-transparent via-white/20 to-white/60 rounded-full" />
                                        </div>
                                    </div>
                                    <div className="space-y-4 sm:space-y-5">
                                        {rms.map(m => (
                                            <MatchRow key={m.id} match={m} onEditMatch={onEditMatch} onRevertMatch={onRevertMatch} onQuickUpdate={onQuickUpdate} onShareMatch={onShareMatch} isAdmin={isAdmin} activeSeason={activeSeason} hasPlayoffs={hasPlayoffs} />
                                        ))}
                                    </div>
                                </section>
                            ))}
                            {completedCount === 0 && (
                                <div className="text-center py-24 opacity-30 flex flex-col items-center gap-4 rounded-3xl bg-black/30 border border-white/5 p-8 max-w-xl mx-auto">
                                    <Zap className="w-16 h-16 text-white/40" />
                                    <p className="text-sm font-black uppercase tracking-[0.4em] italic text-white/60">EMPTY_ARCHIVE: NO_MATCH_RECORDS</p>
                                </div>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
            )}
        </div>
    );
});
