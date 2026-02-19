
'use client';

import { useMemo, useState } from 'react';
import type { Match, Season, Team, Player, WithId, LeagueEntry } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Swords, Trophy, User, TrendingUp } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from './ui/scroll-area';
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
          isW2: m.isCompleted && s2 > s1
        };
      }
    });
    return data;
  }, [matches, playersById, teamsById, leagueTable]);

  const MatchCard = ({ bid, label }: { bid: string, label: string }) => {
    const m = bracketData[bid];
    if (!m) return (
        <div className="flex flex-col gap-1 opacity-40">
            <span className="text-[9px] font-black uppercase tracking-widest text-primary/60 ml-1">{label}</span>
            <div className="w-44 h-16 bg-card/20 border border-dashed border-primary/20 rounded-lg flex flex-col items-center justify-center">
                <span className="text-[8px] font-bold uppercase tracking-tighter">Slot Belum Ada</span>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col gap-1">
            <span className="text-[9px] font-black uppercase tracking-widest text-primary/60 ml-1 italic">{label}</span>
            <Card className={cn("w-44 overflow-hidden border-2 transition-all cursor-pointer hover:ring-2 hover:ring-primary/50", m.isCompleted ? "border-primary/30" : "border-muted border-dashed")} onClick={() => setSelectedMatch(m)}>
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
        <ScrollArea className="w-full h-full pb-4">
            <div className="min-w-[1000px] flex flex-col gap-12 p-4">
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
                            <MatchCard bid="playoff-m13" label="UB FINAL" />
                        </div>
                    </div>
                </div>

                <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

                {/* Lower Bracket */}
                <div className="space-y-4">
                    <h3 className="text-sm font-black uppercase tracking-[0.3em] text-amber-500 italic flex items-center gap-2"><div className="h-4 w-1 bg-amber-500" /> Lower Bracket (Elimination)</h3>
                    <div className="flex items-center gap-8 pl-4 overflow-x-visible">
                        <div className="flex flex-col gap-4">
                            <MatchCard bid="playoff-m5" label="LB - PUTARAN 1" /><MatchCard bid="playoff-m6" label="LB - PUTARAN 1" />
                        </div>
                        <div className="flex flex-col gap-4">
                            <MatchCard bid="playoff-m7" label="LB - VS LOSER M1 & M2" /><MatchCard bid="playoff-m8" label="LB - VS LOSER M3 & M4" />
                        </div>
                        <div className="flex flex-col gap-4">
                            <MatchCard bid="playoff-m11" label="LB - PUTARAN 3" /><MatchCard bid="playoff-m12" label="LB - PUTARAN 3" />
                        </div>
                        <div className="flex flex-col gap-4">
                            <MatchCard bid="playoff-m14" label="LB - VS LOSER M9" /><MatchCard bid="playoff-m15" label="LB - VS LOSER M10" />
                        </div>
                        <div className="flex flex-col justify-center h-full">
                            <MatchCard bid="playoff-m16" label="LB - PUTARAN 5" />
                        </div>
                        <div className="flex flex-col justify-center h-full">
                            <MatchCard bid="playoff-m17" label="LB - VS LOSER M13" />
                        </div>
                    </div>
                </div>

                {/* Grand Final */}
                <div className="flex flex-col items-center gap-4 mt-8">
                    <div className="h-12 w-px bg-gradient-to-b from-primary to-amber-500" />
                    <h3 className="text-xl font-black uppercase tracking-[0.5em] text-white flex items-center gap-4"><Trophy className="text-yellow-400 w-8 h-8" /> GRAND FINAL</h3>
                    <div className="scale-125"><MatchCard bid="playoff-m18" label="THE FINAL BATTLE" /></div>
                </div>
            </div>
        </ScrollArea>

        <Dialog open={!!selectedMatch} onOpenChange={(o) => !o && setSelectedMatch(null)}>
            <DialogContent className="max-w-xl border-primary border-2">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-primary uppercase italic"><TrendingUp className="w-5 h-5" /> Playoff Match Analysis</DialogTitle>
                    <DialogDescription>Detail pertandingan babak: {selectedMatch?.round}</DialogDescription>
                </DialogHeader>
                {selectedMatch && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-8 items-center relative">
                            <div className="absolute left-1/2 -translate-x-1/2 font-black italic text-2xl text-primary/30">VS</div>
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
                    </div>
                )}
            </DialogContent>
        </Dialog>
    </div>
  );
}
