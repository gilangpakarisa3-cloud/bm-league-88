'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Crown, Sparkles, Trophy, Pencil, Trash2, User, Shield, Flame, TrendingUp, Target, Award, ArrowUpDown, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Player, Team, WithId, SeasonRecord } from "@/lib/types";
import type { PlayerTierConfig } from "./player-holo-card";
import { getSeasonTheme, type TISeasonTheme } from "@/lib/season-theme";

export type CareerSortKey = 'mmr' | 'pts' | 'goals' | 'gd' | 'winrate' | 'played' | 'titles';

interface PlayerTelemetryTableProps {
  players: any[];
  teamsById: Record<string, WithId<Team>>;
  hallOfFame: SeasonRecord[] | null | undefined;
  tiersConfig: PlayerTierConfig[];
  isAdmin: boolean;
  onEdit: (player: WithId<Player>) => void;
  onDelete: (player: WithId<Player>) => void;
  theme?: TISeasonTheme;
  sortKey?: CareerSortKey;
  onSortChange?: (key: CareerSortKey) => void;
}

export const PlayerTelemetryTable = ({
  players,
  teamsById,
  hallOfFame,
  tiersConfig,
  isAdmin,
  onEdit,
  onDelete,
  theme,
  sortKey = 'mmr',
  onSortChange
}: PlayerTelemetryTableProps) => {
  const activeTheme = theme || getSeasonTheme(null);

  // Top 3 for Triumvirate of Legends podium (Order: #2 Left, #1 Center, #3 Right)
  const showPodium = players.length >= 3;
  const podiumOrder = showPodium ? [
    { player: players[1], visualRank: 2 },
    { player: players[0], visualRank: 1 },
    { player: players[2], visualRank: 3 },
  ] : [];

  return (
    <div className="hidden lg:block overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-[#0A192F]/90 via-black/85 to-[#0A192F]/95 backdrop-blur-3xl shadow-[0_25px_80px_rgba(0,0,0,0.95)] relative group/matrix font-body">
      {/* Top Laser Conduit */}
      <div
        className="h-[2px] w-full"
        style={{
          background: `linear-gradient(90deg, transparent, ${activeTheme.primaryHex}, transparent)`,
          boxShadow: `0 0 20px ${activeTheme.primaryHex}`,
        }}
      />

      {/* 1. TRIUMVIRATE OF LEGENDS - Top 3 Podium Showcase */}
      {showPodium && (
        <div className="relative px-6 py-6 border-b border-white/10 bg-gradient-to-b from-white/[0.02] to-transparent">
          {/* Subtle Ambient Glow */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[550px] h-[140px] rounded-full blur-[80px] pointer-events-none opacity-20"
            style={{ backgroundColor: activeTheme.primaryHex }}
          />

          <div className="relative z-10 flex items-center justify-between max-w-5xl mx-auto mb-4 px-1">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4" style={{ color: activeTheme.primaryHex }} />
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] font-ti text-white/90">
                TRIUMVIRATE OF LEGENDS // ALL-TIME APEX CONTENDERS
              </span>
            </div>
            <div className="text-[9px] font-body font-semibold uppercase tracking-[0.18em] text-white/40">
              IMMORTAL STANDINGS RACE
            </div>
          </div>

          <div className="relative z-10 grid grid-cols-3 gap-3.5 max-w-5xl mx-auto items-end">
            {podiumOrder.map(({ player, visualRank }) => {
              if (!player) return null;
              const team = player.teamId ? teamsById[player.teamId] : null;
              const wonSeasons = hallOfFame?.filter(record => record.winnerPlayerId === player.id) || [];
              const isFirst = visualRank === 1;
              const isSecond = visualRank === 2;
              const rankColor = isFirst
                ? activeTheme.primaryHex
                : isSecond
                ? '#E2E8F0'
                : '#F59E0B';

              const careerPoints = ((player.overallWin || 0) * 3) + (player.overallDraw || 0);
              const careerGd = (player.overallGoalsFor || 0) - (player.overallGoalsAgainst || 0);
              const winPercent = player.winRate || 0;

              return (
                <div
                  key={player.id}
                  className={cn(
                    "group/podium relative rounded-2xl transition-all duration-300 p-3.5 sm:p-4 select-none",
                    "bg-gradient-to-b from-[#101828]/95 via-[#0A0E1A]/95 to-[#060810]/98",
                    "border hover:-translate-y-1 hover:brightness-110 shadow-lg",
                    isFirst
                      ? "md:-translate-y-1.5 z-20 border-2"
                      : "z-10 opacity-95 hover:opacity-100 border"
                  )}
                  style={{
                    borderColor: isFirst ? activeTheme.primaryHex : `${rankColor}40`,
                    boxShadow: isFirst ? `0 12px 35px ${activeTheme.glowRgba || 'rgba(204,253,1,0.25)'}` : undefined,
                  }}
                >
                  {/* Top Laser Accent */}
                  <div
                    className="absolute top-0 left-4 right-4 h-[2px] rounded-full opacity-80"
                    style={{
                      background: `linear-gradient(90deg, transparent, ${rankColor}, transparent)`,
                    }}
                  />

                  {/* Header Row: Rank Badge & Titles */}
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <div
                      className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-body font-bold text-[8px] sm:text-[9.5px] uppercase tracking-[0.14em]",
                        isFirst ? "text-black shadow-sm font-extrabold" : "text-white/80 bg-white/10"
                      )}
                      style={
                        isFirst
                          ? { backgroundColor: activeTheme.primaryHex, color: activeTheme.themeKey === 'crimson' ? '#ffffff' : '#000000' }
                          : undefined
                      }
                    >
                      {isFirst ? (
                        <>
                          <Crown className="w-2.5 h-2.5 fill-current" />
                          <span>#1 LEADER</span>
                        </>
                      ) : isSecond ? (
                        <>
                          <Award className="w-2.5 h-2.5 text-slate-300" />
                          <span>#2 RANK</span>
                        </>
                      ) : (
                        <>
                          <Award className="w-2.5 h-2.5 text-amber-400" />
                          <span>#3 RANK</span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-1 font-ti text-[9px] sm:text-[10px] font-semibold text-amber-400">
                      <Trophy className="w-2.5 h-2.5 fill-amber-400/20" />
                      <span>{wonSeasons.length}x Juara</span>
                    </div>
                  </div>

                  {/* Center: Avatar & Info */}
                  <div className="flex items-center gap-3 my-2">
                    <div className="relative shrink-0">
                      <Avatar
                        className={cn(
                          "border-2 transition-transform duration-300 group-hover/podium:scale-105 shadow-md",
                          isFirst ? "h-12 w-12 sm:h-14 sm:w-14" : "h-10 w-10 sm:h-12 sm:w-12"
                        )}
                        style={{ borderColor: rankColor }}
                      >
                        <AvatarImage src={team?.logoUrl} alt={player.name} className="object-cover" />
                        <AvatarFallback className="bg-black/90 font-bold text-xs text-white">
                          {player.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      {player.legacyOvrRating ? (
                        <div
                          className="absolute -bottom-1 -right-1 px-1 py-[0.5px] rounded font-headline font-bold text-[8px] tracking-tight bg-black border border-white/20 text-yellow-400 shadow tabular-nums"
                          title={`Legacy OVR: ${player.legacyOvrRating.toFixed(0)}`}
                        >
                          {player.legacyOvrRating.toFixed(0)}
                        </div>
                      ) : null}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-ti font-bold uppercase tracking-wide truncate text-sm sm:text-base text-white">
                          {player.name}
                        </span>
                        {wonSeasons.length >= 2 && (
                          <span className="text-[7.5px] px-1 py-0.2 rounded bg-amber-400/20 text-amber-300 font-ti font-semibold tracking-tight shrink-0 border border-amber-400/40">
                            DYNASTY
                          </span>
                        )}
                      </div>
                      <p className="text-[9px] font-body font-semibold uppercase tracking-[0.14em] text-white/40 truncate">
                        {team?.name || 'Free Agent'}
                      </p>
                      <div className="mt-1 flex items-baseline gap-1.5">
                        <span
                          className="font-headline font-bold text-base sm:text-lg tracking-wider tabular-nums"
                          style={{ color: rankColor }}
                        >
                          {player.mmrRating || player.mmr || 800} <span className="text-[9px] font-body font-semibold opacity-70 tracking-normal">MMR</span>
                        </span>
                        <span className="text-[9px] text-white/40 font-headline font-bold tabular-nums tracking-wider">
                          PEAK {player.peakMmrRating || player.mmrRating || 800}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 4 Mini Telemetry Metrics */}
                  <div className="grid grid-cols-4 gap-1 mt-2.5 pt-2 border-t border-white/10 text-center">
                    <div className="bg-white/[0.03] rounded-lg p-1">
                      <span className="block text-[7.5px] font-body font-semibold text-white/40 uppercase tracking-wider">MAIN</span>
                      <span className="font-headline font-bold text-xs text-white tabular-nums tracking-wider">{player.overallPlayed || 0}</span>
                    </div>
                    <div className="bg-emerald-500/10 rounded-lg p-1">
                      <span className="block text-[7.5px] font-body font-semibold text-emerald-400/70 uppercase tracking-wider">WIN%</span>
                      <span className="font-headline font-bold text-xs text-emerald-400 tabular-nums tracking-wider">{winPercent.toFixed(0)}%</span>
                    </div>
                    <div className="bg-amber-500/10 rounded-lg p-1">
                      <span className="block text-[7.5px] font-body font-semibold text-amber-400/70 uppercase tracking-wider">POIN</span>
                      <span className="font-headline font-bold text-xs text-amber-300 tabular-nums tracking-wider">{careerPoints}</span>
                    </div>
                    <div className="bg-sky-500/10 rounded-lg p-1">
                      <span className="block text-[7.5px] font-body font-semibold text-sky-400/70 uppercase tracking-wider">SG</span>
                      <span className={cn(
                        "font-headline font-bold text-xs tabular-nums tracking-wider",
                        careerGd > 0 ? "text-sky-300" : careerGd < 0 ? "text-rose-400" : "text-white/60"
                      )}>
                        {careerGd > 0 ? `+${careerGd}` : careerGd}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. MAIN TABLE - IMMORTAL CAREER LADDER */}
      <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
        <table className="w-full text-left text-xs text-white border-collapse font-body">
          <thead>
            <tr className="border-b border-white/10 bg-black/75 text-[10px] font-body font-bold uppercase tracking-[0.18em] text-white/50 select-none">
              <th className="py-4 px-3 text-center w-16">RANK</th>
              <th className="py-4 px-4 min-w-[220px]">
                <span className="inline-flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-white/40" />
                  ATLET // SKUAD KLUB
                </span>
              </th>
              <th className="py-4 px-3 text-center">
                <span className="inline-flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-white/40" />
                  TIER
                </span>
              </th>
              <th
                onClick={() => onSortChange?.('mmr')}
                className="py-4 px-3 text-center cursor-pointer hover:text-white transition-colors group/th select-none"
              >
                <div className="inline-flex items-center justify-center gap-1 text-primary">
                  <Flame className="w-3.5 h-3.5 text-primary" />
                  <span>MMR (PEAK)</span>
                  {sortKey === 'mmr' ? (
                    <ChevronDown className="w-3.5 h-3.5 text-primary animate-pulse" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-white/20 group-hover/th:text-white/60" />
                  )}
                </div>
              </th>
              <th
                onClick={() => onSortChange?.('played')}
                className="py-4 px-2.5 text-center cursor-pointer hover:text-white transition-colors group/th select-none"
              >
                <div className="inline-flex items-center justify-center gap-1">
                  <span>MAIN</span>
                  {sortKey === 'played' ? (
                    <ChevronDown className="w-3 h-3 text-primary" />
                  ) : (
                    <ArrowUpDown className="w-2.5 h-2.5 text-white/20 group-hover/th:text-white/60" />
                  )}
                </div>
              </th>
              <th className="py-4 px-2 text-center text-emerald-400">M</th>
              <th className="py-4 px-2 text-center text-amber-400">S</th>
              <th className="py-4 px-2 text-center text-rose-400">K</th>
              <th
                onClick={() => onSortChange?.('gd')}
                className="py-4 px-3 text-center cursor-pointer hover:text-white transition-colors group/th select-none"
                title="Goal Difference (GM : GK)"
              >
                <div className="inline-flex items-center justify-center gap-1">
                  <span>SG (GM:GK)</span>
                  {sortKey === 'gd' ? (
                    <ChevronDown className="w-3 h-3 text-primary" />
                  ) : (
                    <ArrowUpDown className="w-2.5 h-2.5 text-white/20 group-hover/th:text-white/60" />
                  )}
                </div>
              </th>
              <th
                onClick={() => onSortChange?.('goals')}
                className="py-4 px-3 text-center cursor-pointer hover:text-white transition-colors group/th select-none"
                title="Total Gol & Rasio Gol per Laga"
              >
                <div className="inline-flex items-center justify-center gap-1">
                  <Target className="w-3 h-3 text-white/40" />
                  <span>GOL (GPG)</span>
                  {sortKey === 'goals' ? (
                    <ChevronDown className="w-3 h-3 text-primary" />
                  ) : (
                    <ArrowUpDown className="w-2.5 h-2.5 text-white/20 group-hover/th:text-white/60" />
                  )}
                </div>
              </th>
              <th
                onClick={() => onSortChange?.('winrate')}
                className="py-4 px-3 text-center min-w-[140px] cursor-pointer hover:text-white transition-colors group/th select-none"
              >
                <div className="inline-flex items-center justify-center gap-1 text-primary">
                  <TrendingUp className="w-3.5 h-3.5 text-primary" />
                  <span>WIN RATE</span>
                  {sortKey === 'winrate' ? (
                    <ChevronDown className="w-3 h-3 text-primary" />
                  ) : (
                    <ArrowUpDown className="w-2.5 h-2.5 text-white/20 group-hover/th:text-white/60" />
                  )}
                </div>
              </th>
              <th
                onClick={() => onSortChange?.('pts')}
                className="py-4 px-3 text-center cursor-pointer hover:text-white transition-colors group/th select-none w-24 min-w-[96px]"
                title="Poin Karir: (Menang x 3) + (Seri x 1)"
              >
                <div className="inline-flex items-center justify-center gap-1 text-amber-300 whitespace-nowrap">
                  <span>POIN KARIR</span>
                  {sortKey === 'pts' ? (
                    <ChevronDown className="w-3 h-3 text-amber-400" />
                  ) : (
                    <ArrowUpDown className="w-2.5 h-2.5 text-white/20 group-hover/th:text-white/60" />
                  )}
                </div>
              </th>
              <th
                onClick={() => onSortChange?.('titles')}
                className="py-4 px-4 min-w-[230px] cursor-pointer hover:text-white transition-colors group/th select-none"
              >
                <div className="inline-flex items-center gap-1 text-yellow-400 whitespace-nowrap">
                  <Trophy className="w-3.5 h-3.5 text-yellow-400" />
                  <span>GELAR JUARA</span>
                  {sortKey === 'titles' ? (
                    <ChevronDown className="w-3 h-3 text-yellow-400" />
                  ) : (
                    <ArrowUpDown className="w-2.5 h-2.5 text-white/20 group-hover/th:text-white/60" />
                  )}
                </div>
              </th>
              {isAdmin && <th className="py-4 px-3 text-center w-20">AKSI</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {players.map((player, idx) => {
              const team = player.teamId ? teamsById[player.teamId] : null;
              const wonSeasons = hallOfFame?.filter(record => record.winnerPlayerId === player.id) || [];
              const tier = tiersConfig.find(t => t.players && t.players.some((p: any) => p.id === player.id)) || tiersConfig[3] || tiersConfig[0];
              const playerRank = player.rank ?? player.ovrRank ?? (idx + 1);
              const isPodium1 = playerRank === 1;
              const isPodium2 = playerRank === 2;
              const isPodium3 = playerRank === 3;
              const isTopPodium = playerRank !== null && playerRank <= 3;
              const isLegendTier = tier.id === 'LEGEND' || playerRank <= 4;
              const winPercent = player.winRate || 0;

              const played = player.overallPlayed || 0;
              const wins = player.overallWin || 0;
              const draws = player.overallDraw || 0;
              const losses = player.overallLoss || 0;
              const goalsFor = player.overallGoalsFor || 0;
              const goalsAgainst = player.overallGoalsAgainst || 0;
              const gd = goalsFor - goalsAgainst;
              const gpg = played > 0 ? (goalsFor / played).toFixed(2) : '0.00';
              const careerPoints = (wins * 3) + draws;

              // Stacked win rate bar percentages
              const winBarPercent = played > 0 ? (wins / played) * 100 : 0;
              const drawBarPercent = played > 0 ? (draws / played) * 100 : 0;
              const lossBarPercent = played > 0 ? (losses / played) * 100 : 0;

              return (
                <tr
                  key={player.id}
                  className={cn(
                    "transition-all duration-200 group/row relative",
                    isPodium1 ? "bg-gradient-to-r from-yellow-500/[0.1] via-transparent to-transparent hover:bg-yellow-500/[0.14]" :
                      isPodium2 ? "bg-gradient-to-r from-slate-300/[0.08] via-transparent to-transparent hover:bg-slate-300/[0.12]" :
                        isPodium3 ? "bg-gradient-to-r from-amber-600/[0.08] via-transparent to-transparent hover:bg-amber-600/[0.12]" :
                          "hover:bg-white/[0.04]"
                  )}
                >
                  {/* Rank Cell with Left Laser Edge Bar */}
                  <td className="py-3.5 px-3 text-center relative">
                    {/* Left Laser Bar matching Tier HudBar */}
                    <div className={cn("absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full", tier.hudBar)} />

                    <div className="flex items-center justify-center pl-1">
                      {player.isCalibrated && playerRank ? (
                        <div className={cn(
                          "relative w-8 h-8 rounded-xl flex items-center justify-center font-headline font-bold tracking-wider text-xs transition-transform duration-300 group/row:scale-110 tabular-nums",
                          isPodium1 ? "bg-gradient-to-br from-yellow-300 via-yellow-400 to-amber-500 text-black shadow-[0_0_20px_rgba(250,204,21,0.6)] border border-yellow-200" :
                            isPodium2 ? "bg-gradient-to-br from-slate-200 via-slate-300 to-slate-400 text-black shadow-[0_0_15px_rgba(203,213,225,0.5)] border border-white" :
                              isPodium3 ? "bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 text-white shadow-[0_0_15px_rgba(217,119,6,0.5)] border border-amber-400/40" :
                                "bg-white/5 text-white/50 border border-white/10 group-hover/row:border-white/30 group-hover/row:text-white"
                        )}>
                          {isPodium1 ? (
                            <Crown className="w-3.5 h-3.5 fill-black" />
                          ) : (
                            <span>#{playerRank}</span>
                          )}
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center font-headline font-bold text-xs bg-slate-500/10 text-slate-400 border border-slate-500/20">
                          -
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Player & Club */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="relative shrink-0">
                        <Avatar className={cn(
                          "h-10 w-10 rounded-2xl border-2 transition-transform duration-300 group-hover/row:scale-105 shadow-md",
                          isTopPodium && player.isCalibrated ? "border-primary/50 shadow-[0_0_15px_rgba(204,253,1,0.25)]" : "border-white/10"
                        )}>
                          <AvatarImage src={team?.logoUrl} alt={player.name} className="object-cover" />
                          <AvatarFallback className="bg-black/80 text-[10px] font-bold text-white">
                            {player.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {isTopPodium && player.isCalibrated && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-primary flex items-center justify-center shadow-[0_0_8px_rgba(204,253,1,0.9)]">
                            <Sparkles className="w-2 h-2 text-black" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={cn(
                            "uppercase tracking-wide truncate transition-colors drop-shadow-sm text-sm text-white group-hover/row:text-primary",
                            isLegendTier ? "font-ti font-bold" : "font-body font-bold"
                          )}>
                            {player.name}
                          </span>
                          {wonSeasons.length >= 2 && (
                            <span className="text-[7.5px] px-1 py-0.2 rounded bg-amber-400/20 text-amber-300 font-ti font-semibold tracking-tight shrink-0 border border-amber-400/40">
                              DYNASTY
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="w-1 h-1 rounded-full bg-white/40" />
                          <span className="text-[10px] font-body font-semibold uppercase tracking-[0.14em] text-white/50 truncate">
                            {team?.name || 'Free Agent'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Tier Division */}
                  <td className="py-3.5 px-3 text-center">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[8px] font-body font-bold uppercase tracking-[0.18em] px-2.5 py-1 rounded-full border shadow-sm transition-all whitespace-nowrap",
                        tier.bgPill
                      )}
                    >
                      {tier.title}
                    </Badge>
                  </td>

                  {/* MMR & Peak MMR */}
                  <td className="py-3.5 px-3 text-center">
                    <div className="inline-flex flex-col items-center justify-center">
                      <div className={cn(
                        "px-3 py-1 rounded-xl bg-black/60 border font-headline font-bold tabular-nums text-sm tracking-wider shadow-inner flex items-baseline gap-1",
                        tier.color.includes('yellow') ? "border-yellow-400/40 text-yellow-400 shadow-[0_0_12px_rgba(250,204,21,0.2)]" :
                          tier.color.includes('primary') ? "border-primary/40 text-primary shadow-[0_0_12px_rgba(204,253,1,0.2)]" :
                            tier.color.includes('accent') ? "border-accent/40 text-accent shadow-[0_0_12px_rgba(100,255,218,0.2)]" :
                              "border-white/10 text-white/70"
                      )}>
                        <span>{player.mmrRating || player.mmr || 800}</span>
                        <span className="text-[8px] font-body font-semibold opacity-60 not-italic tracking-normal">MMR</span>
                      </div>
                      <span className="text-[8px] font-headline font-bold text-white/40 uppercase tracking-wider tabular-nums mt-0.5">
                        PEAK {player.peakMmrRating || player.mmrRating || player.mmr || 800}
                      </span>
                    </div>
                  </td>

                  {/* Main / Played */}
                  <td className="py-3.5 px-2.5 text-center font-headline font-bold text-white/80 tabular-nums text-sm tracking-wider">
                    <span className="px-2 py-0.5 rounded-lg bg-white/[0.03] border border-white/5">
                      {played}
                    </span>
                  </td>

                  {/* W (Menang) */}
                  <td className="py-3.5 px-2 text-center font-headline font-bold text-emerald-400 tabular-nums text-sm tracking-wider">
                    <span className="px-1.5 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      {wins}
                    </span>
                  </td>

                  {/* D (Seri) */}
                  <td className="py-3.5 px-2 text-center font-headline font-bold text-amber-400 tabular-nums text-sm tracking-wider">
                    <span className="px-1.5 py-0.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                      {draws}
                    </span>
                  </td>

                  {/* L (Kalah) */}
                  <td className="py-3.5 px-2 text-center font-headline font-bold text-rose-400 tabular-nums text-sm tracking-wider">
                    <span className="px-1.5 py-0.5 rounded-lg bg-rose-500/10 border border-rose-500/20">
                      {losses}
                    </span>
                  </td>

                  {/* SG (GM : GK) */}
                  <td className="py-3.5 px-3 text-center">
                    <div className={cn(
                      "font-headline font-bold text-sm tabular-nums tracking-wider",
                      gd > 0 ? "text-emerald-400" : gd < 0 ? "text-rose-400" : "text-white/60"
                    )}>
                      {gd > 0 ? `+${gd}` : gd}
                    </div>
                    <div className="text-[8.5px] font-headline font-semibold text-white/35 tabular-nums tracking-wider">
                      {goalsFor} : {goalsAgainst}
                    </div>
                  </td>

                  {/* Gol (GPG) */}
                  <td className="py-3.5 px-3 text-center">
                    <div className="font-headline font-bold text-white text-sm tabular-nums tracking-wider">
                      {goalsFor} <span className="text-[8px] font-body font-semibold text-white/40 tracking-normal">G</span>
                    </div>
                    <div className="text-[8.5px] font-headline font-semibold text-emerald-400/80 tabular-nums tracking-wider">
                      {gpg}/laga
                    </div>
                  </td>

                  {/* Win Rate & Stacked Bar */}
                  <td className="py-3.5 px-3 text-center">
                    <div className="w-32 mx-auto">
                      <div className="flex justify-between items-baseline text-[9.5px] font-headline font-bold mb-1 tabular-nums tracking-wider">
                        <span className="text-white/40 text-[8.5px] font-body tracking-wider">
                          {player.legacyOvrRating ? `OVR ${player.legacyOvrRating.toFixed(0)}` : 'CAREER'}
                        </span>
                        <span className={cn(
                          winPercent >= 60 ? "text-primary" : winPercent >= 45 ? "text-accent" : "text-white/70"
                        )}>
                          {winPercent.toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-black/80 overflow-hidden flex border border-white/10 p-[0.5px]">
                        <div style={{ width: `${winBarPercent}%` }} className="bg-emerald-400 h-full rounded-l-full" title={`Menang: ${wins}`} />
                        <div style={{ width: `${drawBarPercent}%` }} className="bg-amber-400 h-full" title={`Seri: ${draws}`} />
                        <div style={{ width: `${lossBarPercent}%` }} className="bg-rose-500/80 h-full rounded-r-full" title={`Kalah: ${losses}`} />
                      </div>
                    </div>
                  </td>

                  {/* Career Points */}
                  <td className="py-3.5 px-3 text-center whitespace-nowrap w-24">
                    <div className="inline-flex items-center justify-center min-w-[76px] h-8 px-3 rounded-xl font-headline font-bold text-sm bg-amber-400/15 border border-amber-400/40 text-amber-300 shadow-inner tabular-nums tracking-wider whitespace-nowrap">
                      <span>{careerPoints}</span>
                      <span className="ml-1 text-[8.5px] font-body font-bold opacity-75 tracking-normal">PTS</span>
                    </div>
                  </td>

                  {/* Gelar Juara (Won Seasons) */}
                  <td className="py-3.5 px-4 font-body min-w-[230px]">
                    {wonSeasons.length > 0 ? (
                      <div className="flex flex-col gap-1.5 items-start">
                        {wonSeasons.map(rec => (
                          <div
                            key={rec.seasonId}
                            className="group/badge inline-flex items-center gap-1.5 w-[210px] h-7 px-2.5 rounded-lg bg-gradient-to-r from-amber-500/20 via-yellow-500/15 to-transparent border border-amber-500/40 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.15)] hover:border-amber-400 transition-all font-ti font-semibold tracking-wider text-[9px] whitespace-nowrap"
                            title={rec.seasonName}
                          >
                            <Trophy className="w-3 h-3 text-amber-400 shrink-0 fill-amber-400/20" />
                            <span className="text-amber-300 truncate">
                              {rec.seasonName}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center h-8 pl-2">
                        <span className="text-[11px] text-white/20 font-body tracking-widest">-</span>
                      </div>
                    )}
                  </td>

                  {/* Admin Actions */}
                  {isAdmin && (
                    <td className="py-3.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEdit(player)}
                          className="h-7 w-7 text-white/40 hover:text-primary hover:bg-primary/10 rounded-xl transition-colors"
                          title="Edit Athlete"
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDelete(player)}
                          className="h-7 w-7 text-white/40 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"
                          title="Delete Athlete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 3. TI BROADCAST FOOTER LEGEND */}
      <div className="p-3.5 px-6 bg-black/85 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-[10px] font-body text-white/50 tracking-[0.14em]">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm bg-yellow-400 shadow-[0_0_6px_#facc15]" />
            <strong className="text-yellow-400 font-bold">LEGEND</strong> (Rank 1–4 Global)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm bg-lime-400 shadow-[0_0_6px_#a3e635]" />
            <strong className="text-lime-400 font-bold">TOP PLAYER</strong> (Rank 5–8 Global)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
            <strong className="text-cyan-400 font-bold">REGULER</strong> (Rank 9–12 Global)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm bg-pink-400 shadow-[0_0_6px_#f472b6]" />
            <strong className="text-pink-400 font-bold">AMATEUR</strong> (Rank 13+ Global)
          </span>
        </div>
        <div className="flex items-center gap-4 uppercase font-semibold">
          <span>POIN KARIR = (M × 3) + (S × 1) • GPG = GOL PER LAGA</span>
          <span className="text-white/20">•</span>
          <span className="text-primary font-bold">TI METRIC PROTOCOL // OPERATIONAL</span>
        </div>
      </div>
    </div>
  );
};
