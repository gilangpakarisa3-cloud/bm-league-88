'use client';

import { useMemo, useState, useRef } from 'react';
import type { Match, Season, Team, Player, WithId, LeagueEntry } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Swords, Trophy, User, TrendingUp, Info, History, Calendar, Clock, Activity, ShieldCheck, Target, Zap, ShieldAlert, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from './ui/badge';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { ChartContainer, ChartConfig, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

interface TournamentBracketProps {
  matches: WithId<Match>[];
  playersById: Record<string, WithId<Player>>;
  teamsById: Record<string, WithId<Team>>;
  leagueTable: (WithId<LeagueEntry> & { player?: WithId<Player>, team?: WithId<Team> })[];
  season: WithId<Season> | null;
  isAdmin?: boolean;
}

export function TournamentBracket({ matches, playersById, teamsById, leagueTable, season, isAdmin = false }: TournamentBracketProps) {
  const [selectedMatch, setSelectedMatch] = useState<any | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);
  const mouseMoved = useRef(false);

  const onMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    isDragging.current = true;
    mouseMoved.current = false;
    startX.current = e.pageX - scrollRef.current.offsetLeft;
    scrollLeft.current = scrollRef.current.scrollLeft;
    document.body.style.userSelect = 'none';
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !scrollRef.current) return;
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX.current);
    if (Math.abs(walk) > 10) {
      mouseMoved.current = true;
      scrollRef.current.scrollLeft = scrollLeft.current - walk;
    }
  };

  const onMouseUp = () => {
    isDragging.current = false;
    document.body.style.userSelect = '';
  };

  const onMouseLeave = () => {
    isDragging.current = false;
    document.body.style.userSelect = '';
  };

  const handleCardClick = (matchData: any) => {
    if (!mouseMoved.current) {
      setSelectedMatch(matchData);
    }
  };

  // Helper to calculate complex player analysis
  const getPlayerAnalysis = (playerId: string) => {
    if (!playerId || playerId === 'TBD' || playerId.includes('Loser')) return null;

    // IMPORTANT: Sort by matchDate descending to get "Last 5" correctly
    const playerMatches = matches
      .filter(m => m.isCompleted && (m.player1Id === playerId || m.player2Id === playerId))
      .sort((a, b) => b.matchDate.toMillis() - a.matchDate.toMillis());

    const entry = leagueTable.find(e => e.playerId === playerId);
    const team = entry?.teamId ? teamsById[entry.teamId] : (playersById[playerId]?.teamId ? teamsById[playersById[playerId].teamId] : null);

    const stats = playerMatches.reduce((acc, m) => {
      acc.played++;
      const isP1 = m.player1Id === playerId;
      const s1 = m.player1Wins !== null ? m.player1Wins : (m.player1Score ?? 0);
      const s2 = m.player2Wins !== null ? m.player2Wins : (m.player2Score ?? 0);
      const pRes = isP1 ? s1 : s2;
      const oRes = isP1 ? s2 : s1;

      if (pRes > oRes) acc.win++;
      else if (pRes < oRes) acc.loss++;
      else acc.draw++;

      if (m.player1Score !== null && m.player2Score !== null) {
        acc.gf += isP1 ? m.player1Score : m.player2Score;
        acc.ga += isP1 ? m.player2Score : m.player1Score;
      }
      return acc;
    }, { played: 0, win: 0, draw: 0, loss: 0, gf: 0, ga: 0 });

    const winRate = stats.played > 0 ? (stats.win / stats.played) * 100 : 0;
    
    // Last 5 matches: Most recent on the right
    const last5Raw = playerMatches.slice(0, 5).reverse();
    const form = last5Raw.map(m => {
      const isP1 = m.player1Id === playerId;
      const s1 = m.player1Wins !== null ? m.player1Wins : (m.player1Score ?? 0);
      const s2 = m.player2Wins !== null ? m.player2Wins : (m.player2Score ?? 0);
      const pRes = isP1 ? s1 : s2;
      const oRes = isP1 ? s2 : s1;
      return pRes > oRes ? 'W' : (pRes < oRes ? 'L' : 'D');
    });

    // Stability Chart Data: From oldest to newest
    let cumulativeScore = 0;
    const chartData = [{ match: 0, points: 0 }, ...[...playerMatches].reverse().map((m, i) => {
      const isP1 = m.player1Id === playerId;
      const s1 = m.player1Wins !== null ? m.player1Wins : (m.player1Score ?? 0);
      const s2 = m.player2Wins !== null ? m.player2Wins : (m.player2Score ?? 0);
      const pRes = isP1 ? s1 : s2;
      const oRes = isP1 ? s2 : s1;
      const res = pRes > oRes ? 1 : (pRes < oRes ? -1 : 0);
      cumulativeScore += res;
      return { match: i + 1, points: cumulativeScore };
    })];

    // Style & Quote
    let playStyleText = "Gaya bermain: Balanced";
    let playStyleType: 'attacking' | 'defensive' | 'balanced' = 'balanced';
    
    if (stats.played > 0) {
        const avgGF = stats.gf / stats.played;
        const avgGA = stats.ga / stats.played;
        if (avgGF > 2.2) {
            playStyleText = "Gaya bermain: Attacking";
            playStyleType = 'attacking';
        } else if (avgGA < 1.2 && stats.played >= 3) {
            playStyleText = "Gaya bermain: Defensive & Counter";
            playStyleType = 'defensive';
        }
    }

    let quote = "Stabil";
    let quoteColor = "text-foreground";
    const recentResults = playerMatches.slice(0, 5).map(m => {
        const isP1 = m.player1Id === playerId;
        const s1 = m.player1Wins !== null ? m.player1Wins : (m.player1Score ?? 0);
        const s2 = m.player2Wins !== null ? m.player2Wins : (m.player2Score ?? 0);
        return (isP1 ? s1 : s2) > (isP1 ? s2 : s1) ? 'W' : ((isP1 ? s1 : s2) < (isP1 ? s2 : s1) ? 'L' : 'D');
    });

    const recentWinCount = recentResults.filter(f => f === 'W').length;
    if (recentWinCount === 5) { quote = "Merasa tak terkalahkan"; quoteColor = "text-green-400"; }
    else if (recentWinCount >= 3) { quote = "Dalam performa yang bagus"; quoteColor = "text-green-400"; }
    else if (recentResults.filter(f => f === 'L').length >= 3) { quote = "Performa sedang menurun"; quoteColor = "text-red-400"; }

    return { stats, winRate, form, chartData, playStyleText, playStyleType, quote, quoteColor, team, entry, cumulativeScore };
  };

  const projections = useMemo(() => {
    if (!leagueTable || leagueTable.length === 0) return null;
    const sortAndRank = (data: any[]) => [...data].sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor);
    const gA = sortAndRank(leagueTable.filter(p => p.group === 'A'));
    const gB = sortAndRank(leagueTable.filter(p => p.group === 'B'));
    const proj: Record<string, any> = {};
    if (gA.length >= 4 && gB.length >= 4) {
        proj['playoff-m1'] = { p1: gA[0], p2: gB[3], isProjection: true, round: 'UB-Quarter Final' };
        proj['playoff-m2'] = { p1: gB[1], p2: gA[2], isProjection: true, round: 'UB-Quarter Final' };
        proj['playoff-m3'] = { p1: gB[0], p2: gA[3], isProjection: true, round: 'UB-Quarter Final' };
        proj['playoff-m4'] = { p1: gA[1], p2: gB[2], isProjection: true, round: 'UB-Quarter Final' };
    }
    return proj;
  }, [leagueTable]);

  const bracketData = useMemo(() => {
    const data: Record<string, any> = {};
    matches.forEach(m => {
      if (m.bracketId) {
        const e1 = leagueTable.find(e => e.playerId === m.player1Id);
        const e2 = leagueTable.find(e => e.playerId === m.player2Id);
        const t1 = e1 ? teamsById[e1.teamId] : (playersById[m.player1Id] ? teamsById[playersById[m.player1Id].teamId] : null);
        const t2 = e2 ? teamsById[e2.teamId] : (playersById[m.player2Id] ? teamsById[playersById[m.player2Id].teamId] : null);
        const s1 = m.player1Wins !== null ? m.player1Wins : (m.player1Score ?? 0);
        const s2 = m.player2Wins !== null ? m.player2Wins : (m.player2Score ?? 0);
        data[m.bracketId] = {
          ...m,
          p1: e1 ? { name: e1.playerName, playerId: e1.playerId } : (playersById[m.player1Id] || { name: m.player1Id === 'TBD' ? 'TBD' : m.player1Id, playerId: m.player1Id }),
          p2: e2 ? { name: e2.playerName, playerId: e2.playerId } : (playersById[m.player2Id] || { name: m.player2Id === 'TBD' ? 'TBD' : m.player2Id, playerId: m.player2Id }),
          t1, t2, s1, s2,
          isW1: m.isCompleted && s1 > s2,
          isW2: m.isCompleted && s2 > s1
        };
      }
    });
    return data;
  }, [matches, playersById, teamsById, leagueTable]);

  const MatchCard = ({ bid, label }: { bid: string, label: string }) => {
    const m = bracketData[bid];
    const p = projections?.[bid];
    if (!m && p) {
        const t1 = p.p1?.teamId ? teamsById[p.p1.teamId] : null;
        const t2 = p.p2?.teamId ? teamsById[p.p2.teamId] : null;
        return (
            <div className="flex flex-col gap-1 opacity-60">
                <div className="flex items-center justify-between px-1">
                    <span className="text-[9px] font-black tracking-widest text-primary/60 ml-1 uppercase">{label}</span>
                    <Badge variant="outline" className="h-3 text-[7px] border-amber-500/30 text-amber-500 py-0 px-1 font-black tracking-tighter uppercase">Proyeksi</Badge>
                </div>
                <Card className="w-44 overflow-hidden border-2 border-muted border-dashed bg-card/10 cursor-pointer hover:border-primary/40 transition-all" onClick={() => handleCardClick({ ...p, player1Id: p.p1.playerId, player2Id: p.p2.playerId, t1, t2, isProjection: true, round: label, p1: { name: p.p1.playerName, playerId: p.p1.playerId }, p2: { name: p.p2.playerName, playerId: p.p2.playerId } })}>
                    <CardContent className="p-0 flex flex-col divide-y divide-border/20">
                        <div className="flex items-center justify-between px-2 py-1 h-8"><div className="flex items-center gap-1.5 overflow-hidden"><Avatar className="h-5 w-5 border border-muted/20 opacity-50"><AvatarImage src={t1?.logoUrl} /><AvatarFallback><User /></AvatarFallback></Avatar><span className="text-[10px] font-bold truncate text-foreground/50">{p.p1.playerName || 'TBD'}</span></div></div>
                        <div className="flex items-center justify-between px-2 py-1 h-8"><div className="flex items-center gap-1.5 overflow-hidden"><Avatar className="h-5 w-5 border border-muted/20 opacity-50"><AvatarImage src={t2?.logoUrl} /><AvatarFallback><User /></AvatarFallback></Avatar><span className="text-[10px] font-bold truncate text-foreground/50">{p.p2.playerName || 'TBD'}</span></div></div>
                    </CardContent>
                </Card>
            </div>
        );
    }
    if (!m) return (
        <div className="flex flex-col gap-1 opacity-40">
            <span className="text-[9px] font-black tracking-widest text-primary/60 ml-1 uppercase">{label}</span>
            <div className="w-44 h-16 bg-card/20 border border-dashed border-primary/20 rounded-lg flex flex-col items-center justify-center"><span className="text-[8px] font-bold tracking-tighter text-muted-foreground">Menunggu alur...</span></div>
        </div>
    );
    return (
        <div className="flex flex-col gap-1">
            <span className="text-[9px] font-black tracking-widest text-primary/60 ml-1 uppercase">{label}</span>
            <Card className={cn("w-44 overflow-hidden border-2 transition-all cursor-pointer hover:ring-2 hover:ring-primary/50", m.isCompleted ? "border-primary/30" : "border-primary/10 border-dashed")} onClick={() => handleCardClick(m)}>
                <CardContent className="p-0 flex flex-col divide-y divide-border">
                    <div className={cn("flex items-center justify-between px-2 py-1 bg-card h-8", m.isW1 && "bg-primary/10")}>
                        <div className="flex items-center gap-1.5 overflow-hidden"><Avatar className="h-5 w-5 border"><AvatarImage src={m.t1?.logoUrl} /><AvatarFallback><User /></AvatarFallback></Avatar><span className={cn("text-[10px] font-bold truncate", m.isW1 ? "text-primary" : "text-foreground/70")}>{m.p1.name}</span></div>
                        <span className={cn("text-xs font-mono font-bold", m.isW1 ? "text-primary" : "text-muted-foreground")}>{m.isCompleted ? m.s1 : '-'}</span>
                    </div>
                    <div className={cn("flex items-center justify-between px-2 py-1 bg-card h-8", m.isW2 && "bg-primary/10")}>
                        <div className="flex items-center gap-1.5 overflow-hidden"><Avatar className="h-5 w-5 border"><AvatarImage src={m.t2?.logoUrl} /><AvatarFallback><User /></AvatarFallback></Avatar><span className={cn("text-[10px] font-bold truncate", m.isW2 ? "text-primary" : "text-foreground/70")}>{m.p2.name}</span></div>
                        <span className={cn("text-xs font-mono font-bold", m.isW2 ? "text-primary" : "text-muted-foreground")}>{m.isCompleted ? m.s2 : '-'}</span>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
  };

  const analysis1 = useMemo(() => selectedMatch ? getPlayerAnalysis(selectedMatch.player1Id) : null, [selectedMatch, matches, leagueTable, teamsById, playersById]);
  const analysis2 = useMemo(() => selectedMatch ? getPlayerAnalysis(selectedMatch.player2Id) : null, [selectedMatch, matches, leagueTable, teamsById, playersById]);

  const sharedChartDomain = useMemo(() => {
    const defaultDomain = [-5, 5];
    if (!analysis1 && !analysis2) return defaultDomain;
    
    const points1 = analysis1?.chartData.map(d => d.points) || [];
    const points2 = analysis2?.chartData.map(d => d.points) || [];
    const allPoints = [...points1, ...points2];
    
    if (allPoints.length === 0) return defaultDomain;
    
    const maxVal = Math.max(...allPoints.map(Math.abs));
    const finalMax = Math.max(maxVal, 5); // Ensure at least a range of 5
    return [-finalMax, finalMax];
  }, [analysis1, analysis2]);

  const chartConfig = { points: { label: "Trend", color: "hsl(var(--primary))" } } satisfies ChartConfig;

  // Helper to get playstyle class
  const getPlayStyleClass = (type: 'attacking' | 'defensive' | 'balanced') => {
    switch (type) {
        case 'attacking': return "bg-red-500/20 text-red-400 border-red-500/30";
        case 'defensive': return "bg-blue-500/20 text-blue-400 border-blue-500/30";
        default: return "bg-primary/20 text-primary border-primary/30";
    }
  }

  return (
    <div className="w-full">
        {(!matches || matches.filter(m => m.bracketId).length === 0) && leagueTable.length > 0 && (
            <div className="mb-6 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex items-start gap-3">
                <Info className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-200/80 leading-relaxed">
                    <p className="font-bold text-amber-500 tracking-tight mb-1">Mode live preview (Proyeksi)</p>
                    <p>Bagan di bawah ini adalah proyeksi otomatis berdasarkan klasemen grup saat ini. Jadwal resmi akan muncul setelah Admin menekan tombol "Start Playoff".</p>
                </div>
            </div>
        )}

        <div ref={scrollRef} onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseLeave} className="w-full overflow-x-auto pb-6 cursor-grab active:cursor-grabbing scrollbar-thin scrollbar-thumb-primary/20">
            <div className="min-w-[1400px] flex items-stretch gap-10 p-4">
                <div className="flex-1 flex flex-col gap-12">
                    <div className="space-y-4">
                        <h3 className="text-sm font-black tracking-[0.3em] text-primary flex items-center gap-2 uppercase"><div className="h-4 w-1 bg-primary" /> Upper bracket (Double Life)</h3>
                        <div className="flex items-center gap-8 pl-4">
                            <div className="flex flex-col gap-4"><MatchCard bid="playoff-m1" label="UB-QF 1" /><MatchCard bid="playoff-m2" label="UB-QF 2" /><MatchCard bid="playoff-m3" label="UB-QF 3" /><MatchCard bid="playoff-m4" label="UB-QF 4" /></div>
                            <div className="flex flex-col gap-20 py-8"><MatchCard bid="playoff-m9" label="UB-Semi 1" /><MatchCard bid="playoff-m10" label="UB-Semi 2" /></div>
                            <div className="flex flex-col justify-center h-full"><MatchCard bid="playoff-m15" label="UB final" /></div>
                        </div>
                    </div>
                    <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
                    <div className="space-y-4">
                        <h3 className="text-sm font-black tracking-[0.3em] text-amber-500 flex items-center gap-2 uppercase"><div className="h-4 w-1 bg-amber-500" /> Lower bracket (Elimination)</h3>
                        <div className="flex items-center gap-8 pl-4">
                            <div className="flex flex-col gap-4"><MatchCard bid="playoff-m5" label="LB-R1" /><MatchCard bid="playoff-m6" label="LB-R1" /><MatchCard bid="playoff-m7" label="LB-R1" /><MatchCard bid="playoff-m8" label="LB-R1" /></div>
                            <div className="flex flex-col gap-24 py-12"><MatchCard bid="playoff-m11" label="LB-R2" /><MatchCard bid="playoff-m12" label="LB-R2" /></div>
                            <div className="flex flex-col gap-24 py-12"><MatchCard bid="playoff-m13" label="LB-R3" /><MatchCard bid="playoff-m14" label="LB-R3" /></div>
                            <div className="flex flex-col justify-center h-full"><MatchCard bid="playoff-m16" label="LB semifinal" /></div>
                            <div className="flex flex-col justify-center h-full"><MatchCard bid="playoff-m17" label="LB final" /></div>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col items-center justify-center gap-6 pl-10 border-l border-primary/10">
                    <div className="flex flex-col items-center gap-4">
                        <div className="relative"><div className="absolute -inset-4 bg-yellow-400/20 rounded-full blur-xl animate-pulse" /><Trophy className="text-yellow-400 w-14 h-14 relative z-10 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" /></div>
                        <div className="text-center space-y-1"><h3 className="text-xl font-black tracking-[0.4em] text-white uppercase">Grand final</h3><p className="text-[9px] font-bold text-primary tracking-widest opacity-80 uppercase">Ultimate Battle for Glory</p></div>
                    </div>
                    <div className="scale-125 transform transition-transform hover:scale-150 py-10"><MatchCard bid="playoff-m18" label="Championship" /></div>
                </div>
            </div>
        </div>

        <Dialog open={!!selectedMatch} onOpenChange={(o) => !o && setSelectedMatch(null)}>
            <DialogContent className="max-w-4xl border-primary border-2 p-0 overflow-hidden bg-[#0A192F]/95 backdrop-blur-xl max-h-[95vh] overflow-y-auto">
                <div className="p-8 space-y-8">
                    <DialogHeader>
                        <div className="flex items-center gap-2 text-primary">
                            <Activity className="w-6 h-6" />
                            <DialogTitle className="text-3xl font-black tracking-tighter uppercase">Analisis Tren & Momentum <span className="text-white/50">({selectedMatch?.round || 'Playoff'})</span></DialogTitle>
                        </div>
                        <DialogDescription className="text-base text-white/60">Perbandingan stabilitas hasil seluruh pertandingan (Grup + Playoff) masing-masing peserta.</DialogDescription>
                    </DialogHeader>

                    <div className="flex justify-center">
                        <div className="bg-primary/5 border border-primary/30 rounded-xl p-4 flex flex-col items-center gap-2 min-w-[300px]">
                            <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Rencana pertandingan (Informasi saja)</p>
                            <div className="flex items-center gap-6 text-primary">
                                <div className="flex items-center gap-2 font-bold"><Calendar className="w-4 h-4" /> {selectedMatch?.matchDate ? format(selectedMatch.matchDate.toDate(), 'eeee, d MMMM yyyy', { locale: localeId }) : 'TBD'}</div>
                                <div className="h-4 w-px bg-primary/30" />
                                <div className="flex items-center gap-2 font-bold"><Clock className="w-4 h-4" /> {selectedMatch?.matchDate ? format(selectedMatch.matchDate.toDate(), 'HH:mm') : 'TBD'}</div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                        <div className="flex flex-col items-center text-center gap-4">
                            {analysis1 ? (
                                <>
                                    <Avatar className="h-24 w-24 border-4 border-primary shadow-2xl shadow-primary/20"><AvatarImage src={analysis1.team?.logoUrl} /><AvatarFallback><User /></AvatarFallback></Avatar>
                                    <div>
                                        <h3 className="text-2xl font-black tracking-tight">{selectedMatch.p1?.name}</h3>
                                        <p className="text-xs font-bold text-white/50 uppercase tracking-widest">{analysis1.team?.name || 'Tanpa Tim'}</p>
                                        <Badge variant="outline" className="mt-2 bg-yellow-400/10 border-yellow-400/50 text-yellow-400 font-black px-3">GRUP {analysis1.entry?.group || 'A'} RANK : {analysis1.entry?.rank || '?'}</Badge>
                                        <div className="mt-2">
                                            <Badge className={cn("text-[9px] font-black uppercase tracking-tighter px-2 py-0.5 border", getPlayStyleClass(analysis1.playStyleType))}>
                                                {analysis1.playStyleText}
                                            </Badge>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="flex flex-col items-center gap-4">
                                    <div className="h-24 w-24 rounded-full bg-white/5 border-4 border-dashed border-white/10 flex items-center justify-center"><User className="w-10 h-10 text-white/20" /></div>
                                    <div>
                                        <h3 className="text-2xl font-black tracking-tight text-white/30">Menunggu Peserta</h3>
                                        <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] mt-1">Belum ditentukan</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col items-center justify-center">
                            <div className="bg-primary border-4 border-background rounded-full w-16 h-16 flex items-center justify-center shadow-[0_0_30px_rgba(204,253,1,0.4)] ring-8 ring-primary/10">
                                <span className="text-black font-black text-2xl tracking-tighter italic italic-none">VS</span>
                            </div>
                        </div>

                        <div className="flex flex-col items-center text-center gap-4">
                            {analysis2 ? (
                                <>
                                    <Avatar className="h-24 w-24 border-4 border-white shadow-2xl"><AvatarImage src={analysis2.team?.logoUrl} /><AvatarFallback><User /></AvatarFallback></Avatar>
                                    <div>
                                        <h3 className="text-2xl font-black tracking-tight">{selectedMatch.p2?.name}</h3>
                                        <p className="text-xs font-bold text-white/50 uppercase tracking-widest">{analysis2.team?.name || 'Tanpa Tim'}</p>
                                        <Badge variant="outline" className="mt-2 bg-yellow-400/10 border-yellow-400/50 text-yellow-400 font-black px-3">GRUP {analysis2.entry?.group || 'B'} RANK : {analysis2.entry?.rank || '?'}</Badge>
                                        <div className="mt-2">
                                            <Badge className={cn("text-[9px] font-black uppercase tracking-tighter px-2 py-0.5 border", getPlayStyleClass(analysis2.playStyleType))}>
                                                {analysis2.playStyleText}
                                            </Badge>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="flex flex-col items-center gap-4">
                                    <div className="h-24 w-24 rounded-full bg-white/5 border-4 border-dashed border-white/10 flex items-center justify-center"><User className="w-10 h-10 text-white/20" /></div>
                                    <div>
                                        <h3 className="text-2xl font-black tracking-tight text-white/30">Menunggu Peserta</h3>
                                        <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] mt-1">Belum ditentukan</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-12 pt-4">
                        <div className="space-y-6">
                            {analysis1 && analysis1.stats.played > 0 ? (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                                            <p className="text-[10px] font-bold text-white/40 uppercase mb-1">Win Rate</p>
                                            <p className="text-2xl font-black text-primary">% {analysis1.winRate.toFixed(0)}</p>
                                        </div>
                                        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                                            <p className="text-[10px] font-bold text-white/40 uppercase mb-1">Poin Grup</p>
                                            <p className="text-2xl font-black text-white">{analysis1.entry?.points || 0}</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-6 gap-1">
                                        {[
                                            { label: 'W', val: analysis1.stats.win, col: 'text-primary' },
                                            { label: 'D', val: analysis1.stats.draw, col: 'text-yellow-400' },
                                            { label: 'L', val: analysis1.stats.loss, col: 'text-red-400' },
                                            { label: 'GF', val: analysis1.stats.gf, col: 'text-white' },
                                            { label: 'GA', val: analysis1.stats.ga, col: 'text-white' },
                                            { label: 'GD', val: analysis1.stats.gf - analysis1.stats.ga, col: 'text-primary' }
                                        ].map((s, i) => (
                                            <div key={i} className="flex flex-col items-center bg-white/5 p-2 rounded">
                                                <p className="text-[8px] font-bold text-white/30">{s.label}</p>
                                                <p className={cn("text-xs font-black", s.col)}>{s.val}</p>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <p className="text-[10px] font-black text-white/40 uppercase"><History className="inline w-3 h-3 mr-1" /> Laga Terakhir</p>
                                        <div className="flex gap-1.5">
                                            {analysis1.form.map((f, i) => (
                                                <div key={i} className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border", f === 'W' ? "bg-green-500/20 text-green-400 border-green-500/50" : (f === 'L' ? "bg-red-500/20 text-red-400 border-red-500/50" : "bg-yellow-500/20 text-yellow-400 border-yellow-500/50"))}>{f}</div>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="h-40 bg-white/[0.02] rounded-xl border border-dashed border-white/5 flex items-center justify-center">
                                    <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Statistik belum tersedia</p>
                                </div>
                            )}
                        </div>

                        <div className="space-y-6">
                            {analysis2 && analysis2.stats.played > 0 ? (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                                            <p className="text-[10px] font-bold text-white/40 uppercase mb-1">Win Rate</p>
                                            <p className="text-2xl font-black text-primary">% {analysis2.winRate.toFixed(0)}</p>
                                        </div>
                                        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                                            <p className="text-[10px] font-bold text-white/40 uppercase mb-1">Poin Grup</p>
                                            <p className="text-2xl font-black text-white">{analysis2.entry?.points || 0}</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-6 gap-1">
                                        {[
                                            { label: 'W', val: analysis2.stats.win, col: 'text-primary' },
                                            { label: 'D', val: analysis2.stats.draw, col: 'text-yellow-400' },
                                            { label: 'L', val: analysis2.stats.loss, col: 'text-red-400' },
                                            { label: 'GF', val: analysis2.stats.gf, col: 'text-white' },
                                            { label: 'GA', val: analysis2.stats.ga, col: 'text-white' },
                                            { label: 'GD', val: analysis2.stats.gf - analysis2.stats.ga, col: 'text-primary' }
                                        ].map((s, i) => (
                                            <div key={i} className="flex flex-col items-center bg-white/5 p-2 rounded">
                                                <p className="text-[8px] font-bold text-white/30">{s.label}</p>
                                                <p className={cn("text-xs font-black", s.col)}>{s.val}</p>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <p className="text-[10px] font-black text-white/40 uppercase"><History className="inline w-3 h-3 mr-1" /> Laga Terakhir</p>
                                        <div className="flex gap-1.5">
                                            {analysis2.form.map((f, i) => (
                                                <div key={i} className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border", f === 'W' ? "bg-green-500/20 text-green-400 border-green-500/50" : (f === 'L' ? "bg-red-500/20 text-red-400 border-red-500/50" : "bg-yellow-500/20 text-yellow-400 border-yellow-500/50"))}>{f}</div>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="h-40 bg-white/[0.02] rounded-xl border border-dashed border-white/5 flex items-center justify-center">
                                    <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Statistik belum tersedia</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-center gap-2 text-primary"><TrendingUp className="w-5 h-5" /> <h4 className="text-sm font-black tracking-widest uppercase">Grafik Stabilitas Individu</h4></div>
                        <div className="grid grid-cols-2 gap-8">
                            <Card className="bg-white/5 border-white/10">
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-center">
                                        <CardTitle className="text-[10px] font-black tracking-widest text-primary uppercase"><Zap className="inline w-3 h-3 mr-1" /> Tren {selectedMatch?.p1?.name || 'TBD'}</CardTitle>
                                        {analysis1 && analysis1.stats.played > 0 && <Badge variant="outline" className="bg-primary/10 border-primary/30 text-primary text-[10px] font-black">+{analysis1.cumulativeScore} PTS</Badge>}
                                    </div>
                                    {analysis1 && analysis1.stats.played > 0 && <p className={cn("text-[9px] font-black mt-1", analysis1.quoteColor)}>"{analysis1.quote}"</p>}
                                </CardHeader>
                                <CardContent>
                                    {analysis1 && analysis1.stats.played > 0 ? (
                                        <ChartContainer config={chartConfig} className="h-40 w-full">
                                            <LineChart data={analysis1.chartData} margin={{ left: -20, right: 10, top: 10 }}>
                                                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                                <XAxis dataKey="match" hide />
                                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }} domain={sharedChartDomain} />
                                                <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" strokeDasharray="3 3" />
                                                <Line type="monotone" dataKey="points" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ fill: 'hsl(var(--primary))', r: 4 }} activeDot={{ r: 6 }} />
                                            </LineChart>
                                        </ChartContainer>
                                    ) : (
                                        <div className="h-40 flex flex-col items-center justify-center gap-2 opacity-20">
                                            <Loader2 className="w-6 h-6 animate-spin" />
                                            <p className="text-[8px] font-black uppercase tracking-[0.2em]">Menanti Peserta...</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <Card className="bg-white/5 border-white/10">
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-center">
                                        <CardTitle className="text-[10px] font-black tracking-widest text-primary uppercase"><Zap className="inline w-3 h-3 mr-1" /> Tren {selectedMatch?.p2?.name || 'TBD'}</CardTitle>
                                        {analysis2 && analysis2.stats.played > 0 && <Badge variant="outline" className="bg-yellow-400/10 border-yellow-400/30 text-yellow-400 text-[10px] font-black">+{analysis2.cumulativeScore} PTS</Badge>}
                                    </div>
                                    {analysis2 && analysis2.stats.played > 0 && <p className={cn("text-[9px] font-black mt-1", analysis2.quoteColor)}>"{analysis2.quote}"</p>}
                                </CardHeader>
                                <CardContent>
                                    {analysis2 && analysis2.stats.played > 0 ? (
                                        <ChartContainer config={chartConfig} className="h-40 w-full">
                                            <LineChart data={analysis2.chartData} margin={{ left: -20, right: 10, top: 10 }}>
                                                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                                <XAxis dataKey="match" hide />
                                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }} domain={sharedChartDomain} />
                                                <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" strokeDasharray="3 3" />
                                                <Line type="monotone" dataKey="points" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ fill: 'hsl(var(--primary))', r: 4 }} activeDot={{ r: 6 }} />
                                            </LineChart>
                                        </ChartContainer>
                                    ) : (
                                        <div className="h-40 flex flex-col items-center justify-center gap-2 opacity-20">
                                            <Loader2 className="w-6 h-6 animate-spin" />
                                            <p className="text-[8px] font-black uppercase tracking-[0.2em]">Menanti Peserta...</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                        <p className="text-[10px] text-center text-white/30 font-medium">*Grafik menunjukkan akumulasi hasil positif (+1 Menang) vs negatif (-1 Kalah). Garis yang terus naik menandakan stabilitas performa yang tinggi.</p>
                    </div>

                    <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Babak kompetisi saat ini:</p>
                            <Badge className="bg-yellow-400/20 text-yellow-400 border-yellow-400/30 font-black uppercase text-[10px] px-4 py-1">{selectedMatch?.round || 'Playoff Stage'}</Badge>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    </div>
  );
}