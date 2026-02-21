
'use client';

import { useMemo, useState, useRef } from 'react';
import type { Match, Season, Team, Player, WithId, LeagueEntry } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Swords, Trophy, User, TrendingUp, Info, History } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from './ui/badge';
import { ScrollArea, ScrollBar } from './ui/scroll-area';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

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
  
  // Drag-to-scroll logic
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [hasMoved, setHasMoved] = useState(false);

  const onMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
    setHasMoved(false);
  };

  const onMouseLeave = () => {
    setIsDragging(false);
  };

  const onMouseUp = () => {
    setIsDragging(false);
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 1.5; 
    if (Math.abs(walk) > 5) {
      setHasMoved(true);
    }
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  const projections = useMemo(() => {
    if (!leagueTable || leagueTable.length === 0) return null;

    const sortAndRank = (data: any[]) => 
        [...data].sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
            if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
            return a.playerName.localeCompare(b.playerName);
        });

    const gA = sortAndRank(leagueTable.filter(p => p.group === 'A'));
    const gB = sortAndRank(leagueTable.filter(p => p.group === 'B'));

    const proj: Record<string, { p1: any, p2: any, isProjection: boolean }> = {};

    if (gA.length >= 4 && gB.length >= 4) {
        proj['playoff-m1'] = { p1: gA[0], p2: gB[3], isProjection: true };
        proj['playoff-m2'] = { p1: gB[1], p2: gA[2], isProjection: true };
        proj['playoff-m3'] = { p1: gB[0], p2: gA[3], isProjection: true };
        proj['playoff-m4'] = { p1: gA[1], p2: gB[2], isProjection: true };
    }

    if (gA.length >= 6 && gB.length >= 6) {
        proj['playoff-m5'] = { p1: gA[4], p2: { playerName: 'Loser QF 1' }, isProjection: true };
        proj['playoff-m6'] = { p1: gB[4], p2: { playerName: 'Loser QF 2' }, isProjection: true };
        proj['playoff-m7'] = { p1: gA[5], p2: { playerName: 'Loser QF 3' }, isProjection: true };
        proj['playoff-m8'] = { p1: gB[5], p2: { playerName: 'Loser QF 4' }, isProjection: true };
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
          p1: e1 ? { name: e1.playerName } : (playersById[m.player1Id] || { name: m.player1Id === 'TBD' ? 'TBD' : m.player1Id }),
          p2: e2 ? { name: e2.playerName } : (playersById[m.player2Id] || { name: m.player2Id === 'TBD' ? 'TBD' : m.player2Id }),
          t1, t2, s1, s2,
          isW1: m.isCompleted && s1 > s2,
          isW2: m.isCompleted && s2 > s1,
          isLive: true 
        };
      }
    });
    return data;
  }, [matches, playersById, teamsById, leagueTable]);

  const h2hMatches = useMemo(() => {
    if (!selectedMatch || !matches) return [];
    
    // Normalize IDs depending on if it's a projection or official bracket match
    const p1Id = selectedMatch.player1Id || selectedMatch.p1?.playerId || selectedMatch.p1?.id;
    const p2Id = selectedMatch.player2Id || selectedMatch.p2?.playerId || selectedMatch.p2?.id;

    if (!p1Id || !p2Id || p1Id === 'TBD' || p2Id === 'TBD' || p1Id.includes('Loser')) return [];

    return matches.filter(m => 
        m.isCompleted && 
        ((m.player1Id === p1Id && m.player2Id === p2Id) || (m.player1Id === p2Id && m.player2Id === p1Id))
    ).sort((a,b) => b.matchDate.toMillis() - a.matchDate.toMillis());
  }, [selectedMatch, matches]);

  const MatchCard = ({ bid, label }: { bid: string, label: string }) => {
    const m = bracketData[bid];
    const p = projections?.[bid];

    if (!m && p) {
        const p1 = p.p1;
        const p2 = p.p2;
        const t1 = teamsById[p1.teamId];
        const t2 = teamsById[p2.teamId];

        return (
            <div className="flex flex-col gap-1 opacity-60 grayscale-[0.5]">
                <div className="flex items-center justify-between px-1">
                    <span className="text-[9px] font-black tracking-widest text-primary/60 ml-1">{label}</span>
                    <Badge variant="outline" className="h-3 text-[7px] border-amber-500/30 text-amber-500 py-0 px-1 font-black tracking-tighter uppercase">Proyeksi</Badge>
                </div>
                <Card 
                    className="w-44 overflow-hidden border-2 border-muted border-dashed bg-card/10 cursor-pointer hover:border-primary/40 transition-all"
                    onClick={() => !hasMoved && setSelectedMatch({
                        p1: { name: p1.playerName || p1.name },
                        p2: { name: p2.playerName || p2.name },
                        t1, t2,
                        player1Id: p1.playerId || p1.id,
                        player2Id: p2.playerId || p2.id,
                        round: label,
                        isProjection: true
                    })}
                >
                    <CardContent className="p-0 flex flex-col divide-y divide-border/20">
                        <div className="flex items-center justify-between px-2 py-1 h-8">
                            <div className="flex items-center gap-1.5 overflow-hidden">
                                <Avatar className="h-5 w-5 border border-muted/20 opacity-50"><AvatarImage src={t1?.logoUrl} /><AvatarFallback><User /></AvatarFallback></Avatar>
                                <span className="text-[10px] font-bold truncate text-foreground/50">{p1.playerName || p1.name}</span>
                            </div>
                        </div>
                        <div className="flex items-center justify-between px-2 py-1 h-8">
                            <div className="flex items-center gap-1.5 overflow-hidden">
                                <Avatar className="h-5 w-5 border border-muted/20 opacity-50"><AvatarImage src={t2?.logoUrl} /><AvatarFallback><User /></AvatarFallback></Avatar>
                                <span className="text-[10px] font-bold truncate text-foreground/50">{p2.playerName || p2.name}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!m) return (
        <div className="flex flex-col gap-1 opacity-40">
            <span className="text-[9px] font-black tracking-widest text-primary/60 ml-1">{label}</span>
            <div className="w-44 h-16 bg-card/20 border border-dashed border-primary/20 rounded-lg flex flex-col items-center justify-center">
                <span className="text-[8px] font-bold tracking-tighter text-muted-foreground">Menunggu alur...</span>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col gap-1">
            <span className="text-[9px] font-black tracking-widest text-primary/60 ml-1">{label}</span>
            <Card 
                className={cn(
                    "w-44 overflow-hidden border-2 transition-all cursor-pointer hover:ring-2 hover:ring-primary/50", 
                    m.isCompleted ? "border-primary/30" : "border-primary/10 border-dashed"
                )} 
                onClick={() => !hasMoved && setSelectedMatch(m)}
            >
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

  return (
    <div className="w-full">
        {(!matches || matches.filter(m => m.bracketId).length === 0) && leagueTable.length > 0 && (
            <div className="mb-6 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                <Info className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-200/80 leading-relaxed">
                    <p className="font-bold text-amber-500 tracking-tight mb-1">Mode Live Preview (Proyeksi)</p>
                    <p>Bagan di bawah ini adalah <strong>proyeksi otomatis</strong> berdasarkan klasemen grup saat ini. Nama pemain akan berubah secara live mengikuti hasil pertandingan di fase grup. Jadwal resmi akan muncul setelah Admin menekan tombol "Start Playoff".</p>
                </div>
            </div>
        )}

        <ScrollArea className="w-full pb-4">
            <div 
                ref={scrollRef}
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
                onMouseLeave={onMouseLeave}
                className={cn(
                    "w-full cursor-grab active:cursor-grabbing select-none",
                    isDragging && "cursor-grabbing"
                )}
            >
                <div className="min-w-[1400px] flex items-stretch gap-10 p-4">
                    <div className="flex-1 flex flex-col gap-12">
                        {/* Upper Bracket */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-black tracking-[0.3em] text-primary flex items-center gap-2"><div className="h-4 w-1 bg-primary" /> Upper Bracket (Double Life)</h3>
                            <div className="flex items-center gap-8 pl-4">
                                <div className="flex flex-col gap-4">
                                    <MatchCard bid="playoff-m1" label="UB-QF 1" /><MatchCard bid="playoff-m2" label="UB-QF 2" /><MatchCard bid="playoff-m3" label="UB-QF 3" /><MatchCard bid="playoff-m4" label="UB-QF 4" />
                                </div>
                                <div className="flex flex-col gap-20 py-8">
                                    <MatchCard bid="playoff-m9" label="UB-SEMI 1" /><MatchCard bid="playoff-m10" label="UB-SEMI 2" />
                                </div>
                                <div className="flex flex-col justify-center h-full">
                                    <MatchCard bid="playoff-m15" label="UB Final" />
                                </div>
                            </div>
                        </div>

                        <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

                        {/* Lower Bracket */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-black tracking-[0.3em] text-amber-500 flex items-center gap-2"><div className="h-4 w-1 bg-amber-500" /> Lower Bracket (Elimination)</h3>
                            <div className="flex items-center gap-8 pl-4">
                                <div className="flex flex-col gap-4">
                                    <MatchCard bid="playoff-m5" label="LB-R1 (vs Loser QF 1)" />
                                    <MatchCard bid="playoff-m6" label="LB-R1 (vs Loser QF 2)" />
                                    <MatchCard bid="playoff-m7" label="LB-R1 (vs Loser QF 3)" />
                                    <MatchCard bid="playoff-m8" label="LB-R1 (vs Loser QF 4)" />
                                </div>
                                <div className="flex flex-col gap-24 py-12">
                                    <MatchCard bid="playoff-m11" label="LB-R2 (Win M5 & M6)" /><MatchCard bid="playoff-m12" label="LB-R2 (Win M7 & M8)" />
                                </div>
                                <div className="flex flex-col gap-24 py-12">
                                    <MatchCard bid="playoff-m13" label="LB-R3 (vs Loser SEMI 1)" /><MatchCard bid="playoff-m14" label="LB-R3 (vs Loser SEMI 2)" />
                                </div>
                                <div className="flex flex-col justify-center h-full">
                                    <MatchCard bid="playoff-m16" label="LB Semifinal" />
                                </div>
                                <div className="flex flex-col justify-center h-full">
                                    <MatchCard bid="playoff-m17" label="LB Final" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Grand Final Column */}
                    <div className="flex flex-col items-center justify-center gap-6 pl-10 border-l border-primary/10">
                        <div className="flex flex-col items-center gap-4">
                            <div className="relative">
                                <div className="absolute -inset-4 bg-yellow-400/20 rounded-full blur-xl animate-pulse" />
                                <Trophy className="text-yellow-400 w-14 h-14 relative z-10 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
                            </div>
                            <div className="text-center space-y-1">
                                <h3 className="text-xl font-black tracking-[0.4em] text-white">Grand final</h3>
                                <p className="text-[9px] font-bold text-primary tracking-widest opacity-80">Ultimate Battle for Glory</p>
                            </div>
                        </div>
                        <div className="scale-125 transform transition-transform hover:scale-150 py-10">
                            <MatchCard bid="playoff-m18" label="Championship" />
                        </div>
                        <div className="w-1 bg-gradient-to-b from-primary/40 to-transparent h-20 rounded-full" />
                    </div>
                </div>
            </div>
            <ScrollBar orientation="horizontal" />
        </ScrollArea>

        <Dialog open={!!selectedMatch} onOpenChange={(o) => !o && setSelectedMatch(null)}>
            <DialogContent className="max-w-xl border-primary border-2 p-0 overflow-hidden">
                <ScrollArea className="max-h-[85vh]">
                    <div className="p-6 space-y-8">
                        <DialogHeader>
                            <div className="flex items-center justify-between mb-4">
                                <Badge variant="outline" className="font-black tracking-widest text-[10px] bg-primary/10 text-primary border-primary/30 uppercase">
                                    {selectedMatch?.isProjection ? 'Prediksi Pertandingan' : selectedMatch?.round}
                                </Badge>
                                {selectedMatch?.isProjection && (
                                    <Badge variant="outline" className="text-[9px] font-bold border-amber-500/50 text-amber-500">Live Preview</Badge>
                                )}
                            </div>
                            <DialogTitle className="flex items-center gap-2 text-primary text-left font-black tracking-tighter text-2xl">
                                <TrendingUp className="w-6 h-6" /> Analisis Pertandingan
                            </DialogTitle>
                            <DialogDescription className="text-left font-medium">
                                Detail alur dan riwayat pertemuan kedua pemain.
                            </DialogDescription>
                        </DialogHeader>

                        {selectedMatch && (
                            <div className="space-y-8">
                                <div className="grid grid-cols-2 gap-8 items-center relative">
                                    <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center z-10">
                                        <div className="bg-background border-4 border-primary rounded-full w-14 h-14 flex items-center justify-center shadow-[0_0_20px_rgba(204,253,1,0.4)] ring-4 ring-background">
                                            <span className="text-primary font-black text-xl tracking-tighter">vs</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-center gap-3 text-center">
                                        <Avatar className="h-20 w-20 border-4 border-primary shadow-lg"><AvatarImage src={selectedMatch.t1?.logoUrl} /><AvatarFallback><User /></AvatarFallback></Avatar>
                                        <div className="space-y-0.5">
                                            <p className="font-black tracking-tight text-lg">{selectedMatch.p1.name}</p>
                                            <p className="text-[10px] font-bold text-primary/70 tracking-widest">{selectedMatch.t1?.name || 'Tanpa Tim'}</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-center gap-3 text-center">
                                        <Avatar className="h-20 w-20 border-4 border-primary shadow-lg"><AvatarImage src={selectedMatch.t2?.logoUrl} /><AvatarFallback><User /></AvatarFallback></Avatar>
                                        <div className="space-y-0.5">
                                            <p className="font-black tracking-tight text-lg">{selectedMatch.p2.name}</p>
                                            <p className="text-[10px] font-bold text-primary/70 tracking-widest">{selectedMatch.t2?.name || 'Tanpa Tim'}</p>
                                        </div>
                                    </div>
                                </div>

                                {selectedMatch.isCompleted && (
                                    <div className="bg-primary/10 border-2 border-primary/30 rounded-2xl p-6 text-center shadow-inner">
                                        <p className="text-[10px] font-black text-primary tracking-[0.3em] mb-2 uppercase">Skor akhir</p>
                                        <p className="text-6xl font-black tracking-tighter text-primary drop-shadow-[0_0_15px_rgba(204,253,1,0.4)]">
                                            {selectedMatch.s1} - {selectedMatch.s2}
                                        </p>
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <h4 className="text-sm font-black tracking-widest text-primary flex items-center gap-2 uppercase">
                                        <History className="w-4 h-4" /> Head to Head (Musim Ini)
                                    </h4>
                                    
                                    {h2hMatches.length > 0 ? (
                                        <div className="space-y-3">
                                            {h2hMatches.map((m, idx) => {
                                                const isP1 = m.player1Id === (selectedMatch.player1Id || selectedMatch.p1.playerId);
                                                const s1 = m.player1Score ?? m.player1Wins ?? 0;
                                                const s2 = m.player2Score ?? m.player2Wins ?? 0;
                                                const result = s1 > s2 ? 'W' : (s1 < s2 ? 'L' : 'D');

                                                return (
                                                    <Card key={idx} className="bg-muted/20 border-white/5 hover:border-primary/20 transition-all">
                                                        <CardContent className="p-3 flex items-center justify-between">
                                                            <div className="flex flex-col">
                                                                <span className="text-[10px] font-bold text-muted-foreground">{format(m.matchDate.toDate(), 'd MMM yyyy', { locale: localeId })}</span>
                                                                <span className="text-[9px] font-black text-primary/60 uppercase tracking-tighter">{m.round || 'Liga'}</span>
                                                            </div>
                                                            <div className="flex items-center gap-4">
                                                                <span className={cn("text-lg font-black tracking-tighter", result === 'W' ? 'text-green-400' : (result === 'L' ? 'text-red-400' : 'text-amber-400'))}>
                                                                    {s1} - {s2}
                                                                </span>
                                                                <Badge className={cn("h-6 w-6 p-0 flex items-center justify-center font-black rounded-md", result === 'W' ? 'bg-green-500/20 text-green-400' : (result === 'L' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'))}>
                                                                    {result}
                                                                </Badge>
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                )
                                            })}
                                        </div>
                                    ) : (
                                        <div className="bg-card/40 border border-dashed border-white/10 rounded-xl p-8 text-center">
                                            <History className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                                            <p className="text-xs font-bold text-muted-foreground">Belum ada riwayat pertemuan musim ini.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    </div>
  );
}
