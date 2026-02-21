'use client';

import { useMemo, useState, useRef } from 'react';
import type { Match, Season, Team, Player, WithId, LeagueEntry } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Swords, Trophy, User, TrendingUp, Info } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from './ui/badge';

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
    // e.pageX is relative to the document
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
    const walk = (x - startX) * 1.5; // multiplier for scroll speed
    if (Math.abs(walk) > 5) {
      setHasMoved(true);
    }
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  // 1. Calculate Group Rankings for Projections
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

    // UB Quarter Finals Projection (1A vs 4B, 2B vs 3A, 1B vs 4A, 2A vs 3B)
    if (gA.length >= 4 && gB.length >= 4) {
        proj['playoff-m1'] = { p1: gA[0], p2: gB[3], isProjection: true }; // 1A vs 4B
        proj['playoff-m2'] = { p1: gB[1], p2: gA[2], isProjection: true }; // 2B vs 3A
        proj['playoff-m3'] = { p1: gB[0], p2: gA[3], isProjection: true }; // 1B vs 4A
        proj['playoff-m4'] = { p1: gA[1], p2: gB[2], isProjection: true }; // 2A vs 3B
    }

    // LB Round 1 Projection (Rank 5 & 6)
    if (gA.length >= 6 && gB.length >= 6) {
        proj['playoff-m5'] = { p1: gA[4], p2: { playerName: 'Loser QF 1' }, isProjection: true }; // 5A
        proj['playoff-m6'] = { p1: gB[4], p2: { playerName: 'Loser QF 2' }, isProjection: true }; // 5B
        proj['playoff-m7'] = { p1: gA[5], p2: { playerName: 'Loser QF 3' }, isProjection: true }; // 6A
        proj['playoff-m8'] = { p1: gB[5], p2: { playerName: 'Loser QF 4' }, isProjection: true }; // 6B
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

  const MatchCard = ({ bid, label }: { bid: string, label: string }) => {
    const m = bracketData[bid];
    const p = projections?.[bid];

    if (!m && p) {
        return (
            <div className="flex flex-col gap-1 opacity-60 grayscale-[0.5]">
                <div className="flex items-center justify-between px-1">
                    <span className="text-[9px] font-black uppercase tracking-widest text-primary/60 italic">{label}</span>
                    <Badge variant="outline" className="h-3 text-[7px] border-amber-500/30 text-amber-500 py-0 px-1 font-black uppercase tracking-tighter">PROYEKSI</Badge>
                </div>
                <Card className="w-44 overflow-hidden border-2 border-muted border-dashed bg-card/10">
                    <CardContent className="p-0 flex flex-col divide-y divide-border/20">
                        <div className="flex items-center justify-between px-2 py-1 h-8">
                            <div className="flex items-center gap-1.5 overflow-hidden">
                                <Avatar className="h-5 w-5 border border-muted/20 opacity-50"><AvatarImage src={teamsById[p.p1.teamId]?.logoUrl} /><AvatarFallback><User /></AvatarFallback></Avatar>
                                <span className="text-[10px] font-bold truncate text-foreground/50">{p.p1.playerName || p.p1.name}</span>
                            </div>
                        </div>
                        <div className="flex items-center justify-between px-2 py-1 h-8">
                            <div className="flex items-center gap-1.5 overflow-hidden">
                                <Avatar className="h-5 w-5 border border-muted/20 opacity-50"><AvatarImage src={teamsById[p.p2.teamId]?.logoUrl} /><AvatarFallback><User /></AvatarFallback></Avatar>
                                <span className="text-[10px] font-bold truncate text-foreground/50">{p.p2.playerName || p.p2.name}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!m) return (
        <div className="flex flex-col gap-1 opacity-40">
            <span className="text-[9px] font-black uppercase tracking-widest text-primary/60 ml-1">{label}</span>
            <div className="w-44 h-16 bg-card/20 border border-dashed border-primary/20 rounded-lg flex flex-col items-center justify-center">
                <span className="text-[8px] font-bold uppercase tracking-tighter text-muted-foreground">Menunggu Alur...</span>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col gap-1">
            <span className="text-[9px] font-black uppercase tracking-widest text-primary/60 ml-1 italic">{label}</span>
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
                    <p className="font-bold text-amber-500 uppercase tracking-tight mb-1">Mode Live Preview (Proyeksi)</p>
                    <p>Bagan di bawah ini adalah **proyeksi otomatis** berdasarkan klasemen grup saat ini. Nama pemain akan berubah secara live mengikuti hasil pertandingan di fase grup. Jadwal resmi akan muncul setelah Admin menekan tombol "Start Playoff".</p>
                </div>
            </div>
        )}

        <div 
            ref={scrollRef}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseLeave}
            className={cn(
                "w-full overflow-x-auto pb-6 cursor-grab active:cursor-grabbing select-none scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent",
                isDragging && "cursor-grabbing"
            )}
        >
            <div className="min-w-[1500px] flex items-center gap-16 p-4">
                <div className="flex-1 flex flex-col gap-12">
                    {/* Upper Bracket */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-black uppercase tracking-[0.3em] text-primary italic flex items-center gap-2"><div className="h-4 w-1 bg-primary" /> Upper Bracket (Double Life)</h3>
                        <div className="flex items-center gap-8 pl-4">
                            <div className="flex flex-col gap-4">
                                <MatchCard bid="playoff-m1" label="UB-QF 1" /><MatchCard bid="playoff-m2" label="UB-QF 2" /><MatchCard bid="playoff-m3" label="UB-QF 3" /><MatchCard bid="playoff-m4" label="UB-QF 4" />
                            </div>
                            <div className="flex flex-col gap-20 py-8">
                                <MatchCard bid="playoff-m9" label="UB-SEMI 1" /><MatchCard bid="playoff-m10" label="UB-SEMI 2" />
                            </div>
                            <div className="flex flex-col justify-center h-full">
                                <MatchCard bid="playoff-m15" label="UB FINAL" />
                            </div>
                        </div>
                    </div>

                    <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

                    {/* Lower Bracket */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-black uppercase tracking-[0.3em] text-amber-500 italic flex items-center gap-2"><div className="h-4 w-1 bg-amber-500" /> Lower Bracket (Elimination)</h3>
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
                                <MatchCard bid="playoff-m16" label="LB SEMIFINAL" />
                            </div>
                            <div className="flex flex-col justify-center h-full">
                                <MatchCard bid="playoff-m17" label="LB FINAL" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Grand Final Column */}
                <div className="flex flex-col items-center justify-center gap-8 pr-12 h-full">
                    <div className="w-px h-32 bg-gradient-to-b from-primary/50 to-amber-500/50 hidden md:block" />
                    <div className="flex flex-col items-center gap-4">
                        <Trophy className="text-yellow-400 w-16 h-16 drop-shadow-[0_0_20px_rgba(250,204,21,0.6)] animate-bounce" />
                        <div className="text-center">
                            <h3 className="text-2xl font-black uppercase tracking-[0.5em] text-white italic">GRAND FINAL</h3>
                            <p className="text-[10px] font-bold text-primary uppercase tracking-widest mt-1">Ultimate Battle for Glory</p>
                        </div>
                    </div>
                    <div className="scale-150 transform transition-transform hover:scale-[1.6]">
                        <MatchCard bid="playoff-m18" label="CHAMPIONSHIP" />
                    </div>
                    <div className="w-px h-32 bg-gradient-to-t from-amber-500/50 to-primary/50 hidden md:block" />
                </div>
            </div>
        </div>

        <Dialog open={!!selectedMatch} onOpenChange={(o) => !o && setSelectedMatch(null)}>
            <DialogContent className="max-w-xl border-primary border-2">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-primary uppercase italic text-left"><TrendingUp className="w-5 h-5" /> Playoff Match Analysis</DialogTitle>
                    <DialogDescription className="text-left">Detail pertandingan babak: {selectedMatch?.round}</DialogDescription>
                </DialogHeader>
                {selectedMatch && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-8 items-center relative">
                            <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center z-10">
                                <div className="bg-background border-4 border-primary rounded-full w-12 h-12 flex items-center justify-center shadow-[0_0_20px_rgba(204,253,1,0.4)] ring-4 ring-background">
                                    <span className="text-primary font-black italic text-lg tracking-tighter">VS</span>
                                </div>
                            </div>
                            <div className="flex flex-col items-center gap-2 text-center">
                                <Avatar className="h-16 w-16 border-2 border-primary"><AvatarImage src={selectedMatch.t1?.logoUrl} /><AvatarFallback><User /></AvatarFallback></Avatar>
                                <p className="font-bold">{selectedMatch.p1.name}</p>
                                <p className="text-xs text-muted-foreground uppercase">{selectedMatch.t1?.name}</p>
                            </div>
                            <div className="flex flex-col items-center gap-2 text-center">
                                <Avatar className="h-16 w-16 border-2 border-primary"><AvatarImage src={selectedMatch.t2?.logoUrl} /><AvatarFallback><User /></AvatarFallback></Avatar>
                                <p className="font-bold">{selectedMatch.p2.name}</p>
                                <p className="text-xs text-muted-foreground uppercase">{selectedMatch.t2?.name}</p>
                            </div>
                        </div>
                        {selectedMatch.isCompleted && (
                            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-center">
                                <p className="text-xs font-black uppercase text-primary mb-2">Final Score</p>
                                <p className="text-5xl font-black italic tracking-tighter text-primary">{selectedMatch.s1} - {selectedMatch.s2}</p>
                            </div>
                        )}
                        <div className="pt-2 border-t border-border flex flex-col items-start text-[10px] font-bold gap-1">
                            <span className="text-muted-foreground uppercase tracking-tight">Babak Kompetisi Saat Ini:</span>
                            <Badge variant="outline" className="font-black uppercase italic tracking-widest text-[10px] bg-primary/10 text-primary border-primary/30">{selectedMatch.round}</Badge>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    </div>
  );
}
