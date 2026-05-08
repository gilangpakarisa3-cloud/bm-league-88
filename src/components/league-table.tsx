'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { LeagueEntry, Season, WithId, Player, Team, Match } from "@/lib/types";
import { Skeleton } from "./ui/skeleton";
import { Button } from "./ui/button";
import { Trash2, User, Trophy, Award, LayoutGrid, Swords, Scan, Activity, Zap, Shield, Info, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useTranslation } from "@/hooks/use-translation";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { useMemo, memo } from "react";
import { TournamentBracket } from "./tournament-bracket";
import { resolveLogo } from "@/lib/logo-utils";

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

const PlayoffQualificationLegend = () => (
  <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-10 p-6 sm:p-10 bg-black/60 border-b-4 border-yellow-400/30 backdrop-blur-3xl relative overflow-hidden group/legend shrink-0">
    {/* HUD Background Pattern with Yellow Tint */}
    <div className="absolute inset-0 bg-[linear-gradient(rgba(250,204,21,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(250,204,21,0.02)_1px,transparent_1px)] bg-[size:25px_25px] opacity-20 pointer-events-none" />
    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-yellow-400/20 to-transparent" />
    
    {/* HUD Decoration Corners */}
    <div className="absolute top-0 left-0 w-12 h-12 border-t-2 border-l-2 border-yellow-400/20 rounded-tl-sm pointer-events-none group-hover/legend:border-yellow-400 transition-colors duration-500" />
    <div className="absolute bottom-0 right-0 w-12 h-12 border-b-2 border-r-2 border-yellow-400/20 rounded-br-sm pointer-events-none group-hover/legend:border-yellow-400 transition-colors duration-500" />

    <div className="flex flex-wrap items-center justify-center gap-10 sm:gap-20 animate-in fade-in slide-in-from-top-4 duration-700 relative z-10">
      <div className="flex items-center gap-4 group/item">
        <div className="relative">
          <div className="absolute -inset-3 bg-green-500/20 rounded-full blur-md opacity-0 group-hover/item:opacity-100 transition-opacity animate-pulse" />
          <div className="w-6 h-6 bg-green-500 shadow-[0_0_20px_rgba(34,197,94,0.6)] border-r-4 border-black/20 -skew-x-[15deg] transition-transform group-hover/item:scale-110" />
        </div>
        <div className="flex flex-col text-left">
          <span className="text-sm sm:text-base font-black uppercase italic text-green-400 leading-none">Upper Bracket</span>
          <span className="text-[10px] sm:text-xs font-bold text-white/30 uppercase tracking-[0.2em] mt-1.5">Rank 1 - 4 (Hijau)</span>
        </div>
      </div>

      <div className="w-px h-12 bg-white/5 hidden lg:block" />

      <div className="flex items-center gap-4 group/item">
        <div className="relative">
          <div className="absolute -inset-4 bg-yellow-400/20 rounded-full blur-lg opacity-40 group-hover/item:opacity-100 transition-opacity animate-pulse" />
          <div className="w-6 h-6 bg-yellow-400 shadow-[0_0_30px_rgba(250,204,21,0.8)] border-r-4 border-black/20 -skew-x-[15deg] transition-transform group-hover/item:scale-110" />
        </div>
        <div className="flex flex-col text-left">
          <span className="text-sm sm:text-base font-black uppercase italic text-yellow-400 leading-none">Lower Bracket</span>
          <span className="text-[10px] sm:text-xs font-bold text-white/30 uppercase tracking-[0.2em] mt-1.5">Rank 5 - 6 (Emas)</span>
        </div>
      </div>

      <div className="w-px h-12 bg-white/5 hidden lg:block" />

      <div className="flex items-center gap-4 group/item">
        <div className="relative">
          <div className="absolute -inset-3 bg-red-500/20 rounded-full blur-md opacity-0 group-hover/item:opacity-100 transition-opacity animate-pulse" />
          <div className="w-6 h-6 bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.6)] border-r-4 border-black/20 -skew-x-[15deg] transition-transform group-hover/item:scale-110" />
        </div>
        <div className="flex flex-col text-left">
          <span className="text-sm sm:text-base font-black uppercase italic text-red-500 leading-none">Nangis di Pojok</span>
          <span className="text-[10px] sm:text-xs font-bold text-white/30 uppercase tracking-[0.2em] mt-1.5">Rank 7+ (Merah)</span>
        </div>
      </div>
    </div>
  </div>
);

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
                    const isP1 = m.player1Id === playerId;
                    const s1 = isCoop || (m.round && m.round !== 'Group') ? (m.player1Wins ?? 0) : (m.player1Score ?? 0);
                    const s2 = isCoop || (m.round && m.round !== 'Group') ? (m.player2Wins ?? 0) : (m.player2Score ?? 0);
                    const pRes = isP1 ? s1 : s2;
                    const oRes = isP1 ? s2 : s1;
                    if (pRes > oRes) return 'W';
                    if (pRes < oRes) return 'L';
                    return 'D';
                });
        });
        return forms;
    }, [matches, tableData, isCoop]);

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
              {!isCoop && <TableHead className="text-center font-black text-yellow-400 w-10 sm:w-20 text-[8px] sm:text-[10px] tracking-[0.1em] sm:tracking-[0.2em] uppercase">{t('d_short')}</TableHead>}
              <TableHead className="text-center font-black text-red-400 w-10 sm:w-20 text-[8px] sm:text-[10px] tracking-[0.1em] sm:tracking-[0.2em] uppercase">{t('l_short')}</TableHead>
              {!isCoop && (
                <>
                    <TableHead className="hidden lg:table-cell text-center font-black text-white/40 w-20 text-[10px] tracking-[0.2em] uppercase">{t('gf_short')}</TableHead>
                    <TableHead className="hidden lg:table-cell text-center font-black text-white/40 w-20 text-[10px] tracking-[0.2em] uppercase">{t('ga_short')}</TableHead>
                    <TableHead className="hidden lg:table-cell text-center font-black text-primary/60 w-20 text-[10px] tracking-[0.2em] uppercase">{t('gd_short')}</TableHead>
                </>
              )}
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
              const isQualificationZone =
                  (isPlayoffHybrid && entry.rank >= 1 && entry.rank <= 4) ||
                  (currentType === 'Single' && entry.rank > 1 && entry.rank <= 4);
              
              const isLowerBracketZone = 
                  isPlayoffHybrid && 
                  totalPlayers >= 6 && 
                  (entry.rank === 5 || entry.rank === 6);

              const isRelegationZone = 
                  (currentType === 'Single' && totalPlayers > 3 && entry.rank >= totalPlayers - 2) ||
                  (isPlayoffHybrid && totalPlayers > 6 && entry.rank > 6);
              
              const isUnbeaten = entry.played > 0 && entry.loss === 0;
              const isDefendingChampion = entry.playerId === defendingChampionId;

              return (
                <TableRow 
                  key={entry.id}
                  className={cn(
                    "transition-all h-16 sm:h-20 border-b-white/5 relative group/row",
                    isFirst ? "bg-primary/[0.08] hover:bg-primary/[0.15]" :
                    isQualificationZone ? "bg-green-500/[0.05] hover:bg-green-500/[0.1]" :
                    isLowerBracketZone ? "bg-amber-500/[0.05] hover:bg-amber-500/[0.1]" :
                    isRelegationZone ? "bg-red-500/[0.05] hover:bg-red-500/[0.1]" : "hover:bg-white/[0.03]"
                  )}
                >
                  <TableCell className={cn("p-0 w-1.5 transition-all duration-500", 
                    isFirst ? 'bg-primary shadow-[0_0_20px_rgba(204,253,1,0.8)]' :
                    isQualificationZone ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]' :
                    isLowerBracketZone ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]' :
                    isRelegationZone ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]' : 'bg-transparent'
                  )}>
                  </TableCell>
                  <TableCell className={cn(
                    "text-center font-black text-base sm:text-xl px-1 italic transition-all duration-500",
                    isFirst ? "text-primary scale-125 drop-shadow-[0_0_15px_rgba(204,253,1,0.7)]" : 
                    isQualificationZone ? "text-green-400" :
                    isLowerBracketZone ? "text-amber-500" :
                    isRelegationZone ? "text-red-500" : "text-white/40"
                    )}>
                    {entry.rank}
                  </TableCell>
                  <TableCell className="relative overflow-visible py-2 sm:py-3">
                    <div 
                      className="flex items-center gap-2 sm:gap-4 cursor-pointer group/node"
                      onClick={() => onSelectPlayer(entry)}
                    >
                       <div className="relative shrink-0">
                          <div className={cn(
                              "absolute -inset-1 rounded-full blur-md opacity-0 transition-opacity duration-500",
                              isFirst ? "bg-primary/20 opacity-100" : "group-hover/node:bg-primary/10 group-hover/node:opacity-100"
                          )} />
                          <Avatar className={cn(
                              "h-10 w-10 sm:h-14 sm:w-14 border-2 transition-all duration-500 shadow-xl relative z-10",
                              isFirst ? "border-primary scale-110" : "border-white/10 group-hover/node:border-primary group-hover/node:scale-105"
                          )}>
                            <AvatarImage key={entry.logoUrl} src={entry.logoUrl || undefined} alt={entry.playerName} className="object-cover" referrerPolicy="no-referrer" />
                            <AvatarFallback className="bg-black/40 font-black text-xs"><User className="w-5 h-5 sm:w-7 sm:h-7 text-white/30"/></AvatarFallback>
                          </Avatar>
                          {isFirst && (
                             <div className="absolute -top-1 -right-1 bg-primary rounded-full p-1 shadow-lg border-2 border-background z-20 animate-bounce">
                                <Trophy className="w-3 h-3 text-black" />
                             </div>
                          )}
                       </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-center translate-y-[-1px]">
                        <div className="flex items-center gap-2">
                           <span className={cn(
                               "font-black tracking-tight transition-colors truncate uppercase italic pr-2", 
                               isFirst ? "text-sm sm:text-xl text-primary drop-shadow-[0_0_10px_rgba(204,253,1,0.4)]" : "text-[12px] sm:text-lg text-white group-hover/node:text-primary"
                            )}>
                                {entry.playerName}
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                                {isUnbeaten && (
                                    <Badge variant="outline" className="border-yellow-400/50 bg-yellow-400/10 text-yellow-300 px-1.5 py-0 h-4 sm:h-5 font-black text-[6px] sm:text-[8px] uppercase">
                                        UB
                                    </Badge>
                                )}
                                {isDefendingChampion && (
                                    <Badge variant="outline" className="border-amber-500/50 bg-amber-500/10 text-amber-400 px-1.5 py-0 h-4 sm:h-5 font-black text-[6px] sm:text-[8px] uppercase">
                                        CH
                                    </Badge>
                                )}
                            </div>
                        </div>
                        <div className="text-[8px] sm:text-[11px] font-black text-white/30 uppercase tracking-[0.15em] sm:tracking-[0.2em] truncate pr-4 group-hover/node:text-white/50 transition-colors">
                            {entry.team?.name || entry.teamName || 'Athlete Protocol'}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center px-1 sm:px-2 text-xs sm:text-sm font-black text-white/80 tabular-nums">{entry.played}</TableCell>
                  <TableCell className="text-center px-1 sm:px-2 text-xs sm:text-sm font-black text-green-400 tabular-nums">{entry.win}</TableCell>
                  {!isCoop && <TableCell className="text-center px-1 sm:px-2 text-xs sm:text-sm font-black text-yellow-400 tabular-nums">{entry.draw}</TableCell>}
                  <TableCell className="text-center px-1 sm:px-2 text-xs sm:text-sm font-black text-red-400 tabular-nums">{entry.loss}</TableCell>
                  {!isCoop && (
                    <>
                        <TableCell className="hidden lg:table-cell text-center px-2 text-sm font-bold text-white/30 tabular-nums">{entry.goalsFor}</TableCell>
                        <TableCell className="hidden lg:table-cell text-center px-2 text-sm font-bold text-white/30 tabular-nums">{entry.goalsAgainst}</TableCell>
                        <TableCell className={cn("hidden lg:table-cell text-center px-2 text-sm font-black tabular-nums", entry.goalDifference > 0 ? "text-primary/60" : (entry.goalDifference < 0 ? "text-red-400/60" : "text-white/20"))}>
                            {entry.goalDifference > 0 ? `+${entry.goalDifference}` : entry.goalDifference}
                        </TableCell>
                    </>
                  )}
                  <TableCell className="hidden xl:table-cell text-center px-2">
                      <div className="flex justify-center gap-1">
                          {playerForm.length > 0 ? playerForm.map((res, i) => (
                              <div key={i} className={cn(
                                  "w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black border transition-transform hover:scale-110",
                                  res === 'W' ? "bg-green-500/20 text-green-400 border-green-500/50" : 
                                  res === 'L' ? "bg-red-500/20 text-red-400 border-red-500/50" : 
                                  "bg-yellow-500/20 text-yellow-400 border-yellow-500/50"
                              )}>{res === 'W' ? 'M' : res === 'L' ? 'K' : 'S'}</div>
                          )) : <span className="text-[8px] font-bold text-white/10 uppercase tracking-tighter italic">No Data</span>}
                      </div>
                  </TableCell>
                  <TableCell className={cn(
                      "text-center font-black text-xl sm:text-3xl px-1 sm:px-2 italic transition-all duration-500 tabular-nums", 
                      isFirst ? "text-primary drop-shadow-[0_0_20px_rgba(204,253,1,0.6)]" : "text-primary"
                    )}>
                    {entry.points}
                  </TableCell>
                  {canRemovePlayer && (
                    <TableCell className="hidden sm:table-cell text-right px-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 hover:bg-red-500/10 hover:text-red-500 transition-colors border border-white/5 rounded-xl"
                        onClick={() => onRemovePlayer?.(entry)}
                        title={`${t('remove')} ${entry.playerName}`}
                      >
                        <Trash2 className="h-4.5 w-4.5" />
                        <span className="sr-only">{t('remove_player')}</span>
                      </Button>
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

        return {
            ...entry,
            team: team,
            logoUrl
        };
    });
  }, [tableData, teamsById, playersById]);

  const isHybrid = seasonType === 'Hybrid' || seasonType === 'Co-Op Hybrid';

  const { groupA, groupB } = useMemo(() => {
    if (!isHybrid) return { groupA: [], groupB: [] };
    
    const sortAndRank = (data: typeof enrichedTableData) => 
        data.sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
            if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
            return a.playerName.localeCompare(b.playerName);
        }).map((entry, index) => ({...entry, rank: index + 1}));

    const a = sortAndRank(enrichedTableData.filter(p => p.group === 'A'));
    const b = sortAndRank(enrichedTableData.filter(p => p.group === 'B'));
    
    return { groupA: a, groupB: b };
  }, [enrichedTableData, isHybrid]);


  if (isLoading) {
    return <LeagueTableSkeleton isCoop={seasonType === 'Co-Op' || seasonType === 'Co-Op Hybrid'} />;
  }
  
  if (tableData.length === 0) {
    return (
      <div className="w-full overflow-hidden rounded-2xl border-2 border-dashed border-primary/20 bg-card/40 p-10 sm:p-16 text-center backdrop-blur-md">
        <LayoutGrid className="w-12 h-12 sm:w-16 sm:h-16 text-primary/10 mx-auto mb-4" />
        <h2 className="text-xl sm:text-2xl font-black text-muted-foreground uppercase tracking-widest pr-4">{t('no_players_registered_title')}</h2>
        <p className="text-[10px] sm:text-sm font-bold text-muted-foreground/60 mt-2 uppercase tracking-tighter">{t('no_players_registered_desc')}</p>
      </div>
    );
  }
  
  const isSeasonCoop = seasonType === 'Co-Op' || seasonType === 'Co-Op Hybrid';

  return (
    <div className="w-full overflow-hidden rounded-xl sm:rounded-[2.5rem] border-2 border-white/5 bg-card/60 backdrop-blur-3xl shadow-2xl">
        {isHybrid && activeTab !== 'playoff' && <PlayoffQualificationLegend />}
        
        {isHybrid ? (
             <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-black/60 h-16 sm:h-20 p-2 border-b-4 border-white/10 relative overflow-hidden backdrop-blur-2xl rounded-none shadow-[0_10px_50px_rgba(0,0,0,0.5)]">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 pointer-events-none" />
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary/60 rounded-tl-sm" />
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-primary/60 rounded-tr-sm" />
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-primary/20 blur-sm" />

                    <TabsTrigger 
                        value="group_a" 
                        className={cn(
                            "relative h-full font-black uppercase tracking-[0.2em] text-[10px] sm:text-xs italic transition-all duration-700 group/tab overflow-hidden",
                            "data-[state=active]:text-black data-[state=inactive]:text-white/30 data-[state=inactive]:hover:text-white/70"
                        )}
                    >
                        <span className="relative z-10 flex items-center justify-center gap-3 pr-2">
                            <div className="relative">
                                <Scan className="w-4 h-4 opacity-40 group-data-[state=active]/tab:opacity-100 group-data-[state=active]/tab:animate-pulse" />
                                <div className="absolute inset-0 bg-primary/40 blur-md opacity-0 group-data-[state=active]/tab:opacity-100 transition-opacity" />
                            </div>
                            Grup A <span className="text-[12px] opacity-40 group-data-[state=active]/tab:opacity-100 font-bold bg-black/20 px-1.5 rounded" suppressHydrationWarning>[{groupA.length}]</span>
                        </span>
                        <div className={cn(
                            "absolute inset-0 -skew-x-[15deg] transition-all duration-700 -z-0 translate-x-[-100%] group-data-[state=active]/tab:translate-x-0",
                            "group-data-[state=active]/tab:bg-primary group-data-[state=active]/tab:shadow-[0_0_40px_rgba(204,253,1,0.5)]",
                            "border-r-4 border-white/10 group-data-[state=active]/tab:border-black/20"
                        )} />
                        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary/40 scale-x-0 group-data-[state=active]/tab:scale-x-100 transition-transform duration-1000 delay-300" />
                    </TabsTrigger>

                    <TabsTrigger 
                        value="group_b" 
                        className={cn(
                            "relative h-full font-black uppercase tracking-[0.2em] text-[10px] sm:text-xs italic transition-all duration-700 group/tab overflow-hidden",
                            "data-[state=active]:text-black data-[state=inactive]:text-white/30 data-[state=inactive]:hover:text-white/70"
                        )}
                    >
                        <span className="relative z-10 flex items-center justify-center gap-3 pr-2">
                            <div className="relative">
                                <Scan className="w-4 h-4 opacity-40 group-data-[state=active]/tab:opacity-100 group-data-[state=active]/tab:animate-pulse" />
                                <div className="absolute inset-0 bg-primary/40 blur-md opacity-0 group-data-[state=active]/tab:opacity-100 transition-opacity" />
                            </div>
                            Grup B <span className="text-[12px] opacity-40 group-data-[state=active]/tab:opacity-100 font-bold bg-black/20 px-1.5 rounded" suppressHydrationWarning>[{groupB.length}]</span>
                        </span>
                        <div className={cn(
                            "absolute inset-0 -skew-x-[15deg] transition-all duration-700 -z-0 translate-x-[-100%] group-data-[state=active]/tab:translate-x-0",
                            "group-data-[state=active]/tab:bg-primary group-data-[state=active]/tab:shadow-[0_0_40px_rgba(204,253,1,0.5)]",
                            "border-r-4 border-white/10 group-data-[state=active]/tab:border-black/20"
                        )} />
                        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary/40 scale-x-0 group-data-[state=active]/tab:scale-x-100 transition-transform duration-1000 delay-300" />
                    </TabsTrigger>

                    <TabsTrigger 
                        value="playoff" 
                        className={cn(
                            "relative h-full font-black uppercase tracking-[0.2em] text-[10px] sm:text-xs italic transition-all duration-700 group/tab overflow-hidden",
                            "data-[state=active]:text-black data-[state=inactive]:text-white/30 data-[state=inactive]:hover:text-white/70"
                        )}
                    >
                         <span className="relative z-10 flex items-center justify-center gap-3 pr-2">
                            <div className="relative">
                                <Swords className="w-4 h-4 opacity-40 group-data-[state=active]/tab:opacity-100 group-data-[state=active]/tab:animate-pulse" />
                                <div className="absolute inset-0 bg-primary/40 blur-md opacity-0 group-data-[state=active]/tab:opacity-100 transition-opacity" />
                            </div>
                            Playoff
                        </span>
                        <div className={cn(
                            "absolute inset-0 -skew-x-[15deg] transition-all duration-700 -z-0 translate-x-[-100%] group-data-[state=active]/tab:translate-x-0",
                            "group-data-[state=active]/tab:bg-primary group-data-[state=active]/tab:shadow-[0_0_40px_rgba(204,253,1,0.5)]",
                            "border-r-4 border-white/10 group-data-[state=active]/tab:border-black/20"
                        )} />
                        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary/40 scale-x-0 group-data-[state=active]/tab:scale-x-100 transition-transform duration-1000 delay-300" />
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="group_a" className="mt-0">
                    <SingleTable 
                        tableData={groupA} 
                        totalPlayers={groupA.length}
                        onSelectPlayer={onSelectPlayer}
                        seasonType={seasonType}
                        isLoading={isLoading}
                        onRemovePlayer={onRemovePlayer}
                        seasonStatus={seasonStatus}
                        isAdmin={isAdmin}
                        defendingChampionId={defendingChampionId}
                        matches={matches}
                        isCoop={isSeasonCoop}
                     />
                </TabsContent>
                <TabsContent value="group_b" className="mt-0">
                     <SingleTable 
                        tableData={groupB}
                        totalPlayers={groupB.length}
                        onSelectPlayer={onSelectPlayer}
                        seasonType={seasonType}
                        isLoading={isLoading}
                         onRemovePlayer={onRemovePlayer}
                        seasonStatus={seasonStatus}
                        isAdmin={isAdmin}
                        defendingChampionId={defendingChampionId}
                         matches={matches}
                         isCoop={isSeasonCoop}
                     />
                </TabsContent>
                <TabsContent value="playoff" className="mt-0 ">
                     <TournamentBracket 
                        matches={matches}
                        playersById={playersById}
                         teamsById={teamsById}
                        leagueTable={tableData}
                        season={activeSeason}
                        isAdmin={isAdmin}
                        onRevertMatch={onRevertMatch}
                     />
                </TabsContent>
            </Tabs>
        ) : (
             <SingleTable 
                tableData={enrichedTableData.map((e, i) => ({ ...e, rank: i + 1 }))}
                isCoop={isSeasonCoop}
                totalPlayers={enrichedTableData.length}
                onSelectPlayer={onSelectPlayer}
                seasonType={seasonType}
                isLoading={isLoading}
                 onRemovePlayer={onRemovePlayer}
                seasonStatus={seasonStatus}
                isAdmin={isAdmin}
                defendingChampionId={defendingChampionId}
                matches={matches}
            />
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
              {!isCoop && <TableHead className="hidden sm:table-cell text-center">{t('d_short')}</TableHead>}
              <TableHead className="hidden sm:table-cell text-center">{t('l_short')}</TableHead>
              <TableHead className="text-center font-bold">{t('pts')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(8)].map((_, i) => (
              <TableRow key={i} className="h-20">
                <TableCell className="w-2 p-0"></TableCell>
                <TableCell><Skeleton className="h-8 w-8 mx-auto rounded-md" /></TableCell>
                <TableCell>
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                </TableCell>
                <TableCell><Skeleton className="h-6 w-8 mx-auto" /></TableCell>
                <TableCell className="hidden sm:table-cell"><Skeleton className="h-6 w-8 mx-auto" /></TableCell>
                {!isCoop && <TableCell className="hidden sm:table-cell"><Skeleton className="h-6 w-8 mx-auto" /></TableCell>}
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
