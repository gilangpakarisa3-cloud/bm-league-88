'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { LeagueEntry, Season, WithId, Player, Team, Match, CoOpLeagueEntry } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, User, Trophy, Award, LayoutGrid, Swords, Scan, Activity, Zap, Shield, Info, CheckCircle2, Flame, Binary, Target, ShieldAlert, Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useTranslation } from "@/hooks/use-translation";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { useMemo, memo } from "react";
import { resolveLogo } from "@/lib/logo-utils";
import { TournamentBracket } from "./tournament-bracket";

interface LeagueTableProps {
  tableData: (WithId<LeagueEntry> & { player?: WithId<Player>, team?: WithId<Team>, logoUrl?: string })[];
  isLoading?: boolean;
  onRemovePlayer?: (entry: WithId<LeagueEntry>) => void;
  onSelectPlayer: (entry: WithId<LeagueEntry>) => void;
  seasonStatus?: Season['status'];
  seasonType?: Season['type'];
  isAdmin: boolean;
  defendingChampionId?: string;
  matches?: WithId<Match>[];
  playersById?: Record<string, WithId<Player>>;
  teamsById?: Record<string, WithId<Team>>;
  activeSeason?: WithId<Season> | null;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  onRevertMatch?: (match: WithId<Match>) => void;
}

interface SingleTableProps {
  tableData: (WithId<LeagueEntry> & { player?: WithId<Player>, team?: WithId<Team>, rank: number, logoUrl?: string })[];
  isLoading?: boolean;
  onRemovePlayer?: (entry: WithId<LeagueEntry>) => void;
  onSelectPlayer: (entry: WithId<LeagueEntry>) => void;
  seasonStatus?: Season['status'];
  seasonType?: Season['type'];
  isAdmin: boolean;
  defendingChampionId?: string;
  isCoop?: boolean;
  totalPlayers: number;
  matches: WithId<Match>[];
}

