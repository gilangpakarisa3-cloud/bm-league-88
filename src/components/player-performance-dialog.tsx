'use client';

import { useMemo, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { WithId, LeagueEntry, Match, Player, Team, Season, CoOpLeagueEntry } from '@/lib/types';
import { User, Shield, Percent, Trophy, Award, TrendingUp, Zap, Activity, Scan, Binary, Star, Flame, BarChart3 } from 'lucide-react';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { Progress } from './ui/progress';
import { ScrollArea } from './ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ChartContainer, ChartConfig } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceLine } from 'recharts';

interface PlayerPerformanceDialogProps {
  player: WithId<LeagueEntry> | null;
  matches: WithId<Match>[];
  allPlayers: WithId<Player>[];
  allTeams: WithId<Team>[];
  totalPlayersInSeason: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defendingChampionId?: string;
  isAdmin: boolean;
  activeSeason: WithId<Season> | null;
  coopLeagueTable: WithId<CoOpLeagueEntry>[];
  singleLeagueTable: WithId<LeagueEntry>[];
}

const StatDisplay = ({ label, value, variant = "default" }: { label: string, value: string | number, variant?: "default" | "primary" | "gold" }) => (
  <div className={cn(
      "flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all duration-500 group/stat",
      variant === "primary" ? "bg-primary/10 border-primary/20 hover:border-primary/50" : 
      variant === "gold" ? "bg-yellow-500/10 border-yellow-500/20 hover:border-yellow-500/50" : "bg-white/5 border-white/10 hover:border-white/30"
  )}>
    <span className="text-[7px] font-black text-white/40 uppercase tracking-[0.2em]">{label}</span>
    <span className={cn("text-lg font-black italic tabular-nums leading-none mt-1", variant === "primary" ? "text-primary" : variant === "gold" ? "text-yellow-500" : "text-white")} suppressHydrationWarning>{value}</span>
  </div>
);

const IntelCard = ({ icon: Icon, label, value, variant = "default" }: { icon: any, label: string, value: string | number, variant?: "default" | "primary" | "gold" }) => (
  <div className={cn(
      "flex flex-col items-center text-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-500 relative overflow-hidden group/intel",
      variant === "primary" ? "bg-primary/10 border-primary/20 hover:border-primary/50" : 
      variant === "gold" ? "bg-yellow-500/10 border-yellow-500/20 hover:border-yellow-500/50" : "bg-white/5 border-white/10 hover:border-white/20"
  )}>
      <div className="absolute inset-0 bg-current opacity-0 group-hover/intel:opacity-5 transition-opacity" />
      <div className="flex items-center justify-center gap-1.5 relative z-10">
          <Icon className={cn("w-3 h-3", variant === "primary" ? "text-primary" : variant === "gold" ? "text-yellow-500" : "text-white/60")} />
          <span className="text-[7px] font-black uppercase tracking-[0.2em] text-white/60">{label}</span>
      </div>
      <span className={cn("font-black text-sm uppercase italic leading-none relative z-10", variant === "primary" ? "text-primary" : variant === "gold" ? "text-yellow-500" : "text-white")} suppressHydrationWarning>{value}</span>
  </div>
);

export function PlayerPerformanceDialog({ 
    player, 
    matches, 
    allPlayers, 
    allTeams, 
    totalPlayersInSeason, 
    open, 
    onOpenChange, 
    defendingChampionId, 
    isAdmin, 
    activeSeason, 
    coopLeagueTable,
    singleLeagueTable
}: PlayerPerformanceDialogProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('history');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (player) setActiveTab('history');
  }, [player]);
  
  const playersById = useMemo(() => allPlayers.reduce((acc, p) => { acc[p.id] = p; return acc; }, {} as Record<string, WithId<Player>>), [allPlayers]);
  const teamsById = useMemo(() => allTeams.reduce((acc, t) => { acc[t.id] = t; return acc; }, {} as Record<string, WithId<Team>>), [allTeams]);

  const masterPlayersRanked = useMemo(() => {
    const players = Object.values(playersById);
    const withOvr = players.map(p => {
        const poss = (p.overallPlayed || 0) * 3;
        const act = ((p.overallWin || 0) * 3) + ((p.overallDraw || 0) * 1);
        return { ...p, ovrRating: poss > 0 ? (act / poss) * 100 : 0 };
    });
    return [...withOvr].sort((a, b) => b.ovrRating - a.ovrRating || b.overallPlayed - a.overallPlayed).map((p, i) => ({ ...p, masterRank: i + 1 }));
  }, [playersById]);

  const performanceStats = useMemo(() => {
    if (!player || !activeSeason) return null;

    const isCoop = (activeSeason.type || 'Single') === 'Co-Op';
    const playerIdToFilter = isCoop ? player.id : player.playerId;

    const coopTableById = (coopLeagueTable || []).reduce((acc, entry) => { acc[entry.id] = entry; return acc; }, {} as Record<string, WithId<CoOpLeagueEntry>>);
    const singleTableByPlayerId = (singleLeagueTable || []).reduce((acc, entry) => { acc[entry.playerId] = entry; return acc; }, {} as Record<string, WithId<LeagueEntry>>);

    const playerMatches = matches.filter(m => (m.player1Id === playerIdToFilter || m.player2Id === playerIdToFilter));

    const completedMatches = playerMatches
      .filter(m => m.isCompleted)
      .sort((a, b) => b.matchDate.toMillis() - a.matchDate.toMillis())
      .map(m => {
        const isPlayer1 = m.player1Id === playerIdToFilter;
        const opponentId = isPlayer1 ? m.player2Id : m.player1Id;
        let opponent = null; let opponentTeam = null;
        
        if (isCoop) {
            const opponentEntry = coopTableById[opponentId];
            if (opponentEntry) { opponent = { name: opponentEntry.teamName }; opponentTeam = teamsById[opponentEntry.player1TeamId] || null; }
        } else {
            const opponentEntry = singleTableByPlayerId[opponentId];
            if (opponentEntry) { opponent = { name: opponentEntry.playerName }; opponentTeam = teamsById[opponentEntry.teamId]; }
            else { const opponentPlayer = playersById[opponentId]; if(opponentPlayer){ opponent = { name: opponentPlayer.name }; opponentTeam = teamsById[opponentPlayer.teamId]; } }
        }

        let result: 'W' | 'L' | 'D';
        let playerResult, opponentResult;
        if (isCoop) {
            playerResult = isPlayer1 ? m.player1Wins! : m.player2Wins!;
            opponentResult = isPlayer1 ? m.player2Wins! : m.player1Wins!;
            result = playerResult > opponentResult ? 'W' : 'L';
        } else {
            playerResult = isPlayer1 ? m.player1Score! : m.player2Score!;
            opponentResult = isPlayer1 ? m.player2Score! : m.player1Score!;
            if (playerResult > opponentResult) result = 'W';
            else if (playerResult < opponentResult) result = 'L';
            else result = 'D';
        }
        return { ...m, isPlayer1, opponent, opponentTeam, playerResult, opponentResult, result };
      });
      
    const upcomingMatches = playerMatches
      .filter(m => !m.isCompleted)
      .sort((a,b) => a.matchDate.toMillis() - b.matchDate.toMillis())
      .map(m => {
          const isPlayer1 = m.player1Id === playerIdToFilter;
          const opponentId = isPlayer1 ? m.player2Id : m.player1Id;
          let opponent = null; let opponentTeam = null;
          if (isCoop) {
            const opponentEntry = coopTableById[opponentId];
            if (opponentEntry) { opponent = { name: opponentEntry.teamName }; opponentTeam = teamsById[opponentEntry.player1TeamId] || null; }
          } else {
              const opponentEntry = singleTableByPlayerId[opponentId];
              if (opponentEntry) { opponent = { name: opponentEntry.playerName }; opponentTeam = teamsById[opponentEntry.teamId]; }
              else { const opponentPlayer = playersById[opponentId]; if (opponentPlayer) { opponent = { name: opponentPlayer.name }; opponentTeam = teamsById[opponentPlayer.teamId]; } }
          }
          return { ...m, isPlayer1, opponent, opponentTeam }
      });

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
    
    const possiblePoints = stats.played * 3;
    const actualPoints = (stats.win * 3) + (stats.draw * 1);
    const winRate = possiblePoints > 0 ? (actualPoints / possiblePoints) * 100 : 0;

    let trendScore = 0;
    const chartData = [{ match: 0, points: 0 }, ...[...completedMatches].reverse().map((match, index) => {
        if (match.result === 'W') trendScore += 1;
        else if (match.result === 'L') trendScore -= 1;
        return { match: index + 1, points: trendScore };
    })];

    const masterInfo = masterPlayersRanked.find(p => p.id === playerIdToFilter);

    let pST = "Balance"; 
    let pSType: 'attacking' | 'defensive' | 'balanced' = 'balanced'; 
    let pSD = t('play_style_balanced_desc');
    
    if (stats.played > 0) {
        const avgGF = stats.gf / stats.played;
        const avgGA = stats.ga / stats.played;
        if (avgGF > 1.6) {
            pST = "Attacking";
            pSType = 'attacking';
            pSD = t('play_style_attacking_desc');
        } else if (avgGA < 1.2 && stats.played >= 3) {
            pST = "Defense & Counter";
            pSType = 'defensive';
            pSD = t('play_style_defensive_desc');
        }
    }

    const last5Matches = completedMatches.slice(0, 5);
    let performanceStatus = null;
    if (last5Matches.length > 0) {
        const winCount = last5Matches.filter(m => m.result === 'W').length;
        const lossCount = last5Matches.filter(m => m.result === 'L').length;
        if (winCount === 5) performanceStatus = { text: "Merasa tak terkalahkan", color: "text-green-400" };
        else if (winCount >= 3) performanceStatus = { text: "Performa Unggul", color: "text-green-400" };
        else if (lossCount >= 3) performanceStatus = { text: "Performa Menurun", color: "text-red-400" };
    }

    const groupSize = activeSeason.type === 'Hybrid' 
        ? (player.group === 'A' ? singleLeagueTable.filter(p => p.group === 'A') : singleLeagueTable.filter(p => p.group === 'B')).length 
        : totalPlayersInSeason;

    return { completedMatches, upcomingMatches, winRate, seasonProgress, totalMatchesCount, chartData, performanceStatus, stats, groupSize, playStyleText: pST, playStyleType: pSType, playStyleDescription: pSD, masterInfo }
  }, [player, matches, playersById, teamsById, totalPlayersInSeason, activeSeason, coopLeagueTable, singleLeagueTable, t, masterPlayersRanked]);

  const chartConfig = { points: { label: "Tren", color: "hsl(var(--primary))" } } satisfies ChartConfig;

  if (!player || !performanceStats) return null;

  const playerTeamDetails = teamsById[player.teamId];
  const { completedMatches, upcomingMatches, winRate, seasonProgress, totalMatchesCount, chartData, performanceStatus, stats, groupSize, playStyleText, playStyleType, playStyleDescription, masterInfo } = performanceStats;
  
  const isTopRank = player.rank === 1;
  const isBottomRank = player.rank >= groupSize - 2 && groupSize > 3;
  const isDefendingChampion = player.playerId === defendingChampionId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-primary border-4 p-0 overflow-hidden bg-background/95 backdrop-blur-3xl rounded-[2.5rem] shadow-[0_0_100px_rgba(204,253,1,0.15)]">
        <ScrollArea className="max-h-[90vh]">
            <div className="p-6 relative">
                {/* HUD Scanning Layer */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.02),rgba(0,255,0,0.01),rgba(0,0,255,0.02))] bg-[length:100%_4px,3px_100%] pointer-events-none opacity-20" />

                <DialogHeader className="flex flex-col items-center text-center relative z-10">
                    <div className="flex items-center gap-2 mb-4 bg-primary/10 px-4 py-1 rounded-full border border-primary/20">
                        <Scan className="w-3 h-3 text-primary animate-pulse" />
                        <span className="text-[8px] font-black uppercase tracking-[0.3em] text-primary italic">Roster Intel Transmission</span>
                    </div>

                    <div className="relative group">
                      <div className="absolute -inset-6 bg-primary/20 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000 animate-pulse" />
                      
                      {player.group && (
                          <div className="absolute -top-2 -left-2 z-20">
                              <Badge className="bg-primary text-black border-2 border-background font-black text-[10px] px-3 h-7 italic shadow-xl uppercase">
                                  GRUP {player.group}
                              </Badge>
                          </div>
                      )}

                      <Avatar className="h-28 w-28 border-4 border-primary shadow-2xl relative z-10 group-hover:scale-105 transition-all duration-500">
                        <AvatarImage src={playerTeamDetails?.logoUrl} alt={player.playerName} className="object-cover" referrerPolicy="no-referrer" />
                        <AvatarFallback className="bg-black/40 font-black text-xs"><User className="h-14 w-14 text-white/10" /></AvatarFallback>
                      </Avatar>
                      
                      <div className={cn(
                        "absolute -bottom-2 -right-2 flex h-12 w-12 items-center justify-center rounded-2xl border-4 border-background text-base font-black shadow-xl z-20 rotate-12 transition-transform group-hover:rotate-0",
                        isTopRank ? "bg-yellow-400 text-black shadow-[0_0_20px_rgba(250,204,21,0.4)]" : 
                        isBottomRank ? "bg-red-500 text-white" : "bg-primary text-black shadow-[0_0_20px_rgba(204,253,1,0.4)]"
                      )} suppressHydrationWarning>
                        {player.rank}
                      </div>

                       {isDefendingChampion && (
                          <div className="absolute -top-3 -right-3 transform rotate-12 z-20 animate-bounce">
                              <Badge className="bg-amber-500 text-black border-2 border-white p-2 rounded-xl shadow-2xl">
                                  <Award className="w-6 h-6"/>
                              </Badge>
                          </div>
                      )}
                    </div>

                    <div className="space-y-1 pt-6 w-full flex flex-col items-center">
                      <DialogTitle className="text-4xl font-black tracking-tighter uppercase italic text-white text-center drop-shadow-[0_0_30px_rgba(255,255,255,0.1)] leading-none mb-2" suppressHydrationWarning>{player.playerName}</DialogTitle>
                      
                      <div className="flex items-center justify-center gap-3 font-black text-white/60 uppercase tracking-widest text-[11px] text-center bg-white/5 px-4 py-1.5 rounded-xl border border-white/5">
                          <Avatar className="h-5 w-5 opacity-80 border border-white/10"><AvatarImage src={playerTeamDetails?.logoUrl} className="object-cover" referrerPolicy="no-referrer" /><AvatarFallback><Shield/></AvatarFallback></Avatar>
                          <span className="text-center" suppressHydrationWarning>{player.teamName || 'Independent'}</span>
                      </div>

                      <div className="pt-4 flex justify-center">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Badge className={cn("text-xs font-black uppercase tracking-tighter px-6 py-2.5 border-2 cursor-help shadow-2xl animate-in fade-in zoom-in duration-500 transition-all hover:scale-105", 
                                    playStyleType === 'attacking' ? "bg-red-500/20 text-red-400 border-red-500/30" : 
                                    playStyleType === 'defensive' ? "bg-blue-500/20 text-blue-400 border-blue-500/30" : 
                                    "bg-primary/20 text-primary border-primary/30")}>
                                    {playStyleText}
                                </Badge>
                            </PopoverTrigger>
                            <PopoverContent className="w-64 text-center bg-background/95 border-primary/30 backdrop-blur-xl rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                                <p className="text-[11px] font-bold leading-relaxed text-white text-center">{playStyleDescription}</p>
                            </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                </DialogHeader>

                <div className="space-y-8 mt-10 relative z-10">
                    {/* Performance HUD Card - Redesigned for Solid Header & Glassy Body */}
                    <Card className="bg-black/80 backdrop-blur-3xl border-2 border-white/10 rounded-[2rem] overflow-hidden group hover:border-primary/40 transition-all duration-500 relative">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 -mr-12 -mt-12 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors" />
                        
                        <CardHeader className="p-5 bg-primary text-black relative z-10 border-b-2 border-black/10">
                            <div className="flex flex-col items-center gap-2 text-center">
                                <div className="flex items-center justify-center gap-3">
                                    <Binary className="w-4 h-4" />
                                    <h3 className="text-[11px] font-black tracking-[0.25em] uppercase italic">SEASON PERFORMANCE HUD</h3>
                                </div>
                                <div className="flex items-center gap-3 bg-black/10 px-3 py-1 rounded-lg">
                                    <Badge className="bg-black text-primary border-none font-black uppercase italic text-[10px] px-3 h-6 shadow-lg">OVR {winRate.toFixed(0)}%</Badge>
                                    <div className="w-1.5 h-1.5 rounded-full bg-black/20" />
                                    <span className="text-[10px] font-black uppercase tracking-widest opacity-80">{performanceStatus?.text || "Status: Stabil"}</span>
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent className="p-6 space-y-8 relative z-10">
                            <div className="space-y-3">
                                <div className="flex justify-between items-center px-1">
                                    <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-primary italic flex items-center gap-2">
                                        <Scan className="w-3.5 h-3.5"/> Signal Analysis
                                    </h3>
                                    <span className="text-[11px] font-black text-primary italic tabular-nums" suppressHydrationWarning>{seasonProgress.toFixed(0)}% COMPLETE</span>
                                </div>
                                <div className="relative h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                                    <div className="absolute left-0 top-0 h-full bg-primary shadow-[0_0_15px_rgba(204,253,1,0.6)] transition-all duration-1000" style={{ width: `${seasonProgress}%` }} />
                                </div>
                                <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em] text-center" suppressHydrationWarning>UNIT LOG: {stats.played} / {totalMatchesCount} ENAGEMENTS FINALIZED</p>
                            </div>

                            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2.5">
                                <StatDisplay label="Main" value={stats.played} />
                                <StatDisplay label="Win" value={stats.win} />
                                {activeSeason?.type !== 'Co-Op' && <StatDisplay label="Draw" value={stats.draw} />}
                                <StatDisplay label="Loss" value={stats.loss} />
                                <StatDisplay label="Points" value={player.points} variant="primary" />
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-2">
                                <div className="space-y-3 text-center">
                                    <p className="text-[8px] font-black text-primary/60 uppercase tracking-[0.3em] italic">Season Intel</p>
                                    <div className="grid gap-2.5">
                                        <IntelCard icon={Percent} label="OVR Musim" value={`${winRate.toFixed(0)}%`} variant="primary" />
                                        <IntelCard icon={Trophy} label="Rank Grup" value={`#${player.rank}`} />
                                    </div>
                                </div>
                                <div className="space-y-3 text-center">
                                    <p className="text-[8px] font-black text-white/60 uppercase tracking-[0.3em] italic">Career Intel</p>
                                    <div className="grid gap-2.5">
                                        <IntelCard icon={Flame} label="OVR Master" value={masterInfo?.ovrRating.toFixed(0) || '0'} variant="gold" />
                                        <IntelCard icon={Star} label="Rank Global" value={`#${masterInfo?.masterRank || '?'}`} />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                  
                  {/* Slanted HUD Tabs */}
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                      <div className="flex justify-center mb-8">
                        <TabsList className="grid grid-cols-3 w-full h-16 sm:h-20 bg-black/60 p-2 border-b-4 border-white/10 relative overflow-hidden backdrop-blur-2xl rounded-none shadow-[0_10px_50px_rgba(0,0,0,0.5)]">
                            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary/60" />
                            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-primary/60" />
                            
                            {['history', 'upcoming', 'trend'].map((tab) => (
                                <TabsTrigger 
                                    key={tab}
                                    value={tab} 
                                    className={cn(
                                        "relative h-full font-black uppercase tracking-[0.15em] text-[10px] sm:text-xs italic transition-all duration-700 group/tab overflow-hidden",
                                        "data-[state=active]:text-black data-[state=inactive]:text-white/30 data-[state=inactive]:hover:text-white/70"
                                    )}
                                >
                                    <span className="relative z-10">{tab === 'history' ? 'RIWAYAT' : tab === 'upcoming' ? 'SISA LAGA' : 'TREN'}</span>
                                    <div className={cn(
                                        "absolute inset-0 -skew-x-[15deg] transition-all duration-700 -z-0 translate-x-[-100%] group-data-[state=active]/tab:translate-x-0",
                                        "group-data-[state=active]/tab:bg-primary group-data-[state=active]/tab:shadow-[0_0_40px_rgba(204,253,1,0.5)]",
                                        "border-r-4 border-white/10 group-data-[state=active]/tab:border-black/20"
                                    )} />
                                </TabsTrigger>
                            ))}
                        </TabsList>
                      </div>
                      
                      <TabsContent value="history" className="mt-0 outline-none animate-in fade-in duration-500">
                           {completedMatches.length > 0 ? (
                              <div className="space-y-4">
                              {completedMatches.map(match => (
                                  <div key={match.id} className="group/match relative overflow-hidden transition-all duration-500 border-2 border-white/5 bg-black/40 backdrop-blur-xl hover:border-primary/30 p-4 rounded-2xl flex items-center justify-between shadow-2xl">
                                    <div className={cn(
                                        "absolute left-0 top-0 bottom-0 w-1.5 transition-all duration-500",
                                        match.result === 'W' ? "bg-primary shadow-[0_0_15px_rgba(204,253,1,0.8)]" : 
                                        match.result === 'L' ? "bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.8)]" : 
                                        "bg-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.8)]"
                                    )} />
                                    
                                    <div className="flex items-center gap-4 relative z-10">
                                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-[11px] font-black border-2 shadow-inner transition-transform group-hover/match:scale-110 duration-500", 
                                            match.result === 'W' ? "bg-green-500/20 text-green-400 border-green-500/30" : 
                                            match.result === 'L' ? "bg-red-500/20 text-red-400 border-red-500/30" : 
                                            "bg-yellow-500/20 text-yellow-400 border-yellow-500/30")}>
                                            {match.result === 'W' ? 'M' : match.result === 'L' ? 'K' : 'S'}
                                        </div>
                                        <div className="text-left space-y-0.5">
                                            <div className="flex items-center gap-2">
                                                <p className="text-[13px] font-black tracking-tight uppercase italic pr-2 text-white/90" suppressHydrationWarning>vs {match.opponent?.name || 'TBD'}</p>
                                                <Badge variant="outline" className={cn("text-[8px] h-4.5 px-2 font-black uppercase italic tracking-widest", match.isPlayer1 ? "border-primary/30 text-primary bg-primary/5" : "border-white/10 text-white/30")}>
                                                    {match.isPlayer1 ? 'Home' : 'Away'}
                                                </Badge>
                                            </div>
                                            <p className="text-[9px] font-bold text-white/20 uppercase tracking-[0.25em]" suppressHydrationWarning>{format(match.matchDate.toDate(), "d MMM, HH:mm", { locale: localeId })}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 relative z-10 bg-black/60 px-4 py-2 rounded-xl border border-white/5 shadow-inner">
                                        <span className={cn("text-xl font-black tabular-nums italic", match.result === 'W' ? 'text-primary' : match.result === 'L' ? 'text-red-400' : 'text-yellow-400')} suppressHydrationWarning>
                                            {match.isPlayer1 ? match.playerResult : match.opponentResult}
                                        </span>
                                        <span className="text-xs font-black text-white/10">/</span>
                                        <span className="text-xl font-black tabular-nums italic text-white/30" suppressHydrationWarning>
                                            {match.isPlayer1 ? match.opponentResult : match.playerResult}
                                        </span>
                                    </div>
                                  </div>
                              ))}
                              </div>
                          ) : <div className="text-center py-20 opacity-20 flex flex-col items-center gap-4"><Activity className="w-12 h-12"/><p className="text-xs font-black uppercase tracking-[0.4em] italic text-center">No Historical Log Found</p></div>}
                      </TabsContent>
                      
                      <TabsContent value="upcoming" className="mt-0 outline-none animate-in fade-in duration-500">
                           {upcomingMatches.length > 0 ? (
                              <div className="space-y-4">
                              {upcomingMatches.map(match => (
                                  <div key={match.id} className="group/match relative overflow-hidden transition-all duration-500 border-2 border-dashed border-white/10 bg-black/20 backdrop-blur-sm p-4 rounded-2xl flex items-center justify-between opacity-60 hover:opacity-100 hover:border-primary/20">
                                      <div className="flex items-center gap-4 relative z-10">
                                          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 border-2 border-white/5"><Activity className="w-5 h-5 text-white/20"/></div>
                                          <div className="text-left space-y-0.5">
                                              <p className="text-[13px] font-black tracking-tight uppercase italic pr-2 text-white/80" suppressHydrationWarning>vs {match.opponent?.name || 'TBD'}</p>
                                              <p className="text-[9px] font-bold text-white/20 uppercase tracking-[0.25em]">SIGNAL DETECTED • RESERVED</p>
                                          </div>
                                      </div>
                                      <Badge variant="outline" className="text-[9px] font-black border-primary/20 text-primary/40 uppercase italic px-3 h-6 bg-primary/5">QUEUE</Badge>
                                  </div>
                              ))}
                              </div>
                          ) : <div className="text-center py-20 opacity-20 flex flex-col items-center gap-4"><Zap className="w-12 h-12 animate-pulse"/><p className="text-xs font-black uppercase tracking-[0.4em] italic text-center">Protocol Complete • No Queue</p></div>}
                      </TabsContent>
                      
                       <TabsContent value="trend" className="mt-0 outline-none animate-in fade-in duration-500">
                          <Card className="bg-black/80 backdrop-blur-3xl border-2 border-white/5 overflow-hidden rounded-[2rem] shadow-2xl relative group/trend">
                              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
                              <CardHeader className="p-5 pb-3 bg-primary/5 border-b border-white/5">
                                  <div className="flex justify-between items-center">
                                      <CardTitle className="text-[10px] font-black tracking-[0.3em] text-primary uppercase flex items-center gap-2.5 italic">
                                          <TrendingUp className="w-4 h-4"/> MOMENTUM STABILITY
                                      </CardTitle>
                                      <Badge className="bg-primary/10 border-primary/30 text-primary text-[10px] font-black italic px-3 h-6" suppressHydrationWarning>
                                          {chartData.length > 1 ? chartData[chartData.length - 1].points : 0} PTS TREND
                                      </Badge>
                                  </div>
                              </CardHeader>
                              <CardContent className="p-6 pt-8">
                                  {isMounted && chartData.length > 1 ? (
                                      <ChartContainer config={chartConfig} className="h-40 w-full opacity-80 group-hover/trend:opacity-100 transition-opacity">
                                          <LineChart data={chartData} margin={{ left: -20, right: 10, top: 10 }}>
                                              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                              <XAxis dataKey="match" hide />
                                              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontStyle: 'italic', fontWeight: '900', fill: 'rgba(255,255,255,0.2)' }} allowDecimals={false} />
                                              <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" strokeDasharray="5 5" />
                                              <Line type="monotone" dataKey="points" stroke="hsl(var(--primary))" strokeWidth={4} dot={{ fill: "hsl(var(--primary))", r: 5, strokeWidth: 3, stroke: "black" }} activeDot={{ r: 8, stroke: 'white', strokeWidth: 3 }} />
                                          </LineChart>
                                      </ChartContainer>
                                  ) : <div className="text-center py-16 opacity-20 flex flex-col items-center gap-4"><BarChart3 className="w-10 h-10"/><p className="text-[10px] font-black uppercase tracking-[0.3em] italic text-center">Insufficient Data Matrix</p></div>}
                              </CardContent>
                          </Card>
                       </TabsContent>
                  </Tabs>

                  {/* Analysis Disclaimer */}
                  <div className="bg-primary/10 border border-primary/20 rounded-[1.5rem] p-5 text-center mt-10 relative overflow-hidden group/disclaimer">
                    <div className="absolute inset-0 bg-primary/5 translate-x-[-100%] group-hover/disclaimer:translate-x-[100%] transition-transform duration-1000" />
                    <p className="text-[9px] text-white/40 font-black tracking-[0.3em] uppercase mb-1.5 relative z-10 italic">Technical Analysis Disclaimer</p>
                    <p className="text-[11px] font-bold text-primary/80 italic leading-relaxed text-center relative z-10 px-2">Data dikalkulasi berdasarkan performa agregat unit pemain dalam seluruh fase kompetisi. Stabilitas sinyal di atas nol menunjukkan konsistensi kemenangan taktis yang tinggi.</p>
                  </div>
                </div>
            </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
