'use client';

import { useMemo, useState, useEffect } from 'react';
import type { Match, Season, Team, Player, WithId, LeagueEntry } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Swords, Trophy, User, History, Info, Calendar, Percent, TrendingUp, CheckCircle2, XCircle, MinusCircle, LineChart as LineChartIcon, Clock, Save, Zap, ShieldAlert, Target } from 'lucide-react';
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
import { ChartContainer, ChartConfig, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar as CalendarComponent } from './ui/calendar';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

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
  const [localSchedules, setLocalSchedules] = useState<Record<string, { date: string, time: string }>>({});
  
  // State for the inputs in the dialog
  const [tempDate, setTempDate] = useState<Date | undefined>(undefined);
  const [tempTime, setTempTime] = useState<string>("");

  // Load informational schedules from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('playoff_info_schedules');
    if (saved) {
      try {
        setLocalSchedules(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load local schedules", e);
      }
    }
  }, []);

  // Update temp inputs when a match is selected
  useEffect(() => {
    if (selectedMatch) {
      const schedule = localSchedules[selectedMatch.id];
      if (schedule) {
        setTempDate(schedule.date ? new Date(schedule.date) : undefined);
        setTempTime(schedule.time || "");
      } else {
        setTempDate(undefined);
        setTempTime("");
      }
    }
  }, [selectedMatch, localSchedules]);

  const handleSaveInfoSchedule = () => {
    if (!selectedMatch) return;
    
    const newSchedules = {
      ...localSchedules,
      [selectedMatch.id]: {
        date: tempDate ? tempDate.toISOString() : "",
        time: tempTime
      }
    };
    
    setLocalSchedules(newSchedules);
    localStorage.setItem('playoff_info_schedules', JSON.stringify(newSchedules));
  };

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

  const analysisData = useMemo(() => {
    if (!selectedMatch || !selectedMatch.player1 || !selectedMatch.player2) return null;
    
    const id1 = selectedMatch.player1Id;
    const id2 = selectedMatch.player2Id;

    const getPlayerStats = (playerId: string) => {
        const entry = leagueTable.find(e => e.playerId === playerId);
        
        const groupRank = (entry && entry.group)
            ? leagueTable
                .filter(e => e.group === entry.group)
                .sort((a, b) => {
                    if (b.points !== a.points) return b.points - a.points;
                    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
                    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
                    return 0;
                })
                .findIndex(e => e.playerId === playerId) + 1
            : entry?.rank;

        const playerMatches = matches
            .filter(m => m.isCompleted && (m.player1Id === playerId || m.player2Id === playerId))
            .sort((a,b) => a.matchDate.toMillis() - b.matchDate.toMillis());

        let currentTrend = 0;
        let totalGF = 0;
        let totalGA = 0;

        const analyzedMatches = playerMatches.map(m => {
            const isP1 = m.player1Id === playerId;
            const opponentId = isP1 ? m.player2Id : m.player1Id;
            const oppEntry = leagueTable.find(e => e.playerId === opponentId);
            const opponentName = oppEntry ? oppEntry.playerName : (playersById[opponentId]?.name || 'Unknown');
            
            const pScore = isP1 
                ? (m.player1Wins !== null ? m.player1Wins : (m.player1Score ?? 0))
                : (m.player2Wins !== null ? m.player2Wins : (m.player2Score ?? 0));
            
            const oScore = isP1
                ? (m.player2Wins !== null ? m.player2Wins : (m.player2Score ?? 0))
                : (m.player1Wins !== null ? m.player1Wins : (m.player1Score ?? 0));

            totalGF += (pScore || 0);
            totalGA += (oScore || 0);

            const result = pScore > oScore ? 'W' : pScore < oScore ? 'L' : 'D';
            if (result === 'W') currentTrend += 1;
            else if (result === 'L') currentTrend -= 1;
            
            return { ...m, pScore, oScore, result, opponentName, trendAtMatch: currentTrend };
        });

        const totalPlayed = analyzedMatches.length;
        const totalWins = analyzedMatches.filter(m => m.result === 'W').length;
        const totalLosses = analyzedMatches.filter(m => m.result === 'L').length;
        const totalDraws = analyzedMatches.filter(m => m.result === 'D').length;
        const winRate = totalPlayed > 0 ? (totalWins / totalPlayed) * 100 : 0;
        
        const avgGF = totalPlayed > 0 ? totalGF / totalPlayed : 0;
        const avgGA = totalPlayed > 0 ? totalGA / totalPlayed : 0;

        const chartData = [{ match: 0, trend: 0, tooltip: 'Awal Musim' }, ...analyzedMatches.map((m, i) => ({
            match: i + 1,
            trend: m.trendAtMatch,
            tooltip: `vs ${m.opponentName}: ${m.pScore} - ${m.oScore} (${m.result})`
        }))];

        const performanceStatus = (() => {
            if (currentTrend >= 3) return { text: "Merasa Tak Terkalahkan", color: "text-green-400" };
            if (currentTrend >= 1) return { text: "Dalam performa yang bagus", color: "text-green-400" };
            if (currentTrend <= -3) return { text: "Pemain sedang ketakutan", color: "text-red-400" };
            if (currentTrend <= -1) return { text: "Performa sedang buruk", color: "text-red-400" };
            return { text: "Mental Stabil", color: "text-muted-foreground" };
        })();

        const playingStyle = (() => {
            if (totalPlayed === 0) return { text: "Balanced", color: "bg-primary/20 text-primary border-primary/50", icon: Target };
            if (avgGF >= 1.5) return { text: "Attacking", color: "bg-red-500/20 text-red-400 border-red-500/50", icon: Zap };
            if (avgGA <= 1.2 && winRate >= 40) return { text: "Defensive & Counter", color: "bg-blue-500/20 text-blue-400 border-blue-500/50", icon: ShieldAlert };
            return { text: "Balanced", color: "bg-primary/20 text-primary border-primary/50", icon: Target };
        })();

        return { 
            entry: entry ? { ...entry, groupRank } : null, 
            matches: analyzedMatches, 
            winRate, 
            finalTrend: currentTrend, 
            chartData, 
            status: performanceStatus, 
            playingStyle,
            totalWins,
            totalLosses,
            totalDraws,
            totalPlayed,
            totalGF,
            totalGA,
            totalGD: totalGF - totalGA
        };
    };

    return {
        p1Stats: getPlayerStats(id1),
        p2Stats: getPlayerStats(id2),
    };
  }, [selectedMatch, matches, leagueTable, playersById]);

  const globalYDomain = useMemo(() => {
    if (!analysisData) return [-2, 2];
    const allTrendPoints = [
        ...analysisData.p1Stats.chartData.map(d => d.trend),
        ...analysisData.p2Stats.chartData.map(d => d.trend)
    ];
    const min = Math.min(...allTrendPoints, -1);
    const max = Math.max(...allTrendPoints, 1);
    return [min - 1, max + 1];
  }, [analysisData]);

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

  const PlayerAnalysisColumn = ({ stats, playerInfo, team, variant = 'primary', side, matchScore, showScore }: { stats: any, playerInfo: any, team: any, variant?: 'primary' | 'gold', side: 'left' | 'right', matchScore?: number | null, showScore?: boolean }) => {
    const StyleIcon = stats.playingStyle.icon;
    
    const watermarkColorClass = 
        stats.playingStyle.text === "Attacking" ? "text-red-500" :
        stats.playingStyle.text === "Defensive & Counter" ? "text-blue-500" :
        "text-primary";
    
    const StatMinimal = ({ label, value, color }: { label: string, value: any, color: string }) => (
        <div className="flex flex-col items-center flex-1">
            <span className="text-[7px] font-black text-muted-foreground uppercase leading-tight">{label}</span>
            <span className={cn("text-[10px] font-black leading-tight", color)}>{value}</span>
        </div>
    );

    return (
        <div className="space-y-4 relative overflow-hidden rounded-xl py-2 px-1">
            <div className={cn(
                "absolute -top-4 pointer-events-none opacity-[0.12] -z-0 transition-all duration-700",
                side === 'left' ? "-right-6" : "-left-6"
            )}>
                <StyleIcon 
                    className={cn(
                        "w-32 h-32", 
                        watermarkColorClass,
                        side === 'left' ? "rotate-[25deg]" : "-rotate-[25deg]"
                    )} 
                    strokeWidth={1.5} 
                />
            </div>

            <div className="flex flex-col items-center gap-2 text-center relative z-10">
                <div className="relative">
                    {showScore && matchScore !== null && (
                        <div className={cn(
                            "absolute inset-0 flex items-center justify-center pointer-events-none -z-10 select-none transition-all duration-500",
                            side === 'left' ? "-translate-x-20" : "translate-x-20"
                        )}>
                            <span className="text-9xl font-black opacity-20 text-white italic">
                                {matchScore}
                            </span>
                        </div>
                    )}
                    <Avatar className={cn("h-12 w-12 border-2", variant === 'gold' ? "border-yellow-400/50" : "border-primary/50")}>
                        <AvatarImage src={team?.logoUrl} />
                        <AvatarFallback><User /></AvatarFallback>
                    </Avatar>
                </div>
                <div className="flex flex-col items-center w-full">
                    <p className="text-sm font-bold truncate max-w-[120px] mx-auto">{playerInfo?.name || 'TBD'}</p>
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold mx-auto">{team?.name}</p>
                    <div className="flex flex-col items-center gap-1 mt-1 w-full">
                        {stats.entry?.group && (
                            <Badge variant="outline" className={cn(
                                "text-[9px] font-black h-4 px-1.5 uppercase",
                                variant === 'gold' ? "border-yellow-400/50 text-yellow-400 bg-yellow-400/5" : "border-primary/50 text-primary bg-primary/5"
                            )}>
                                GRUP {stats.entry.group} Rank : {stats.entry.groupRank}
                            </Badge>
                        )}
                        <Badge variant="outline" className={cn("text-[8px] font-bold h-4 px-1.5 uppercase border flex items-center gap-1", stats.playingStyle.color)}>
                            <StyleIcon className="w-2.5 h-2.5" />
                            Gaya Bermain : {stats.playingStyle.text}
                        </Badge>
                    </div>
                </div>
            </div>

            {stats.entry && (
                <div className="grid grid-cols-2 gap-2 relative z-10">
                    <div className="bg-muted/30 p-2 rounded-md border text-center">
                        <p className="text-[10px] text-muted-foreground font-bold uppercase">Win Rate</p>
                        <div className="flex items-center justify-center gap-1">
                            <Percent className={cn("w-3 h-3", variant === 'gold' ? "text-yellow-400" : "text-primary")} />
                            <p className={cn("text-sm font-black", variant === 'gold' ? "text-yellow-400" : "text-primary")}>{stats.winRate.toFixed(0)}%</p>
                        </div>
                    </div>
                    <div className="bg-muted/30 p-2 rounded-md border text-center">
                        <p className="text-[10px] text-muted-foreground font-bold uppercase">Poin Grup</p>
                        <p className={cn("text-sm font-black", variant === 'gold' ? "text-yellow-400" : "text-primary")}>{stats.entry.points}</p>
                    </div>
                </div>
            )}

            <div className="relative z-10 pt-2 border-t border-border/30">
                <div className="bg-muted/20 border rounded-lg p-1.5 flex justify-between items-center gap-1">
                    <StatMinimal label="W" value={stats.totalWins} color="text-green-400" />
                    <StatMinimal label="D" value={stats.totalDraws} color="text-yellow-400" />
                    <StatMinimal label="L" value={stats.totalLosses} color="text-red-400" />
                    <div className="w-px h-4 bg-border/50 mx-0.5" />
                    <StatMinimal label="GF" value={stats.totalGF} color="text-primary" />
                    <StatMinimal label="GA" value={stats.totalGA} color="text-foreground" />
                    <StatMinimal label="GD" value={stats.totalGD > 0 ? `+${stats.totalGD}` : stats.totalGD} color={stats.totalGD >= 0 ? "text-primary" : "text-red-400"} />
                </div>
            </div>

            <div className="space-y-1.5 relative z-10">
                <p className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                    <History className="w-3 h-3" /> Laga Terakhir
                </p>
                <div className="flex flex-wrap gap-1">
                    <TooltipProvider delayDuration={0}>
                        {stats.matches.map((m: any, i: number) => (
                            <Tooltip key={i}>
                                <TooltipTrigger asChild>
                                    <Badge 
                                        variant="outline" 
                                        className={cn(
                                            "w-6 h-6 p-0 flex items-center justify-center text-[10px] font-black border-2 cursor-help transition-transform hover:scale-110 active:scale-95",
                                            m.result === 'W' ? "bg-green-500/10 text-green-400 border-green-500/50" :
                                            m.result === 'L' ? "bg-red-500/10 text-red-400 border-red-500/50" :
                                            "bg-yellow-500/10 text-yellow-400 border-yellow-500/50"
                                        )}
                                    >
                                        {m.result}
                                    </Badge>
                                </TooltipTrigger>
                                <TooltipContent className="text-center p-2 backdrop-blur-md bg-background/90 border-primary/50 shadow-xl">
                                    <p className="text-[10px] font-black uppercase text-primary mb-1">{m.round || 'Babak Grup'}</p>
                                    <p className="text-xs font-bold">vs {m.opponentName}</p>
                                    <p className="text-sm font-black mt-1 text-yellow-400">{m.pScore} - {m.oScore}</p>
                                </TooltipContent>
                            </Tooltip>
                        ))}
                    </TooltipProvider>
                </div>
            </div>
        </div>
    );
  };

  const TrendChartBox = ({ data, color, playerName, yDomain, status }: { data: any[], color: string, playerName: string, yDomain: number[], status: any }) => (
    <div className="bg-muted/20 rounded-lg border p-4 space-y-3">
        <div className="flex flex-col border-b pb-2 gap-1">
            <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                    <LineChartIcon className="w-3.5 h-3.5" style={{ color }} />
                    Tren {playerName}
                </h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-background border" style={{ color }}>
                    {data[data.length-1]?.trend > 0 ? `+${data[data.length-1]?.trend}` : data[data.length-1]?.trend} PTS
                </span>
            </div>
            {status && <p className={cn("text-[9px] font-bold italic uppercase tracking-wider", status.color)}>"{status.text}"</p>}
        </div>
        <div className="h-32 w-full">
            <ChartContainer config={{ trend: { label: "Trend", color } }} className="h-full w-full">
                <LineChart data={data} margin={{ left: -30, right: 10, top: 10, bottom: 0 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" />
                    <XAxis dataKey="match" tickLine={false} axisLine={false} tickMargin={8} tick={{ fontSize: 9 }} tickFormatter={(value) => value === 0 ? 'Start' : `M${value}`} />
                    <YAxis tickLine={false} axisLine={false} tickMargin={8} tick={{ fontSize: 9 }} allowDecimals={false} domain={yDomain} />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" labelFormatter={(value, payload) => payload?.[0]?.payload.match === 0 ? "Awal Musim" : `Match ${payload?.[0]?.payload.match}`} formatter={(value, name, item) => (<div className="text-left"><p className="text-[10px] text-muted-foreground font-bold">{item.payload.tooltip}</p><p className="font-black text-xs mt-1">Nilai Tren: {item.payload.trend > 0 ? `+${item.payload.trend}` : item.payload.trend}</p></div>)} />} />
                    <Line dataKey="trend" type="monotone" stroke={color} strokeWidth={3} dot={{ fill: color, r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
            </ChartContainer>
        </div>
    </div>
  );

  const hasScheduleInfo = selectedMatch && localSchedules[selectedMatch.id] && (localSchedules[selectedMatch.id].date || localSchedules[selectedMatch.id].time);

  return (
    <div className="w-full overflow-x-auto pb-8 pt-4">
      <div className="min-w-[700px] flex justify-between items-start gap-8 px-4">
        <div className="flex flex-col gap-8">
          <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground text-center mb-2">Perempat Final</h3>
          <div className="flex flex-col gap-6">
            {bracketData['Quarter-Final'].length > 0 ? (
                bracketData['Quarter-Final'].map(m => <MatchCard key={m.id} match={m} />)
            ) : (
                [...Array(4)].map((_, i) => (
                    <div key={i} className="w-48 sm:w-56 h-20 bg-card/30 border-2 border-primary/10 border-dashed rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all duration-500">
                        <Swords className="h-4 w-4 text-primary/30" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/40 italic">Menunggu Grup</span>
                    </div>
                ))
            )}
          </div>
        </div>

        <div className="flex flex-col gap-8">
          <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground text-center mb-2">Semi Final</h3>
          <div className="flex flex-col justify-around flex-grow gap-24 py-12">
             {bracketData['Semi-Final'].length > 0 ? (
                bracketData['Semi-Final'].map(m => <MatchCard key={m.id} match={m} />)
            ) : (
                [...Array(2)].map((_, i) => (
                    <div key={i} className="w-48 sm:w-56 h-20 bg-card/30 border-2 border-primary/10 border-dashed rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all duration-500">
                        <Swords className="h-4 w-4 text-primary/30" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/40 italic">Menunggu QF</span>
                    </div>
                ))
            )}
          </div>
        </div>

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
                <div className="w-48 sm:w-56 h-24 bg-primary/5 border-2 border-primary/20 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 transition-all duration-500">
                    <Trophy className="h-6 w-6 text-primary/20 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/40 italic">Menunggu Finalis</span>
                </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={!!selectedMatch} onOpenChange={(open) => !open && setSelectedMatch(null)}>
        <DialogContent className="max-w-3xl border-primary border-2 p-0 overflow-hidden">
            <ScrollArea className="max-h-[90vh]">
                <div className="p-6 space-y-6">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl font-black uppercase tracking-tighter">
                            <TrendingUp className="w-6 h-6 text-primary" />
                            <span className="text-white">Analisis Tren & Momentum</span>
                            <span className="text-primary ml-1">
                                ({
                                    selectedMatch?.round === 'Quarter-Final' ? 'Perempat Final' :
                                    selectedMatch?.round === 'Semi-Final' ? 'Semi Final' : 'Grand Final'
                                })
                            </span>
                        </DialogTitle>
                        <DialogDescription>
                            Perbandingan stabilitas hasil seluruh pertandingan (Grup + Playoff) masing-masing peserta.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedMatch && (
                        <div className="space-y-6">
                            {(isAdmin || hasScheduleInfo) && (
                                <div className="flex justify-center">
                                    <div className="bg-card border-2 border-primary/20 rounded-lg p-1.5 space-y-1.5 w-fit">
                                        <div className="flex items-center justify-center gap-2 text-primary font-bold text-[9px] uppercase tracking-widest px-2">
                                            <Calendar className="w-3 h-3" /> Rencana Pertandingan (Informasi Saja)
                                        </div>
                                        {isAdmin && (
                                            <div className="grid grid-cols-1 sm:flex sm:items-end gap-2 px-2 pb-1">
                                                <div className="space-y-1">
                                                    <Label className="text-[9px] font-bold uppercase text-muted-foreground">Pilih Hari/Tanggal</Label>
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <Button variant="outline" size="sm" className="w-full justify-start font-normal text-[10px] h-8 px-2">
                                                                <Calendar className="mr-1.5 h-3 w-3" />
                                                                {tempDate ? format(tempDate, "eeee, d MMM yyyy", { locale: localeId }) : "Pilih Tanggal"}
                                                            </Button>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-auto p-0" align="start"><CalendarComponent mode="single" selected={tempDate} onSelect={setTempDate} initialFocus /></PopoverContent>
                                                    </Popover>
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-[9px] font-bold uppercase text-muted-foreground">Waktu (HH:mm)</Label>
                                                    <Input placeholder="HH:mm" value={tempTime} onChange={(e) => setTempTime(e.target.value)} className="h-8 text-[10px] px-2 w-20" />
                                                </div>
                                                <Button size="sm" onClick={handleSaveInfoSchedule} className="h-8 text-[10px] gap-1.5 px-3"><Save className="w-3 h-3" /> Simpan Info</Button>
                                            </div>
                                        )}
                                        {hasScheduleInfo && (
                                            <div className="flex justify-center py-0.5">
                                                <div className="px-4 py-1.5 bg-primary/5 rounded border border-primary/20 flex items-center justify-center gap-3 text-xs font-black text-primary italic w-fit">
                                                    <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{localSchedules[selectedMatch.id].date ? format(new Date(localSchedules[selectedMatch.id].date), "eeee, d MMMM yyyy", { locale: localeId }) : "Hari belum ditentukan"}</div>
                                                    <div className="w-px h-3 bg-primary/20" />
                                                    <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{localSchedules[selectedMatch.id].time || "Jam belum ditentukan"}</div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-8 relative">
                                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border/50 hidden sm:block" />
                                
                                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 hidden sm:flex items-center justify-center">
                                    <div className="bg-background border-4 border-primary rounded-full w-16 h-16 flex items-center justify-center shadow-[0_0_25px_rgba(204,253,1,0.5)] ring-4 ring-background">
                                        <span className="text-primary font-black italic text-2xl tracking-tighter pr-1">VS</span>
                                    </div>
                                </div>

                                <PlayerAnalysisColumn 
                                    stats={analysisData?.p1Stats} 
                                    playerInfo={selectedMatch.player1} 
                                    team={selectedMatch.team1} 
                                    variant="primary" 
                                    side="left" 
                                    matchScore={selectedMatch.score1}
                                    showScore={selectedMatch.isCompleted}
                                />
                                <PlayerAnalysisColumn 
                                    stats={analysisData?.p2Stats} 
                                    playerInfo={selectedMatch.player2} 
                                    team={selectedMatch.team2} 
                                    variant="gold" 
                                    side="right" 
                                    matchScore={selectedMatch.score2}
                                    showScore={selectedMatch.isCompleted}
                                />
                            </div>

                            <div className="space-y-4 pt-4 border-t">
                                <h4 className="text-xs font-bold flex items-center gap-2 text-primary uppercase tracking-widest"><LineChartIcon className="w-4 h-4" /> Grafik Stabilitas Individu</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <TrendChartBox data={analysisData?.p1Stats.chartData} color="hsl(var(--primary))" playerName={selectedMatch.player1?.name || 'Pemain 1'} yDomain={globalYDomain} status={analysisData?.p1Stats.status} />
                                    <TrendChartBox data={analysisData?.p2Stats.chartData} color="#FACC15" playerName={selectedMatch.player2?.name || 'Pemain 2'} yDomain={globalYDomain} status={analysisData?.p2Stats.status} />
                                </div>
                                <p className="text-[9px] text-yellow-400 italic text-center leading-tight">*Grafik menunjukkan akumulasi hasil positif (+1 Menang) vs negatif (-1 Kalah). Garis yang terus naik menandakan stabilitas performa yang tinggi.</p>
                            </div>
                            <div className="pt-2 border-t border-border flex justify-start gap-2 items-center text-[10px] font-bold">
                                <span className="text-muted-foreground uppercase tracking-tighter">Babak Kompetisi Saat Ini:</span>
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
