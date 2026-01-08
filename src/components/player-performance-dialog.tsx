
'use client';

import { useMemo, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { WithId, LeagueEntry, Match, Player, Team } from '@/lib/types';
import { User, Shield, Percent, Trophy, CheckCircle, XCircle, MinusCircle, Home, Route, ShieldCheck, CalendarClock, Award, TrendingUp, KeyRound } from 'lucide-react';
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
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useToast } from '@/hooks/use-toast';


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
}

export function PlayerPerformanceDialog({ player, matches, allPlayers, allTeams, totalPlayersInSeason, open, onOpenChange, defendingChampionId, previousSeasonName, isAdmin }: PlayerPerformanceDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState('history');
  const [passwordPromptOpen, setPasswordPromptOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  
  const TREND_TAB_PASSWORD = "buka dong";

  useEffect(() => {
    // Reset the active tab to 'history' whenever the player prop changes.
    // This ensures the trend tab is not left open when viewing a new player.
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
    if (!player) return null;

    const playerMatches = matches.filter(m => (m.player1Id === player.playerId || m.player2Id === player.playerId));

    const completedMatches = playerMatches
      .filter(m => m.isCompleted)
      .sort((a, b) => b.matchDate.toMillis() - a.matchDate.toMillis())
      .map(m => {
        const isPlayer1 = m.player1Id === player.playerId;
        const playerScore = isPlayer1 ? m.player1Score! : m.player2Score!;
        const opponentScore = isPlayer1 ? m.player2Score! : m.player1Score!;
        const opponentId = isPlayer1 ? m.player2Id : m.player1Id;
        const opponent = playersById[opponentId];
        const opponentTeam = opponent ? teamsById[opponent.teamId] : null;
        
        let result: 'W' | 'D' | 'L';
        if (playerScore > opponentScore) result = 'W';
        else if (playerScore < opponentScore) result = 'L';
        else result = 'D';
        
        return {
          ...m,
          isPlayer1,
          opponent,
          opponentTeam,
          playerScore,
          opponentScore,
          result,
        };
      });
      
    const upcomingMatches = playerMatches
      .filter(m => !m.isCompleted)
      .sort((a,b) => a.matchDate.toMillis() - b.matchDate.toMillis())
      .map(m => {
          const isPlayer1 = m.player1Id === player.playerId;
          const opponentId = isPlayer1 ? m.player2Id : m.player1Id;
          const opponent = playersById[opponentId];
          const opponentTeam = opponent ? teamsById[opponent.teamId] : null;
          return {
              ...m,
              isPlayer1,
              opponent,
              opponentTeam
          }
      });


    const winRate = player.played > 0 ? (player.win / player.played) * 100 : 0;
    const totalMatches = totalPlayersInSeason > 1 ? (totalPlayersInSeason - 1) * 2 : 0;
    const seasonProgress = totalMatches > 0 ? (player.played / totalMatches) * 100 : 0;

    let trendScore = 0;
    const chartData = [{ match: 0, points: 0, tooltip: 'Awal Musim' }, ...[...completedMatches].reverse().map((match, index) => {
        if (match.result === 'W') trendScore += 1;
        else if (match.result === 'L') trendScore -= 1;
        // Draw does nothing
        return {
            match: index + 1,
            points: trendScore,
            tooltip: `vs ${match.opponent?.name}: ${match.playerScore}-${match.opponentScore} (${match.result})`
        };
    })];

    const finalTrendScore = chartData.length > 1 ? chartData[chartData.length - 1].points : 0;

    // Calculate trend for last 5 matches
    const last5Matches = completedMatches.slice(0, 5);
    let last5TrendScore = 0;
    let performanceStatus = null;
    if (last5Matches.length === 5) {
        last5Matches.forEach(match => {
            if (match.result === 'W') last5TrendScore += 1;
            else if (match.result === 'L') last5TrendScore -=1;
        });

        if (last5TrendScore === 5) performanceStatus = { text: "Merasa Tak Terkalahkan", color: "text-green-400" };
        else if (last5TrendScore >= 3) performanceStatus = { text: "Dalam performa yang bagus", color: "text-green-400" };
        else if (last5TrendScore <= -3 && last5TrendScore > -5) performanceStatus = { text: "Dalam performa yang buruk", color: "text-red-400" };
        else if (last5TrendScore === -5) performanceStatus = { text: "Pemain sedang ketakutan", color: "text-red-400" };
    }


    return {
        completedMatches,
        upcomingMatches,
        winRate,
        seasonProgress,
        totalMatches,
        chartData,
        finalTrendScore,
        performanceStatus,
    }

  }, [player, matches, playersById, teamsById, totalPlayersInSeason]);
  
  const handleTabChange = (value: string) => {
    if (value === 'trend') {
      const hasAccess = isAdmin; // Only admin has direct access now
      if (hasAccess) {
        setActiveTab('trend');
      } else {
        setPasswordPromptOpen(true);
      }
    } else {
      setActiveTab(value);
    }
  };

  const handlePasswordSubmit = () => {
    if (passwordInput === TREND_TAB_PASSWORD) {
      toast({ title: 'Akses Diberikan', description: 'Tab tren performa telah dibuka.' });
      setActiveTab('trend');
      setPasswordPromptOpen(false);
      setPasswordInput('');
    } else {
      toast({ variant: 'destructive', title: 'Kata Sandi Salah', description: 'Anda tidak diizinkan mengakses tab ini.' });
    }
  };

  if (!player || !performanceStats) return null;

  const playerDetails = playersById[player.playerId];
  const playerTeamDetails = teamsById[player.teamId];
  const { completedMatches, upcomingMatches, winRate, seasonProgress, totalMatches, chartData, finalTrendScore, performanceStatus } = performanceStats;
  
   const chartConfig = {
    points: {
      label: "Points",
      color: "hsl(var(--primary))",
    },
  } satisfies ChartConfig;

  const StatDisplay = ({ label, value }: { label: string, value: string | number }) => (
    <div className="flex flex-col items-center justify-center p-2 rounded-md bg-card">
      <span className="text-xs sm:text-sm font-semibold text-muted-foreground">{label}</span>
      <span className="text-base sm:text-lg font-bold text-primary">{value}</span>
    </div>
  );
  
  const isTopRank = player.rank === 1;
  const isBottomRank = player.rank >= totalPlayersInSeason - 2 && totalPlayersInSeason > 3;
  const isUnbeaten = player.played > 0 && player.loss === 0;
  const isDefendingChampion = player.playerId === defendingChampionId;


  const rankBadgeStyle = cn(
    "absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-background text-sm font-bold",
    {
      "bg-yellow-400 border-yellow-300 text-black": isTopRank,
      "bg-red-500 border-red-400 text-white": isBottomRank,
      "bg-primary text-primary-foreground": !isTopRank && !isBottomRank
    }
  );

  const rankTextStyle = cn("text-xl font-bold mt-1", {
    "text-yellow-400": isTopRank,
    "text-red-500": isBottomRank,
    "text-primary": !isTopRank && !isBottomRank,
  });


  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-primary border-2 p-0">
        <ScrollArea className="max-h-[90vh]">
            <div className="p-6">
                <DialogHeader className="flex flex-col items-center text-center">
                    <div className="relative">
                      <Avatar className="h-16 w-16 sm:h-20 sm:w-20 border-4 border-primary">
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
                                          <Badge variant="outline" className="border-amber-500/50 bg-amber-500/20 text-amber-400 backdrop-blur-sm p-1.5 rounded-full">
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
                                          <Badge variant="outline" className="border-yellow-400/50 bg-yellow-400/20 text-yellow-300 backdrop-blur-sm p-1.5 rounded-full">
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
                      
                      {isTopRank && !isUnbeaten && !isDefendingChampion && (
                           <TooltipProvider>
                              <Tooltip>
                                  <TooltipTrigger asChild>
                                      <div className="absolute -top-2 -right-2 transform rotate-12">
                                          <Badge variant="outline" className="border-yellow-400/50 bg-yellow-400/20 text-yellow-300 backdrop-blur-sm p-1.5 rounded-full">
                                              <Trophy className="w-5 h-5"/>
                                          </Badge>
                                      </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                      <p>Peringkat Pertama</p>
                                  </TooltipContent>
                              </Tooltip>
                          </TooltipProvider>
                      )}
                    </div>
                    <div className="flex flex-col items-center space-y-1 pt-2">
                      <DialogTitle className="text-2xl font-bold">{player.playerName}</DialogTitle>
                      <DialogDescription className="flex items-center justify-center gap-2">
                        <Avatar className="h-5 w-5">
                            <AvatarImage src={playerTeamDetails?.logoUrl} alt={player.teamName} />
                            <AvatarFallback><Shield className="w-3 h-3"/></AvatarFallback>
                        </Avatar>
                        {player.teamName}
                      </DialogDescription>
                       {isDefendingChampion && previousSeasonName && (
                        <p className="text-xs font-bold text-yellow-400">
                          Juara Bertahan - {previousSeasonName}
                        </p>
                      )}
                    </div>
                </DialogHeader>

                <div className="py-2 sm:space-y-6 mt-4">
                    <div className='space-y-4'>
                        <div>
                            <h3 className="text-sm font-semibold mb-2">Progres Musim</h3>
                            <Progress value={seasonProgress} className="h-3" />
                            <p className="text-xs text-muted-foreground mt-1.5">{player.played} dari {totalMatches} pertandingan dimainkan ({seasonProgress.toFixed(0)}%)</p>
                        </div>
                         <div className="grid grid-cols-5 gap-2 text-center">
                           <StatDisplay label={t('played', { defaultValue: "P"})} value={player.played} />
                           <StatDisplay label={t('w', { defaultValue: "W"})} value={player.win} />
                           <StatDisplay label={t('d', { defaultValue: "D"})} value={player.draw} />
                           <StatDisplay label={t('l', { defaultValue: "L"})} value={player.loss} />
                           <StatDisplay label={t('pts', { defaultValue: "Pts"})} value={player.points} />
                        </div>
                         <div className="grid grid-cols-2 gap-2">
                            <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-muted/50">
                                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                                    <Percent className="w-4 h-4 text-primary"/>
                                    <p>Win Rate</p>
                                </div>
                                <p className="text-xl font-bold text-primary mt-1">{winRate.toFixed(0)}%</p>
                            </div>
                            <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-muted/50">
                                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                                    <Trophy className="w-4 h-4 text-primary"/>
                                    <p>Peringkat</p>
                                </div>
                                <p className={rankTextStyle}>{player.rank}</p>
                            </div>
                        </div>
                    </div>
                  <div className="mt-6 sm:mt-0">
                    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="history">Riwayat</TabsTrigger>
                            <TabsTrigger value="upcoming">Sisa Laga</TabsTrigger>
                            <TabsTrigger value="trend">Tren Performa</TabsTrigger>
                        </TabsList>
                        <TabsContent value="history">
                             {completedMatches.length > 0 ? (
                                <div className="space-y-3 pt-4">
                                {completedMatches.map(match => {
                                const scoreColorPlayer = cn({
                                        'text-green-400': match.result === 'W',
                                        'text-red-400': match.result === 'L',
                                        'text-foreground': match.result === 'D',
                                    });
                                const scoreColorOpponent = 'text-foreground';
                                
                                const homeScore = match.player1Score ?? 0;
                                const awayScore = match.player2Score ?? 0;
                                
                                return (
                                    <div key={match.id} className="flex items-center justify-between p-3 rounded-lg bg-card border-l-4 border-primary/50">
                                    <div className="flex items-center gap-2">
                                        <ResultBadge result={match.result} />
                                        <HomeAwayBadge isHome={match.isPlayer1} />
                                        <div className='flex items-center gap-2'>
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={match.opponentTeam?.logoUrl} alt={match.opponentTeam?.name} />
                                                <AvatarFallback><Shield /></AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="text-sm font-semibold">vs {match.opponent?.name || 'Unknown'}</p>
                                                <p className="text-xs text-muted-foreground">{format(match.matchDate.toDate(), "d MMM yyyy, HH:mm", { locale: localeId })}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-lg font-bold">
                                        {match.isPlayer1 ? (
                                            <>
                                            <span className={scoreColorPlayer}>{homeScore}</span>
                                            <span className="mx-2 text-muted-foreground">-</span>
                                            <span className={scoreColorOpponent}>{awayScore}</span>
                                            </>
                                        ) : (
                                            <>
                                            <span className={scoreColorOpponent}>{homeScore}</span>
                                            <span className="mx-2 text-muted-foreground">-</span>
                                            <span className={scoreColorPlayer}>{awayScore}</span>
                                            </>
                                        )}
                                    </p>
                                    </div>
                                )
                                })}
                                </div>
                            ) : (
                                <p className="text-center text-muted-foreground py-8">{t('no_completed_matches', {defaultValue: 'Belum ada pertandingan yang selesai.'})}</p>
                            )}
                        </TabsContent>
                        <TabsContent value="upcoming">
                             {upcomingMatches.length > 0 ? (
                                <div className="space-y-3 pt-4">
                                {upcomingMatches.map(match => (
                                    <div key={match.id} className="flex items-center justify-between p-3 rounded-lg bg-card border-l-4 border-primary/50">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="w-8 h-8 flex items-center justify-center font-bold border-2 border-muted">
                                                <CalendarClock className="w-4 h-4"/>
                                            </Badge>
                                             <HomeAwayBadge isHome={match.isPlayer1} />
                                             <div className='flex items-center gap-2'>
                                                <Avatar className="h-8 w-8">
                                                    <AvatarImage src={match.opponentTeam?.logoUrl} alt={match.opponentTeam?.name} />
                                                    <AvatarFallback><Shield /></AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="text-sm font-semibold">vs {match.opponent?.name || 'Unknown'}</p>
                                                    <p className="text-xs text-muted-foreground">Jadwal belum ditentukan</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                </div>
                            ) : (
                                 <p className="text-center text-muted-foreground py-8">Semua pertandingan telah selesai.</p>
                            )}
                        </TabsContent>
                         <TabsContent value="trend">
                            <Card className="mt-4">
                                <CardHeader>
                                    <div className="flex justify-between items-center">
                                        <CardTitle className="flex items-center gap-2 text-primary">
                                            <TrendingUp className="w-5 h-5"/>
                                            Tren Performa
                                        </CardTitle>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-sm text-muted-foreground">Nilai Akhir:</span>
                                            <span className={cn("text-xl font-bold", 
                                                finalTrendScore > 0 && "text-green-400",
                                                finalTrendScore < 0 && "text-red-400",
                                                finalTrendScore === 0 && "text-foreground"
                                            )}>
                                                {finalTrendScore > 0 ? `+${finalTrendScore}` : finalTrendScore}
                                            </span>
                                        </div>
                                    </div>
                                     {performanceStatus && (
                                        <CardDescription className={cn("text-sm font-bold italic", performanceStatus.color)}>
                                            "{performanceStatus.text}"
                                        </CardDescription>
                                    )}
                                </CardHeader>
                                <CardContent>
                                    {chartData.length > 1 ? (
                                        <ChartContainer config={chartConfig} className="h-48 w-full">
                                            <LineChart
                                                accessibilityLayer
                                                data={chartData}
                                                margin={{
                                                    left: -20,
                                                    right: 20,
                                                }}
                                            >
                                                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border) / 0.5)" />
                                                <XAxis
                                                    dataKey="match"
                                                    tickLine={false}
                                                    axisLine={false}
                                                    tickMargin={8}
                                                    tickFormatter={(value) => value === 0 ? 'Start' : `M${value}`}
                                                />
                                                <YAxis
                                                    tickLine={false}
                                                    axisLine={false}
                                                    tickMargin={8}
                                                    allowDecimals={false}
                                                />
                                                <ChartTooltip
                                                    cursor={false}
                                                    content={
                                                        <ChartTooltipContent
                                                            indicator="dot"
                                                            labelFormatter={(value, payload) => payload?.[0]?.payload.match === 0 ? "Awal Musim" : `Match ${payload?.[0]?.payload.match}`}
                                                            formatter={(value, name, item) => (
                                                                <div className="text-left">
                                                                    <p className="text-xs text-muted-foreground">{item.payload.tooltip}</p>
                                                                    <p className="font-bold">Nilai Tren: {item.payload.points > 0 ? `+${item.payload.points}`: item.payload.points}</p>
                                                                </div>
                                                            )}
                                                        />
                                                    }
                                                />
                                                <Line
                                                    dataKey="points"
                                                    type="monotone"
                                                    stroke="hsl(var(--primary))"
                                                    strokeWidth={2}
                                                    dot={{
                                                        fill: "hsl(var(--primary))",
                                                        r: 4
                                                    }}
                                                    activeDot={{
                                                        r: 6
                                                    }}
                                                />
                                            </LineChart>
                                        </ChartContainer>
                                    ) : (
                                        <p className="text-center text-muted-foreground py-8">Butuh minimal 2 pertandingan untuk menampilkan tren.</p>
                                    )}
                                </CardContent>
                            </Card>
                         </TabsContent>
                    </Tabs>
                  </div>
                </div>
            </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>

    <Dialog open={passwordPromptOpen} onOpenChange={setPasswordPromptOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><KeyRound className="w-5 h-5 text-primary"/> Akses Terbatas</DialogTitle>
                <DialogDescription className="text-foreground">Tab ini hanya dapat diakses oleh admin dan <strong>Ade Urip</strong>. Silakan masukkan kata sandi untuk melanjutkan.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="trend-password">Kata Sandi</Label>
                    <Input
                        id="trend-password"
                        type="password"
                        value={passwordInput}
                        onChange={e => setPasswordInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handlePasswordSubmit()}
                        className="col-span-3"
                    />
                </div>
            </div>
            <DialogFooter>
                <Button onClick={handlePasswordSubmit}>Buka</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  );
}


const ResultBadge = ({ result }: { result: 'W' | 'D' | 'L' }) => {
    const resultConfig = {
        W: { text: 'W', className: 'bg-green-500/20 text-green-400 border-green-500/50' },
        D: { text: 'D', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-400' },
        L: { text: 'L', className: 'bg-red-500/20 text-red-400 border-red-500/50' },
    };
    const { text, className } = resultConfig[result];
    
    return <Badge variant="outline" className={cn("w-8 h-8 flex items-center justify-center text-sm font-bold border-2", className)}>{text}</Badge>
};

const HomeAwayBadge = ({ isHome }: { isHome: boolean }) => {
    const text = isHome ? 'H' : 'A';
    return <Badge variant="outline" className={cn("w-8 h-8 flex items-center justify-center p-0 font-bold text-sm border-2")}>{text}</Badge>
};

    
