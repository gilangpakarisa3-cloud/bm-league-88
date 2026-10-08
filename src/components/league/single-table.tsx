'use client';

import { memo, useMemo } from 'react';
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
import { Trash2, User, Trophy, Award, LayoutGrid, Swords, Activity, Zap, Shield, CheckCircle2, Flame, Binary } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTranslation } from "@/hooks/use-translation";
import { Badge } from "@/components/ui/badge";
import { resolveLogo } from "@/lib/logo-utils";
import { getSeasonTheme, type TISeasonTheme } from "@/lib/season-theme";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

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
  theme?: TISeasonTheme;
  playersById?: Record<string, WithId<Player>>;
  teamsById?: Record<string, WithId<Team>>;
  hasDivisions?: boolean;
  isDivision2?: boolean;
  division1Name?: string;
  division2Name?: string;
  promotionSpots?: number;
  relegationSpots?: number;
  onToggleDivision?: (entry: WithId<LeagueEntry>) => void;
}

export const SingleTable = memo(({ 
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
    matches,
    theme,
    playersById = {},
    teamsById = {},
    hasDivisions = false,
    isDivision2 = false,
    division1Name = 'Divisi 1',
    division2Name = 'Divisi 2',
    promotionSpots = 2,
    relegationSpots = 2,
    onToggleDivision,
}: SingleTableProps) => {
    const { t } = useTranslation();
    const activeTheme = theme || getSeasonTheme(null);
    const canRemovePlayer = seasonStatus === 'Not Started' && !!onRemovePlayer && isAdmin;

    const playerFormsMap = useMemo(() => {
        if (!matches || matches.length === 0) return {};
        
        // Lookup helpers for quick name resolution
        const entryMap: Record<string, { playerName?: string; teamName?: string; teamId?: string }> = {};
        tableData.forEach(e => {
            const id = e.playerId || e.id;
            entryMap[id] = { playerName: e.playerName, teamName: e.teamName, teamId: e.teamId };
        });

        type FormItem = {
            result: 'W' | 'L' | 'D';
            matchId: string;
            opponentName: string;
            opponentTeamName?: string;
            opponentLogo?: string;
            scoreText: string;
            isHome: boolean;
            round?: string;
        };

        const forms: Record<string, FormItem[]> = {};
        
        tableData.forEach(entry => {
            const playerId = entry.playerId || entry.id;
            forms[playerId] = matches
                .filter(m => m.isCompleted && (m.player1Id === playerId || m.player2Id === playerId))
                .sort((a, b) => {
                  const tA = a.matchDate?.toMillis ? a.matchDate.toMillis() : 0;
                  const tB = b.matchDate?.toMillis ? b.matchDate.toMillis() : 0;
                  return tB - tA;
                })
                .slice(0, 5)
                .reverse()
                .map(m => {
                    const isPlayer1 = m.player1Id === playerId;
                    const opponentId = isPlayer1 ? m.player2Id : m.player1Id;
                    const isBo3 = m.player1Wins !== null && m.player1Wins !== undefined && m.round !== 'Group';
                    const s1 = isBo3 ? (m.player1Wins ?? 0) : (m.player1Score ?? 0);
                    const s2 = isBo3 ? (m.player2Wins ?? 0) : (m.player2Score ?? 0);
                    const myScore = isPlayer1 ? s1 : s2;
                    const oppScore = isPlayer1 ? s2 : s1;

                    let result: 'W' | 'L' | 'D' = 'D';
                    if (myScore > oppScore) result = 'W';
                    else if (myScore < oppScore) result = 'L';

                    // Resolve opponent name & team info
                    const oppEntry = entryMap[opponentId];
                    const oppPlayer = playersById[opponentId];
                    const opponentName = oppEntry?.playerName || oppPlayer?.name || opponentId || 'Lawan';
                    const oppTeamId = oppEntry?.teamId || oppPlayer?.teamId;
                    const oppTeam = oppTeamId ? teamsById[oppTeamId] : undefined;
                    const opponentTeamName = oppTeam?.name || oppEntry?.teamName || oppPlayer?.teamName;
                    const opponentLogo = oppTeam?.logoUrl ? resolveLogo(oppTeam.logoUrl) : undefined;

                    return {
                        result,
                        matchId: m.id,
                        opponentName,
                        opponentTeamName,
                        opponentLogo,
                        scoreText: `${myScore} - ${oppScore}${isBo3 ? ' (BO3)' : ''}`,
                        isHome: isPlayer1,
                        round: m.round
                    };
                });
        });
        return forms;
    }, [matches, tableData, playersById, teamsById]);

    return (
      <div className="w-full overflow-x-auto scrollbar-ultra-sport">
        <Table className="w-auto min-w-full border-collapse">
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b border-white/10 h-10 sm:h-12 bg-black/60 backdrop-blur-md">
              <TableHead className="w-9 sm:w-12 text-center font-black text-white/40 uppercase text-[8px] sm:text-[10px] tracking-[0.15em] sm:tracking-[0.2em] px-1">
                {t('rank')}
              </TableHead>
              <TableHead className="text-left font-black text-white/40 text-[8px] sm:text-[10px] tracking-[0.15em] sm:tracking-[0.2em] min-w-[160px] sm:min-w-[220px] uppercase pl-2 sm:pl-4">
                {t('player')}
              </TableHead>
              <TableHead className="text-center font-black text-white/40 w-8 sm:w-11 text-[8px] sm:text-[10px] tracking-wider sm:tracking-[0.15em] uppercase px-1">
                {t('played_short')}
              </TableHead>
              <TableHead className="text-center font-black text-emerald-400/80 w-8 sm:w-11 text-[8px] sm:text-[10px] tracking-wider sm:tracking-[0.15em] uppercase px-1">
                {t('w_short')}
              </TableHead>
              <TableHead className="text-center font-black text-amber-400/80 w-8 sm:w-11 text-[8px] sm:text-[10px] tracking-wider sm:tracking-[0.15em] uppercase px-1">
                {t('d_short')}
              </TableHead>
              <TableHead className="text-center font-black text-rose-400/80 w-8 sm:w-11 text-[8px] sm:text-[10px] tracking-wider sm:tracking-[0.15em] uppercase px-1">
                {t('l_short')}
              </TableHead>
              <TableHead className={cn("text-center font-black w-9 sm:w-13 text-[8px] sm:text-[10px] tracking-wider sm:tracking-[0.15em] uppercase px-1", activeTheme.primaryText)}>
                {t('gd_short')}
              </TableHead>
              <TableHead className="hidden md:table-cell text-center font-black text-white/40 w-9 sm:w-12 text-[8px] sm:text-[9px] tracking-wider uppercase px-1">
                {t('gf_short')}
              </TableHead>
              <TableHead className="hidden md:table-cell text-center font-black text-white/40 w-9 sm:w-12 text-[8px] sm:text-[9px] tracking-wider uppercase px-1">
                {t('ga_short')}
              </TableHead>
              <TableHead className="hidden xl:table-cell text-center font-black text-white/40 w-32 text-[9px] tracking-[0.2em] uppercase px-2">
                FORM
              </TableHead>
              <TableHead className={cn("text-center font-black w-12 sm:w-16 text-[8px] sm:text-[10px] tracking-wider sm:tracking-[0.15em] uppercase pr-2 sm:pr-4", activeTheme.primaryText)}>
                {t('pts_short')}
              </TableHead>
              {canRemovePlayer && (
                <TableHead className="hidden sm:table-cell text-right font-black text-rose-400 w-12 text-[9px] tracking-[0.2em] uppercase pr-4">
                  {t('actions')}
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {tableData.map((entry) => {
              const currentType = seasonType || 'Single';
              const isSingleHybrid = currentType === 'Single Hybrid';
              const isCoopHybrid = currentType === 'Co-Op Hybrid';
              const isGroupHybrid = currentType === 'Hybrid';
              const playerForm = playerFormsMap[entry.playerId || entry.id] || [];
              const isFirst = entry.rank === 1;

              let isUpperBracketZone = false;
              let isLowerBracketZone = false;
              let isRelegationZone = false;
              let isPromotionZone = false;

              const actualPromotionSpots = Math.max(1, promotionSpots || 2);
              const actualRelegationSpots = Math.max(1, relegationSpots || 2);

              if (isDivision2) {
                isPromotionZone = entry.rank <= actualPromotionSpots;
              } else if (hasDivisions) {
                if (isGroupHybrid) {
                  // Di format 2 grup, rank 1-2 lolos Upper Bracket, rank 3-4 lolos Playoff Contender (Top 4 tiap grup lolos playoff)
                  // Juru kunci grup di luar zona playoff (rank 5+) menjadi kandidat degradasi langsung
                  const spotsPerGroup = Math.max(1, Math.ceil(actualRelegationSpots / 2));
                  isUpperBracketZone = entry.rank >= 1 && entry.rank <= 2;
                  isLowerBracketZone = entry.rank === 3 || entry.rank === 4;
                  // Hanya yang di luar zona playoff (rank > 4) yang ditandai degradasi di fase grup
                  isRelegationZone = entry.rank > 4 && entry.rank > Math.max(0, totalPlayers - spotsPerGroup);
                } else if (isSingleHybrid) {
                  // Top 8 lolos Playoff 8 Besar dan berhak bertarung untuk gelar juara
                  isUpperBracketZone = entry.rank >= 1 && entry.rank <= 8;
                  // Hanya rank di luar playoff (#9+) yang langsung degradasi di klasemen reguler
                  // Tim di top 8 tidak ditandai degradasi karena masih bertanding di playoff
                  const nonPlayoffSpots = Math.max(0, totalPlayers - 8);
                  const directRelegationSpots = Math.min(actualRelegationSpots, nonPlayoffSpots);
                  isRelegationZone = entry.rank > 8 && (entry.rank > totalPlayers - directRelegationSpots);
                } else {
                  isRelegationZone = totalPlayers > actualRelegationSpots && entry.rank > totalPlayers - actualRelegationSpots;
                }
              } else {
                if (isSingleHybrid) {
                  isUpperBracketZone = entry.rank >= 1 && entry.rank <= 8;
                  isLowerBracketZone = false;
                  isRelegationZone = entry.rank > 8;
                } else if (isCoopHybrid) {
                  isUpperBracketZone = entry.rank >= 1 && entry.rank <= 4;
                  isLowerBracketZone = entry.rank === 5 || entry.rank === 6;
                  isRelegationZone = entry.rank > 6;
                } else if (isGroupHybrid) {
                  isUpperBracketZone = entry.rank >= 1 && entry.rank <= 2;
                  isLowerBracketZone = entry.rank === 3 || entry.rank === 4;
                  isRelegationZone = entry.rank > 4;
                } else if (currentType === 'Single' && totalPlayers > 3) {
                  isRelegationZone = entry.rank >= totalPlayers - 2;
                }
              }
              
              return (
                <TableRow 
                  key={entry.id} 
                  className={cn(
                    "transition-all h-13 sm:h-18 border-b border-white/5 relative group/row overflow-hidden",
                    isPromotionZone ? "bg-emerald-500/[0.04] hover:bg-emerald-500/[0.08]" :
                    isFirst ? activeTheme.tableLeaderBg : 
                    isUpperBracketZone ? "bg-emerald-500/[0.02] hover:bg-emerald-500/[0.07]" : 
                    isLowerBracketZone ? "bg-amber-500/[0.02] hover:bg-amber-500/[0.07]" : 
                    isRelegationZone ? "bg-rose-500/[0.03] hover:bg-rose-500/[0.08]" : 
                    "hover:bg-white/[0.03]"
                  )}
                >
                  {/* Rank Cell with Laser Edge Tracer */}
                  <TableCell className="relative p-0 text-center w-8 sm:w-16">
                    {/* Left aerodynamic laser beam */}
                    <div 
                      className={cn(
                        "absolute left-0 top-2 bottom-2 w-1 sm:w-1.5 rounded-r-full transition-all duration-300",
                        isPromotionZone ? "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)]" :
                        isFirst ? activeTheme.tableLaserBeam :
                        isUpperBracketZone ? "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]" :
                        isLowerBracketZone ? "bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.8)]" :
                        isRelegationZone ? "bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.9)]" :
                        "bg-transparent"
                      )} 
                    />

                    {/* Futuristic Rank Badge */}
                    <div className="flex items-center justify-center pl-1 sm:pl-3">
                      {isFirst ? (
                        <div className={cn("w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl font-black text-xs sm:text-base italic flex items-center justify-center group-hover/row:scale-110 transition-transform font-headline", activeTheme.tableLeaderGradient)}>
                          1
                        </div>
                      ) : isPromotionZone ? (
                        <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-emerald-500/20 border border-emerald-400 text-emerald-300 font-black text-xs sm:text-base italic flex items-center justify-center shadow-[0_0_15px_rgba(52,211,153,0.3)] group-hover/row:scale-105 transition-all font-headline">
                          {entry.rank}
                        </div>
                      ) : isUpperBracketZone ? (
                        <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 font-black text-xs sm:text-base italic flex items-center justify-center shadow-[0_0_12px_rgba(16,185,129,0.2)] group-hover/row:border-emerald-400 group-hover/row:scale-105 transition-all font-headline">
                          {entry.rank}
                        </div>
                      ) : isLowerBracketZone ? (
                        <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-400 font-black text-xs sm:text-base italic flex items-center justify-center shadow-[0_0_12px_rgba(245,158,11,0.2)] group-hover/row:border-amber-400 group-hover/row:scale-105 transition-all font-headline">
                          {entry.rank}
                        </div>
                      ) : isRelegationZone ? (
                        <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-400 font-black text-xs sm:text-base italic flex items-center justify-center shadow-[0_0_12px_rgba(244,63,94,0.2)] group-hover/row:border-rose-400 group-hover/row:scale-105 transition-all font-headline">
                          {entry.rank}
                        </div>
                      ) : (
                        <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-white/[0.04] border border-white/10 text-white/50 font-black text-xs sm:text-base italic flex items-center justify-center group-hover/row:text-white transition-all font-headline">
                          {entry.rank}
                        </div>
                      )}
                    </div>
                  </TableCell>

                  {/* Athlete & Team Cell */}
                  <TableCell className="relative overflow-visible py-1.5 sm:py-3 pl-1.5 sm:pl-4 w-[180px] sm:w-[260px] max-w-[280px]">
                    <div 
                      className="flex items-center gap-2 sm:gap-3.5 cursor-pointer group/node min-w-0" 
                      onClick={() => onSelectPlayer(entry)}
                      title="Klik untuk melihat Season Performance HUD"
                    >
                      <div className="relative shrink-0">
                        <div className={cn(
                          "absolute -inset-1 rounded-xl sm:rounded-2xl blur-md opacity-0 transition-opacity duration-300", 
                          isFirst ? cn(activeTheme.tableLeaderGlow, "opacity-100") : "group-hover/node:opacity-50"
                        )} />
                        <Avatar className={cn(
                          "h-7 w-7 sm:h-11 sm:w-11 rounded-lg sm:rounded-2xl border transition-all duration-300 shadow-md relative z-10", 
                          isFirst ? cn("border-2 scale-105", activeTheme.tagBorder) : "border-white/15 group-hover/node:scale-105"
                        )}>
                          <AvatarImage key={entry.logoUrl} src={entry.logoUrl || undefined} alt={entry.playerName} className="object-cover" referrerPolicy="no-referrer" />
                          <AvatarFallback className="bg-black/60 font-black text-[9px] sm:text-xs rounded-lg sm:rounded-2xl"><User className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-white/30"/></AvatarFallback>
                        </Avatar>
                      </div>

                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <div className="flex items-center gap-1 sm:gap-2">
                          <span 
                            className={cn(
                              "font-black tracking-tight transition-colors truncate uppercase italic pr-1 font-headline leading-tight", 
                              isFirst ? cn("text-[11px] sm:text-base drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]", activeTheme.primaryText) : "text-[11px] sm:text-sm text-white group-hover/node:text-white"
                            )} 
                            suppressHydrationWarning
                          >
                            {entry.playerName}
                          </span>
                          {isFirst && (
                            <Badge className={cn("border-none text-[7px] sm:text-[8px] px-1 sm:px-1.5 h-3.5 sm:h-4 rounded-full uppercase italic shrink-0 hidden sm:inline-flex shadow-sm", activeTheme.tableLeaderBadge)}>
                              LEADER
                            </Badge>
                          )}
                          {isPromotionZone && (
                            <Badge className="border-none text-[7.5px] px-1.5 h-4 rounded-full uppercase italic shrink-0 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
                              🟢 PROMOSI
                            </Badge>
                          )}
                          {isRelegationZone && hasDivisions && (
                            <Badge className="border-none text-[7.5px] px-1.5 h-4 rounded-full uppercase italic shrink-0 bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                              🔻 DEGRADASI
                            </Badge>
                          )}
                        </div>
                        <div 
                          className="text-[7px] sm:text-[10px] font-black text-white/40 uppercase tracking-wider sm:tracking-[0.15em] truncate pr-2 group-hover/node:text-white/70 transition-colors flex items-center gap-1" 
                          suppressHydrationWarning
                        >
                          <span className={cn("w-1 h-1 rounded-full shrink-0", isFirst ? activeTheme.tableLeaderBadge : "bg-white/20")} />
                          <span className="truncate">{entry.team?.name || entry.teamName || 'Independent'}</span>
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  {/* M (Main / Played) */}
                  <TableCell className="text-center px-1 text-[10px] sm:text-xs font-black text-white/80 tabular-nums font-mono" suppressHydrationWarning>
                    {entry.played}
                  </TableCell>

                  {/* W (Menang / Win) */}
                  <TableCell className="text-center px-1 text-[10px] sm:text-xs font-black text-emerald-400 tabular-nums font-mono" suppressHydrationWarning>
                    {entry.win}
                  </TableCell>

                  {/* S (Seri / Draw) */}
                  <TableCell className="text-center px-1 text-[10px] sm:text-xs font-black text-amber-400 tabular-nums font-mono" suppressHydrationWarning>
                    {entry.draw}
                  </TableCell>

                  {/* K (Kalah / Loss) */}
                  <TableCell className="text-center px-1 text-[10px] sm:text-xs font-black text-rose-400 tabular-nums font-mono" suppressHydrationWarning>
                    {entry.loss}
                  </TableCell>

                  {/* SG (Goal Difference) */}
                  <TableCell 
                    className={cn(
                      "text-center px-1 text-[10px] sm:text-xs font-black tabular-nums font-mono transition-all", 
                      entry.goalDifference > 0 ? cn(activeTheme.primaryText, "drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]") : 
                      (entry.goalDifference < 0 ? "text-rose-400/80" : "text-white/30")
                    )} 
                    suppressHydrationWarning
                  >
                    {entry.goalDifference > 0 ? `+${entry.goalDifference}` : entry.goalDifference}
                  </TableCell>

                  {/* GM (Goals For) */}
                  <TableCell className="hidden md:table-cell text-center px-1 text-[10px] sm:text-xs font-bold text-white/40 tabular-nums font-mono" suppressHydrationWarning>
                    {entry.goalsFor}
                  </TableCell>

                  {/* GA (Goals Against) */}
                  <TableCell className="hidden md:table-cell text-center px-1 text-[10px] sm:text-xs font-bold text-white/40 tabular-nums font-mono" suppressHydrationWarning>
                    {entry.goalsAgainst}
                  </TableCell>

                  {/* FORM (Bentuk 5 Laga) */}
                  <TableCell className="hidden xl:table-cell text-center px-2">
                    <div className="flex justify-center gap-1">
                      {playerForm.length > 0 ? (
                        <TooltipProvider delayDuration={150}>
                          {playerForm.map((formItem, i) => {
                            const res = formItem.result;
                            const isWin = res === 'W';
                            const isLoss = res === 'L';
                            const resultLabel = isWin ? 'Menang' : isLoss ? 'Kalah' : 'Seri';

                            return (
                              <Tooltip key={formItem.matchId ? `${formItem.matchId}-${i}` : i}>
                                <TooltipTrigger asChild>
                                  <div 
                                    className={cn(
                                      "w-5 h-5 sm:w-6 sm:h-6 rounded-lg flex items-center justify-center text-[9px] font-black border transition-all cursor-pointer hover:scale-110", 
                                      isWin ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.3)] hover:bg-emerald-500/30" : 
                                      isLoss ? "bg-rose-500/20 text-rose-400 border-rose-500/40 shadow-[0_0_8px_rgba(244,63,94,0.3)] hover:bg-rose-500/30" : 
                                      "bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-[0_0_8px_rgba(245,158,11,0.3)] hover:bg-amber-500/30"
                                    )}
                                  >
                                    {isWin ? 'M' : isLoss ? 'K' : 'S'}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent 
                                  side="top" 
                                  sideOffset={6}
                                  className="p-2 px-3 bg-zinc-950/95 border border-white/15 backdrop-blur-xl text-white shadow-2xl rounded-xl min-w-[140px] text-left"
                                >
                                  <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-1.5 mb-1.5">
                                    <span className={cn(
                                      "text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded",
                                      isWin ? "bg-emerald-500/20 text-emerald-400" :
                                      isLoss ? "bg-rose-500/20 text-rose-400" :
                                      "bg-amber-500/20 text-amber-400"
                                    )}>
                                      {resultLabel}
                                    </span>
                                    <span className="text-[10px] text-white/40 font-semibold uppercase">
                                      {formItem.isHome ? 'Kandang' : 'Tandang'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {formItem.opponentLogo && (
                                      <Avatar className="w-5 h-5 rounded-md border border-white/10 shrink-0">
                                        <AvatarImage src={formItem.opponentLogo} alt={formItem.opponentName} className="object-contain p-0.5" />
                                        <AvatarFallback className="text-[8px] bg-white/10 font-bold">{formItem.opponentName.slice(0, 2)}</AvatarFallback>
                                      </Avatar>
                                    )}
                                    <div className="flex flex-col min-w-0 flex-1">
                                      <span className="text-[11px] font-bold text-white truncate leading-tight">
                                        vs {formItem.opponentName}
                                      </span>
                                      {formItem.opponentTeamName && (
                                        <span className="text-[9px] text-white/50 truncate">
                                          {formItem.opponentTeamName}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="mt-1.5 pt-1.5 border-t border-white/10 flex items-center justify-between">
                                    <span className="text-[10px] text-white/40 font-mono">Skor</span>
                                    <span className="text-[12px] font-black font-mono tracking-wider text-white">
                                      {formItem.scoreText}
                                    </span>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            );
                          })}
                        </TooltipProvider>
                      ) : (
                        <div className="flex items-center justify-center gap-1 opacity-25">
                          <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
                          <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
                          <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
                          <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
                          <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
                        </div>
                      )}
                    </div>
                  </TableCell>

                  {/* P (Points) */}
                  <TableCell className="text-center px-1 sm:px-3 tabular-nums pr-2 sm:pr-4">
                    <span 
                      className={cn(
                        "inline-block min-w-[2rem] sm:min-w-[3rem] px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg sm:rounded-xl font-black text-xs sm:text-lg italic tabular-nums transition-all duration-300 font-headline", 
                        isFirst ? activeTheme.pointsBadgeLeader : activeTheme.pointsBadge
                      )} 
                      suppressHydrationWarning
                    >
                      {entry.points}
                    </span>
                  </TableCell>

                  {canRemovePlayer && (
                    <TableCell className="hidden sm:table-cell text-right px-2 pr-4">
                      <div className="flex items-center justify-end gap-1.5">
                        {hasDivisions && onToggleDivision && (
                          <Button 
                            type="button"
                            variant="outline" 
                            size="sm" 
                            className="h-8 px-2.5 text-[9px] font-mono font-black uppercase tracking-wider rounded-xl border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition-all flex items-center gap-1" 
                            onClick={() => onToggleDivision(entry)} 
                            title={`Pindahkan ${entry.playerName} ke ${isDivision2 ? (division1Name || 'Divisi 1') : (division2Name || 'Divisi 2')}`}
                          >
                            <span>⇄ {isDivision2 ? (division1Name || 'DIV 1') : (division2Name || 'DIV 2')}</span>
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 hover:bg-rose-500/10 hover:text-rose-400 transition-colors border border-white/5 rounded-xl" 
                          onClick={() => onRemovePlayer?.(entry)} 
                          title={`${t('remove')} ${entry.playerName}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
});

SingleTable.displayName = 'SingleTable';