const PlayoffQualificationLegend = () => {
  return (
    <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-10 p-6 sm:p-10 bg-black/60 border-b-4 border-yellow-400/30 backdrop-blur-3xl relative overflow-hidden group/legend shrink-0">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(250,204,21,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(250,204,21,0.02)_1px,transparent_1px)] bg-[size:25px_25px] opacity-20 pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-yellow-400/20 to-transparent" />
      <div className="absolute top-0 left-0 w-12 h-12 border-t-2 border-l-2 border-yellow-400/20 rounded-tl-sm pointer-events-none group-legend:border-yellow-400 transition-colors duration-500" />
      <div className="absolute bottom-0 right-0 w-12 h-12 border-b-2 border-r-2 border-yellow-400/20 rounded-br-sm pointer-events-none group-legend:border-yellow-400 transition-colors duration-500" />

      <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-20 animate-in fade-in slide-in-from-top-4 duration-700 relative z-10">
        <div className="flex items-center gap-4 group/item">
          <div className="relative">
            <div className="absolute -inset-3 bg-green-500/20 rounded-full blur-md opacity-0 group-hover/item:opacity-100 transition-opacity animate-pulse" />
            <div className="w-6 h-6 bg-green-500 shadow-[0_0_20px_rgba(34,197,94,0.6)] border-r-4 border-black/20 -skew-x-[15deg] transition-transform group-hover/item:scale-110" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-sm sm:text-base font-black uppercase italic text-green-400 leading-none">Upper Bracket</span>
            <span className="text-[10px] sm:text-xs font-bold text-white/30 uppercase tracking-[0.2em] mt-1.5">Peringkat 1 - 4</span>
          </div>
        </div>

        <div className="w-px h-12 bg-white/5 hidden lg:block" />

        <div className="flex items-center gap-4 group/item">
          <div className="relative">
            <div className="absolute -inset-4 bg-yellow-400/20 rounded-full blur-lg opacity-40 group-hover/item:opacity-100 transition-opacity animate-pulse" />
            <div className="w-6 h-6 bg-yellow-400 shadow-[0_0_30px_rgba(250,204,21,0.8)] border-r-4 border-black/20 -skew-x-[15deg] transition-transform group-hover/item:scale-110" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-sm sm:text-base font-black uppercase italic text-yellow-400 none">Lower Bracket</span>
            <span className="text-[10px] sm:text-xs font-bold text-white/30 uppercase tracking-[0.2em] mt-1.5">Peringkat 5 - 6</span>
          </div>
        </div>

        <div className="w-px h-12 bg-white/5 hidden lg:block" />

        <div className="flex items-center gap-4 group/item">
          <div className="relative">
            <div className="absolute -inset-3 bg-red-500/20 rounded-full blur-md opacity-0 group-hover/item:opacity-100 transition-opacity animate-pulse" />
            <div className="w-6 h-6 bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.6)] border-r-4 border-black/20 -skew-x-[15deg] transition-transform group-hover/item:scale-110" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-sm sm:text-base font-black uppercase italic text-red-500 leading-none">Eliminasi</span>
            <span className="text-[10px] sm:text-xs font-bold text-white/30 uppercase tracking-[0.2em] mt-1.5">Peringkat 7+</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const SingleTable = memo(({ 
    tableData, 
    isLoading, 
    onRemovePlayer, 
    onSelectPlayer, 
    seasonStatus, 
    seasonType, 
    isAdmin, 
    defendingChampionId, 
    isCoop = false, 
    totalPlayers,
    matches
}: SingleTableProps) => {
    const { t } = useTranslation();
    const canRemovePlayer = seasonStatus === 'Not Started' && !!onRemovePlayer && isAdmin;

    const playerFormsMap = useMemo(() => {
        if (!matches || matches.length === 0) return {};
        const forms: Record<string, string[]> = {};
        
        tableData.forEach(entry => {
            const playerId = entry.playerId || entry.id;
            forms[playerId] = matches
                .filter(m => m.isCompleted && (m.player1Id === playerId || m.player2Id === playerId))
                .sort((a, b) => b.matchDate.toMillis() - a.matchDate.toMillis())
                .slice(0, 5)
                .reverse()
                .map(m => {
                    const isPlayer1 = m.player1Id === playerId;
                    const isBo3 = m.player1Wins !== null && m.player1Wins !== undefined && m.round !== 'Group';
                    const s1 = isBo3 ? (m.player1Wins ?? 0) : (m.player1Score ?? 0);
                    const s2 = isBo3 ? (m.player2Wins ?? 0) : (m.player2Score ?? 0);
                    const playerResult = isPlayer1 ? s1 : s2;
                    const opponentResult = isPlayer1 ? s2 : s1;
                    if (playerResult > opponentResult) return 'W';
                    if (playerResult < opponentResult) return 'L';
                    return 'D';
                });
        });
        return forms;
    }, [matches, tableData]);

    return (
         <div className="w-full overflow-x-auto scrollbar-ultra-sport">
        <Table className="min-w-full">
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b-primary/30 border-t-0 h-12 sm:h-14 bg-black/40">
              <TableHead className="w-1.5 p-0"></TableHead>
              <TableHead className="w-8 sm:w-10 text-center font-black text-primary uppercase text-[8px] sm:text-[10px] tracking-[0.1em] sm:tracking-[0.2em]">{t('rank')}</TableHead>
              <TableHead className="text-left font-black text-primary text-[8px] sm:text-[10px] tracking-[0.1em] sm:tracking-[0.2em] min-w-[140px] sm:min-w-[180px] uppercase">{t('player')}</TableHead>
              <TableHead className="text-center font-black text-primary w-10 sm:w-20 text-[8px] sm:text-[10px] tracking-[0.1em] sm:tracking-[0.2em] uppercase">{t('played_short')}</TableHead>
              <TableHead className="text-center font-black text-green-400 w-10 sm:w-20 text-[8px] sm:text-[10px] tracking-[0.1em] sm:tracking-[0.2em] uppercase">{t('w_short')}</TableHead>
              <TableHead className="text-center font-black text-yellow-400 w-10 sm:w-20 text-[8px] sm:text-[10px] tracking-[0.1em] sm:tracking-[0.2em] uppercase">{t('d_short')}</TableHead>
              <TableHead className="text-center font-black text-red-400 w-10 sm:w-20 text-[8px] sm:text-[10px] tracking-[0.1em] sm:tracking-[0.2em] uppercase">{t('l_short')}</TableHead>
              <TableHead className={cn("text-center font-black text-primary/60 w-10 sm:w-20 text-[8px] sm:text-[10px] tracking-[0.1em] sm:tracking-[0.2em] uppercase")}>{t('gd_short')}</TableHead>
              <TableHead className="hidden md:table-cell text-center font-black text-white/40 w-20 text-[10px] tracking-[0.2em] uppercase">{t('gf_short')}</TableHead>
              <TableHead className="hidden md:table-cell text-center font-black text-white/40 w-20 text-[10px] tracking-[0.2em] uppercase">{t('ga_short')}</TableHead>
              <TableHead className="hidden xl:table-cell text-center font-black text-white/40 w-40 text-[10px] tracking-[0.2em] uppercase">Form</TableHead>
              <TableHead className="text-center font-black text-primary w-12 sm:w-24 text-[8px] sm:text-[10px] tracking-[0.1em] sm:tracking-[0.2em] uppercase">{t('pts_short')}</TableHead>
              {canRemovePlayer && <TableHead className="hidden sm:table-cell text-right font-black text-accent w-16 text-[10px] tracking-[0.2em] uppercase">{t('actions')}</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {tableData.map((entry) => {
              const currentType = seasonType || 'Single';
              const isPlayoffHybrid = currentType === 'Hybrid' || currentType === 'Co-Op Hybrid';
              const playerForm = playerFormsMap[entry.playerId || entry.id] || [];
              const isFirst = entry.rank === 1;
              const isUpperBracketZone = isPlayoffHybrid && entry.rank >= 1 && entry.rank <= 4;
              const isLowerBracketZone = isPlayoffHybrid && (entry.rank === 5 || entry.rank === 6);
              const isRelegationZone = (currentType === 'Single' && totalPlayers > 3 && entry.rank >= totalPlayers - 2) || (isPlayoffHybrid && entry.rank > 6);
              
              return (
                <TableRow key={entry.id} className={cn("transition-all h-16 sm:h-20 border-b-white/5 relative group/row", isFirst ? "bg-primary/[0.08] hover:bg-primary/[0.15]" : isUpperBracketZone ? "bg-green-500/[0.05] hover:bg-green-500/[0.1]" : isLowerBracketZone ? "bg-yellow-500/[0.05] hover:bg-yellow-500/[0.1]" : isRelegationZone ? "bg-red-500/[0.05] hover:bg-red-500/[0.1]" : "hover:bg-white/[0.03]")}>
                  <TableCell className={cn("p-0 w-1.5 transition-all duration-500", isFirst ? 'bg-primary shadow-[0_0_20px_rgba(204,253,1,0.8)]' : isUpperBracketZone ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]' : isLowerBracketZone ? 'bg-yellow-400 shadow-[0_0_10px_rgba(245,158,11,0.3)]' : isRelegationZone ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]' : 'bg-transparent')} />
                  <TableCell className={cn("text-center font-black text-base sm:text-xl px-1 italic transition-all duration-500", isFirst ? "text-primary scale-125 drop-shadow-[0_0_15px_rgba(204,253,1,0.7)]" : isUpperBracketZone ? "text-green-400" : isLowerBracketZone ? "text-yellow-400" : isRelegationZone ? "text-red-500" : "text-white/40")}>{entry.rank}</TableCell>
                  <TableCell className="relative overflow-visible py-2 sm:py-3">
                    <div className="flex items-center gap-2 sm:gap-4 cursor-pointer group/node" onClick={() => onSelectPlayer(entry)}>
                       <div className="relative shrink-0">
                          <div className={cn("absolute -inset-1 rounded-full blur-md opacity-0 transition-opacity duration-500", isFirst ? "bg-primary/20 opacity-100" : "group-hover/node:bg-primary/10 group-hover/node:opacity-100")} />
                          <Avatar className={cn("h-10 w-10 sm:h-14 sm:w-14 border-2 transition-all duration-500 shadow-xl relative z-10", isFirst ? "border-primary scale-110" : "border-white/10 group-hover/node:border-primary group-hover/node:scale-105")}>
                            <AvatarImage key={entry.logoUrl} src={entry.logoUrl || undefined} alt={entry.playerName} className="object-cover" referrerPolicy="no-referrer" />
                            <AvatarFallback className="bg-black/40 font-black text-xs"><User className="w-5 h-5 sm:w-7 sm:h-7 text-white/30"/></AvatarFallback>
                          </Avatar>
                       </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-center translate-y-[-1px]">
                        <div className="flex items-center gap-2">
                           <span className={cn("font-black tracking-tight transition-colors truncate uppercase italic pr-2", isFirst ? "text-sm sm:text-xl text-primary drop-shadow-[0_0_10px_rgba(204,253,1,0.4)]" : "text-[12px] sm:text-lg text-white group-hover/node:text-primary")} suppressHydrationWarning>{entry.playerName}</span>
                        </div>
                        <div className="text-[8px] sm:text-[11px] font-black text-white/30 uppercase tracking-[0.15em] sm:tracking-[0.2em] truncate pr-4 group-hover/node:text-white/50 transition-colors" suppressHydrationWarning>{entry.team?.name || entry.teamName || 'Athlete Protocol'}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center px-1 sm:px-2 text-xs sm:text-sm font-black text-white/80 tabular-nums" suppressHydrationWarning>{entry.played}</TableCell>
                  <TableCell className="text-center px-1 sm:px-2 text-xs sm:text-sm font-black text-green-400 tabular-nums" suppressHydrationWarning>{entry.win}</TableCell>
                  <TableCell className="text-center px-1 sm:px-2 text-xs sm:text-sm font-black text-yellow-400 tabular-nums" suppressHydrationWarning>{entry.draw}</TableCell>
                  <TableCell className="text-center px-1 sm:px-2 text-xs sm:text-sm font-black text-red-400 tabular-nums" suppressHydrationWarning>{entry.loss}</TableCell>
                  <TableCell className={cn("text-center px-1 sm:px-2 text-xs sm:text-sm font-black tabular-nums transition-all duration-300", entry.goalDifference > 0 ? "text-primary/60" : (entry.goalDifference < 0 ? "text-red-400/60" : "text-white/20"))} suppressHydrationWarning>{entry.goalDifference > 0 ? `+${entry.goalDifference}` : entry.goalDifference}</TableCell>
                  <TableCell className="hidden md:table-cell text-center px-2 text-sm font-bold text-white/30 tabular-nums" suppressHydrationWarning>{entry.goalsFor}</TableCell>
                  <TableCell className="hidden md:table-cell text-center px-2 text-sm font-bold text-white/30 tabular-nums" suppressHydrationWarning>{entry.goalsAgainst}</TableCell>
                  <TableCell className="hidden xl:table-cell text-center px-2">
                      <div className="flex justify-center gap-1">
                          {playerForm.length > 0 ? playerForm.map((res, i) => (
                              <div key={i} className={cn("w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black border transition-transform hover:scale-110", res === 'W' ? "bg-green-500/20 text-green-400 border-green-500/30" : res === 'L' ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-yellow-500/20 text-yellow-400 border-yellow-500/50")}>{res === 'W' ? 'M' : res === 'L' ? 'K' : 'S'}</div>
                          )) : <span className="text-[8px] font-bold text-white/10 uppercase tracking-tighter italic">No Data</span>}
                      </div>
                  </TableCell>
                  <TableCell className={cn("text-center font-black text-xl sm:text-3xl px-1 sm:px-2 italic transition-all duration-500 tabular-nums", isFirst ? "text-primary drop-shadow-[0_0_20px_rgba(204,253,1,0.6)]" : "text-primary")} suppressHydrationWarning>{entry.points}</TableCell>
                  {canRemovePlayer && (
                    <TableCell className="hidden sm:table-cell text-right px-2">
                      <Button variant="ghost" size="icon" className="h-10 w-10 hover:bg-red-500/10 hover:text-red-500 transition-colors border border-white/5 rounded-xl" onClick={() => onRemovePlayer?.(entry)} title={`${t('remove')} ${entry.playerName}`}><Trash2 className="h-4.5 w-4.5" /></Button>
                    </TableCell>
                  )}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    )
});

SingleTable.displayName = 'SingleTable';

const TopScorerTable = memo(({ 
    tableData, 
    isLoading, 
    seasonType,
    teamsById
}: { 
    tableData: any[], 
    isLoading: boolean, 
    seasonType?: Season['type'],
    teamsById: Record<string, WithId<Team>>
}) => {
    const { t } = useTranslation();

    const topScorers = useMemo(() => {
        if (!tableData || tableData.length === 0) return [];
        const scorers: { name: string, goals: number, teamId: string, teamName: string, id: string, played: number, logoUrl: string }[] = [];
        
        tableData.forEach(entry => {
            if (seasonType === 'Co-Op' || seasonType === 'Co-Op Hybrid') {
                const coop = entry as CoOpLeagueEntry;
                const t1 = teamsById[coop.player1TeamId];
                scorers.push({ 
                    id: coop.player1Id, name: coop.player1Name, goals: coop.player1Goals || 0, teamId: coop.player1TeamId, teamName: coop.player1TeamName, played: coop.played,
                    logoUrl: resolveLogo(t1?.logoUrl, coop.player1Id, coop.player1Name)
                });
                const t2 = teamsById[coop.player2TeamId];
                scorers.push({ 
                    id: coop.player2Id, name: coop.player2Name, goals: coop.player2Goals || 0, teamId: coop.player2TeamId, teamName: coop.player2TeamName, played: coop.played,
                    logoUrl: resolveLogo(t2?.logoUrl, coop.player2Id, coop.player2Name)
                });
            } else {
                const single = entry as LeagueEntry;
                const t = teamsById[single.teamId];
                scorers.push({ 
                    id: single.playerId, name: single.playerName, goals: single.goalsFor || 0, teamId: single.teamId, teamName: single.teamName, played: single.played,
                    logoUrl: resolveLogo(t?.logoUrl, single.playerId, single.playerName)
                });
            }
        });

        const uniqueScorers = scorers.reduce((acc, current) => {
            const x = acc.find(item => item.id === current.id);
            if (!x) return acc.concat([current]);
            return acc;
        }, [] as typeof scorers);

        return uniqueScorers.sort((a, b) => b.goals - a.goals || a.name.localeCompare(b.name)).map((s, i) => ({ ...s, rank: i + 1 }));
    }, [tableData, seasonType, teamsById]);

    const predator = useMemo(() => topScorers.find(s => s.goals > 0), [topScorers]);
    
    const mainPedofil = useMemo(() => {
        const activeScorers = topScorers.filter(s => s.played > 0);
        if (activeScorers.length === 0) return null;

        const minGoals = Math.min(...activeScorers.map(s => s.goals));
        const worstScorers = activeScorers.filter(s => s.goals === minGoals);
        
        return worstScorers.sort((a, b) => b.played - a.played)[0];
    }, [topScorers]);

    if (isLoading) return <LeagueTableSkeleton isCoop={true} />;

    return (
        <div className="space-y-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto px-4">
                {predator ? (
                    <Card className="relative overflow-hidden border-4 border-primary bg-primary/[0.03] rounded-[2rem] p-6 sm:p-8 shadow-[0_0_80px_rgba(204,253,1,0.2)] group/pred-card hover:border-white transition-all duration-500 animate-in fade-in zoom-in-95">
                         <div className="absolute inset-0 bg-[linear-gradient(rgba(204,253,1,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(204,253,1,0.02)_1px,transparent_1px)] bg-[size:25px_25px] pointer-events-none" />
                         <div className="absolute inset-0 overflow-hidden pointer-events-none z-10 opacity-30">
                             <div className="w-full h-2 bg-primary blur-[2px] absolute top-0 left-0 animate-scanning" />
                         </div>
                         <div className="absolute -bottom-10 -right-10 w-72 h-72 text-primary opacity-[0.08] pointer-events-none z-0">
                            <Flame className="w-full h-full animate-float fill-current" />
                         </div>
                         <div className="flex flex-col items-center justify-center mb-8 relative z-20">
                            <div className="relative group/badge">
                                <div className="absolute -inset-6 bg-primary/20 blur-3xl opacity-0 group-hover/badge:opacity-100 transition-opacity animate-pulse" />
                                <div className="relative flex flex-col items-center">
                                    <Badge className="bg-primary text-black font-black italic text-sm sm:text-lg px-12 h-10 tracking-[0.4em] -skew-x-[20deg] shadow-[8px_8px_0px_rgba(204,253,1,0.2)] border-r-4 border-black mb-3 rounded-none">
                                        PREDATOR
                                    </Badge>
                                    <div className="flex items-center gap-2">
                                        <div className="h-1 w-12 bg-primary" />
                                        <span className="text-[7px] font-black text-primary uppercase tracking-[0.4em] animate-pulse">MAXIMUM_THREAT_DETECTED</span>
                                        <div className="h-1 w-12 bg-primary" />
                                    </div>
                                </div>
                            </div>
                         </div>
                         <div className="flex items-center gap-6 relative z-20">
                             <div className="relative">
                                <div className="absolute -inset-1 bg-primary rounded-full blur opacity-20 group-hover/pred-card:opacity-60 transition-opacity" />
                                <Avatar className="h-24 w-24 border-4 border-primary shadow-2xl group-hover/pred-card:scale-105 transition-all duration-500">
                                    <AvatarImage src={predator.logoUrl} className="object-cover" referrerPolicy="no-referrer" />
                                    <AvatarFallback className="bg-black/40"><User className="w-12 h-12 text-white/20"/></AvatarFallback>
                                </Avatar>
                             </div>
                             <div className="flex-1 min-w-0">
                                 <h4 className="text-2xl sm:text-3xl font-black text-white uppercase italic tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.2)] leading-tight pr-2" suppressHydrationWarning>{predator.name}</h4>
                                 <div className="flex items-center gap-2 mt-1">
                                    <div className="w-2 h-2 rounded-full bg-primary animate-ping" />
                                    <p className="text-[10px] font-black text-primary/80 uppercase tracking-widest truncate" suppressHydrationWarning>{predator.teamName}</p>
                                 </div>
                             </div>
                             <div className="text-right flex flex-col items-end">
                                 <div className="relative">
                                    <span className="text-6xl sm:text-7xl font-black italic text-primary tabular-nums leading-none drop-shadow-[0_0_30px_rgba(204,253,1,0.6)]" suppressHydrationWarning>{predator.goals}</span>
                                    <div className="absolute top-0 right-0 h-full w-full bg-gradient-to-t from-primary/20 to-transparent pointer-events-none" />
                                 </div>
                                 <p className="text-[10px] sm:text-xs font-black text-primary/80 uppercase tracking-widest mt-1 text-right drop-shadow-[0_0_10px_rgba(204,253,1,0.4)]">UNIT GOALS AGGREGATE</p>
                             </div>
                         </div>
                         <div className="mt-8 flex items-center justify-between border-t border-primary/30 pt-4">
                            <div className="flex items-center gap-2">
                                <Zap className="w-4 h-4 text-primary fill-primary animate-pulse" />
                                <span className="text-[8px] font-black text-primary/60 uppercase">TARGET_ACQUIRED_LOCKED</span>
                            </div>
                            <span className="text-[8px] font-black text-primary/40">SYSTEM_AUTH_ID: 888-88-8</span>
                         </div>
                    </Card>
                ) : (
                    <Card className="relative overflow-hidden border-2 border-dashed border-white/5 bg-black/40 rounded-[2rem] p-8 flex flex-col items-center justify-center opacity-30">
                        <Activity className="w-12 h-12 mb-4" />
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] italic text-center">AWAITING FIRST PREDATOR DATA</p>
                    </Card>
                )}

                {mainPedofil ? (
                    <Card className="relative overflow-hidden border-4 border-red-600 bg-red-950/20 rounded-[2rem] p-6 sm:p-8 shadow-[0_0_80px_rgba(220,38,38,0.2)] group/ped-card hover:border-red-500 transition-all duration-300 animate-in fade-in zoom-in-95">
                         <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-0 bg-[repeating-linear-gradient(45deg,#ff0000,#ff0000_10px,#000_10px,#000_20px)]" />
                         <div className="absolute inset-0 overflow-hidden pointer-events-none z-10 opacity-30">
                             <div className="w-full h-2 bg-red-500 blur-[2px] absolute top-0 left-0 animate-scanning" />
                         </div>
                         <div className="absolute -bottom-10 -right-10 w-72 h-72 text-red-600 opacity-[0.1] pointer-events-none z-0">
                            <ShieldAlert className="w-full h-full animate-pulse" />
                         </div>
                         <div className="flex flex-col items-center justify-center mb-8 relative z-20">
                            <div className="relative group/warning">
                                <div className="absolute -inset-4 bg-red-600/30 blur-2xl animate-pulse rounded-full" />
                                <div className="relative flex flex-col items-center">
                                    <Badge className="bg-red-600 text-white font-black italic text-sm sm:text-lg px-12 h-10 tracking-[0.4em] -skew-x-[20deg] shadow-[8px_8px_0px_rgba(0,0,0,0.4)] border-r-4 border-black mb-3 rounded-none">
                                        PEDOFIL
                                    </Badge>
                                    <div className="flex items-center gap-2">
                                        <div className="h-1 w-12 bg-red-600" />
                                        <span className="text-[7px] font-black text-red-500 uppercase tracking-[0.4em] animate-pulse">
                                          {mainPedofil.goals === 0 ? 'MANDUL DETECTED' : 'LOWEST OUTPUT DETECTED'}
                                        </span>
                                        <div className="h-1 w-12 bg-red-600" />
                                    </div>
                                </div>
                            </div>
                         </div>
                         <div className="flex items-center gap-6 relative z-20">
                             <div className="relative">
                                <div className="absolute -inset-1 bg-red-600 rounded-full blur opacity-20 group-hover/ped-card:opacity-60 transition-opacity" />
                                <Avatar className="h-24 w-24 border-4 border-red-600 shadow-2xl group-hover/ped-card:scale-105 transition-all duration-500">
                                    <AvatarImage src={mainPedofil.logoUrl} className="object-cover" referrerPolicy="no-referrer" />
                                    <AvatarFallback className="bg-black/40"><User className="w-12 h-12 text-white/20"/></AvatarFallback>
                                </Avatar>
                             </div>
                             <div className="flex-1 min-w-0">
                                 <h4 className="text-2xl sm:text-3xl font-black text-white uppercase italic tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.2)] leading-tight pr-2" suppressHydrationWarning>{mainPedofil.name}</h4>
                                 <div className="flex items-center gap-2 mt-1">
                                    <div className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
                                    <p className="text-[10px] font-black text-red-500/80 uppercase tracking-widest truncate" suppressHydrationWarning>{mainPedofil.teamName}</p>
                                 </div>
                             </div>
                             <div className="text-right flex flex-col items-end">
                                 <div className="relative">
                                    <span className="text-6xl sm:text-7xl font-black italic text-red-600 tabular-nums leading-none drop-shadow-[0_0_20px_rgba(220,38,38,0.5)]" suppressHydrationWarning>{mainPedofil.goals}</span>
                                    <div className="absolute top-0 right-0 h-full w-full bg-gradient-to-t from-red-600/20 to-transparent pointer-events-none" />
                                 </div>
                                 <p className="text-[10px] sm:text-xs font-black text-red-500 uppercase tracking-widest mt-1 text-right drop-shadow-[0_0_10px_rgba(239,68,68,0.4)]" suppressHydrationWarning>
                                   {mainPedofil.goals === 0 ? `${mainPedofil.played} LAGA MANDUL DETECTED` : `${mainPedofil.played} LAGA EFISIENSI RENDAH`}
                                 </p>
                             </div>
                         </div>
                         <div className="mt-8 flex items-center justify-between border-t border-red-600/30 pt-4">
                            <div className="flex items-center gap-2">
                                <ShieldAlert className="w-4 h-4 text-red-600 animate-pulse" />
                                <span className="text-[8px] font-black text-red-500/60 uppercase">SIGNAL_LOST_PROTOCOL</span>
                            </div>
                            <span className="text-[8px] font-black text-red-500/40">SYSTEM_ALERT_ID: 000-00-0</span>
                         </div>
                    </Card>
                ) : (
                    <Card className="relative overflow-hidden border-4 border-primary/20 bg-black/40 rounded-[2rem] p-8 flex flex-col items-center justify-center transition-all duration-700 hover:border-primary/40">
                        <div className="absolute inset-0 bg-primary/[0.02] pointer-events-none" />
                        <div className="flex flex-col items-center gap-4 relative z-10">
                            <div className="p-4 bg-primary/10 rounded-full border-2 border-primary/20 shadow-[0_0_30px_rgba(204,253,1,0.1)]">
                                <CheckCircle2 className="w-10 h-10 text-primary animate-pulse" />
                            </div>
                            <div className="space-y-1 text-center">
                                <p className="text-[11px] font-black uppercase tracking-[0.4em] text-primary/60 italic">SYSTEM_SAFE: NO_DATA_DETECTED</p>
                                <p className="text-[8px] font-bold text-white/20 uppercase tracking-[0.3em]">AWAITING UNIT MATCH ENGAGEMENTS</p>
                            </div>
                        </div>
                        <div className="absolute bottom-4 right-6 flex items-center gap-1.5 opacity-20">
                            <Radio className="w-3 h-3 text-primary" />
                            <span className="text-[7px] font-black text-white uppercase">SIGNAL_CLEARED</span>
                        </div>
                    </Card>
                )}
            </div>

            <div className="max-w-4xl mx-auto w-full overflow-hidden border-2 border-white/5 rounded-[2.5rem] bg-black/20 shadow-2xl relative">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:30px_30px] opacity-20 pointer-events-none" />
                
                <div className="overflow-x-auto scrollbar-ultra-sport">
                    <Table className="min-w-full">
                        <TableHeader>
                            <TableRow className="hover:bg-transparent border-b-primary/30 h-14 bg-black/40">
                                <TableHead className="w-3 p-0"></TableHead>
                                <TableHead className="w-12 sm:w-20 text-center font-black text-primary uppercase text-[8px] sm:text-[10px] tracking-[0.2em]">Pos</TableHead>
                                <TableHead className="text-left font-black text-primary text-[8px] sm:text-[10px] tracking-[0.2em] uppercase">Pemain</TableHead>
                                <TableHead className="text-center font-black text-primary w-24 sm:w-40 text-[8px] sm:text-[10px] tracking-[0.2em] uppercase">Total Gol</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {topScorers.map((scorer) => {
                                const isRank1 = scorer.rank === 1;
                                const hasGoals = scorer.goals > 0;
                                return (
                                    <TableRow key={scorer.id} className={cn(
                                        "transition-all h-16 sm:h-24 border-b-white/5 relative group/row overflow-hidden", 
                                        isRank1 && hasGoals ? "bg-primary/[0.12] hover:bg-primary/[0.2] shadow-[inset_0_0_50px_rgba(204,253,1,0.15)]" : "hover:bg-white/[0.05]"
                                    )}>
                                        <TableCell className={cn(
                                            "p-0 w-3 transition-all duration-500", 
                                            isRank1 && hasGoals ? 'bg-primary shadow-[0_0_30px_rgba(204,253,1,0.9)]' : 'bg-transparent group-hover/row:bg-primary/40'
                                        )} />
                                        <TableCell className={cn(
                                            "text-center font-black text-xl sm:text-3xl italic transition-all duration-500", 
                                            isRank1 && hasGoals ? "text-primary scale-125 drop-shadow-[0_0_15px_rgba(204,253,1,0.4)]" : "text-white/20 group-hover/row:text-white/40"
                                        )}>{scorer.rank}</TableCell>
                                        <TableCell className="py-2 relative overflow-hidden">
                                            {isRank1 && hasGoals && (
                                                <span className="absolute left-[20%] top-1/2 -translate-y-1/2 text-4xl sm:text-7xl font-black text-primary/[0.03] uppercase italic tracking-tighter pointer-events-none select-none z-0 whitespace-nowrap">
                                                    PREDATOR
                                                </span>
                                            )}
                                            <div className="flex items-center gap-4 relative z-10">
                                                <Avatar className={cn(
                                                    "h-10 w-10 sm:h-14 sm:w-14 border-2 transition-all duration-500 shadow-lg",
                                                    isRank1 && hasGoals ? "border-primary scale-110" : "border-white/10 group-hover/row:border-primary/40"
                                                )}>
                                                    <AvatarImage src={scorer.logoUrl} className="object-cover" referrerPolicy="no-referrer" />
                                                    <AvatarFallback className="bg-black/40"><User className="w-8 h-8 text-white/10"/></AvatarFallback>
                                                </Avatar>
                                                <div className="flex flex-col">
                                                    <span className={cn(
                                                        "font-black tracking-tight uppercase italic pr-2 transition-all", 
                                                        isRank1 && hasGoals ? "text-lg sm:text-3xl text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]" : "text-sm sm:text-xl text-white/80 group-hover/row:text-white"
                                                    )} suppressHydrationWarning>{scorer.name}</span>
                                                    <span className={cn(
                                                        "text-[8px] sm:text-[11px] font-black uppercase tracking-widest mt-1", 
                                                        isRank1 && hasGoals ? "text-primary/60" : "text-white/20 group-hover/row:text-white/40"
                                                    )} suppressHydrationWarning>{scorer.teamName}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className={cn(
                                            "text-center font-black text-2xl sm:text-7xl italic tabular-nums transition-all", 
                                            isRank1 && hasGoals ? "text-primary drop-shadow-[0_0_30px_rgba(204,253,1,0.7)]" : (hasGoals ? "text-white/60 group-hover/row:text-primary" : "text-white/10 group-hover/row:text-white/20")
                                        )} suppressHydrationWarning>{scorer.goals}</TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
});
TopScorerTable.displayName = 'TopScorerTable';

export function LeagueTable({ 
    tableData, 
    isLoading = false, 
    onRemovePlayer, 
    onSelectPlayer, 
    seasonStatus, 
    seasonType, 
    isAdmin, 
    defendingChampionId,
    matches = [],
    playersById = {},
    teamsById = {},
    activeSeason = null,
    activeTab = "group_a",
    onTabChange,
    onRevertMatch
}: LeagueTableProps) {
  const { t } = useTranslation();
  
  const enrichedTableData = useMemo(() => {
    return tableData.map(entry => {
        const pId = entry.playerId || entry.id;
        const player = playersById[pId];
        const teamId = entry.teamId || player?.teamId || '';
        const team = teamsById[teamId];
        const logoUrl = resolveLogo(team?.logoUrl, teamId, entry.playerName);
        return { ...entry, team: team, logoUrl };
    });
  }, [tableData, teamsById, playersById]);

  const isHybrid = seasonType === 'Hybrid' || seasonType === 'Co-Op Hybrid';
  const isCoopHybrid = seasonType === 'Co-Op Hybrid';

  const { groupA, groupB } = useMemo(() => {
    if (!isHybrid || isCoopHybrid) return { groupA: [], groupB: [] };
    const sortFn = (a: any, b: any) => b.points - a.points || (b.goalDifference || 0) - (a.goalDifference || 0) || (b.goalsFor || 0) - (a.goalsFor || 0) || (b.win || 0) - (a.win || 0);
    const a = [...enrichedTableData].filter(p => p.group === 'A').sort(sortFn).map((entry, index) => ({...entry, rank: index + 1}));
    const b = [...enrichedTableData].filter(p => p.group === 'B').sort(sortFn).map((entry, index) => ({...entry, rank: index + 1}));
    return { groupA: a, groupB: b };
  }, [enrichedTableData, isHybrid, isCoopHybrid]);


  if (isLoading) return <LeagueTableSkeleton isCoop={seasonType === 'Co-Op' || seasonType === 'Co-Op Hybrid'} />;
  if (tableData.length === 0) return (<div className="w-full overflow-hidden rounded-xl sm:rounded-[2.5rem] border-2 border-dashed border-primary/20 bg-card/40 p-10 sm:p-16 text-center backdrop-blur-md"><LayoutGrid className="w-12 h-12 sm:w-16 sm:h-16 text-primary/10 mx-auto mb-4" /><h2 className="text-xl sm:text-2xl font-black text-muted-foreground uppercase tracking-widest pr-4">{t('no_players_registered_title')}</h2><p className="text-[10px] sm:text-sm font-bold text-muted-foreground/60 mt-2 uppercase tracking-tighter">{t('no_players_registered_desc')}</p></div>);
  
  const isSeasonCoop = seasonType === 'Co-Op' || seasonType === 'Co-Op Hybrid';

  return (
    <div className="w-full overflow-hidden rounded-xl sm:rounded-[2.5rem] border-2 border-white/5 bg-card/60 backdrop-blur-3xl shadow-2xl">
        {isHybrid && activeTab !== 'playoff' && <PlayoffQualificationLegend />}
        
        {isSeasonCoop ? (
             <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
                <TabsList className={cn("grid w-full bg-black/60 h-16 sm:h-20 p-2 border-b-4 border-white/10 relative overflow-hidden backdrop-blur-2xl rounded-none shadow-[0_10px_50px_rgba(0,0,0,0.5)]", isCoopHybrid ? "grid-cols-3" : "grid-cols-2")}>
                    <TabsTrigger value="standings" className="relative h-full font-black uppercase tracking-[0.15em] text-[10px] sm:text-xs italic transition-all group/tab overflow-hidden">
                        <span className="relative z-10 flex items-center justify-center gap-3 pr-2"><Scan className="w-4 h-4 opacity-40 group-data-[state=active]/tab:opacity-100" />Klasemen</span>
                        <div className="absolute inset-0 -skew-x-[15deg] transition-all duration-700 -z-0 translate-x-[-100%] group-data-[state=active]/tab:translate-x-0 group-data-[state=active]/tab:bg-primary group-data-[state=active]/tab:shadow-[0_0_40px_rgba(204,253,1,0.5)] border-r-4 border-white/10 group-data-[state=active]/tab:border-black/20" />
                    </TabsTrigger>
                    <TabsTrigger value="topskor" className="relative h-full font-black uppercase tracking-[0.15em] text-[10px] sm:text-xs italic transition-all group/tab overflow-hidden">
                        <span className="relative z-10 flex items-center justify-center gap-3 pr-2"><Flame className="w-4 h-4 opacity-40 group-data-[state=active]/tab:opacity-100" />Top Skor</span>
                        <div className="absolute inset-0 -skew-x-[15deg] transition-all duration-700 -z-0 translate-x-[-100%] group-data-[state=active]/tab:translate-x-0 group-data-[state=active]/tab:bg-yellow-400 group-data-[state=active]/tab:shadow-[0_0_40px_rgba(250,204,21,0.5)] border-r-4 border-white/10 group-data-[state=active]/tab:border-black/20" />
                    </TabsTrigger>
                    {isCoopHybrid && (
                        <TabsTrigger value="playoff" className="relative h-full font-black uppercase tracking-[0.15em] text-[10px] sm:text-xs italic transition-all group/tab overflow-hidden">
                            <span className="relative z-10 flex items-center justify-center gap-3 pr-2"><Swords className="w-4 h-4 opacity-40 group-data-[state=active]/tab:opacity-100" />Playoff</span>
                            <div className="absolute inset-0 -skew-x-[15deg] transition-all duration-700 -z-0 translate-x-[-100%] group-data-[state=active]/tab:translate-x-0 group-data-[state=active]/tab:bg-primary group-data-[state=active]/tab:shadow-[0_0_40px_rgba(204,253,1,0.5)] border-r-4 border-white/10 group-data-[state=active]/tab:border-black/20" />
                        </TabsTrigger>
                    )}
                </TabsList>
                <TabsContent value="standings" className="mt-0"><SingleTable tableData={enrichedTableData.map((e, i) => ({ ...e, rank: i + 1 }))} isCoop={true} totalPlayers={enrichedTableData.length} onSelectPlayer={onSelectPlayer} seasonType={seasonType} isLoading={isLoading} onRemovePlayer={onRemovePlayer} seasonStatus={seasonStatus} isAdmin={isAdmin} defendingChampionId={defendingChampionId} matches={matches} /></TabsContent>
                <TabsContent value="topskor" className="mt-0 py-10"><TopScorerTable tableData={tableData} isLoading={isLoading} seasonType={seasonType} teamsById={teamsById} /></TabsContent>
                {isCoopHybrid && (
                    <TabsContent value="playoff" className="mt-0 p-4 sm:p-8">
                        <TournamentBracket 
                            matches={matches || []}
                            playersById={playersById}
                            teamsById={teamsById}
                            leagueTable={tableData}
                            season={activeSeason || null}
                            isAdmin={isAdmin}
                            defendingChampionId={defendingChampionId}
                            onRevertMatch={onRevertMatch}
                        />
                    </TabsContent>
                )}
             </Tabs>
        ) : (
            isHybrid ? (
                <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
                    <TabsList className="grid grid-cols-3 w-full bg-black/60 h-16 sm:h-20 p-2 border-b-4 border-white/10 relative overflow-hidden backdrop-blur-2xl rounded-none shadow-[0_10px_50px_rgba(0,0,0,0.5)]">
                        <TabsTrigger value="group_a" className="relative h-full font-black uppercase tracking-[0.15em] text-[10px] sm:text-xs italic transition-all group/tab overflow-hidden"><span className="relative z-10 flex items-center justify-center gap-3 pr-2">Grup A</span><div className="absolute inset-0 -skew-x-[15deg] transition-all duration-700 -z-0 translate-x-[-100%] group-data-[state=active]/tab:translate-x-0 group-data-[state=active]/tab:bg-primary group-data-[state=active]/tab:shadow-[0_0_40px_rgba(204,253,1,0.5)] border-r-4 border-white/10 group-data-[state=active]/tab:border-black/20" /></TabsTrigger>
                        <TabsTrigger value="group_b" className="relative h-full font-black uppercase tracking-[0.15em] text-[10px] sm:text-xs italic transition-all group/tab overflow-hidden"><span className="relative z-10 flex items-center justify-center gap-3 pr-2">Grup B</span><div className="absolute inset-0 -skew-x-[15deg] transition-all duration-700 -z-0 translate-x-[-100%] group-data-[state=active]/tab:translate-x-0 group-data-[state=active]/tab:bg-primary group-data-[state=active]/tab:shadow-[0_0_40px_rgba(204,253,1,0.5)] border-r-4 border-white/10 group-data-[state=active]/tab:border-black/20" /></TabsTrigger>
                        <TabsTrigger value="playoff" className="relative h-full font-black uppercase tracking-[0.15em] text-[10px] sm:text-xs italic transition-all group/tab overflow-hidden"><span className="relative z-10 flex items-center justify-center gap-3 pr-2">Playoff</span><div className="absolute inset-0 -skew-x-[15deg] transition-all duration-700 -z-0 translate-x-[-100%] group-data-[state=active]/tab:translate-x-0 group-data-[state=active]/tab:bg-primary group-data-[state=active]/tab:shadow-[0_0_40px_rgba(204,253,1,0.5)] border-r-4 border-white/10 group-data-[state=active]/tab:border-black/20" /></TabsTrigger>
                    </TabsList>
                    <TabsContent value="group_a" className="mt-0"><SingleTable tableData={groupA} totalPlayers={groupA.length} onSelectPlayer={onSelectPlayer} seasonType={seasonType} isLoading={isLoading} onRemovePlayer={onRemovePlayer} seasonStatus={seasonStatus} isAdmin={isAdmin} defendingChampionId={defendingChampionId} matches={matches} isCoop={false} /></TabsContent>
                    <TabsContent value="group_b" className="mt-0"><SingleTable tableData={groupB} totalPlayers={groupB.length} onSelectPlayer={onSelectPlayer} seasonType={seasonType} isLoading={isLoading} onRemovePlayer={onRemovePlayer} seasonStatus={seasonStatus} isAdmin={isAdmin} defendingChampionId={defendingChampionId} matches={matches} isCoop={false} /></TabsContent>
                    <TabsContent value="playoff" className="mt-0 p-4 sm:p-8">
                        <TournamentBracket 
                            matches={matches || []}
                            playersById={playersById}
                            teamsById={teamsById}
                            leagueTable={tableData}
                            season={activeSeason || null}
                            isAdmin={isAdmin}
                            defendingChampionId={defendingChampionId}
                            onRevertMatch={onRevertMatch}
                        />
                    </TabsContent>
                </Tabs>
            ) : (
                <SingleTable tableData={enrichedTableData.map((e, i) => ({ ...e, rank: i + 1 }))} isCoop={false} totalPlayers={enrichedTableData.length} onSelectPlayer={onSelectPlayer} seasonType={seasonType} isLoading={isLoading} onRemovePlayer={onRemovePlayer} seasonStatus={seasonStatus} isAdmin={isAdmin} defendingChampionId={defendingChampionId} matches={matches} />
            )
        )}
    </div>
  );
}

function LeagueTableSkeleton({ isCoop }: { isCoop: boolean }) {
  const { t } = useTranslation();
  return (
    <div className="w-full overflow-hidden rounded-2xl border-2 border-white/5 bg-card/40 backdrop-blur-xl shadow-2xl animate-pulse">
      <div className="w-full overflow-x-auto">
        <Table className="min-w-full">
          <TableHeader>
            <TableRow className="hover:bg-transparent h-14">
              <TableHead className="w-2 p-0"></TableHead>
              <TableHead className="w-16 text-center">{t('rank')}</TableHead>
              <TableHead>{t('player')}</TableHead>
              <TableHead className="text-center">{t('played')}</TableHead>
              <TableHead className="hidden sm:table-cell text-center">{t('w_short')}</TableHead>
              <TableHead className="hidden sm:table-cell text-center">{t('d_short')}</TableHead>
              <TableHead className="hidden sm:table-cell text-center">{t('l_short')}</TableHead>
              <TableHead className="text-center font-bold">{t('pts')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(8)].map((_, i) => (
              <TableRow key={i} className="h-20">
                <TableCell className="w-2 p-0"></TableCell>
                <TableCell><Skeleton className="h-8 w-8 mx-auto rounded-md" /></TableCell>
                <TableCell><div className="flex items-center gap-4"><Skeleton className="h-12 w-12 rounded-full" /><div className="space-y-2"><Skeleton className="h-5 w-32" /><Skeleton className="h-3 w-24" /></div></div></TableCell>
                <TableCell><Skeleton className="h-6 w-8 mx-auto" /></TableCell>
                <TableCell className="hidden sm:table-cell"><Skeleton className="h-6 w-8 mx-auto" /></TableCell>
                <TableCell className="hidden sm:table-cell"><Skeleton className="h-6 w-8 mx-auto" /></TableCell>
                <TableCell className="hidden sm:table-cell"><Skeleton className="h-6 w-8 mx-auto" /></TableCell>
                <TableCell><Skeleton className="h-8 w-12 mx-auto" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
