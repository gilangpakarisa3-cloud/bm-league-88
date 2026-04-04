'use client';

import { useMemo, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { WithId, LeagueEntry, Match, Player, Team, Season, CoOpLeagueEntry } from '@/lib/types';
import { User, Shield, Percent, Trophy, Award, TrendingUp, Zap, Activity, Scan, Binary, Star, Flame } from 'lucide-react';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { Progress } from './ui/progress';
import { ScrollArea } from './ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
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
      <DialogContent className="max-w-md border-primary border-4 p-0 overflow-hidden bg-background/95 backdrop-blur-3xl rounded-[2rem] shadow-[0_0_100px_rgba(204,253,1,0.15)]">
        <ScrollArea className="max-h-[90vh]">
            <div className="p-6 relative">
                {/* HUD Scanning Layer */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.02),rgba(0,255,0,0.01),rgba(0,0,255,0.02))] bg-[length:100%_4px,3px_100%] pointer-events-none opacity-20" />

                <DialogHeader className="flex flex-col items-center text-center relative z-10">
                    <div className="relative group">
                      <div className="absolute -inset-4 bg-primary/20 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000 animate-pulse" />
                      
                      {player.group && (
                          <div className="absolute -top-2 -left-2 z-20">
                              <Badge className="bg-primary text-black border-2 border-background font-black text-[10px] px-2 h-7 italic shadow-xl uppercase">
                                  GRUP {player.group}
                              </Badge>
                          </div>
                      )}

                      <Avatar className="h-24 w-24 border-4 border-primary shadow-2xl relative z-10 group-hover:scale-105 transition-all duration-500">
                        <AvatarImage src={playerTeamDetails?.logoUrl} alt={player.playerName} className="object-cover" referrerPolicy="no-referrer" />
                        <AvatarFallback className="bg-black/40 font-black text-xs"><User className="h-12 w-12 text-white/10" /></AvatarFallback>
                      </Avatar>
                      
                      <div className={cn(
                        "absolute -bottom-2 -right-2 flex h-10 w-10 items-center justify-center rounded-xl border-4 border-background text-sm font-black shadow-xl z-20 rotate-12 transition-transform group-hover:rotate-0",
                        isTopRank ? "bg-yellow-400 text-black" : isBottomRank ? "bg-red-500 text-white" : "bg-primary text-black"
                      )} suppressHydrationWarning>
                        {player.rank}
                      </div>

                       {isDefendingChampion && (
                          <div className="absolute -top-3 -right-3 transform rotate-12 z-20 animate-bounce">
                              <Badge className="bg-amber-500 text-black border-2 border-white p-1.5 rounded-lg shadow-2xl">
                                  <Award className="w-5 h-5"/>
                              </Badge>
                          </div>
                      )}
                    </div>

                    <div className="space-y-1 pt-4 w-full flex flex-col items-center">
                      <DialogTitle className="text-3xl font-black tracking-tighter uppercase italic text-white text-center" suppressHydrationWarning>{player.playerName}</DialogTitle>
                      <div className="flex items-center justify-center gap-2 font-black text-white/40 uppercase tracking-widest text-[10px] text-center">
                          <Avatar className="h-4 w-4 opacity-60"><AvatarImage src={playerTeamDetails?.logoUrl} className="object-cover" referrerPolicy="no-referrer" /><AvatarFallback><Shield/></AvatarFallback></Avatar>
                          <span className="text-center" suppressHydrationWarning>{player.teamName || 'Independent'}</span>
                      </div>
                      <div className="pt-2 flex justify-center">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Badge className={cn("text-xs font-black uppercase tracking-tighter px-5 py-2 border-2 cursor-help shadow-lg animate-in fade-in zoom-in duration-500", 
                                    playStyleType === 'attacking' ? "bg-red-500/20 text-red-400 border-red-500/30" : 
                                    playStyleType === 'defensive' ? "bg-blue-500/20 text-blue-400 border-blue-500/30" : 
                                    "bg-primary/20 text-primary border-primary/30")}>
                                    {playStyleText}
                                </Badge>
                            </PopoverTrigger>
                            <PopoverContent className="w-64 text-center bg-background/95 border-primary/30 backdrop-blur-xl rounded-xl">
                                <p className="text-[10px] font-bold leading-relaxed text-white text-center">{playStyleDescription}</p>
                            </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                </DialogHeader>

                <div className="space-y-6 mt-8 relative z-10">
                    {/* Performance HUD Card */}
                    <Card className="bg-black/80 backdrop-blur-3xl border-2 border-white/10 rounded-[1.5rem] overflow-hidden group hover:border-primary/40 transition-all duration-500 relative">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 -mr-8 -mt-8 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />
                        
                        <CardHeader className="p-4 bg-primary text-black relative z-10 border-b-2 border-black/10">
                            <div className="flex flex-col items-center gap-1.5 text-center">
                                <div className="flex items-center justify-center gap-2">
                                    <Binary className="w-3.5 h-3.5" />
                                    <h3 className="text-[10px] font-black tracking-[0.2em] uppercase italic">SEASON PERFORMANCE HUD</h3>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge className="bg-black text-primary border-none font-black uppercase italic text-[9px] px-3 h-5 shadow-lg">OVR {winRate.toFixed(0)}%</Badge>
                                    <div className="w-1.5 h-1.5 rounded-full bg-black/20" />
                                    <span className="text-[9px] font-black uppercase tracking-widest opacity-80">{performanceStatus?.text || "Status: Stabil"}</span>
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent className="p-5 space-y-6 relative z-10">
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="text-[8px] font-black uppercase tracking-[0.3em] text-primary italic flex items-center gap-2">
                                        <Scan className="w-3 h-3"/> Signal Progress
                                    </h3>
                                    <span className="text-[10px] font-black text-primary italic" suppressHydrationWarning>{seasonProgress.toFixed(0)}%</span>
                                </div>
                                <Progress value={seasonProgress} className="h-1 bg-white/10" />
                                <p className="text-[7px] font-black text-white/20 mt-2 uppercase tracking-widest text-center" suppressHydrationWarning>SYNC: {stats.played} / {totalMatchesCount} UNITS COMPLETED</p>
                            </div>

                            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                                <StatDisplay label="Main" value={stats.played} />
                                <StatDisplay label="Menang" value={stats.win} />
                                {activeSeason?.type !== 'Co-Op' && <StatDisplay label="Seri" value={stats.draw} />}
                                <StatDisplay label="Kalah" value={stats.loss} />
                                <StatDisplay label="Poin" value={player.points} variant="primary" />
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-2">
                                <div className="space-y-2 text-center">
                                    <p className="text-[7px] font-black text-primary/60 uppercase tracking-widest">Season Intel</p>
                                    <div className="grid gap-2">
                                        <IntelCard icon={Percent} label="OVR Musim" value={`${winRate.toFixed(0)}%`} variant="primary" />
                                        <IntelCard icon={Trophy} label="Rank Grup" value={`#${player.rank}`} />
                                    </div>
                                </div>
                                <div className="space-y-2 text-center">
                                    <p className="text-[7px] font-black text-white/60 uppercase tracking-widest">Career Intel</p>
                                    <div className="grid gap-2">
                                        <IntelCard icon={Flame} label="OVR Master" value={masterInfo?.ovrRating.toFixed(0) || '0'} variant="gold" />
                                        <IntelCard icon={Star} label="Rank Global" value={`#${masterInfo?.masterRank || '?'}`} />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                  
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                      <div className="flex justify-center mb-6">
                        <TabsList className="grid grid-cols-3 w-full h-14 sm:h-16 bg-black/60 p-1.5 border-b-4 border-white/10 relative overflow-hidden backdrop-blur-2xl rounded-none shadow-[0_10px_50px_rgba(0,0,0,0.5)]">
                            <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-primary/60" />
                            <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-primary/60" />
                            
                            {['history', 'upcoming', 'trend'].map((tab) => (
                                <TabsTrigger 
                                    key={tab}
                                    value={tab} 
                                    className={cn(
                                        "relative h-full font-black uppercase tracking-[0.1em] text-[10px] italic transition-all duration-700 group/tab overflow-hidden",
                                        "data-[state=active]:text-black data-[state=inactive]:text-white/30 data-[state=inactive]:hover:text-white/70"
                                    )}
                                >
                                    <span className="relative z-10">{tab === 'history' ? 'RIWAYAT' : tab === 'upcoming' ? 'SISA LAGA' : 'TREN'}</span>
                                    <div className={cn(
                                        "absolute inset-0 -skew-x-[15deg] transition-all duration-700 -z-0 translate-x-[-100%] group-data-[state=active]/tab:translate-x-0",
                                        "group-data-[state=active]/tab:bg-primary group-data-[state=active]/tab:shadow-[0_0_30px_rgba(204,253,1,0.4)]",
                                        "border-r-4 border-white/10 group-data-[state=active]/tab:border-black/20"
                                    )} />
                                </TabsTrigger>
                            ))}
                        </TabsList>
                      </div>
                      
                      <TabsContent value="history" className="pt-2 outline-none">
                           {completedMatches.length > 0 ? (
                              <div className="space-y-3">
                              {completedMatches.map(match => (
                                  <div key={match.id} className="group/match relative overflow-hidden transition-all duration-500 border-2 border-white/5 bg-black/40 backdrop-blur-xl hover:border-primary/30 p-3.5 rounded-2xl flex items-center justify-between shadow-2xl">
                                    <div className={cn(
                                        "absolute left-0 top-0 bottom-0 w-1 transition-all duration-500",
                                        match.result === 'W' ? "bg-primary shadow-[0_0_10px_rgba(204,253,1,0.8)]" : 
                                        match.result === 'L' ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]" : 
                                        "bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.8)]"
                                    )} />
                                    
                                    <div className="flex items-center gap-3 relative z-10">
                                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black border-2 shadow-sm", 
                                            match.result === 'W' ? "bg-green-500/20 text-green-400 border-green-500/30" : 
                                            match.result === 'L' ? "bg-red-500/20 text-red-400 border-red-500/30" : 
                                            "bg-yellow-500/20 text-yellow-400 border-yellow-500/30")}>
                                            {match.result === 'W' ? 'M' : match.result === 'L' ? 'K' : 'S'}
                                        </div>
                                        <div className="text-left">
                                            <div className="flex items-center gap-2">
                                                <p className="text-[11px] font-black tracking-tight uppercase italic pr-2" suppressHydrationWarning>vs {match.opponent?.name || 'TBD'}</p>
                                                <Badge variant="outline" className={cn("text-[7px] h-4 px-1.5 font-black uppercase italic tracking-tighter", match.isPlayer1 ? "border-primary/30 text-primary" : "border-white/20 text-white/40")}>
                                                    {match.isPlayer1 ? 'Home' : 'Away'}
                                                </Badge>
                                            </div>
                                            <p className="text-[8px] font-bold text-white/20 uppercase tracking-[0.2em]" suppressHydrationWarning>{format(match.matchDate.toDate(), "d MMM, HH:mm", { locale: localeId })}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 relative z-10 bg-black/40 px-3 py-1.5 rounded-lg border border-white/5">
                                        <span className={cn("text-base font-black tabular-nums italic", match.result === 'W' ? 'text-primary' : match.result === 'L' ? 'text-red-400' : 'text-yellow-400')} suppressHydrationWarning>
                                            {match.isPlayer1 ? match.playerResult : match.opponentResult}
                                        </span>
                                        <span className="text-[10px] font-black text-white/10">:</span>
                                        <span className="text-base font-black tabular-nums italic text-white/40" suppressHydrationWarning>
                                            {match.isPlayer1 ? match.opponentResult : match.playerResult}
                                        </span>
                                    </div>
                                  </div>
                              ))}
                              </div>
                          ) : <div className="text-center py-16 opacity-20 flex flex-col items-center gap-3"><Activity className="w-8 h-8"/><p className="text-[10px] font-black uppercase tracking-[0.3em] italic text-center">Tidak Ada Data</p></div>}
                      </TabsContent>
                      
                      <TabsContent value="upcoming" className="pt-2 outline-none">
                           {upcomingMatches.length > 0 ? (
                              <div className="space-y-3">
                              {upcomingMatches.map(match => (
                                  <div key={match.id} className="group/match relative overflow-hidden transition-all duration-500 border-2 border-dashed border-white/5 bg-black/20 backdrop-blur-sm p-3.5 rounded-2xl flex items-center justify-between opacity-60">
                                      <div className="flex items-center gap-3 relative z-10">
                                          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 border border-white/5"><Activity className="w-4 h-4 text-white/20"/></div>
                                          <div className="text-left">
                                              <p className="text-[11px] font-black tracking-tight uppercase italic pr-2" suppressHydrationWarning>vs {match.opponent?.name || 'TBD'}</p>
                                              <p className="text-[8px] font-bold text-white/20 uppercase tracking-[0.2em]">Sinyal Terdeteksi • Terjadwal</p>
                                          </div>
                                      </div>
                                      <Badge variant="outline" className="text-[8px] font-black border-white/10 text-white/20 uppercase italic">QUEUE</Badge>
                                  </div>
                              ))}
                              </div>
                          ) : <div className="text-center py-16 opacity-20 flex flex-col items-center gap-3"><Zap className="w-8 h-8"/><p className="text-[10px] font-black uppercase tracking-[0.3em] italic text-center">Musim Selesai</p></div>}
                      </TabsContent>
                      
                       <TabsContent value="trend" className="pt-2 outline-none">
                          <Card className="bg-black/60 backdrop-blur-xl border-2 border-white/5 overflow-hidden rounded-[1.5rem] shadow-inner relative group/trend">
                              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
                              <CardHeader className="p-4 pb-2 bg-primary/5">
                                  <div className="flex justify-between items-center">
                                      <CardTitle className="text-[9px] font-black tracking-[0.3em] text-primary uppercase flex items-center gap-2 italic">
                                          <TrendingUp className="w-3 h-3"/> STABILITY TREND
                                      </CardTitle>
                                      <Badge className="bg-primary/10 border-primary/30 text-primary text-[9px] font-black italic" suppressHydrationWarning>
                                          {chartData.length > 1 ? chartData[chartData.length - 1].points : 0} PTS
                                      </Badge>
                                  </div>
                              </CardHeader>
                              <CardContent className="p-4 pt-4">
                                  {isMounted && chartData.length > 1 ? (
                                      <ChartContainer config={chartConfig} className="h-32 w-full opacity-80 group-hover/trend:opacity-100 transition-opacity">
                                          <LineChart data={chartData} margin={{ left: -20, right: 10, top: 10 }}>
                                              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                              <XAxis dataKey="match" hide />
                                              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontStyle: 'italic', fontWeight: '900', fill: 'rgba(255,255,255,0.2)' }} allowDecimals={false} />
                                              <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" strokeDasharray="5 5" />
                                              <Line type="monotone" dataKey="points" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ fill: "hsl(var(--primary))", r: 4, strokeWidth: 2 }} activeDot={{ r: 6, stroke: 'white', strokeWidth: 2 }} />
                                          </LineChart>
                                      </ChartContainer>
                                  ) : <div className="text-center py-12 opacity-20 text-[10px] font-black uppercase italic text-center">Data Tidak Cukup</div>}
                              </CardContent>
                          </Card>
                       </TabsContent>
                  </Tabs>
                </div>
            </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
