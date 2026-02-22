'use client';

import { useMemo, useState, useRef } from 'react';
import type { Match, Season, Team, Player, WithId, LeagueEntry } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Swords, Trophy, User, TrendingUp, Info, History, Calendar, Clock, Activity, ShieldCheck, Target, Zap, ShieldAlert, Loader2, Award, Flame, ChevronRight, Binary, BarChart3, Scan } from 'lucide-react';
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
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from './ui/tooltip';

interface TournamentBracketProps {
  matches: WithId<Match>[];
  playersById: Record<string, WithId<Player>>;
  teamsById: Record<string, WithId<Team>>;
  leagueTable: (WithId<LeagueEntry> & { player?: WithId<Player>, team?: WithId<Team> })[];
  season: WithId<Season> | null;
  isAdmin?: boolean;
  defendingChampionId?: string;
}

export function TournamentBracket({ matches, playersById, teamsById, leagueTable, season, isAdmin = false, defendingChampionId }: TournamentBracketProps) {
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

  const rankedTable = useMemo(() => {
    if (!leagueTable || leagueTable.length === 0) return [];
    
    const sortFn = (a: any, b: any) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
      return a.playerName.localeCompare(b.playerName);
    };

    if (season?.type === 'Hybrid') {
      const gA = [...leagueTable].filter(p => p.group === 'A').sort(sortFn).map((p, i) => ({ ...p, rank: i + 1 }));
      const gB = [...leagueTable].filter(p => p.group === 'B').sort(sortFn).map((p, i) => ({ ...p, rank: i + 1 }));
      return [...gA, ...gB];
    }
    
    return [...leagueTable].sort(sortFn).map((p, i) => ({ ...p, rank: i + 1 }));
  }, [leagueTable, season]);

  const getPlayerAnalysis = (playerId: string) => {
    if (!playerId || playerId === 'TBD' || playerId.includes('TBD') || playerId.includes('Loser')) return null;

    const playerMatches = matches
      .filter(m => m.isCompleted && (m.player1Id === playerId || m.player2Id === playerId))
      .sort((a, b) => a.matchDate.toMillis() - b.matchDate.toMillis());

    const entry = rankedTable.find(e => e.playerId === playerId);
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
    const formMatches = [...playerMatches].reverse().slice(0, 5).reverse();
    const form = formMatches.map(m => {
      const isP1 = m.player1Id === playerId;
      const s1 = m.player1Wins !== null ? m.player1Wins : (m.player1Score ?? 0);
      const s2 = m.player2Wins !== null ? m.player2Wins : (m.player2Score ?? 0);
      const pRes = isP1 ? s1 : s2;
      const oRes = isP1 ? s2 : s1;
      return pRes > oRes ? 'W' : (pRes < oRes ? 'L' : 'D');
    });

    let cumulativeScore = 0;
    const chartData = [{ match: 0, points: 0 }, ...playerMatches.map((m, i) => {
      const isP1 = m.player1Id === playerId;
      const s1 = m.player1Wins !== null ? m.player1Wins : (m.player1Score ?? 0);
      const s2 = m.player2Wins !== null ? m.player2Wins : (m.player2Score ?? 0);
      const pRes = isP1 ? s1 : s2;
      const oRes = isP1 ? s2 : s1;
      const res = pRes > oRes ? 1 : (pRes < oRes ? -1 : 0);
      cumulativeScore += res;
      return { match: i + 1, points: cumulativeScore };
    })];

    let playStyleText = "Gaya bermain: Balanced";
    let playStyleType: 'attacking' | 'defensive' | 'balanced' = 'balanced';
    
    if (stats.played > 0) {
        const avgGF = stats.gf / stats.played;
        const avgGA = stats.ga / stats.played;
        if (avgGF > 1.6) {
            playStyleText = "Gaya bermain: Attacking";
            playStyleType = 'attacking';
        } else if (avgGA < 1.2 && stats.played >= 3) {
            playStyleText = "Gaya bermain: Defensive & Counter";
            playStyleType = 'defensive';
        }
    }

    let quote = "Stabil";
    let quoteColor = "text-foreground";
    const recentWinCount = form.filter(f => f === 'W').length;
    if (recentWinCount === 5) { quote = "Tak terkalahkan"; quoteColor = "text-green-400"; }
    else if (recentWinCount >= 3) { quote = "Performa bagus"; quoteColor = "text-green-400"; }
    else if (form.filter(f => f === 'L').length >= 3) { quote = "Performa menurun"; quoteColor = "text-red-400"; }

    return { 
      stats, 
      winRate, 
      form, 
      chartData, 
      playStyleText, 
      playStyleType, 
      quote, 
      quoteColor, 
      team, 
      entry, 
      cumulativeScore, 
      isDefendingChampion: playerId === defendingChampionId 
    };
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

    if (gA.length >= 6 && gB.length >= 6) {
        proj['playoff-m5'] = { p1: gA[4], p2: { playerName: 'Loser UB-QF 1', playerId: 'TBD-L1' }, isProjection: true, round: 'LB-Round 1' };
        proj['playoff-m6'] = { p1: gB[4], p2: { playerName: 'Loser UB-QF 2', playerId: 'TBD-L2' }, isProjection: true, round: 'LB-Round 1' };
        proj['playoff-m7'] = { p1: gA[5], p2: { playerName: 'Loser UB-QF 3', playerId: 'TBD-L3' }, isProjection: true, round: 'LB-Round 1' };
        proj['playoff-m8'] = { p1: gB[5], p2: { playerName: 'Loser UB-QF 4', playerId: 'TBD-L4' }, isProjection: true, round: 'LB-Round 1' };
    }
    
    return proj;
  }, [leagueTable]);

  const bracketData = useMemo(() => {
    const data: Record<string, any> = {};
    matches.forEach(m => {
      if (m.bracketId) {
        const e1 = rankedTable.find(e => e.playerId === m.player1Id);
        const e2 = rankedTable.find(e => e.playerId === m.player2Id);
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
  }, [matches, playersById, teamsById, rankedTable]);

  const MatchCard = ({ bid, label }: { bid: string, label: string }) => {
    const m = bracketData[bid];
    const p = projections?.[bid];
    
    if (!m && p) {
        const t1 = p.p1?.teamId ? teamsById[p.p1.teamId] : null;
        const t2 = p.p2?.teamId ? teamsById[p.p2.teamId] : null;
        return (
            <div className="flex flex-col gap-1 opacity-70 group/card relative items-center">
                <div className="flex items-center justify-center gap-2 px-1">
                    <span className="text-[8px] font-black tracking-[0.2em] text-primary/40 uppercase">{label}</span>
                    <Badge variant="outline" className="h-3.5 text-[7px] border-amber-500/30 text-amber-500 py-0 px-1 font-black tracking-tighter uppercase italic">Projection</Badge>
                </div>
                <Card 
                    className="w-52 overflow-hidden border-2 border-white/5 border-dashed bg-white/[0.03] cursor-pointer hover:border-primary/40 transition-all duration-500 hover:scale-[1.02] shadow-xl rounded-xl" 
                    onClick={() => handleCardClick({ ...p, player1Id: p.p1.playerId || 'TBD', player2Id: p.p2.playerId || 'TBD', t1, t2, isProjection: true, round: label, p1: { name: p.p1.playerName || p.p1.name, playerId: p.p1.playerId }, p2: { name: p.p2.playerName || p.p2.name, playerId: p.p2.playerId } })}
                >
                    <CardContent className="p-0 flex flex-col divide-y divide-white/5 relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-transparent pointer-events-none" />
                        <div className="flex items-center justify-between px-3 py-2 h-11">
                            <div className="flex items-center gap-2 overflow-hidden">
                                <Avatar className="h-7 w-7 border border-white/10 opacity-40"><AvatarImage src={t1?.logoUrl} /><AvatarFallback><User className="w-3 h-3"/></AvatarFallback></Avatar>
                                <span className="text-[11px] font-black truncate text-white/30 uppercase italic pr-2">{p.p1.playerName || p.p1.name || 'TBD'}</span>
                            </div>
                        </div>
                        <div className="flex items-center justify-between px-3 py-2 h-11">
                            <div className="flex items-center gap-2 overflow-hidden">
                                <Avatar className="h-7 w-7 border border-white/10 opacity-40"><AvatarImage src={t2?.logoUrl} /><AvatarFallback><User className="w-3 h-3"/></AvatarFallback></Avatar>
                                <span className="text-[11px] font-black truncate text-white/30 uppercase italic pr-2">{p.p2.playerName || p.p2.name || 'TBD'}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }
    
    if (!m) return (
        <div className="flex flex-col gap-1 opacity-30 items-center">
            <span className="text-[8px] font-black tracking-[0.2em] text-white/20 uppercase">{label}</span>
            <div className="w-52 h-24 bg-black/20 border-2 border-dashed border-white/5 rounded-xl flex flex-col items-center justify-center gap-2">
                <div className="relative">
                    <div className="absolute inset-0 rounded-full border border-primary/20 animate-ping" />
                    <Loader2 className="w-4 h-4 text-white/10 animate-spin" />
                </div>
                <span className="text-[7px] font-black tracking-[0.3em] text-white/10 uppercase">CALIBRATING PATH</span>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col gap-1 group/card relative items-center">
            <span className="text-[8px] font-black tracking-[0.2em] text-primary/60 uppercase">{label}</span>
            <Card 
                className={cn(
                    "w-52 overflow-hidden border-2 transition-all duration-500 cursor-pointer hover:ring-4 hover:ring-primary/20 hover:scale-[1.02] shadow-2xl rounded-xl", 
                    m.isCompleted ? "border-primary/20 bg-card/60 backdrop-blur-xl" : "border-white/10 bg-white/5 border-dashed"
                )} 
                onClick={() => handleCardClick(m)}
            >
                <CardContent className="p-0 flex flex-col divide-y divide-white/5">
                    {/* Player 1 Row */}
                    <div className={cn("flex items-center justify-between px-3 py-2 h-11 transition-all duration-500 relative", m.isW1 ? "bg-primary/10" : "bg-transparent")}>
                        {m.isW1 && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary shadow-[0_0_10px_rgba(204,253,1,0.6)]" />}
                        <div className="flex items-center gap-2 overflow-hidden">
                            <div className="relative">
                                <Avatar className={cn("h-7 w-7 border-2 transition-all duration-500", m.isW1 ? "border-primary shadow-[0_0_10px_rgba(204,253,1,0.3)] scale-110" : "border-white/10")}>
                                    <AvatarImage src={m.t1?.logoUrl} />
                                    <AvatarFallback><User className="w-3 h-3"/></AvatarFallback>
                                </Avatar>
                                {m.isW1 && <div className="absolute -top-1.5 -right-1.5 bg-primary rounded-full p-0.5 border border-background animate-bounce"><Trophy className="w-2.5 h-2.5 text-black"/></div>}
                            </div>
                            <span className={cn("text-[11px] font-black truncate uppercase italic pr-2 transition-colors", m.isW1 ? "text-primary drop-shadow-[0_0_5px_rgba(204,253,1,0.3)]" : "text-white/60")}>{m.p1.name}</span>
                        </div>
                        <div className={cn("px-2 py-0.5 rounded bg-black/40 border border-white/5 min-w-[24px] text-center", m.isW1 && "border-primary/30")}>
                            <span className={cn("text-sm font-black italic tabular-nums leading-none", m.isW1 ? "text-primary" : "text-white/30")}>{m.isCompleted ? m.s1 : '-'}</span>
                        </div>
                    </div>
                    {/* Player 2 Row */}
                    <div className={cn("flex items-center justify-between px-3 py-2 h-11 transition-all duration-500 relative", m.isW2 ? "bg-primary/10" : "bg-transparent")}>
                        {m.isW2 && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary shadow-[0_0_10px_rgba(204,253,1,0.6)]" />}
                        <div className="flex items-center gap-2 overflow-hidden">
                            <div className="relative">
                                <Avatar className={cn("h-7 w-7 border-2 transition-all duration-500", m.isW2 ? "border-primary shadow-[0_0_10px_rgba(204,253,1,0.3)] scale-110" : "border-white/10")}>
                                    <AvatarImage src={m.t2?.logoUrl} />
                                    <AvatarFallback><User className="w-3 h-3"/></AvatarFallback>
                                </Avatar>
                                {m.isW2 && <div className="absolute -top-1.5 -right-1.5 bg-primary rounded-full p-0.5 border border-background animate-bounce"><Trophy className="w-2.5 h-2.5 text-black"/></div>}
                            </div>
                            <span className={cn("text-[11px] font-black truncate uppercase italic pr-2 transition-colors", m.isW2 ? "text-primary drop-shadow-[0_0_5px_rgba(204,253,1,0.3)]" : "text-white/60")}>{m.p2.name}</span>
                        </div>
                        <div className={cn("px-2 py-0.5 rounded bg-black/40 border border-white/5 min-w-[24px] text-center", m.isW2 && "border-primary/30")}>
                            <span className={cn("text-sm font-black italic tabular-nums leading-none", m.isW2 ? "text-primary" : "text-white/30")}>{m.isCompleted ? m.s2 : '-'}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
  };

  const analysis1 = useMemo(() => selectedMatch ? getPlayerAnalysis(selectedMatch.player1Id) : null, [selectedMatch, matches, rankedTable, teamsById, playersById, defendingChampionId]);
  const analysis2 = useMemo(() => selectedMatch ? getPlayerAnalysis(selectedMatch.player2Id) : null, [selectedMatch, matches, rankedTable, teamsById, playersById, defendingChampionId]);

  const sharedChartDomain = useMemo(() => {
    const defaultDomain = [-5, 5];
    if (!analysis1 && !analysis2) return defaultDomain;
    const points1 = analysis1?.chartData.map(d => d.points) || [];
    const points2 = analysis2?.chartData.map(d => d.points) || [];
    const allPoints = [...points1, ...points2];
    if (allPoints.length === 0) return defaultDomain;
    const maxVal = Math.max(...allPoints.map(Math.abs));
    const finalMax = Math.max(maxVal, 5); 
    return [-finalMax, finalMax];
  }, [analysis1, analysis2]);

  const chartConfig = { points: { label: "Trend", color: "hsl(var(--primary))" } } satisfies ChartConfig;

  const getPlayStyleClass = (type: 'attacking' | 'defensive' | 'balanced') => {
    switch (type) {
        case 'attacking': return "bg-red-500/20 text-red-400 border-red-500/30";
        case 'defensive': return "bg-blue-500/20 text-blue-400 border-blue-500/30";
        default: return "bg-primary/20 text-primary border-primary/30";
    }
  }

  return (
    <div className="w-full relative">
        {/* Decorative Watermark Overlay */}
        <div className="absolute top-0 right-0 pointer-events-none opacity-[0.03] flex flex-col items-end pt-4 pr-10">
            <span className="text-[12rem] font-black italic select-none leading-none tracking-tighter">BRACKET</span>
            <span className="text-[4rem] font-black italic select-none -mt-10 tracking-[0.8em]">BATTLE STATION</span>
        </div>

        {(!matches || matches.filter(m => m.bracketId).length === 0) && leagueTable.length > 0 && (
            <div className="mb-10 group/sim px-8">
                <div className="relative overflow-hidden bg-amber-500/[0.03] border-2 border-amber-500/20 rounded-2xl p-6 backdrop-blur-xl animate-in fade-in slide-in-from-top-4 duration-700">
                    <div className="absolute top-0 left-0 w-1 h-full bg-amber-500 animate-pulse" />
                    <div className="flex items-start gap-5">
                        <div className="p-3.5 rounded-xl bg-amber-500/10 text-amber-500 shadow-lg ring-1 ring-amber-500/20">
                            <Scan className="w-7 h-7" />
                        </div>
                        <div className="flex-1 pt-1">
                            <div className="flex items-center gap-3 mb-2">
                                <Badge className="bg-amber-500 text-black font-black uppercase italic tracking-tighter px-3">Live Simulation v2.4</Badge>
                                <div className="flex gap-1">
                                    {[...Array(3)].map((_, i) => <div key={i} className="w-1 h-1 rounded-full bg-amber-500/40 animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />)}
                                </div>
                            </div>
                            <p className="text-base font-bold text-amber-200/90 leading-tight">Bagan ini adalah proyeksi dinamis berdasarkan peringkat grup saat ini. Jadwal final akan dikunci saat Admin memulai babak playoff.</p>
                        </div>
                    </div>
                </div>
            </div>
        )}

        <div ref={scrollRef} onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseLeave} className="w-full overflow-x-auto pb-12 cursor-grab active:cursor-grabbing no-scrollbar">
            <div className="min-w-[1600px] flex items-stretch gap-10 p-8">
                {/* Main Tournament Column (Upper + Lower) */}
                <div className="flex-1 flex flex-col gap-2 relative">
                    
                    {/* Upper Bracket Vibrant Container */}
                    <div className="flex-1 relative group/ub bg-primary/[0.02] border-2 border-primary/10 rounded-[2.5rem] p-10 backdrop-blur-sm transition-all duration-700 hover:bg-primary/[0.04] hover:border-primary/20">
                        <div className="space-y-10 relative h-full flex flex-col justify-center">
                            <div className="flex items-center gap-5">
                                <div className="h-10 w-2 bg-primary rounded-full shadow-[0_0_20px_rgba(204,253,1,0.8)]" />
                                <div className="flex flex-col">
                                    <h3 className="text-2xl font-black tracking-[0.4em] text-primary uppercase italic">Upper Bracket</h3>
                                    <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">Survivor Protocol: Double Life Enabled</span>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-4 pl-8">
                                {/* QF */}
                                <div className="flex flex-col gap-8 relative">
                                    <MatchCard bid="playoff-m1" label="UB Quarter 1" />
                                    <MatchCard bid="playoff-m2" label="UB Quarter 2" />
                                    <MatchCard bid="playoff-m3" label="UB Quarter 3" />
                                    <MatchCard bid="playoff-m4" label="UB Quarter 4" />
                                </div>
                                
                                <div className="flex flex-col gap-40 py-16 opacity-30">
                                    <div className="flex items-center justify-center h-24"><ChevronRight className="w-4 h-4 text-primary"/></div>
                                    <div className="flex items-center justify-center h-24"><ChevronRight className="w-4 h-4 text-primary"/></div>
                                </div>

                                {/* Semi */}
                                <div className="flex flex-col gap-40 py-16">
                                    <MatchCard bid="playoff-m9" label="UB Semifinal 1" />
                                    <MatchCard bid="playoff-m10" label="UB Semifinal 2" />
                                </div>

                                <div className="flex flex-col justify-center h-full opacity-30">
                                    <div className="flex items-center justify-center h-24"><ChevronRight className="w-5 h-5 text-primary"/></div>
                                </div>

                                {/* UB Final */}
                                <div className="flex flex-col justify-center h-full">
                                    <MatchCard bid="playoff-m15" label="Upper Final" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Lower Bracket Vibrant Container */}
                    <div className="flex-1 relative group/lb bg-yellow-500/[0.02] border-2 border-yellow-500/10 rounded-[2.5rem] p-10 backdrop-blur-sm transition-all duration-700 hover:bg-yellow-500/[0.04] hover:border-yellow-500/20">
                        <div className="space-y-10 relative h-full flex flex-col justify-center">
                            <div className="flex items-center gap-5">
                                <div className="h-10 w-2 bg-amber-500 rounded-full shadow-[0_0_20px_rgba(245,158,11,0.8)]" />
                                <div className="flex flex-col">
                                    <h3 className="text-2xl font-black tracking-[0.4em] text-amber-500 uppercase italic">Lower Bracket</h3>
                                    <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">Extermination Protocol: Sudden Death</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 pl-8">
                                {/* R1 */}
                                <div className="flex flex-col gap-8">
                                    <MatchCard bid="playoff-m5" label="LB Round 1" />
                                    <MatchCard bid="playoff-m6" label="LB Round 1" />
                                    <MatchCard bid="playoff-m7" label="LB Round 1" />
                                    <MatchCard bid="playoff-m8" label="LB Round 1" />
                                </div>

                                <div className="flex flex-col gap-40 py-16 opacity-30">
                                    <div className="flex items-center justify-center h-24"><ChevronRight className="w-4 h-4 text-amber-500"/></div>
                                    <div className="flex items-center justify-center h-24"><ChevronRight className="w-4 h-4 text-amber-500"/></div>
                                </div>

                                {/* R2 */}
                                <div className="flex flex-col gap-40 py-16">
                                    <MatchCard bid="playoff-m11" label="LB Round 2" />
                                    <MatchCard bid="playoff-m12" label="LB Round 2" />
                                </div>

                                <div className="flex flex-col gap-40 py-16 opacity-30">
                                    <div className="flex items-center justify-center h-24"><ChevronRight className="w-4 h-4 text-amber-500"/></div>
                                    <div className="flex items-center justify-center h-24"><ChevronRight className="w-4 h-4 text-amber-500"/></div>
                                </div>

                                {/* R3 */}
                                <div className="flex flex-col gap-40 py-16">
                                    <MatchCard bid="playoff-m13" label="LB Round 3" />
                                    <MatchCard bid="playoff-m14" label="LB Round 3" />
                                </div>

                                <div className="flex flex-col justify-center h-full opacity-30">
                                    <div className="flex items-center justify-center h-24"><ChevronRight className="w-5 h-5 text-amber-500"/></div>
                                </div>

                                {/* LB Semi */}
                                <div className="flex flex-col justify-center h-full">
                                    <MatchCard bid="playoff-m16" label="LB Semifinal" />
                                </div>

                                {/* LB Final */}
                                <div className="flex flex-col justify-center h-full">
                                    <MatchCard bid="playoff-m17" label="Lower Final" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Grand Final Section - Full Height Integrated */}
                <div className="flex flex-col items-center justify-center gap-12 border-l-2 border-white/5 bg-black/30 px-10 rounded-r-[3.5rem] relative group/final overflow-hidden">
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/[0.03] rounded-full blur-[150px] group-hover/final:bg-primary/[0.06] transition-all duration-1000" />
                    </div>

                    <div className="flex flex-col items-center gap-10 relative z-10">
                        <div className="relative group/trophy">
                            <div className="absolute -inset-16 bg-yellow-400/20 rounded-full blur-3xl opacity-40 group-hover/trophy:opacity-100 transition-all duration-1000 animate-pulse" />
                            <div className="relative p-12 bg-yellow-400/10 rounded-full border-4 border-yellow-400/50 shadow-[0_0_100px_rgba(250,204,21,0.3)] ring-8 ring-yellow-400/5">
                                <Trophy className="text-yellow-400 w-32 h-32 drop-shadow-[0_0_40px_rgba(250,204,21,0.8)]" />
                            </div>
                        </div>
                        <div className="text-center space-y-4">
                            <h3 className="text-7xl font-black tracking-[0.4em] text-white uppercase italic drop-shadow-[0_0_30px_rgba(255,255,255,0.1)]">Grand Final</h3>
                            <p className="text-base font-black text-primary tracking-[0.6em] uppercase opacity-60">The Ultimate Apex Battle</p>
                        </div>
                    </div>

                    <div className="scale-[2.0] transform transition-all duration-700 hover:scale-[2.15] py-32 relative z-10">
                        <MatchCard bid="playoff-m18" label="Championship Final" />
                    </div>
                </div>
            </div>
        </div>

        {/* HUD Match Analysis Dialog */}
        <Dialog open={!!selectedMatch} onOpenChange={(o) => !o && setSelectedMatch(null)}>
            <DialogContent className="max-w-5xl border-primary border-4 p-0 overflow-hidden bg-[#0A192F]/98 backdrop-blur-3xl max-h-[95vh] overflow-y-auto shadow-[0_0_150px_rgba(204,253,1,0.2)] rounded-[2rem]">
                <div className="p-12 space-y-12 relative">
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_4px,3px_100%] pointer-events-none opacity-20" />

                    <DialogHeader className="border-b border-white/10 pb-10 relative z-10">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-6 text-primary">
                                <div className="p-4 bg-primary/10 rounded-2xl ring-2 ring-primary/20 shadow-lg">
                                    <BarChart3 className="w-10 h-10" />
                                </div>
                                {selectedMatch && (
                                    <div>
                                        <DialogTitle className="text-5xl font-black tracking-tighter uppercase italic pr-6 leading-none">Match Analytics HUD</DialogTitle>
                                        <div className="flex items-center gap-3 mt-3">
                                            <Badge className="bg-primary/20 text-primary border-primary/30 font-black tracking-widest text-[10px] uppercase">{selectedMatch.round || 'Battle'}</Badge>
                                            <div className="h-1.5 w-1.5 rounded-full bg-white/20" />
                                            <span className="text-xs font-bold text-white/40 uppercase tracking-widest">Tactical HUD System v4.0.1</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="text-right flex flex-col items-end gap-2">
                                <Badge className="bg-white/5 text-white/60 border-white/10 font-black px-4 py-1.5 rounded-lg text-xs tracking-tighter shadow-inner uppercase">Status: Operational</Badge>
                                <div className="flex gap-1.5">
                                    {[...Array(5)].map((_, i) => <div key={i} className={cn("w-4 h-1 rounded-full", i < 3 ? "bg-primary" : "bg-white/10")} />)}
                                </div>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-12 relative z-10">
                        <div className="flex flex-col items-center text-center gap-8 group">
                            {analysis1 ? (
                                <>
                                    <div className="relative">
                                        <div className={cn(
                                            "absolute -inset-6 rounded-full blur-3xl opacity-20 transition-all duration-1000 group-hover:opacity-50 group-hover:scale-110",
                                            analysis1.playStyleType === 'attacking' ? "bg-red-500" : analysis1.playStyleType === 'defensive' ? "bg-blue-500" : "bg-primary"
                                        )} />
                                        <Avatar className="h-40 w-40 border-4 border-primary shadow-2xl relative z-10 scale-100 group-hover:scale-105 transition-all duration-700 ring-8 ring-primary/5">
                                            <AvatarImage src={analysis1.team?.logoUrl} />
                                            <AvatarFallback className="bg-black/40"><User className="w-20 h-20 text-white/10"/></AvatarFallback>
                                        </Avatar>
                                        <div className="absolute -bottom-3 -right-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-black font-black text-2xl shadow-2xl border-4 border-background z-20 rotate-12 transition-transform group-hover:rotate-0">
                                            {analysis1.entry?.rank || '?'}
                                        </div>
                                        {analysis1.isDefendingChampion && (
                                            <div className="absolute -top-6 -left-6 transform -rotate-12 z-20">
                                                <Badge className="bg-amber-500 text-black border-4 border-white p-2.5 rounded-2xl shadow-2xl">
                                                    <Award className="w-8 h-8"/>
                                                </Badge>
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-3">
                                        <h3 className="text-4xl font-black tracking-tighter uppercase italic pr-6 text-white group-hover:text-primary transition-colors">{selectedMatch?.p1?.name}</h3>
                                        <div className="flex flex-col items-center gap-3">
                                            <span className="text-xs font-black text-white/40 uppercase tracking-[0.3em]">{analysis1.team?.name || 'Independent Agent'}</span>
                                            <Badge className={cn("text-xs font-black uppercase tracking-widest px-5 py-2 border-2", getPlayStyleClass(analysis1.playStyleType))}>
                                                {analysis1.playStyleText}
                                            </Badge>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="flex flex-col items-center gap-8 opacity-10">
                                    <div className="h-40 w-40 rounded-full border-4 border-dashed border-white/20 flex items-center justify-center"><User className="w-20 h-20 text-white/20" /></div>
                                    <h3 className="text-3xl font-black tracking-[0.3em] text-white uppercase italic">PENDING SLOT</h3>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col items-center justify-center relative">
                            <div className="absolute -inset-16 bg-primary/5 rounded-full blur-3xl animate-pulse" />
                            <div className="bg-primary border-[10px] border-background rounded-[2rem] w-28 h-28 flex items-center justify-center shadow-[0_0_80px_rgba(204,253,1,0.4)] ring-4 ring-primary/20 relative z-10 rotate-45 group">
                                <span className="text-black font-black text-5xl tracking-tighter italic -rotate-45 pr-1">VS</span>
                            </div>
                            <div className="mt-12 space-y-2 text-center relative z-10">
                                <div className="flex items-center gap-2 justify-center"><Calendar className="w-4 h-4 text-primary"/><span className="text-[10px] font-black text-white uppercase tracking-widest">{selectedMatch?.matchDate ? format(selectedMatch.matchDate.toDate(), 'd MMM yyyy', { locale: localeId }) : 'TBD'}</span></div>
                                <div className="flex items-center gap-2 justify-center"><Clock className="w-4 h-4 text-primary"/><span className="text-[10px] font-black text-white uppercase tracking-widest">{selectedMatch?.matchDate ? format(selectedMatch.matchDate.toDate(), 'HH:mm') : 'TBD'}</span></div>
                            </div>
                        </div>

                        <div className="flex flex-col items-center text-center gap-8 group">
                            {analysis2 ? (
                                <>
                                    <div className="relative">
                                        <div className={cn(
                                            "absolute -inset-6 rounded-full blur-3xl opacity-20 transition-all duration-1000 group-hover:opacity-50 group-hover:scale-110",
                                            analysis2.playStyleType === 'attacking' ? "bg-red-500" : analysis2.playStyleType === 'defensive' ? "bg-blue-500" : "bg-primary"
                                        )} />
                                        <Avatar className="h-40 w-40 border-4 border-white shadow-2xl relative z-10 scale-100 group-hover:scale-105 transition-all duration-700 ring-8 ring-white/5">
                                            <AvatarImage src={analysis2.team?.logoUrl} />
                                            <AvatarFallback className="bg-black/40"><User className="w-20 h-20 text-white/10"/></AvatarFallback>
                                        </Avatar>
                                        <div className="absolute -bottom-3 -right-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-black font-black text-2xl shadow-2xl border-4 border-background z-20 rotate-12 transition-transform group-hover:rotate-0">
                                            {analysis2.entry?.rank || '?'}
                                        </div>
                                        {analysis2.isDefendingChampion && (
                                            <div className="absolute -top-6 -left-6 transform -rotate-12 z-20">
                                                <Badge className="bg-amber-500 text-black border-4 border-white p-2.5 rounded-2xl shadow-2xl">
                                                    <Award className="w-8 h-8"/>
                                                </Badge>
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-3">
                                        <h3 className="text-4xl font-black tracking-tighter uppercase italic pr-6 text-white group-hover:text-primary transition-colors">{selectedMatch?.p2?.name}</h3>
                                        <div className="flex flex-col items-center gap-3">
                                            <span className="text-xs font-black text-white/40 uppercase tracking-[0.3em]">{analysis2.team?.name || 'Independent Agent'}</span>
                                            <Badge className={cn("text-xs font-black uppercase tracking-widest px-5 py-2 border-2", getPlayStyleClass(analysis2.playStyleType))}>
                                                {analysis2.playStyleText}
                                            </Badge>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="flex flex-col items-center gap-8 opacity-10">
                                    <div className="h-40 w-40 rounded-full border-4 border-dashed border-white/20 flex items-center justify-center"><User className="w-20 h-20 text-white/20" /></div>
                                    <h3 className="text-3xl font-black tracking-[0.3em] text-white uppercase italic">PENDING SLOT</h3>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-10 relative z-10">
                        <div className="flex items-center gap-5 text-primary">
                            <Binary className="w-8 h-8" /> 
                            <h4 className="text-2xl font-black tracking-[0.4em] uppercase italic">Momentum & Stability Index</h4>
                            <div className="h-1 flex-1 bg-gradient-to-r from-primary/40 to-transparent rounded-full ml-6" />
                        </div>

                        <div className="grid grid-cols-2 gap-12">
                            <div className="space-y-6">
                                {analysis1 && analysis1.stats.played > 0 ? (
                                    <Card className="bg-white/[0.02] border-2 border-white/5 rounded-[2rem] overflow-hidden group hover:border-primary/30 transition-all duration-500 shadow-2xl">
                                        <CardHeader className="pb-4 bg-black/20 border-b border-white/10">
                                            <div className="flex justify-between items-center">
                                                <CardTitle className="text-xs font-black tracking-widest text-primary uppercase italic flex items-center gap-2">
                                                    <Zap className="w-4 h-4 fill-primary animate-pulse"/> Tracking: {selectedMatch?.p1?.name}
                                                </CardTitle>
                                                <Badge className="bg-primary/10 border-primary/30 text-primary font-black uppercase italic text-[10px]">Win Rate: {analysis1.winRate.toFixed(0)}%</Badge>
                                            </div>
                                            <p className={cn("text-[11px] font-black italic mt-2 uppercase tracking-tighter", analysis1.quoteColor)}>Level: "{analysis1.quote}"</p>
                                        </CardHeader>
                                        <CardContent className="p-8 space-y-8">
                                            <ChartContainer config={chartConfig} className="h-44 w-full">
                                                <LineChart data={analysis1.chartData} margin={{ left: -20, right: 10, top: 10 }}>
                                                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                                    <XAxis dataKey="match" hide />
                                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontStyle: 'italic', fontWeight: '900', fill: 'rgba(255,255,255,0.2)' }} domain={sharedChartDomain} />
                                                    <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" strokeDasharray="5 5" />
                                                    <Line type="monotone" dataKey="points" stroke="hsl(var(--primary))" strokeWidth={5} dot={{ fill: 'hsl(var(--primary))', strokeWidth: 3, r: 6 }} activeDot={{ r: 10, stroke: 'white', strokeWidth: 4 }} />
                                                </LineChart>
                                            </ChartContainer>
                                            <div className="flex justify-center gap-2">
                                                {analysis1.form.map((f, i) => (
                                                    <div key={i} className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black border-2 transition-all", f === 'W' ? "bg-green-500/20 text-green-400 border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.2)]" : (f === 'L' ? "bg-red-500/20 text-red-400 border-red-500/50" : "bg-yellow-500/20 text-yellow-400 border-yellow-500/50"))}>{f}</div>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ) : <div className="h-full flex items-center justify-center opacity-10 grayscale p-20 border-2 border-dashed border-white/10 rounded-[2rem]"><Loader2 className="w-12 h-12 animate-spin" /></div>}
                            </div>

                            <div className="space-y-6">
                                {analysis2 && analysis2.stats.played > 0 ? (
                                    <Card className="bg-white/[0.02] border-2 border-white/5 rounded-[2rem] overflow-hidden group hover:border-primary/30 transition-all duration-500 shadow-2xl">
                                        <CardHeader className="pb-4 bg-black/20 border-b border-white/10">
                                            <div className="flex justify-between items-center">
                                                <CardTitle className="text-xs font-black tracking-widest text-primary uppercase italic flex items-center gap-2">
                                                    <Zap className="w-4 h-4 fill-primary animate-pulse"/> Tracking: {selectedMatch?.p2?.name}
                                                </CardTitle>
                                                <Badge className="bg-primary/10 border-primary/30 text-primary font-black uppercase italic text-[10px]">Win Rate: {analysis2.winRate.toFixed(0)}%</Badge>
                                            </div>
                                            <p className={cn("text-[11px] font-black italic mt-2 uppercase tracking-tighter", analysis2.quoteColor)}>Level: "{analysis2.quote}"</p>
                                        </CardHeader>
                                        <CardContent className="p-8 space-y-8">
                                            <ChartContainer config={chartConfig} className="h-44 w-full">
                                                <LineChart data={analysis2.chartData} margin={{ left: -20, right: 10, top: 10 }}>
                                                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                                    <XAxis dataKey="match" hide />
                                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontStyle: 'italic', fontWeight: '900', fill: 'rgba(255,255,255,0.2)' }} domain={sharedChartDomain} />
                                                    <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" strokeDasharray="5 5" />
                                                    <Line type="monotone" dataKey="points" stroke="hsl(var(--primary))" strokeWidth={5} dot={{ fill: 'hsl(var(--primary))', strokeWidth: 3, r: 6 }} activeDot={{ r: 10, stroke: 'white', strokeWidth: 4 }} />
                                                </LineChart>
                                            </ChartContainer>
                                            <div className="flex justify-center gap-2">
                                                {analysis2.form.map((f, i) => (
                                                    <div key={i} className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black border-2 transition-all", f === 'W' ? "bg-green-500/20 text-green-400 border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.2)]" : (f === 'L' ? "bg-red-500/20 text-red-400 border-red-500/50" : "bg-yellow-500/20 text-yellow-400 border-yellow-500/50"))}>{f}</div>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ) : <div className="h-full flex items-center justify-center opacity-10 grayscale p-20 border-2 border-dashed border-white/10 rounded-[2rem]"><Loader2 className="w-12 h-12 animate-spin" /></div>}
                            </div>
                        </div>
                        
                        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 text-center">
                            <p className="text-[10px] text-white/40 font-black tracking-[0.3em] uppercase mb-2">Technical Analysis Disclaimer</p>
                            <p className="text-xs font-bold text-primary/80 italic">Data dikalkulasi berdasarkan akumulasi performa seluruh kompetisi musim ini. Grafik yang meningkat menunjukkan konsistensi kemenangan yang tinggi.</p>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    </div>
  );
}
