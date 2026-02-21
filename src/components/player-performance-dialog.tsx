'use client';

import { useMemo, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { WithId, LeagueEntry, Match, Player, Team, Season, CoOpLeagueEntry } from '@/lib/types';
import { User, Shield, Percent, Trophy, CheckCircle, XCircle, MinusCircle, Home, Route, ShieldCheck, CalendarClock, Award, TrendingUp, KeyRound, Target, Zap } from 'lucide-react';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { Progress } from './ui/progress';
import { ScrollArea } from './ui/scroll-area';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { ChartContainer, ChartConfig, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine } from 'recharts';


interface PlayerPerformanceDialogProps {
  player: WithId<LeagueEntry> | null;
  matches: WithId<Match>[];
  allPlayers: WithId<Player>[];
  allTeams: WithId<Team>[];
  totalPlayersInSeason: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defendingChampionId?: string;
  previousSeasonName?: string;
  isAdmin: boolean;
  activeSeason: WithId<Season> | null;
  coopLeagueTable: WithId<CoOpLeagueEntry>[];
  singleLeagueTable: WithId<LeagueEntry>[];
}

export function PlayerPerformanceDialog({ 
    player, 
    matches, 
    allPlayers, 
    allTeams, 
    totalPlayersInSeason, 
    open, 
    onOpenChange, 
    defendingChampionId, 
    previousSeasonName, 
    isAdmin, 
    activeSeason, 
    coopLeagueTable,
    singleLeagueTable
}: PlayerPerformanceDialogProps) {
  const { t } = useTranslation();
  
  const [activeTab, setActiveTab] = useState('history');
  
  useEffect(() => {
    if (player) {
      setActiveTab('history');
    }
  }, [player]);
  
  const playersById = useMemo(() => {
    return allPlayers.reduce((acc, p) => {
      acc[p.id] = p;
      return acc;
    }, {} as Record<string, WithId<Player>>);
  }, [allPlayers]);

  const teamsById = useMemo(() => {
    return allTeams.reduce((acc, t) => {
        acc[t.id] = t;
        return acc;
    }, {} as Record<string, WithId<Team>>);
  }, [allTeams]);

  const performanceStats = useMemo(() => {
    if (!player || !activeSeason) return null;

    const isCoop = (activeSeason.type || 'Single') === 'Co-Op';
    const playerIdToFilter = isCoop ? player.id : player.playerId;

    const coopTableById = (coopLeagueTable || []).reduce((acc, entry) => {
        acc[entry.id] = entry;
        return acc;
    }, {} as Record<string, WithId<CoOpLeagueEntry>>);

    const singleTableByPlayerId = (singleLeagueTable || []).reduce((acc, entry) => {
        acc[entry.playerId] = entry;
        return acc;
    }, {} as Record<string, WithId<LeagueEntry>>);

    const playerMatches = matches.filter(m => (m.player1Id === playerIdToFilter || m.player2Id === playerIdToFilter));

    const completedMatches = playerMatches
      .filter(m => m.isCompleted)
      .sort((a, b) => b.matchDate.toMillis() - a.matchDate.toMillis())
      .map(m => {
        const isPlayer1 = m.player1Id === playerIdToFilter;
        const opponentId = isPlayer1 ? m.player2Id : m.player1Id;

        let opponent: { name: string } | null = null;
        let opponentTeam: WithId<Team> | null = null;
        
        if (isCoop) {
            const opponentEntry = coopTableById[opponentId];
            if (opponentEntry) {
                opponent = { name: opponentEntry.teamName };
                opponentTeam = teamsById[opponentEntry.player1TeamId] || null;
            }
        } else {
            const opponentEntry = singleTableByPlayerId[opponentId];
            if (opponentEntry) {
                opponent = { name: opponentEntry.playerName };
                opponentTeam = teamsById[opponentEntry.teamId];
            } else {
                const opponentPlayer = playersById[opponentId];
                if(opponentPlayer){
                    opponent = { name: opponentPlayer.name };
                    opponentTeam = teamsById[opponentPlayer.teamId];
                }
            }
        }

        let result: 'W' | 'L' | 'D';
        let playerResult, opponentResult;

        if (isCoop) {
            playerResult = isPlayer1 ? m.player1Wins! : m.player2Wins!;
            opponentResult = isPlayer1 ? m.player2Wins! : m.player1Wins!;
            if (playerResult > opponentResult) result = 'W';
            else result = 'L';
        } else {
            playerResult = isPlayer1 ? m.player1Score! : m.player2Score!;
            opponentResult = isPlayer1 ? m.player2Score! : m.player1Score!;
            if (playerResult > opponentResult) result = 'W';
            else if (playerResult < opponentResult) result = 'L';
            else result = 'D';
        }
        
        return {
          ...m,
          isPlayer1,
          opponent,
          opponentTeam,
          playerResult,
          opponentResult,
          result,
        };
      });
      
    const upcomingMatches = playerMatches
      .filter(m => !m.isCompleted)
      .sort((a,b) => a.matchDate.toMillis() - b.matchDate.toMillis())
      .map(m => {
          const isPlayer1 = m.player1Id === playerIdToFilter;
          const opponentId = isPlayer1 ? m.player2Id : m.player1Id;
          
          let opponent: { name: string } | null = null;
          let opponentTeam: WithId<Team> | null = null;

          if (isCoop) {
            const opponentEntry = coopTableById[opponentId];
            if (opponentEntry) {
                opponent = { name: opponentEntry.teamName };
                opponentTeam = teamsById[opponentEntry.player1TeamId] || null;
            }
          } else {
              const opponentEntry = singleTableByPlayerId[opponentId];
              if (opponentEntry) {
                  opponent = { name: opponentEntry.playerName };
                  opponentTeam = teamsById[opponentEntry.teamId];
              } else {
                  const opponentPlayer = playersById[opponentId];
                  if (opponentPlayer) {
                    opponent = { name: opponentPlayer.name };
                    opponentTeam = teamsById[opponentPlayer.teamId];
                  }
              }
          }
          return {
              ...m,
              isPlayer1,
              opponent,
              opponentTeam
          }
      });

    // Calculate detailed stats from actual matches
    const stats = completedMatches.reduce((acc, m) => {
        acc.played++;
        if (m.result === 'W') acc.win++;
        else if (m.result === 'L') acc.loss++;
        else acc.draw++;

        if (m.player1Score !== null && m.player2Score !== null) {
            const isP1 = m.player1Id === playerIdToFilter;
            acc.gf += isP1 ? m.player1Score : m.player2Score;
            acc.ga += isP1 ? m.player2Score : m.player1Score;
        }
        return acc;
    }, { played: 0, win: 0, draw: 0, loss: 0, gf: 0, ga: 0 });

    const totalMatchesCount = playerMatches.length;
    const seasonProgress = totalMatchesCount > 0 ? (stats.played / totalMatchesCount) * 100 : 0;
    const winRate = stats.played > 0 ? (stats.win / stats.played) * 100 : 0;

    let trendScore = 0;
    const chartData = [{ match: 0, points: 0, tooltip: 'Awal Musim' }, ...[...completedMatches].reverse().map((match, index) => {
        if (match.result === 'W') trendScore += 1;
        else if (match.result === 'L') trendScore -= 1;
        
        return {
            match: index + 1,
            points: trendScore,
            tooltip: `vs ${match.opponent?.name}: ${match.playerResult}-${match.opponentResult} (${match.result})`
        };
    })];

    const finalTrendScore = chartData.length > 1 ? chartData[chartData.length - 1].points : 0;

    // Play Style Analysis (3 Parameters)
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

    const last5Matches = completedMatches.slice(0, 5);
    let performanceStatus = null;
    if (last5Matches.length > 0) {
        const winCount = last5Matches.filter(m => m.result === 'W').length;
        const lossCount = last5Matches.filter(m => m.result === 'L').length;

        if (winCount === 5) performanceStatus = { text: "Merasa tak terkalahkan", color: "text-green-400" };
        else if (winCount >= 3) performanceStatus = { text: "Dalam performa yang bagus", color: "text-green-400" };
        else if (lossCount >= 3) performanceStatus = { text: "Performa sedang menurun", color: "text-red-400" };
    }

    const groupSize = activeSeason.type === 'Hybrid' 
        ? (player.group === 'A' ? singleLeagueTable.filter(p => p.group === 'A') : singleLeagueTable.filter(p => p.group === 'B')).length 
        : totalPlayersInSeason;

    return {
        completedMatches,
        upcomingMatches,
        winRate,
        seasonProgress,
        totalMatchesCount,
        chartData,
        finalTrendScore,
        performanceStatus,
        stats,
        groupSize,
        playStyleText,
        playStyleType
    }

  }, [player, matches, playersById, teamsById, totalPlayersInSeason, activeSeason, coopLeagueTable, singleLeagueTable]);

  if (!player || !performanceStats) return null;

  const playerTeamDetails = teamsById[player.teamId];
  const { completedMatches, upcomingMatches, winRate, seasonProgress, totalMatchesCount, chartData, finalTrendScore, performanceStatus, stats, groupSize, playStyleText, playStyleType } = performanceStats;
  
   const chartConfig = {
    points: {
      label: "Tren",
      color: "hsl(var(--primary))",
    },
  } satisfies ChartConfig;

  const StatDisplay = ({ label, value }: { label: string, value: string | number }) => (
    <div className="flex flex-col items-center justify-center p-2 rounded-md bg-card">
      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{label}</span>
      <span className="text-lg font-black text-primary">{value}</span>
    </div>
  );
  
  const isTopRank = player.rank === 1;
  const isBottomRank = player.rank >= groupSize - 2 && groupSize > 3;
  const isUnbeaten = stats.played > 0 && stats.loss === 0;
  const isDefendingChampion = player.playerId === defendingChampionId;


  const rankBadgeStyle = cn(
    "absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-background text-sm font-black shadow-lg",
    {
      "bg-yellow-400 border-yellow-300 text-black": isTopRank,
      "bg-red-500 border-red-400 text-white": isBottomRank,
      "bg-primary text-primary-foreground": !isTopRank && !isBottomRank
    }
  );

  const rankTextStyle = cn("text-xl font-black mt-1", {
    "text-yellow-400": isTopRank,
    "text-red-500": isBottomRank,
    "text-primary": !isTopRank && !isBottomRank,
  });

  const isCoop = (activeSeason?.type || 'Single') === 'Co-Op';

  const getPlayStyleClass = (type: 'attacking' | 'defensive' | 'balanced') => {
    switch (type) {
        case 'attacking': return "bg-red-500/20 text-red-400 border-red-500/30";
        case 'defensive': return "bg-blue-500/20 text-blue-400 border-blue-500/30";
        default: return "bg-primary/20 text-primary border-primary/30";
    }
  }


  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-primary border-2 p-0 overflow-hidden bg-[#0A192F]/95 backdrop-blur-xl">
        <ScrollArea className="max-h-[90vh]">
            <div className="p-6">
                <DialogHeader className="flex flex-col items-center text-center">
                    <div className="relative">
                      <Avatar className="h-20 w-20 border-4 border-primary shadow-2xl shadow-primary/20">
                        <AvatarImage src={playerTeamDetails?.logoUrl} alt={player.playerName} />
                        <AvatarFallback><User className="h-10 w-10" /></AvatarFallback>
                      </Avatar>
                      <div className={rankBadgeStyle}>
                        {player.rank}
                      </div>

                       {isDefendingChampion && (
                          <TooltipProvider>
                              <Tooltip>
                                  <TooltipTrigger asChild>
                                      <div className="absolute -top-2 -left-2 transform -rotate-12">
                                          <Badge variant="outline" className="border-amber-500/50 bg-amber-500/20 text-amber-400 backdrop-blur-sm p-1.5 rounded-full shadow-lg">
                                              <Award className="w-5 h-5"/>
                                          </Badge>
                                      </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                      <p>Juara Bertahan</p>
                                  </TooltipContent>
                              </Tooltip>
                          </TooltipProvider>
                      )}

                      {isUnbeaten && (
                          <TooltipProvider>
                              <Tooltip>
                                  <TooltipTrigger asChild>
                                      <div className="absolute -top-2 -right-2 transform rotate-12">
                                          <Badge variant="outline" className="border-yellow-400/50 bg-yellow-400/10 text-yellow-300 backdrop-blur-sm p-1.5 rounded-full shadow-lg">
                                              <ShieldCheck className="w-5 h-5"/>
                                          </Badge>
                                      </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                      <p>Tak Terkalahkan</p>
                                  </TooltipContent>
                              </Tooltip>
                          </TooltipProvider>
                      )}
                    </div>
                    <div className="flex flex-col items-center space-y-1 pt-3">
                      <DialogTitle className="text-2xl font-black tracking-tight">{player.playerName}</DialogTitle>
                      <DialogDescription className="flex items-center justify-center gap-2 font-bold text-white/60">
                        <Avatar className="h-5 w-5">
                            <AvatarImage src={playerTeamDetails?.logoUrl} alt={player.teamName} />
                            <AvatarFallback><Shield className="w-3 h-3"/></AvatarFallback>
                        </Avatar>
                        {player.teamName || 'Tanpa Tim'}
                      </DialogDescription>
                      <div className="pt-1">
                        <Badge className={cn("text-[11px] font-black uppercase tracking-tighter px-3 py-1 border", getPlayStyleClass(playStyleType))}>
                            {playStyleText}
                        </Badge>
                      </div>
                    </div>
                </DialogHeader>

                <div className="py-2 space-y-6 mt-6">
                    <div className='space-y-4'>
                        <div>
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Progres Musim</h3>
                            <Progress value={seasonProgress} className="h-2 bg-white/5" />
                            <p className="text-[10px] font-bold text-muted-foreground mt-2">{stats.played} dari {totalMatchesCount} laga dimainkan ({seasonProgress.toFixed(0)}%)</p>
                        </div>
                         <div className={cn("grid gap-2 text-center", isCoop ? 'grid-cols-4' : 'grid-cols-5')}>
                           <StatDisplay label="M" value={stats.played} />
                           <StatDisplay label="W" value={stats.win} />
                           {!isCoop && <StatDisplay label="S" value={stats.draw} />}
                           <StatDisplay label="K" value={stats.loss} />
                           <StatDisplay label="Pts" value={player.points} />
                        </div>
                         <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-white/5 border border-white/5">
                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                    <Percent className="w-3 h-3 text-primary"/>
                                    <span>Win Rate</span>
                                </div>
                                <p className="text-xl font-black text-primary mt-1">% {winRate.toFixed(0)}</p>
                            </div>
                            <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-white/5 border border-white/5">
                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                    <Trophy className="w-3 h-3 text-primary"/>
                                    <span>Rank</span>
                                </div>
                                <p className={rankTextStyle}>{player.rank}</p>
                            </div>
                        </div>
                    </div>
                  
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                      <TabsList className="grid w-full grid-cols-3 bg-white/5">
                          <TabsTrigger value="history" className="text-[10px] font-black uppercase tracking-widest">Riwayat</TabsTrigger>
                          <TabsTrigger value="upcoming" className="text-[10px] font-black uppercase tracking-widest">Sisa Laga</TabsTrigger>
                          <TabsTrigger value="trend" className="text-[10px] font-black uppercase tracking-widest">Tren</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="history" className="pt-4">
                           {completedMatches.length > 0 ? (
                              <div className="space-y-2">
                              {completedMatches.map(match => {
                              const scoreColorPlayer = cn({
                                      'text-green-400': match.result === 'W',
                                      'text-red-400': match.result === 'L',
                                      'text-yellow-400': match.result === 'D',
                                  });
                              const scoreColorOpponent = cn({
                                      'text-white/80': match.result !== 'D',
                                      'text-yellow-400': match.result === 'D',
                              });
                              
                              return (
                                  <div key={match.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border-l-4 border-primary/50 transition-all hover:bg-white/10">
                                  <div className="flex items-center gap-3">
                                      <div className={cn("w-6 h-6 rounded flex items-center justify-center text-[10px] font-black border", match.result === 'W' ? "bg-green-500/20 text-green-400 border-green-500/50" : (match.result === 'L' ? "bg-red-500/20 text-red-400 border-red-500/50" : "bg-yellow-500/20 text-yellow-400 border-yellow-500/50"))}>{match.result}</div>
                                      <div>
                                          <p className="text-xs font-black tracking-tight">vs {match.opponent?.name || 'Unknown'}</p>
                                          <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">{format(match.matchDate.toDate(), "d MMM, HH:mm", { locale: localeId })}</p>
                                      </div>
                                  </div>
                                  <p className="text-base font-black tabular-nums">
                                      {match.isPlayer1 ? (
                                          <>
                                          <span className={scoreColorPlayer}>{match.playerResult}</span>
                                          <span className="mx-1.5 text-white/20">-</span>
                                          <span className={scoreColorOpponent}>{match.opponentResult}</span>
                                          </>
                                      ) : (
                                          <>
                                          <span className={scoreColorOpponent}>{match.opponentResult}</span>
                                          <span className="mx-1.5 text-white/20">-</span>
                                          <span className={scoreColorPlayer}>{match.playerResult}</span>
                                          </>
                                      )}
                                  </p>
                                  </div>
                              )
                              })}
                              </div>
                          ) : (
                              <div className="text-center py-12 opacity-30">
                                  <p className="text-[10px] font-black uppercase tracking-[0.2em]">Belum ada laga selesai</p>
                              </div>
                          )}
                      </TabsContent>
                      
                      <TabsContent value="upcoming" className="pt-4">
                           {upcomingMatches.length > 0 ? (
                              <div className="space-y-2">
                              {upcomingMatches.map(match => (
                                  <div key={match.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-dashed border-white/10 opacity-70">
                                      <div className="flex items-center gap-3">
                                          <div className="w-6 h-6 rounded flex items-center justify-center bg-white/10"><CalendarClock className="w-3 h-3 text-white/40"/></div>
                                          <div>
                                              <p className="text-xs font-black tracking-tight">vs {match.opponent?.name || 'Unknown'}</p>
                                              <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Jadwal belum ditentukan</p>
                                          </div>
                                      </div>
                                  </div>
                              ))}
                              </div>
                          ) : (
                               <div className="text-center py-12 opacity-30">
                                  <p className="text-[10px] font-black uppercase tracking-[0.2em]">Seluruh laga telah tuntas</p>
                              </div>
                          )}
                      </TabsContent>
                      
                       <TabsContent value="trend" className="pt-4">
                          <Card className="bg-white/5 border-white/10">
                              <CardHeader className="pb-2">
                                  <div className="flex justify-between items-center">
                                      <CardTitle className="text-[10px] font-black tracking-widest text-primary uppercase">
                                          <TrendingUp className="inline w-3 h-3 mr-1"/>
                                          Stabilitas Performa
                                      </CardTitle>
                                      <Badge variant="outline" className="bg-primary/10 border-primary/30 text-primary text-[10px] font-black">
                                          {finalTrendScore > 0 ? `+${finalTrendScore}` : finalTrendScore} Pts
                                      </Badge>
                                  </div>
                                   {performanceStatus && (
                                      <CardDescription className={cn("text-[9px] font-black italic mt-1", performanceStatus.color)}>
                                          "{performanceStatus.text}"
                                      </CardDescription>
                                  )}
                              </CardHeader>
                              <CardContent className="pt-2">
                                  {chartData.length > 1 ? (
                                      <ChartContainer config={chartConfig} className="h-40 w-full">
                                          <LineChart data={chartData} margin={{ left: -20, right: 10, top: 10 }}>
                                              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                              <XAxis dataKey="match" hide />
                                              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }} allowDecimals={false} />
                                              <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" strokeDasharray="3 3" />
                                              <Line 
                                                  type="monotone" 
                                                  dataKey="points" 
                                                  stroke="hsl(var(--primary))" 
                                                  strokeWidth={3} 
                                                  dot={{ fill: "hsl(var(--primary))", r: 4 }} 
                                                  activeDot={{ r: 6 }} 
                                              />
                                          </LineChart>
                                      </ChartContainer>
                                  ) : (
                                      <div className="text-center py-12 opacity-30">
                                          <p className="text-[10px] font-black uppercase tracking-[0.2em]">Butuh minimal 2 laga</p>
                                      </div>
                                  )}
                              </CardContent>
                          </Card>
                       </TabsContent>
                  </Tabs>
                </div>
            </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
    </>
  );
}
