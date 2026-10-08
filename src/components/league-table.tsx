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
import { Trash2, User, Trophy, Award, LayoutGrid, Swords, Scan, Activity, Zap, Shield, Info, CheckCircle2, Flame, Binary, Target, ShieldAlert, Radio, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useTranslation } from "@/hooks/use-translation";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { useMemo, useState, memo } from "react";
import { resolveLogo } from "@/lib/logo-utils";
import { TournamentBracket } from "./tournament-bracket";
import { getSeasonTheme, type TISeasonTheme } from "@/lib/season-theme";
import { StandingsShareDialog } from "./standings-share-dialog";
import { KnockoutShareDialog } from "./knockout-share-dialog";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "./ui/tooltip";

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
  onToggleDivision?: (entry: WithId<LeagueEntry>) => void;
  selectedDivision?: 'div-1' | 'div-2';
  onDivisionChange?: (division: 'div-1' | 'div-2') => void;
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

const PlayoffQualificationLegend = ({ 
  seasonType, 
  theme,
  hasDivisions = false,
  isDivision2 = false,
  div1Name = 'Divisi 1',
  div2Name = 'Divisi 2',
  promotionSpots = 2,
  relegationSpots = 2,
  totalPlayers = 0,
}: { 
  seasonType?: Season['type'], 
  theme?: TISeasonTheme,
  hasDivisions?: boolean,
  isDivision2?: boolean,
  div1Name?: string,
  div2Name?: string,
  promotionSpots?: number,
  relegationSpots?: number,
  totalPlayers?: number,
}) => {
  const isSingleHybrid = seasonType === 'Single Hybrid';
  const isCoopHybrid = seasonType === 'Co-Op Hybrid';
  const currentTheme = theme || getSeasonTheme(null);
  const actualPromotionSpots = Math.max(1, promotionSpots || 2);
  const actualRelegationSpots = Math.max(1, relegationSpots || 2);

  if (isDivision2) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 p-2.5 sm:p-4 px-3 sm:px-8 bg-gradient-to-r from-black/95 via-white/[0.02] to-black/95 border-b border-white/10 backdrop-blur-3xl relative overflow-hidden shrink-0">
        <div className="flex items-center gap-2">
          <Scan className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.15em] sm:tracking-[0.25em] text-cyan-400 italic">
            {div2Name.toUpperCase()} • PROMOTION ZONE
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-3">
          <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-lg sm:rounded-xl bg-emerald-500/[0.08] border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.15)]">
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-pulse" />
            <span className="text-[9px] sm:text-[11px] font-black uppercase italic text-emerald-400">
              Zona Promosi ({actualPromotionSpots === 1 ? '#1' : `#1 - #${actualPromotionSpots}`} Promosi ke {div1Name})
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (isSingleHybrid) {
    // Peserta peringkat 1-8 lolos ke Playoff 8 Besar
    // Peringkat 9+ langsung degradasi / gugur
    // Jika kuota degradasi > jumlah tim di luar 8 besar, sisanya diperebutkan di babak Playoff
    const nonPlayoffSpots = Math.max(0, totalPlayers - 8);
    const directRelegationCount = Math.min(actualRelegationSpots, nonPlayoffSpots);
    const playoffRelegationCount = Math.max(0, actualRelegationSpots - directRelegationCount);
    const startDirectRelegationRank = totalPlayers - directRelegationCount + 1;

    return (
      <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 p-2.5 sm:p-4 px-3 sm:px-8 bg-gradient-to-r from-black/95 via-white/[0.02] to-black/95 border-b border-white/10 backdrop-blur-3xl relative overflow-hidden shrink-0">
        <div className="flex items-center gap-2">
          <Scan className={cn("w-3.5 h-3.5 animate-pulse", currentTheme.primaryText)} />
          <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.15em] sm:tracking-[0.25em] text-white/50 italic">
            {currentTheme.editionName} • LEAGUE TABLE
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-3">
          {/* Lolos Playoff 8 Besar (BO3) */}
          <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-lg sm:rounded-xl bg-emerald-500/[0.08] border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.15)]">
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-pulse" />
            <span className="text-[9px] sm:text-[11px] font-black uppercase italic text-emerald-400">
              Playoff 8 Besar <span className="text-white/40 font-normal">(#1 - #8 Bertarung Gelar Juara)</span>
            </span>
          </div>

          {/* Degradasi jika multi divisi, atau gugur */}
          {hasDivisions ? (
            <>
              {directRelegationCount > 0 && (
                <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-lg sm:rounded-xl bg-rose-500/[0.08] border border-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.15)]">
                  <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.9)]" />
                  <span className="text-[9px] sm:text-[11px] font-black uppercase italic text-rose-400">
                    Degradasi Langsung {directRelegationCount === 1 ? `(#${totalPlayers})` : `(#${startDirectRelegationRank} - #${totalPlayers})`}
                  </span>
                </div>
              )}
              {playoffRelegationCount > 0 && (
                <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-lg sm:rounded-xl bg-amber-500/[0.08] border border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.15)]">
                  <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]" />
                  <span className="text-[9px] sm:text-[11px] font-black uppercase italic text-amber-300">
                    +{playoffRelegationCount} Slot Degradasi dari Gugur Playoff
                  </span>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-lg sm:rounded-xl bg-rose-500/[0.08] border border-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.15)]">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.9)]" />
              <span className="text-[9px] sm:text-[11px] font-black uppercase italic text-rose-400">
                Gugur <span className="text-white/40 font-normal">(#9+)</span>
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  const ubText = isCoopHybrid ? "Seed #1 - 4" : "Seed #1 - 2 (Grup)";
  const lbText = isCoopHybrid ? "Seed #5 - 6" : "Seed #3 - 4 (Grup)";
  const elimText = isCoopHybrid ? "Seed #7+" : "Seed #5+ (Grup)";
  const startRelegationRank = Math.max(1, totalPlayers - actualRelegationSpots + 1);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 p-2.5 sm:p-4 px-3 sm:px-8 bg-gradient-to-r from-black/95 via-white/[0.02] to-black/95 border-b border-white/10 backdrop-blur-3xl relative overflow-hidden shrink-0">
      <div className="flex items-center gap-2">
        <Scan className="w-3.5 h-3.5 text-primary animate-pulse" />
        <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.15em] sm:tracking-[0.25em] text-white/50 italic">
          KLASEMEN RESMI • LEAGUE STANDINGS
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 sm:gap-3">
        {/* Upper Bracket */}
        {(seasonType === 'Hybrid' || seasonType === 'Co-Op Hybrid') && (
          <>
            <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-lg sm:rounded-xl bg-emerald-500/[0.08] border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.15)]">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-pulse" />
              <span className="text-[9px] sm:text-[11px] font-black uppercase italic text-emerald-400">
                Playoff Utama <span className="text-white/40 font-normal">({ubText})</span>
              </span>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-lg sm:rounded-xl bg-amber-500/[0.08] border border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.15)]">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)] animate-pulse" />
              <span className="text-[9px] sm:text-[11px] font-black uppercase italic text-amber-400">
                Playoff Contender <span className="text-white/40 font-normal">({lbText})</span>
              </span>
            </div>
          </>
        )}

        {/* Relegation or Eliminasi */}
        {hasDivisions ? (
          <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-lg sm:rounded-xl bg-rose-500/[0.08] border border-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.15)]">
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.9)]" />
            <span className="text-[9px] sm:text-[11px] font-black uppercase italic text-rose-400">
              {seasonType === 'Hybrid'
                ? `Zona Degradasi (${Math.ceil(actualRelegationSpots / 2)} Tiap Grup • Total ${actualRelegationSpots} Turun ke ${div2Name})`
                : totalPlayers > actualRelegationSpots
                  ? `Zona Degradasi (#${startRelegationRank} - #${totalPlayers} • Total ${actualRelegationSpots} Turun ke ${div2Name})`
                  : `Zona Degradasi (Turun ke ${div2Name})`
              }
            </span>
          </div>
        ) : (
          (seasonType === 'Hybrid' || seasonType === 'Co-Op Hybrid') && (
            <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-lg sm:rounded-xl bg-rose-500/[0.08] border border-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.15)]">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.9)]" />
              <span className="text-[9px] sm:text-[11px] font-black uppercase italic text-rose-400">
                Gugur <span className="text-white/40 font-normal">({elimText})</span>
              </span>
            </div>
          )
        )}
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
        <Table className="min-w-full border-collapse">
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b border-white/10 h-11 sm:h-14 bg-black/60 backdrop-blur-md">
              <TableHead className="w-10 sm:w-16 text-center font-black text-white/40 uppercase text-[8px] sm:text-[10px] tracking-[0.15em] sm:tracking-[0.2em] px-1 sm:px-2">
                {t('rank')}
              </TableHead>
              <TableHead className="text-left font-black text-white/40 text-[8px] sm:text-[10px] tracking-[0.15em] sm:tracking-[0.2em] min-w-[130px] sm:min-w-[220px] uppercase pl-2 sm:pl-4">
                {t('player')}
              </TableHead>
              <TableHead className="text-center font-black text-white/40 w-9 sm:w-16 text-[8px] sm:text-[10px] tracking-wider sm:tracking-[0.2em] uppercase px-0.5 sm:px-2">
                {t('played_short')}
              </TableHead>
              <TableHead className="text-center font-black text-emerald-400/80 w-9 sm:w-16 text-[8px] sm:text-[10px] tracking-wider sm:tracking-[0.2em] uppercase px-0.5 sm:px-2">
                {t('w_short')}
              </TableHead>
              <TableHead className="text-center font-black text-amber-400/80 w-9 sm:w-16 text-[8px] sm:text-[10px] tracking-wider sm:tracking-[0.2em] uppercase px-0.5 sm:px-2">
                {t('d_short')}
              </TableHead>
              <TableHead className="text-center font-black text-rose-400/80 w-9 sm:w-16 text-[8px] sm:text-[10px] tracking-wider sm:tracking-[0.2em] uppercase px-0.5 sm:px-2">
                {t('l_short')}
              </TableHead>
              <TableHead className={cn("text-center font-black w-10 sm:w-20 text-[8px] sm:text-[10px] tracking-wider sm:tracking-[0.2em] uppercase px-0.5 sm:px-2", activeTheme.primaryText)}>
                {t('gd_short')}
              </TableHead>
              <TableHead className="hidden md:table-cell text-center font-black text-white/40 w-16 text-[9px] tracking-[0.2em] uppercase">
                {t('gf_short')}
              </TableHead>
              <TableHead className="hidden md:table-cell text-center font-black text-white/40 w-16 text-[9px] tracking-[0.2em] uppercase">
                {t('ga_short')}
              </TableHead>
              <TableHead className="hidden xl:table-cell text-center font-black text-white/40 w-36 text-[9px] tracking-[0.2em] uppercase">
                FORM
              </TableHead>
              <TableHead className={cn("text-center font-black w-14 sm:w-28 text-[8px] sm:text-[10px] tracking-wider sm:tracking-[0.2em] uppercase pr-2 sm:pr-4", activeTheme.primaryText)}>
                {t('pts_short')}
              </TableHead>
              {canRemovePlayer && (
                <TableHead className="hidden sm:table-cell text-right font-black text-rose-400 w-14 text-[9px] tracking-[0.2em] uppercase pr-4">
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
                  <TableCell className="relative overflow-visible py-1.5 sm:py-3 pl-1.5 sm:pl-4">
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
                  <TableCell className="text-center px-0.5 sm:px-2 text-[11px] sm:text-sm font-black text-white/80 tabular-nums font-mono" suppressHydrationWarning>
                    {entry.played}
                  </TableCell>

                  {/* W (Menang / Win) */}
                  <TableCell className="text-center px-0.5 sm:px-2 text-[11px] sm:text-sm font-black text-emerald-400 tabular-nums font-mono" suppressHydrationWarning>
                    {entry.win}
                  </TableCell>

                  {/* S (Seri / Draw) */}
                  <TableCell className="text-center px-0.5 sm:px-2 text-[11px] sm:text-sm font-black text-amber-400 tabular-nums font-mono" suppressHydrationWarning>
                    {entry.draw}
                  </TableCell>

                  {/* K (Kalah / Loss) */}
                  <TableCell className="text-center px-0.5 sm:px-2 text-[11px] sm:text-sm font-black text-rose-400 tabular-nums font-mono" suppressHydrationWarning>
                    {entry.loss}
                  </TableCell>

                  {/* SG (Goal Difference) */}
                  <TableCell 
                    className={cn(
                      "text-center px-0.5 sm:px-2 text-[11px] sm:text-sm font-black tabular-nums font-mono transition-all", 
                      entry.goalDifference > 0 ? cn(activeTheme.primaryText, "drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]") : 
                      (entry.goalDifference < 0 ? "text-rose-400/80" : "text-white/30")
                    )} 
                    suppressHydrationWarning
                  >
                    {entry.goalDifference > 0 ? `+${entry.goalDifference}` : entry.goalDifference}
                  </TableCell>

                  {/* GM (Goals For) */}
                  <TableCell className="hidden md:table-cell text-center px-2 text-xs sm:text-sm font-bold text-white/40 tabular-nums font-mono" suppressHydrationWarning>
                    {entry.goalsFor}
                  </TableCell>

                  {/* GA (Goals Against) */}
                  <TableCell className="hidden md:table-cell text-center px-2 text-xs sm:text-sm font-bold text-white/40 tabular-nums font-mono" suppressHydrationWarning>
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

const TopScorerTable = memo(({ 
    tableData, 
    isLoading, 
    seasonType,
    teamsById,
    theme
}: { 
    tableData: any[], 
    isLoading: boolean, 
    seasonType?: Season['type'],
    teamsById: Record<string, WithId<Team>>,
    theme?: TISeasonTheme
}) => {
    const { t } = useTranslation();
    const currentTheme = theme || getSeasonTheme(null);
    const primaryHex = currentTheme.primaryHex;
    const secondaryHex = currentTheme.secondaryHex;
    const glowRgba = currentTheme.glowRgba;

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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-5xl mx-auto px-2 sm:px-4">
                {predator ? (
                    <Card 
                        className="relative overflow-hidden border-2 sm:border-4 rounded-2xl sm:rounded-[2rem] p-4 sm:p-8 group/pred-card hover:border-white transition-all duration-500 animate-in fade-in zoom-in-95"
                        style={{
                            borderColor: primaryHex,
                            backgroundColor: `${primaryHex}0A`,
                            boxShadow: `0 0 60px ${primaryHex}25`
                        }}
                    >
                         <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:25px_25px] pointer-events-none" />
                         <div className="absolute -bottom-10 -right-10 w-72 h-72 opacity-[0.08] pointer-events-none z-0" style={{ color: primaryHex }}>
                            <Flame className="w-full h-full animate-float fill-current" />
                         </div>
                         <div className="flex flex-col items-center justify-center mb-6 sm:mb-8 relative z-20">
                            <div className="relative group/badge">
                                <div 
                                    className="absolute -inset-6 blur-3xl opacity-0 group-hover/badge:opacity-100 transition-opacity animate-pulse" 
                                    style={{ backgroundColor: `${primaryHex}33` }}
                                />
                                <div className="relative flex flex-col items-center">
                                    <Badge 
                                        className="font-black italic text-xs sm:text-lg px-6 sm:px-12 h-8 sm:h-10 tracking-[0.25em] sm:tracking-[0.4em] -skew-x-[20deg] shadow-[8px_8px_0px_rgba(0,0,0,0.5)] border-r-4 border-black mb-2 sm:mb-3 rounded-none"
                                        style={{
                                            backgroundColor: primaryHex,
                                            color: currentTheme.themeKey === 'crimson' ? '#ffffff' : '#000000',
                                            boxShadow: `0 0 25px ${glowRgba}`
                                        }}
                                    >
                                        PREDATOR
                                    </Badge>
                                    <div className="flex items-center gap-2">
                                        <div className="h-1 w-8 sm:w-12" style={{ backgroundColor: primaryHex }} />
                                        <span 
                                            className="text-[7px] font-black uppercase tracking-[0.3em] sm:tracking-[0.4em] animate-pulse"
                                            style={{ color: primaryHex }}
                                        >
                                            TOP SCORER // GOLDEN BOOT
                                        </span>
                                        <div className="h-1 w-8 sm:w-12" style={{ backgroundColor: primaryHex }} />
                                    </div>
                                </div>
                            </div>
                         </div>
                         <div className="flex items-center gap-3.5 sm:gap-6 relative z-20">
                            <div className="relative shrink-0">
                                <div 
                                    className="absolute -inset-1 rounded-full blur opacity-20 group-hover/pred-card:opacity-60 transition-opacity" 
                                    style={{ backgroundColor: primaryHex }}
                                />
                                <Avatar 
                                    className="h-16 w-16 sm:h-24 sm:w-24 border-2 sm:border-4 shadow-2xl group-hover/pred-card:scale-105 transition-all duration-500"
                                    style={{ borderColor: primaryHex }}
                                >
                                    <AvatarImage src={predator.logoUrl} className="object-cover" referrerPolicy="no-referrer" />
                                    <AvatarFallback className="bg-black/40"><User className="w-8 h-8 sm:w-12 sm:h-12 text-white/20"/></AvatarFallback>
                                </Avatar>
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="text-lg sm:text-3xl font-black text-white uppercase italic tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.2)] leading-tight pr-2" suppressHydrationWarning>{predator.name}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                    <div className="w-2 h-2 rounded-full animate-ping" style={{ backgroundColor: primaryHex }} />
                                    <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest truncate" style={{ color: `${primaryHex}CC` }} suppressHydrationWarning>{predator.teamName}</p>
                                </div>
                            </div>
                            <div className="text-right flex flex-col items-end shrink-0">
                                <div className="relative">
                                    <span 
                                        className="text-4xl sm:text-7xl font-black italic tabular-nums leading-none" 
                                        style={{ 
                                            color: primaryHex,
                                            textShadow: `0 0 20px ${glowRgba}`
                                        }} 
                                        suppressHydrationWarning
                                    >
                                        {predator.goals}
                                    </span>
                                </div>
                                <p 
                                    className="text-[8px] sm:text-xs font-black uppercase tracking-widest mt-1 text-right" 
                                    style={{ color: primaryHex }} 
                                    suppressHydrationWarning
                                >
                                    GOL MUSIM INI
                                </p>
                            </div>
                         </div>
                         <div className="mt-6 sm:mt-8 flex items-center justify-between border-t pt-3 sm:pt-4" style={{ borderColor: `${primaryHex}33` }}>
                            <div className="flex items-center gap-2">
                                <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-pulse" style={{ color: primaryHex }} />
                                <span className="text-[7px] sm:text-[8px] font-black text-white/40 uppercase">RATING PERFORMA</span>
                            </div>
                            <span className="text-[7px] sm:text-[8px] font-black uppercase tracking-wider" style={{ color: primaryHex }}>PERFORMA: ON FIRE</span>
                         </div>
                    </Card>
                ) : (
                    <Card className="relative overflow-hidden border-2 sm:border-4 border-dashed border-white/10 bg-black/40 rounded-2xl sm:rounded-[2rem] p-6 sm:p-8 flex flex-col items-center justify-center">
                        <Flame className="w-10 h-10 sm:w-12 sm:h-12 text-white/10 mb-2" />
                        <p className="text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] text-white/40 italic">AWAITING FIRST GOAL SCORER</p>
                    </Card>
                )}

                {mainPedofil ? (
                    <Card className="relative overflow-hidden border-2 sm:border-4 border-red-600 bg-red-950/10 rounded-2xl sm:rounded-[2rem] p-4 sm:p-8 shadow-[0_0_80px_rgba(220,38,38,0.15)] group/ped-card hover:border-white transition-all duration-500 animate-in fade-in zoom-in-95">
                          <div className="absolute inset-0 bg-[linear-gradient(rgba(220,38,38,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(220,38,38,0.02)_1px,transparent_1px)] bg-[size:25px_25px] pointer-events-none" />
                          <div className="absolute -bottom-10 -right-10 w-72 h-72 text-red-600 opacity-[0.05] pointer-events-none z-0">
                             <ShieldAlert className="w-full h-full animate-pulse fill-current" />
                          </div>
                          <div className="flex flex-col items-center justify-center mb-6 sm:mb-8 relative z-20">
                             <div className="relative group/badge">
                                 <div className="absolute -inset-6 bg-red-600/20 blur-3xl opacity-0 group-hover/badge:opacity-100 transition-opacity animate-pulse" />
                                 <div className="relative flex flex-col items-center">
                                     <Badge className="bg-red-600 text-white font-black italic text-xs sm:text-lg px-6 sm:px-12 h-8 sm:h-10 tracking-[0.25em] sm:tracking-[0.4em] -skew-x-[20deg] shadow-[8px_8px_0px_rgba(220,38,38,0.2)] border-r-4 border-black mb-2 sm:mb-3 rounded-none">
                                         PEDOFIL
                                     </Badge>
                                     <div className="flex items-center gap-2">
                                         <div className="h-1 w-8 sm:w-12 bg-red-600" />
                                         <span className="text-[7px] font-black text-red-500 uppercase tracking-[0.3em] sm:tracking-[0.4em] animate-pulse">
                                           {mainPedofil.goals === 0 ? 'MANDUL GOL' : 'MINIM GOL'}
                                         </span>
                                         <div className="h-1 w-8 sm:w-12 bg-red-600" />
                                     </div>
                                 </div>
                             </div>
                          </div>
                          <div className="flex items-center gap-3.5 sm:gap-6 relative z-20">
                              <div className="relative shrink-0">
                                  <div className="absolute -inset-1 bg-red-600 rounded-full blur opacity-20 group-hover/ped-card:opacity-60 transition-opacity" />
                                  <Avatar className="h-16 w-16 sm:h-24 sm:w-24 border-2 sm:border-4 border-red-600 shadow-2xl group-hover/ped-card:scale-105 transition-all duration-500">
                                      <AvatarImage src={mainPedofil.logoUrl} className="object-cover" referrerPolicy="no-referrer" />
                                      <AvatarFallback className="bg-black/40"><User className="w-8 h-8 sm:w-12 sm:h-12 text-white/20"/></AvatarFallback>
                                  </Avatar>
                              </div>
                              <div className="flex-1 min-w-0">
                                  <h4 className="text-lg sm:text-3xl font-black text-white uppercase italic tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.2)] leading-tight pr-2" suppressHydrationWarning>{mainPedofil.name}</h4>
                                  <div className="flex items-center gap-2 mt-1">
                                     <div className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
                                     <p className="text-[9px] sm:text-[10px] font-black text-red-500/80 uppercase tracking-widest truncate" suppressHydrationWarning>{mainPedofil.teamName}</p>
                                  </div>
                              </div>
                              <div className="text-right flex flex-col items-end shrink-0">
                                  <div className="relative flex items-center justify-end">
                                     <span 
                                        className="text-4xl sm:text-7xl font-black italic text-red-600 tabular-nums leading-none"
                                        style={{
                                            textShadow: '0 0 25px rgba(220, 38, 38, 0.7), 0 0 50px rgba(220, 38, 38, 0.3)'
                                        }}
                                        suppressHydrationWarning
                                     >
                                        {mainPedofil.goals}
                                     </span>
                                  </div>
                                  <p className="text-[8px] sm:text-xs font-black text-red-500 uppercase tracking-widest mt-1 text-right drop-shadow-[0_0_10px_rgba(239,68,68,0.4)]" suppressHydrationWarning>
                                    {mainPedofil.goals === 0 ? `${mainPedofil.played} LAGA MANDUL` : `${mainPedofil.played} LAGA MINIM`}
                                  </p>
                              </div>
                          </div>
                          <div className="mt-6 sm:mt-8 flex items-center justify-between border-t border-red-600/30 pt-3 sm:pt-4">
                             <div className="flex items-center gap-2">
                                 <ShieldAlert className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-600 animate-pulse" />
                                 <span className="text-[7px] sm:text-[8px] font-black text-red-500/60 uppercase">EFEKTIVITAS RENDAH</span>
                             </div>
                             <span className="text-[8px] font-black text-red-500/40">STATISTIK: COLD FORM</span>
                          </div>
                     </Card>
                 ) : (
                     <Card 
                        className="relative overflow-hidden border-2 sm:border-4 bg-black/40 rounded-2xl sm:rounded-[2rem] p-8 flex flex-col items-center justify-center transition-all duration-700"
                        style={{
                            borderColor: `${primaryHex}35`,
                            boxShadow: `0 0 40px ${primaryHex}15`
                        }}
                     >
                          <div className="flex flex-col items-center gap-4 relative z-10">
                              <div 
                                className="p-4 rounded-full border-2"
                                style={{
                                    backgroundColor: `${primaryHex}15`,
                                    borderColor: `${primaryHex}40`,
                                    boxShadow: `0 0 30px ${glowRgba}`
                                }}
                              >
                                  <CheckCircle2 className="w-10 h-10 animate-pulse" style={{ color: primaryHex }} />
                              </div>
                              <div className="space-y-1 text-center">
                                  <p className="text-[11px] font-black uppercase tracking-[0.4em] italic" style={{ color: `${primaryHex}BB` }}>BELUM ADA DATA PEMAIN</p>
                                  <p className="text-[8px] font-bold text-white/30 uppercase tracking-[0.3em]">MENUNGGU HASIL PERTANDINGAN LIGA</p>
                              </div>
                          </div>
                          <div className="absolute bottom-4 right-6 flex items-center gap-1.5 opacity-30">
                              <Radio className="w-3 h-3" style={{ color: primaryHex }} />
                              <span className="text-[7px] font-black text-white uppercase">STATUS LIGA AKTIF</span>
                          </div>
                     </Card>
                 )}
            </div>

            <div className="max-w-4xl mx-auto w-full overflow-hidden border-2 border-white/10 rounded-2xl sm:rounded-[2.5rem] bg-black/40 shadow-2xl relative">
                <div 
                    className="p-5 border-b border-white/10 flex items-center justify-between"
                    style={{
                        background: `linear-gradient(to right, ${primaryHex}20, rgba(0,0,0,0.4), transparent)`
                    }}
                >
                    <div className="flex items-center gap-2">
                        <Binary className="w-4 h-4" style={{ color: primaryHex }} />
                        <h4 className="text-xs font-black uppercase tracking-widest italic" style={{ color: primaryHex }}>DAFTAR PENCETAK GOL LIGA</h4>
                    </div>
                    <span className="text-[9px] font-bold text-white/30">URUTKAN: JUMLAH GOL TERBANYAK</span>
                </div>
                <div className="overflow-x-auto scrollbar-ultra-sport">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-b border-white/10 hover:bg-transparent h-12 bg-black/60">
                                <TableHead className="w-16 text-center font-black text-[10px] uppercase" style={{ color: primaryHex }}>RANK</TableHead>
                                <TableHead className="text-left font-black text-[10px] uppercase" style={{ color: primaryHex }}>ATHLETE / ROSTER</TableHead>
                                <TableHead className="text-center font-black text-[10px] uppercase w-28" style={{ color: primaryHex }}>GOAL COUNT</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {topScorers.map((scorer) => {
                                const isRank1 = scorer.rank === 1;
                                const hasGoals = scorer.goals > 0;
                                return (
                                    <TableRow 
                                        key={scorer.id} 
                                        className="h-16 transition-all border-b border-white/5 group/row hover:bg-white/[0.03]"
                                        style={isRank1 && hasGoals ? {
                                            backgroundColor: `${primaryHex}10`
                                        } : undefined}
                                    >
                                        <TableCell className="text-center font-black text-base sm:text-xl italic">
                                            <span 
                                                className="inline-flex items-center justify-center w-8 h-8 rounded-xl transition-all" 
                                                style={isRank1 && hasGoals ? {
                                                    backgroundColor: primaryHex,
                                                    color: currentTheme.themeKey === 'crimson' ? '#ffffff' : '#000000',
                                                    boxShadow: `0 0 18px ${glowRgba}`
                                                } : undefined}
                                                suppressHydrationWarning
                                            >
                                                {scorer.rank}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar 
                                                    className="h-10 w-10 border border-white/10 rounded-xl transition-colors"
                                                    style={isRank1 && hasGoals ? { borderColor: primaryHex } : undefined}
                                                >
                                                    <AvatarImage src={scorer.logoUrl} className="object-cover" referrerPolicy="no-referrer" />
                                                    <AvatarFallback className="bg-black/60 font-black text-xs">{scorer.name[0]}</AvatarFallback>
                                                </Avatar>
                                                <div className="flex flex-col">
                                                    <span 
                                                        className="font-black uppercase italic tracking-tight text-sm transition-colors" 
                                                        style={isRank1 && hasGoals ? { color: primaryHex } : undefined}
                                                        suppressHydrationWarning
                                                    >
                                                        {scorer.name}
                                                    </span>
                                                    <span 
                                                        className="text-[8px] sm:text-[11px] font-black uppercase tracking-widest mt-1 text-white/30" 
                                                        style={isRank1 && hasGoals ? { color: `${primaryHex}99` } : undefined}
                                                        suppressHydrationWarning
                                                    >
                                                        {scorer.teamName}
                                                    </span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell 
                                            className="text-center font-black text-2xl sm:text-4xl italic tabular-nums transition-all" 
                                            style={isRank1 && hasGoals ? { 
                                                color: primaryHex,
                                                textShadow: `0 0 20px ${glowRgba}`
                                            } : hasGoals ? {
                                                color: 'rgba(255,255,255,0.8)'
                                            } : {
                                                color: 'rgba(255,255,255,0.2)'
                                            }}
                                            suppressHydrationWarning
                                        >
                                            {scorer.goals}
                                        </TableCell>
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
    onRevertMatch,
    onToggleDivision,
    selectedDivision: propSelectedDivision,
    onDivisionChange,
}: LeagueTableProps) {
  const { t } = useTranslation();
  const theme = useMemo(() => getSeasonTheme(activeSeason), [activeSeason]);
  const [isShareStandingsOpen, setIsShareStandingsOpen] = useState(false);
  const [isShareKnockoutOpen, setIsShareKnockoutOpen] = useState(false);
  
  const [internalDivision, setInternalDivision] = useState<'div-1' | 'div-2'>('div-1');
  const selectedDivision = propSelectedDivision !== undefined ? propSelectedDivision : internalDivision;
  const setSelectedDivision = (div: 'div-1' | 'div-2') => {
    setInternalDivision(div);
    onDivisionChange?.(div);
    if (div === 'div-2') {
      if (activeTab === 'group_a' || activeTab === 'group_b' || activeTab === 'playoff') {
        onTabChange?.('standings');
      }
    } else {
      const isD1Hybrid = activeSeason?.type === 'Hybrid';
      if (isD1Hybrid && activeTab === 'standings') {
        onTabChange?.('group_a');
      }
    }
  };

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

  const hasDivisions = !!activeSeason?.hasDivisions;
  const isMerged = !!activeSeason?.isDiv2Merged;

  const div1Entries = useMemo(() => enrichedTableData.filter(e => e.division !== 'div-2'), [enrichedTableData]);
  const div2Entries = useMemo(() => enrichedTableData.filter(e => e.division === 'div-2'), [enrichedTableData]);

  // Is multi-division actively split? (Has divisions enabled, not merged, and div2 has >= 3 players)
  const isMultiDivisionActive = hasDivisions && !isMerged && div2Entries.length >= 3;

  // The active enriched entries for display
  const currentDisplayData = useMemo(() => {
    if (!isMultiDivisionActive) return enrichedTableData;
    return selectedDivision === 'div-1' ? div1Entries : div2Entries;
  }, [isMultiDivisionActive, selectedDivision, div1Entries, div2Entries, enrichedTableData]);

  // Sort current display entries
  const sortedCurrentData = useMemo(() => {
    const sortFn = (a: any, b: any) => b.points - a.points || (b.goalDifference || 0) - (a.goalDifference || 0) || (b.goalsFor || 0) - (a.goalsFor || 0) || (b.win || 0) - (a.win || 0);
    return [...currentDisplayData].sort(sortFn).map((entry, index) => ({ ...entry, rank: index + 1 }));
  }, [currentDisplayData]);

  // Active format for the selected division
  const currentFormat = useMemo(() => {
    if (isMultiDivisionActive && selectedDivision === 'div-2') {
      if (activeSeason?.division2HasPlayoff === false) {
        return 'Single';
      }
      return activeSeason?.division2Format || 'Single';
    }
    return seasonType || 'Single';
  }, [isMultiDivisionActive, selectedDivision, activeSeason, seasonType]);

  const matchesForDivision = useMemo(() => {
    if (!isMultiDivisionActive) return matches;
    return matches.filter(m => m.division === selectedDivision || (!m.division && selectedDivision === 'div-1'));
  }, [matches, isMultiDivisionActive, selectedDivision]);

  const isStandardHybrid = currentFormat === 'Hybrid';
  const isCoopHybrid = currentFormat === 'Co-Op Hybrid';
  const isSingleHybrid = currentFormat === 'Single Hybrid';
  const isAnyHybrid = isStandardHybrid || isCoopHybrid || isSingleHybrid;

  const { groupA, groupB } = useMemo(() => {
    if (!isStandardHybrid) return { groupA: [], groupB: [] };
    const sortFn = (a: any, b: any) => b.points - a.points || (b.goalDifference || 0) - (a.goalDifference || 0) || (b.goalsFor || 0) - (a.goalsFor || 0) || (b.win || 0) - (a.win || 0);
    
    // Separate players with assigned group and unassigned players
    const explicitA = currentDisplayData.filter(p => p.group === 'A');
    const explicitB = currentDisplayData.filter(p => p.group === 'B');
    const unassigned = currentDisplayData.filter(p => p.group !== 'A' && p.group !== 'B');

    const fullA = [...explicitA];
    const fullB = [...explicitB];

    // Distribute unassigned players so no player is missing from the group view
    unassigned.forEach(p => {
      if (fullA.length <= fullB.length) {
        fullA.push({ ...p, group: 'A' });
      } else {
        fullB.push({ ...p, group: 'B' });
      }
    });

    const a = fullA.sort(sortFn).map((entry, index) => ({...entry, rank: index + 1}));
    const b = fullB.sort(sortFn).map((entry, index) => ({...entry, rank: index + 1}));
    return { groupA: a, groupB: b };
  }, [currentDisplayData, isStandardHybrid]);

  if (isLoading) return <LeagueTableSkeleton isCoop={seasonType === 'Co-Op' || seasonType === 'Co-Op Hybrid'} />;
  if (tableData.length === 0) {
    return (
      <div className={cn("max-w-md sm:max-w-lg mx-auto overflow-hidden rounded-2xl sm:rounded-[2rem] border-2 border-dashed bg-black/60 p-8 sm:p-12 text-center backdrop-blur-2xl relative shadow-2xl transition-all", theme.tableCardBorder)}>
        <div className={cn("absolute top-0 left-0 right-0 h-[2px]", theme.tableTopTracer)} />
        <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center mx-auto mb-4">
          <LayoutGrid className={cn("w-7 h-7", theme.primaryText)} />
        </div>
        <Badge className={cn("mb-2 uppercase text-[7.5px] font-black tracking-widest", theme.badgeClass)}>
          {theme.editionName}
        </Badge>
        <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wider">{t('no_players_registered_title')}</h2>
        <p className="text-[11px] font-bold text-white/40 mt-1.5 uppercase tracking-normal">{t('no_players_registered_desc')}</p>
      </div>
    );
  }
  
  const isSeasonCoop = (seasonType === 'Co-Op' || seasonType === 'Co-Op Hybrid') && (!isMultiDivisionActive || selectedDivision === 'div-1');

  return (
    <div className={cn(
        "w-full overflow-hidden rounded-2xl sm:rounded-[2.5rem] border bg-gradient-to-b from-black/95 via-black/90 to-[#070B14]/95 backdrop-blur-3xl relative aero-card transition-all duration-500",
        theme.tableCardBorder,
        theme.tableCardGlow
    )}>
        {/* Top Accent TI Theme Tracer */}
        <div className={cn("absolute top-0 left-0 right-0 h-[2.5px] z-20 pointer-events-none", theme.tableTopTracer)} />

        {/* Multi-Division Auto-Merge Notification Banner */}
        {hasDivisions && (isMerged || (div2Entries.length > 0 && div2Entries.length <= 2)) && (
          <div className="p-3 sm:p-4 bg-amber-500/[0.08] border-b border-amber-500/30 flex items-center justify-between gap-3 text-amber-300">
            <div className="flex items-center gap-2.5">
              <Info className="w-4 h-4 shrink-0 text-amber-400 animate-pulse" />
              <span className="text-[10px] sm:text-xs font-mono font-bold">
                REGULASI MULTI-DIVISI: Divisi 2 dimerge ke Divisi 1 karena peserta &lt; 3 atlet ({div2Entries.length || 0} atlet). Seluruh peserta bertanding di Divisi 1.
              </span>
            </div>
            <Badge variant="outline" className="border-amber-400/40 bg-amber-400/10 text-amber-300 text-[8px] font-mono uppercase tracking-wider shrink-0 hidden sm:inline-flex">
              MERGED TO DIV 1
            </Badge>
          </div>
        )}

        {/* Multi-Division Switcher Pill Dock (Opsi 1) */}
        {isMultiDivisionActive && (
          <div className="p-3 sm:p-4 bg-gradient-to-r from-black via-white/[0.02] to-black border-b border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center p-1 rounded-2xl bg-white/[0.04] border border-white/10 w-full sm:w-auto gap-1.5 shadow-inner">
              <button
                type="button"
                onClick={() => setSelectedDivision('div-1')}
                className={cn(
                  "flex-1 sm:flex-initial h-10 sm:h-12 px-4 sm:px-6 rounded-xl font-headline font-black text-xs uppercase tracking-wider italic flex items-center justify-center gap-2 transition-all border cursor-pointer",
                  selectedDivision === 'div-1'
                    ? "bg-primary text-black border-primary shadow-[0_0_25px_rgba(204,253,1,0.45)]"
                    : "bg-transparent text-white/50 border-transparent hover:text-white hover:bg-white/[0.04]"
                )}
              >
                <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>{activeSeason?.division1Name || 'DIVISI 1'}</span>
                <span className={cn(
                  "text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full",
                  selectedDivision === 'div-1' ? "bg-black/25 text-black" : "bg-white/10 text-white/50"
                )}>
                  {div1Entries.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedDivision('div-2')}
                className={cn(
                  "flex-1 sm:flex-initial h-10 sm:h-12 px-4 sm:px-6 rounded-xl font-headline font-black text-xs uppercase tracking-wider italic flex items-center justify-center gap-2 transition-all border cursor-pointer",
                  selectedDivision === 'div-2'
                    ? "bg-cyan-400 text-black border-cyan-400 shadow-[0_0_25px_rgba(34,211,238,0.45)]"
                    : "bg-transparent text-white/50 border-transparent hover:text-white hover:bg-white/[0.04]"
                )}
              >
                <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>{activeSeason?.division2Name || 'DIVISI 2'}</span>
                <span className={cn(
                  "text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full",
                  selectedDivision === 'div-2' ? "bg-black/25 text-black" : "bg-white/10 text-white/50"
                )}>
                  {div2Entries.length}
                </span>
              </button>
            </div>

            <div className="flex items-center gap-2 text-[9px] font-mono text-white/40 uppercase tracking-widest px-2">
              <Zap className="w-3 h-3 text-primary animate-pulse" />
              <span>SISTEM 2 DIVISI // {selectedDivision === 'div-1' ? (activeSeason?.division1Name || 'DIVISI 1') : (activeSeason?.division2Name || 'DIVISI 2')}</span>
            </div>
          </div>
        )}

        {/* Legend */}
        {activeTab !== 'playoff' && (
          <PlayoffQualificationLegend 
            seasonType={currentFormat} 
            theme={theme} 
            hasDivisions={hasDivisions && !isMerged}
            isDivision2={isMultiDivisionActive && selectedDivision === 'div-2'}
            div1Name={activeSeason?.division1Name || 'Divisi 1'}
            div2Name={activeSeason?.division2Name || 'Divisi 2'}
            promotionSpots={activeSeason?.promotionSpots ?? 2}
            relegationSpots={activeSeason?.relegationSpots ?? 2}
            totalPlayers={sortedCurrentData.length}
          />
        )}
        
        {isSeasonCoop ? (
             <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
                <div className="p-3 sm:p-4 bg-gradient-to-r from-black/95 via-black/80 to-black/95 border-b border-white/10 backdrop-blur-3xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <TabsList className={cn("grid flex-1 h-12 sm:h-14 p-1.5 bg-white/[0.03] border border-white/10 rounded-2xl sm:rounded-full backdrop-blur-2xl gap-2", isCoopHybrid ? "grid-cols-3" : "grid-cols-2")}>
                      <TabsTrigger value="standings" className={cn("relative h-full font-black uppercase tracking-[0.2em] text-[10px] sm:text-xs italic transition-all duration-300 rounded-xl sm:rounded-full text-white/50 hover:text-white", theme.tabsActiveBg)}>
                          <span className="flex items-center justify-center gap-2"><Scan className="w-4 h-4" />Klasemen</span>
                      </TabsTrigger>
                      <TabsTrigger value="topskor" className={cn("relative h-full font-black uppercase tracking-[0.2em] text-[10px] sm:text-xs italic transition-all duration-300 rounded-xl sm:rounded-full text-white/50 hover:text-white", theme.tabsActiveTopSkor)}>
                          <span className="flex items-center justify-center gap-2"><Flame className="w-4 h-4" />Top Skor</span>
                      </TabsTrigger>
                      {isCoopHybrid && (
                          <TabsTrigger value="playoff" className={cn("relative h-full font-black uppercase tracking-[0.2em] text-[10px] sm:text-xs italic transition-all duration-300 rounded-xl sm:rounded-full text-white/50 hover:text-white", theme.tabsActivePlayoff)}>
                              <span className="flex items-center justify-center gap-2"><Swords className="w-4 h-4" />Playoff</span>
                          </TabsTrigger>
                      )}
                  </TabsList>
                  <div className="flex items-center gap-2 shrink-0 justify-end">
                    {activeTab === 'playoff' ? (
                      <Button
                        type="button"
                        onClick={() => setIsShareKnockoutOpen(true)}
                        className="h-11 sm:h-14 px-4 sm:px-6 rounded-xl sm:rounded-full font-black text-xs uppercase tracking-wider italic bg-amber-400 hover:bg-amber-300 text-black shadow-[0_0_20px_rgba(251,191,36,0.35)] transition-all flex items-center gap-2 border border-amber-300/60 active:scale-95"
                      >
                        <Share2 className="w-4 h-4" />
                        <span>Share Bagan</span>
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        onClick={() => setIsShareStandingsOpen(true)}
                        className="h-11 sm:h-14 px-4 sm:px-6 rounded-xl sm:rounded-full font-black text-xs uppercase tracking-wider italic transition-all flex items-center gap-2 border active:scale-95"
                        style={{
                          backgroundColor: theme.primaryHex,
                          color: theme.themeKey === 'crimson' ? '#ffffff' : '#000000',
                          borderColor: `${theme.primaryHex}60`,
                          boxShadow: `0 0 20px ${theme.glowRgba}`,
                        }}
                      >
                        <Share2 className="w-4 h-4" />
                        <span>Share Klasemen</span>
                      </Button>
                    )}
                  </div>
                </div>
                <TabsContent value="standings" className="mt-0">
                  <SingleTable 
                    tableData={sortedCurrentData} 
                    isCoop={true} 
                    totalPlayers={sortedCurrentData.length} 
                    onSelectPlayer={onSelectPlayer} 
                    seasonType={currentFormat} 
                    isLoading={isLoading} 
                    onRemovePlayer={onRemovePlayer} 
                    onToggleDivision={onToggleDivision}
                    seasonStatus={seasonStatus} 
                    isAdmin={isAdmin} 
                    defendingChampionId={defendingChampionId} 
                    matches={matchesForDivision} 
                    theme={theme} 
                    playersById={playersById} 
                    teamsById={teamsById} 
                    hasDivisions={hasDivisions && !isMerged}
                    isDivision2={isMultiDivisionActive && selectedDivision === 'div-2'}
                    division1Name={activeSeason?.division1Name || 'Divisi 1'}
                    division2Name={activeSeason?.division2Name || 'Divisi 2'}
                    promotionSpots={activeSeason?.promotionSpots ?? 2}
                    relegationSpots={activeSeason?.relegationSpots ?? 2}
                  />
                </TabsContent>
                <TabsContent value="topskor" className="mt-0 py-10">
                  <TopScorerTable tableData={currentDisplayData} isLoading={isLoading} seasonType={currentFormat} teamsById={teamsById} theme={theme} />
                </TabsContent>
                {isCoopHybrid && (
                    <TabsContent value="playoff" className="mt-0 p-1 sm:p-2 xl:p-4 w-full">
                        <TournamentBracket 
                            matches={matchesForDivision}
                            playersById={playersById}
                            teamsById={teamsById}
                            leagueTable={sortedCurrentData}
                            season={activeSeason || null}
                            isAdmin={isAdmin}
                            defendingChampionId={defendingChampionId}
                            onRevertMatch={onRevertMatch}
                        />
                    </TabsContent>
                )}
             </Tabs>
        ) : (
            isSingleHybrid ? (
                <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
                    <div className="p-3 sm:p-4 bg-gradient-to-r from-black/95 via-black/80 to-black/95 border-b border-white/10 backdrop-blur-3xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                      <TabsList className="grid flex-1 grid-cols-3 h-12 sm:h-14 p-1.5 bg-white/[0.03] border border-white/10 rounded-2xl sm:rounded-full backdrop-blur-2xl gap-2">
                          <TabsTrigger value="standings" className={cn("relative h-full font-black uppercase tracking-[0.2em] text-[10px] sm:text-xs italic transition-all duration-300 rounded-xl sm:rounded-full text-white/50 hover:text-white", theme.tabsActiveBg)}>
                              <span className="flex items-center justify-center gap-2"><Scan className="w-4 h-4" />Klasemen</span>
                          </TabsTrigger>
                          <TabsTrigger value="topskor" className={cn("relative h-full font-black uppercase tracking-[0.2em] text-[10px] sm:text-xs italic transition-all duration-300 rounded-xl sm:rounded-full text-white/50 hover:text-white", theme.tabsActiveTopSkor)}>
                              <span className="flex items-center justify-center gap-2"><Flame className="w-4 h-4" />Top Skor</span>
                          </TabsTrigger>
                          <TabsTrigger value="playoff" className={cn("relative h-full font-black uppercase tracking-[0.2em] text-[10px] sm:text-xs italic transition-all duration-300 rounded-xl sm:rounded-full text-white/50 hover:text-white", theme.tabsActivePlayoff)}>
                              <span className="flex items-center justify-center gap-2"><Swords className="w-4 h-4" />Playoff</span>
                          </TabsTrigger>
                      </TabsList>
                      <div className="flex items-center gap-2 shrink-0 justify-end">
                        {activeTab === 'playoff' ? (
                          <Button
                            type="button"
                            onClick={() => setIsShareKnockoutOpen(true)}
                            className="h-11 sm:h-14 px-4 sm:px-6 rounded-xl sm:rounded-full font-black text-xs uppercase tracking-wider italic bg-amber-400 hover:bg-amber-300 text-black shadow-[0_0_20px_rgba(251,191,36,0.35)] transition-all flex items-center gap-2 border border-amber-300/60 active:scale-95"
                          >
                            <Share2 className="w-4 h-4" />
                            <span>Share Bagan</span>
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            onClick={() => setIsShareStandingsOpen(true)}
                            className="h-11 sm:h-14 px-4 sm:px-6 rounded-xl sm:rounded-full font-black text-xs uppercase tracking-wider italic transition-all flex items-center gap-2 border active:scale-95"
                            style={{
                              backgroundColor: theme.primaryHex,
                              color: theme.themeKey === 'crimson' ? '#ffffff' : '#000000',
                              borderColor: `${theme.primaryHex}60`,
                              boxShadow: `0 0 20px ${theme.glowRgba}`,
                            }}
                          >
                            <Share2 className="w-4 h-4" />
                            <span>Share Klasemen</span>
                          </Button>
                        )}
                      </div>
                    </div>
                    <TabsContent value="standings" className="mt-0">
                        <SingleTable 
                          tableData={sortedCurrentData} 
                          isCoop={false} 
                          totalPlayers={sortedCurrentData.length} 
                          onSelectPlayer={onSelectPlayer} 
                          seasonType={currentFormat} 
                          isLoading={isLoading} 
                          onRemovePlayer={onRemovePlayer} 
                          onToggleDivision={onToggleDivision}
                          seasonStatus={seasonStatus} 
                          isAdmin={isAdmin} 
                          defendingChampionId={defendingChampionId} 
                          matches={matchesForDivision} 
                          theme={theme} 
                          playersById={playersById} 
                          teamsById={teamsById} 
                          hasDivisions={hasDivisions && !isMerged}
                          isDivision2={isMultiDivisionActive && selectedDivision === 'div-2'}
                          division1Name={activeSeason?.division1Name || 'Divisi 1'}
                          division2Name={activeSeason?.division2Name || 'Divisi 2'}
                          promotionSpots={activeSeason?.promotionSpots ?? 2}
                          relegationSpots={activeSeason?.relegationSpots ?? 2}
                        />
                    </TabsContent>
                    <TabsContent value="topskor" className="mt-0 py-10">
                        <TopScorerTable tableData={currentDisplayData} isLoading={isLoading} seasonType={currentFormat} teamsById={teamsById} theme={theme} />
                    </TabsContent>
                    <TabsContent value="playoff" className="mt-0 p-1 sm:p-2 xl:p-4 w-full">
                        <TournamentBracket 
                            matches={matchesForDivision}
                            playersById={playersById}
                            teamsById={teamsById}
                            leagueTable={sortedCurrentData}
                            season={activeSeason || null}
                            isAdmin={isAdmin}
                            defendingChampionId={defendingChampionId}
                            onRevertMatch={onRevertMatch}
                        />
                    </TabsContent>
                </Tabs>
            ) : isStandardHybrid ? (
                <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
                    <div className="p-3 sm:p-4 bg-gradient-to-r from-black/95 via-black/80 to-black/95 border-b border-white/10 backdrop-blur-3xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                      <TabsList className="grid flex-1 grid-cols-3 h-12 sm:h-14 p-1.5 bg-white/[0.03] border border-white/10 rounded-2xl sm:rounded-full backdrop-blur-2xl gap-2">
                          <TabsTrigger value="group_a" className={cn("relative h-full font-black uppercase tracking-[0.2em] text-[10px] sm:text-xs italic transition-all duration-300 rounded-xl sm:rounded-full text-white/50 hover:text-white", theme.tabsActiveBg)}><span className="flex items-center justify-center gap-2">Grup A</span></TabsTrigger>
                          <TabsTrigger value="group_b" className={cn("relative h-full font-black uppercase tracking-[0.2em] text-[10px] sm:text-xs italic transition-all duration-300 rounded-xl sm:rounded-full text-white/50 hover:text-white", theme.tabsActiveBg)}><span className="flex items-center justify-center gap-2">Grup B</span></TabsTrigger>
                          <TabsTrigger value="playoff" className={cn("relative h-full font-black uppercase tracking-[0.2em] text-[10px] sm:text-xs italic transition-all duration-300 rounded-xl sm:rounded-full text-white/50 hover:text-white", theme.tabsActivePlayoff)}><span className="flex items-center justify-center gap-2">Playoff</span></TabsTrigger>
                      </TabsList>
                      <div className="flex items-center gap-2 shrink-0 justify-end">
                        {activeTab === 'playoff' ? (
                          <Button
                            type="button"
                            onClick={() => setIsShareKnockoutOpen(true)}
                            className="h-11 sm:h-14 px-4 sm:px-6 rounded-xl sm:rounded-full font-black text-xs uppercase tracking-wider italic bg-amber-400 hover:bg-amber-300 text-black shadow-[0_0_20px_rgba(251,191,36,0.35)] transition-all flex items-center gap-2 border border-amber-300/60 active:scale-95"
                          >
                            <Share2 className="w-4 h-4" />
                            <span>Share Bagan</span>
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            onClick={() => setIsShareStandingsOpen(true)}
                            className="h-11 sm:h-14 px-4 sm:px-6 rounded-xl sm:rounded-full font-black text-xs uppercase tracking-wider italic transition-all flex items-center gap-2 border active:scale-95"
                            style={{
                              backgroundColor: theme.primaryHex,
                              color: theme.themeKey === 'crimson' ? '#ffffff' : '#000000',
                              borderColor: `${theme.primaryHex}60`,
                              boxShadow: `0 0 20px ${theme.glowRgba}`,
                            }}
                          >
                            <Share2 className="w-4 h-4" />
                            <span>Share Klasemen</span>
                          </Button>
                        )}
                      </div>
                    </div>
                    <TabsContent value="group_a" className="mt-0">
                      <SingleTable 
                        tableData={groupA} 
                        totalPlayers={groupA.length} 
                        onSelectPlayer={onSelectPlayer} 
                        seasonType={currentFormat} 
                        isLoading={isLoading} 
                        onRemovePlayer={onRemovePlayer} 
                        onToggleDivision={onToggleDivision}
                        seasonStatus={seasonStatus} 
                        isAdmin={isAdmin} 
                        defendingChampionId={defendingChampionId} 
                        matches={matchesForDivision} 
                        isCoop={false} 
                        theme={theme} 
                        playersById={playersById} 
                        teamsById={teamsById} 
                        hasDivisions={hasDivisions && !isMerged}
                        isDivision2={isMultiDivisionActive && selectedDivision === 'div-2'}
                        division1Name={activeSeason?.division1Name || 'Divisi 1'}
                        division2Name={activeSeason?.division2Name || 'Divisi 2'}
                        promotionSpots={activeSeason?.promotionSpots ?? 2}
                        relegationSpots={activeSeason?.relegationSpots ?? 2}
                      />
                    </TabsContent>
                    <TabsContent value="group_b" className="mt-0">
                      <SingleTable 
                        tableData={groupB} 
                        totalPlayers={groupB.length} 
                        onSelectPlayer={onSelectPlayer} 
                        seasonType={currentFormat} 
                        isLoading={isLoading} 
                        onRemovePlayer={onRemovePlayer} 
                        onToggleDivision={onToggleDivision}
                        seasonStatus={seasonStatus} 
                        isAdmin={isAdmin} 
                        defendingChampionId={defendingChampionId} 
                        matches={matchesForDivision} 
                        isCoop={false} 
                        theme={theme} 
                        playersById={playersById} 
                        teamsById={teamsById} 
                        hasDivisions={hasDivisions && !isMerged}
                        isDivision2={isMultiDivisionActive && selectedDivision === 'div-2'}
                        division1Name={activeSeason?.division1Name || 'Divisi 1'}
                        division2Name={activeSeason?.division2Name || 'Divisi 2'}
                        promotionSpots={activeSeason?.promotionSpots ?? 2}
                        relegationSpots={activeSeason?.relegationSpots ?? 2}
                      />
                    </TabsContent>
                    <TabsContent value="playoff" className="mt-0 p-1 sm:p-2 xl:p-4 w-full">
                        <TournamentBracket 
                            matches={matchesForDivision}
                            playersById={playersById}
                            teamsById={teamsById}
                            leagueTable={sortedCurrentData}
                            season={activeSeason || null}
                            isAdmin={isAdmin}
                            defendingChampionId={defendingChampionId}
                            onRevertMatch={onRevertMatch}
                        />
                    </TabsContent>
                </Tabs>
            ) : (
                <Tabs value={activeTab === 'topskor' ? 'topskor' : 'standings'} onValueChange={onTabChange} className="w-full">
                  <div className="p-3 sm:p-4 bg-gradient-to-r from-black/95 via-black/80 to-black/95 border-b border-white/10 backdrop-blur-3xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <TabsList className="grid flex-1 grid-cols-2 h-12 sm:h-14 p-1.5 bg-white/[0.03] border border-white/10 rounded-2xl sm:rounded-full backdrop-blur-2xl gap-2">
                      <TabsTrigger value="standings" className={cn("relative h-full font-black uppercase tracking-[0.2em] text-[10px] sm:text-xs italic transition-all duration-300 rounded-xl sm:rounded-full text-white/50 hover:text-white", theme.tabsActiveBg)}>
                        <span className="flex items-center justify-center gap-2"><Scan className="w-4 h-4" />Klasemen</span>
                      </TabsTrigger>
                      <TabsTrigger value="topskor" className={cn("relative h-full font-black uppercase tracking-[0.2em] text-[10px] sm:text-xs italic transition-all duration-300 rounded-xl sm:rounded-full text-white/50 hover:text-white", theme.tabsActiveTopSkor)}>
                        <span className="flex items-center justify-center gap-2"><Flame className="w-4 h-4" />Top Skor</span>
                      </TabsTrigger>
                    </TabsList>
                    <div className="flex items-center gap-2 shrink-0 justify-end">
                      <Button
                        type="button"
                        onClick={() => setIsShareStandingsOpen(true)}
                        className="h-11 sm:h-14 px-4 sm:px-6 rounded-xl sm:rounded-full font-black text-xs uppercase tracking-wider italic transition-all flex items-center gap-2 border active:scale-95"
                        style={{
                          backgroundColor: theme.primaryHex,
                          color: theme.themeKey === 'crimson' ? '#ffffff' : '#000000',
                          borderColor: `${theme.primaryHex}60`,
                          boxShadow: `0 0 20px ${theme.glowRgba}`,
                        }}
                      >
                        <Share2 className="w-4 h-4" />
                        <span>Share Klasemen</span>
                      </Button>
                    </div>
                  </div>
                  <TabsContent value="standings" className="mt-0">
                    <SingleTable 
                      tableData={sortedCurrentData} 
                      isCoop={false} 
                      totalPlayers={sortedCurrentData.length} 
                      onSelectPlayer={onSelectPlayer} 
                      seasonType={currentFormat} 
                      isLoading={isLoading} 
                      onRemovePlayer={onRemovePlayer} 
                      onToggleDivision={onToggleDivision}
                      seasonStatus={seasonStatus} 
                      isAdmin={isAdmin} 
                      defendingChampionId={defendingChampionId} 
                      matches={matchesForDivision} 
                      theme={theme} 
                      playersById={playersById} 
                      teamsById={teamsById} 
                      hasDivisions={hasDivisions && !isMerged}
                      isDivision2={isMultiDivisionActive && selectedDivision === 'div-2'}
                      division1Name={activeSeason?.division1Name || 'Divisi 1'}
                      division2Name={activeSeason?.division2Name || 'Divisi 2'}
                      promotionSpots={activeSeason?.promotionSpots ?? 2}
                      relegationSpots={activeSeason?.relegationSpots ?? 2}
                    />
                  </TabsContent>
                  <TabsContent value="topskor" className="mt-0 py-10">
                    <TopScorerTable tableData={currentDisplayData} isLoading={isLoading} seasonType={currentFormat} teamsById={teamsById} theme={theme} />
                  </TabsContent>
                </Tabs>
            )
        )}

        <StandingsShareDialog 
          open={isShareStandingsOpen} 
          onOpenChange={setIsShareStandingsOpen} 
          tableData={sortedCurrentData} 
          activeSeason={activeSeason} 
          seasonType={currentFormat}
          divisionTitle={isMultiDivisionActive ? (selectedDivision === 'div-1' ? (activeSeason?.division1Name || 'Divisi 1') : (activeSeason?.division2Name || 'Divisi 2')) : undefined}
        />

        <KnockoutShareDialog
          open={isShareKnockoutOpen}
          onOpenChange={setIsShareKnockoutOpen}
          matches={matchesForDivision}
          playersById={playersById}
          teamsById={teamsById}
          leagueTable={sortedCurrentData}
          season={activeSeason}
        />
    </div>
  );
}

function LeagueTableSkeleton({ isCoop }: { isCoop: boolean }) {
  const { t } = useTranslation();
  return (
    <div className="w-full overflow-hidden rounded-2xl sm:rounded-[2.5rem] border border-white/10 bg-black/80 backdrop-blur-3xl shadow-2xl p-6 sm:p-8 space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <Skeleton className="h-6 w-6 rounded-full bg-white/10" />
          <Skeleton className="h-5 w-48 bg-white/10" />
        </div>
        <Skeleton className="h-6 w-24 rounded-full bg-white/10" />
      </div>
      <div className="space-y-3">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-3 rounded-2xl bg-white/[0.02] border border-white/5">
            <Skeleton className="h-9 w-9 rounded-xl bg-white/10" />
            <Skeleton className="h-10 w-10 rounded-2xl bg-white/10" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-32 bg-white/10" />
              <Skeleton className="h-3 w-20 bg-white/5" />
            </div>
            <Skeleton className="h-8 w-16 rounded-xl bg-white/10" />
          </div>
        ))}
      </div>
    </div>
  );
}
