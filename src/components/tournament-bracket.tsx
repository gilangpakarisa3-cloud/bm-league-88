'use client';

import { useMemo, useState } from 'react';
import type { Match, Season, Team, Player, WithId, LeagueEntry } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Swords, Trophy, User, History, Info, Calendar, Percent, TrendingUp, CheckCircle2, XCircle, MinusCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Progress } from './ui/progress';

interface TournamentBracketProps {
  matches: WithId<Match>[];
  playersById: Record<string, WithId<Player>>;
  teamsById: Record<string, WithId<Team>>;
  leagueTable: (WithId<LeagueEntry> & { player?: WithId<Player>, team?: WithId<Team> })[];
  season: WithId<Season> | null;
}

export function TournamentBracket({ matches, playersById, teamsById, leagueTable, season }: TournamentBracketProps) {
  const [selectedMatch, setSelectedMatch] = useState<any | null>(null);

  const bracketData = useMemo(() => {
    const rounds = {
      'Quarter-Final': [] as any[],
      'Semi-Final': [] as any[],
      'Final': [] as any[],
    };

    const leagueEntryMap = leagueTable.reduce((acc, entry) => {
        acc[entry.playerId] = entry;
        return acc;
    }, {} as Record<string, LeagueEntry>);

    matches.forEach(match => {
      if (match.round && rounds[match.round as keyof typeof rounds]) {
        const entry1 = leagueEntryMap[match.player1Id];
        const entry2 = leagueEntryMap[match.player2Id];

        const p1 = entry1 ? { name: entry1.playerName, id: entry1.playerId } : (playersById[match.player1Id] || null);
        const p2 = entry2 ? { name: entry2.playerName, id: entry2.playerId } : (playersById[match.player2Id] || null);
        
        const teamId1 = entry1 ? entry1.teamId : (playersById[match.player1Id]?.teamId);
        const teamId2 = entry2 ? entry2.teamId : (playersById[match.player2Id]?.teamId);

        const t1 = teamsById[teamId1] || null;
        const t2 = teamsById[teamId2] || null;

        const score1 = match.player1Wins !== null ? match.player1Wins : (match.player1Score ?? 0);
        const score2 = match.player2Wins !== null ? match.player2Wins : (match.player2Score ?? 0);
        
        const isWinner1 = match.isCompleted && (score1 ?? 0) > (score2 ?? 0);
        const isWinner2 = match.isCompleted && (score2 ?? 0) > (score1 ?? 0);

        rounds[match.round as keyof typeof rounds].push({
          ...match,
          player1: p1,
          player2: p2,
          team1: t1,
          team2: t2,
          score1,
          score2,
          isWinner1,
          isWinner2
        });
      }
    });

    Object.keys(rounds).forEach(key => {
        rounds[key as keyof typeof rounds].sort((a,b) => a.matchDate.toMillis() - b.matchDate.toMillis());
    });

    return rounds;
  }, [matches, playersById, teamsById, leagueTable, season]);

  // Comprehensive analysis for the selected match
  const analysisData = useMemo(() => {
    if (!selectedMatch || !selectedMatch.player1 || !selectedMatch.player2) return null;
    
    const id1 = selectedMatch.player1Id;
    const id2 = selectedMatch.player2Id;

    // 1. Individual Group Stage Performance Analysis
    const getPlayerStats = (playerId: string) => {
        const entry = leagueTable.find(e => e.playerId === playerId);
        const playerMatches = matches
            .filter(m => (m.round === 'Group' || !m.round) && m.isCompleted && (m.player1Id === playerId || m.player2Id === playerId))
            .sort((a,b) => a.matchDate.toMillis() - b.matchDate.toMillis());

        let currentTrend = 0;
        const analyzedMatches = playerMatches.map(m => {
            const isP1 = m.player1Id === playerId;
            const pScore = isP1 ? (m.player1Score ?? m.player1Wins ?? 0) : (m.player2Score ?? m.player2Wins ?? 0);
            const oScore = isP1 ? (m.player2Score ?? m.player2Wins ?? 0) : (m.player1Score ?? m.player1Wins ?? 0);
            const result = pScore > oScore ? 'W' : pScore < oScore ? 'L' : 'D';
            
            if (result === 'W') currentTrend += 1;
            else if (result === 'L') currentTrend -= 1;
            
            return { ...m, pScore, oScore, result, trendAtMatch: currentTrend };
        });

        const winRate = entry && entry.played > 0 ? (entry.win / entry.played) * 100 : 0;

        return {
            entry,
            matches: [...analyzedMatches].reverse(),
            winRate,
            finalTrend: currentTrend
        };
    };

    return {
        p1Stats: getPlayerStats(id1),
        p2Stats: getPlayerStats(id2)
    };
  }, [selectedMatch, matches, leagueTable]);

  const MatchCard = ({ match }: { match: any }) => (
    <Card 
        className={cn(
            "w-48 sm:w-56 overflow-hidden border-2 transition-all cursor-pointer hover:ring-2 hover:ring-primary/50",
            match.isCompleted ? "border-primary/30" : "border-muted border-dashed"
        )}
        onClick={() => setSelectedMatch(match)}
    >
      <CardContent className="p-0">
        <div className="flex flex-col divide-y divide-border">
          {/* Player 1 */}
          <div className={cn(
            "flex items-center justify-between px-3 py-2 bg-card",
            match.isWinner1 && "bg-primary/10"
          )}>
            <div className="flex items-center gap-2 overflow-hidden">
              <Avatar className="h-6 w-6 border">
                <AvatarImage src={match.team1?.logoUrl} />
                <AvatarFallback><User className="h-3 w-3"/></AvatarFallback>
              </Avatar>
              <span className={cn(
                "text-xs font-bold truncate",
                match.isWinner1 ? "text-primary" : "text-foreground/70"
              )}>
                {match.player1?.name || 'TBD'}
              </span>
            </div>
            <span className={cn("font-mono font-bold", match.isWinner1 ? "text-primary" : "text-muted-foreground")}>
              {match.isCompleted ? match.score1 : '-'}
            </span>
          </div>
          {/* Player 2 */}
          <div className={cn(
            "flex items-center justify-between px-3 py-2 bg-card",
            match.isWinner2 && "bg-primary/10"
          )}>
            <div className="flex items-center gap-2 overflow-hidden">
              <Avatar className="h-6 w-6 border">
                <AvatarImage src={match.team2?.logoUrl} />
                <AvatarFallback><User className="h-3 w-3"/></AvatarFallback>
              </Avatar>
              <span className={cn(
                "text-xs font-bold truncate",
                match.isWinner2 ? "text-primary" : "text-foreground/70"
              )}>
                {match.player2?.name || 'TBD'}
              </span>
            </div>
            <span className={cn("font-mono font-bold", match.isWinner2 ? "text-primary" : "text-muted-foreground")}>
              {match.isCompleted ? match.score2 : '-'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const PlayerAnalysisColumn = ({ stats, playerInfo, team }: { stats: any, playerInfo: any, team: any }) => (
    <div className="space-y-4">
        <div className="flex flex-col items-center gap-2 text-center">
            <Avatar className="h-12 w-12 border-2 border-primary/50">
                <AvatarImage src={team?.logoUrl} />
                <AvatarFallback><User /></AvatarFallback>
            </Avatar>
            <div>
                <p className="text-sm font-bold truncate max-w-[120px]">{playerInfo?.name || 'TBD'}</p>
                <p className="text-[10px] text-muted-foreground uppercase font-semibold">{team?.name}</p>
            </div>
        </div>

        {stats.entry && (
            <div className="grid grid-cols-2 gap-2">
                <div className="bg-muted/30 p-2 rounded-md border text-center">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase">Win Rate</p>
                    <div className="flex items-center justify-center gap-1">
                        <Percent className="w-3 h-3 text-primary" />
                        <p className="text-sm font-black text-primary">{stats.winRate.toFixed(0)}%</p>
                    </div>
                </div>
                <div className="bg-muted/30 p-2 rounded-md border text-center">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase">Poin Grup</p>
                    <p className="text-sm font-black text-primary">{stats.entry.points}</p>
                </div>
            </div>
        )}

        <div className="space-y-1.5">
            <p className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                <History className="w-3 h-3" /> Hasil Laga Grup
            </p>
            <div className="flex flex-wrap gap-1">
                {stats.matches.map((m: any, i: number) => (
                    <Badge 
                        key={i} 
                        variant="outline" 
                        className={cn(
                            "w-6 h-6 p-0 flex items-center justify-center text-[10px] font-black border-2",
                            m.result === 'W' ? "bg-green-500/10 text-green-400 border-green-500/50" :
                            m.result === 'L' ? "bg-red-500/10 text-red-400 border-red-500/50" :
                            "bg-yellow-500/10 text-yellow-400 border-yellow-500/50"
                        )}
                    >
                        {m.result}
                    </Badge>
                ))}
                {stats.matches.length === 0 && <p className="text-[10px] italic text-muted-foreground">Belum ada data</p>}
            </div>
        </div>
    </div>
  );

  return (
    <div className="w-full overflow-x-auto pb-8 pt-4">
      <div className="min-w-[700px] flex justify-between items-start gap-8 px-4">
        
        {/* Quarter Finals */}
        <div className="flex flex-col gap-8">
          <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground text-center mb-2">Perempat Final</h3>
          <div className="flex flex-col gap-6">
            {bracketData['Quarter-Final'].length > 0 ? (
                bracketData['Quarter-Final'].map(m => <MatchCard key={m.id} match={m} />)
            ) : (
                [...Array(4)].map((_, i) => <div key={i} className="w-48 sm:w-56 h-20 border-2 border-dashed border-muted rounded-lg flex items-center justify-center text-xs text-muted-foreground italic">Menunggu Hasil Grup</div>)
            )}
          </div>
        </div>

        {/* Semi Finals */}
        <div className="flex flex-col gap-8">
          <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground text-center mb-2">Semi Final</h3>
          <div className="flex flex-col justify-around flex-grow gap-24 py-12">
             {bracketData['Semi-Final'].length > 0 ? (
                bracketData['Semi-Final'].map(m => <MatchCard key={m.id} match={m} />)
            ) : (
                [...Array(2)].map((_, i) => <div key={i} className="w-48 sm:w-56 h-20 border-2 border-dashed border-muted rounded-lg flex items-center justify-center text-xs text-muted-foreground italic">Menunggu QF</div>)
            )}
          </div>
        </div>

        {/* Final */}
        <div className="flex flex-col gap-8 items-center">
          <h3 className="text-sm font-bold uppercase tracking-widest text-primary text-center mb-2 flex items-center gap-2">
            <Trophy className="h-4 w-4" /> Grand Final
          </h3>
          <div className="flex flex-col justify-center flex-grow py-24">
             {bracketData['Final'].length > 0 ? (
                <div className="scale-110">
                    <MatchCard match={bracketData['Final'][0]} />
                </div>
            ) : (
                <div className="w-48 sm:w-56 h-24 border-2 border-primary/20 border-dashed rounded-lg flex flex-col items-center justify-center text-xs text-muted-foreground italic gap-2">
                    <Swords className="h-5 w-5 opacity-20" />
                    <span>Menunggu Finalis</span>
                </div>
            )}
          </div>
        </div>
      </div>

      {/* Analysis Dialog */}
      <Dialog open={!!selectedMatch} onOpenChange={(open) => !open && setSelectedMatch(null)}>
        <DialogContent className="max-w-xl border-primary border-2 p-0 overflow-hidden">
            <ScrollArea className="max-h-[90vh]">
                <div className="p-6 space-y-6">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl font-black italic uppercase tracking-tighter">
                            <TrendingUp className="w-6 h-6 text-primary" />
                            Tren & Momentum Performa
                        </DialogTitle>
                        <DialogDescription>
                            Analisis kekuatan dan tren hasil pertandingan masing-masing peserta.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedMatch && analysisData && (
                        <div className="space-y-8">
                            {/* Individual Performance Comparison */}
                            <div className="grid grid-cols-2 gap-8 relative">
                                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border/50 hidden sm:block" />
                                <PlayerAnalysisColumn 
                                    stats={analysisData.p1Stats} 
                                    playerInfo={selectedMatch.player1} 
                                    team={selectedMatch.team1} 
                                />
                                <PlayerAnalysisColumn 
                                    stats={analysisData.p2Stats} 
                                    playerInfo={selectedMatch.player2} 
                                    team={selectedMatch.team2} 
                                />
                            </div>

                            <Separator className="bg-primary/20" />

                            {/* Momentum Summary Section */}
                            <div className="space-y-4">
                                <h4 className="text-xs font-bold flex items-center gap-2 text-primary uppercase tracking-widest bg-primary/5 p-2 rounded border border-primary/20">
                                    <Swords className="w-4 h-4" /> Momentum & Stabilitas
                                </h4>
                                
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase">
                                            <span className="truncate max-w-[100px]">{selectedMatch.player1?.name}</span>
                                            <span className={cn(
                                                analysisData.p1Stats.finalTrend > 0 ? "text-green-400" : 
                                                analysisData.p1Stats.finalTrend < 0 ? "text-red-400" : ""
                                            )}>
                                                {analysisData.p1Stats.finalTrend > 0 ? `+${analysisData.p1Stats.finalTrend}` : analysisData.p1Stats.finalTrend}
                                            </span>
                                        </div>
                                        <Progress 
                                            value={Math.max(10, Math.min(100, (analysisData.p1Stats.finalTrend + 5) * 10))} 
                                            className="h-1.5" 
                                            color={analysisData.p1Stats.finalTrend > 0 ? "bg-green-500" : analysisData.p1Stats.finalTrend < 0 ? "bg-red-500" : "bg-primary"}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase">
                                            <span className="truncate max-w-[100px]">{selectedMatch.player2?.name}</span>
                                            <span className={cn(
                                                analysisData.p2Stats.finalTrend > 0 ? "text-green-400" : 
                                                analysisData.p2Stats.finalTrend < 0 ? "text-red-400" : ""
                                            )}>
                                                {analysisData.p2Stats.finalTrend > 0 ? `+${analysisData.p2Stats.finalTrend}` : analysisData.p2Stats.finalTrend}
                                            </span>
                                        </div>
                                        <Progress 
                                            value={Math.max(10, Math.min(100, (analysisData.p2Stats.finalTrend + 5) * 10))} 
                                            className="h-1.5" 
                                            color={analysisData.p2Stats.finalTrend > 0 ? "bg-green-500" : analysisData.p2Stats.finalTrend < 0 ? "bg-red-500" : "bg-primary"}
                                        />
                                    </div>
                                </div>
                                <p className="text-[9px] text-muted-foreground italic text-center leading-tight">
                                    *Momentum bar menunjukkan akumulasi hasil positif vs negatif selama fase grup. Semakin tinggi nilainya, semakin stabil performa pemain tersebut.
                                </p>
                            </div>

                            <div className="pt-2 border-t border-border flex justify-between items-center text-[10px] font-bold">
                                <span className="text-muted-foreground uppercase tracking-tighter">Babak Kompetisi:</span>
                                <Badge variant="outline" className="border-primary text-primary text-[10px] h-5">{selectedMatch.round}</Badge>
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
