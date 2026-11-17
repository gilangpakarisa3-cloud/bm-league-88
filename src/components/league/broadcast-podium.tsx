'use client';

import React from 'react';
import type { LeagueEntry, WithId, Player, Team } from "@/lib/types";
import type { TISeasonTheme } from "@/lib/season-theme";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Crown, Award, User, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { getTierFromMmr, TIER_STYLES, resolveEffectivePlayerMmr } from "@/lib/mmr";

interface BroadcastPodiumProps {
  topEntries: (WithId<LeagueEntry> & {
    player?: WithId<Player>;
    team?: WithId<Team>;
    rank: number;
    logoUrl?: string;
  })[];
  theme: TISeasonTheme;
  onSelectPlayer: (entry: WithId<LeagueEntry>) => void;
  playerFormsMap?: Record<string, { result: 'W' | 'L' | 'D' }[]>;
  enrichedGlobalPlayersMap?: Record<string, any>;
  playersById?: Record<string, WithId<Player>>;
  hasDivisions?: boolean;
  isDivision2?: boolean;
  defendingChampionId?: string;
}

export const BroadcastPodium = React.memo(({
  topEntries,
  theme,
  onSelectPlayer,
  playerFormsMap = {},
  enrichedGlobalPlayersMap = {},
  playersById = {},
  hasDivisions = false,
  isDivision2 = false,
  defendingChampionId,
}: BroadcastPodiumProps) => {
  if (!topEntries || topEntries.length < 3) return null;

  // Podium Order: #2 (Left), #1 (Center), #3 (Right)
  const rank1 = topEntries[0];
  const rank2 = topEntries[1];
  const rank3 = topEntries[2];

  const podiumSlots = [
    { entry: rank2, visualRank: 2 },
    { entry: rank1, visualRank: 1 },
    { entry: rank3, visualRank: 3 },
  ];

  const getPlayerMmrInfo = (entry: typeof rank1) => {
    const pId = entry.playerId || entry.id;
    const globalEnriched = pId ? enrichedGlobalPlayersMap[pId] : undefined;
    const playerObj = globalEnriched || entry.player || (pId ? playersById[pId] : undefined);
    const playerDivision = entry.division || (isDivision2 ? 'div-2' : (hasDivisions ? 'div-1' : playerObj?.division));

    const resolved = resolveEffectivePlayerMmr(playerObj, playerDivision, globalEnriched);
    return { mmr: resolved.mmr, tierId: resolved.tierId, style: resolved.tierStyle };
  };

  return (
    <div className="w-full relative px-2 sm:px-6 xl:px-10 pt-4 pb-6 border-b border-white/10 bg-[#070A12]/80 backdrop-blur-xl">
      {/* Subtle Ambient Light */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[350px] sm:w-[600px] h-[100px] rounded-full blur-[60px] pointer-events-none opacity-20"
        style={{ backgroundColor: theme.primaryHex }}
      />

      {/* Header Bar */}
      <div className="relative z-10 flex items-center justify-between gap-2 max-w-5xl xl:max-w-6xl 2xl:max-w-7xl mx-auto mb-3 px-1">
        <div className="flex items-center gap-2">
          <Trophy className="w-3.5 h-3.5" style={{ color: theme.primaryHex }} />
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] font-ti text-white/90">
            Top 3 Pemimpin Klasemen
          </span>
        </div>
        <div className="text-[9px] font-body font-semibold text-white/40 uppercase tracking-[0.18em]">
          Leaderboard Race
        </div>
      </div>

      {/* 3 Clean Compact Podium Cards */}
      <div className="relative z-10 grid grid-cols-3 gap-2 sm:gap-4 xl:gap-6 max-w-5xl xl:max-w-6xl 2xl:max-w-7xl mx-auto items-end">
        {podiumSlots.map(({ entry, visualRank }) => {
          const isFirst = visualRank === 1;
          const isSecond = visualRank === 2;
          const isThird = visualRank === 3;
          const { mmr, tierId, style: mmrStyle } = getPlayerMmrInfo(entry);

          const isDefendingChampion = Boolean(
            defendingChampionId && (
              entry.playerId === defendingChampionId ||
              entry.id === defendingChampionId ||
              (entry as any).player1Id === defendingChampionId ||
              (entry as any).player2Id === defendingChampionId
            )
          );

          // Real relevant data: PTS (Points) as the hero number!
          const rankColor = isFirst
            ? theme.primaryHex
            : isSecond
            ? '#38BDF8'
            : '#F59E0B';

          return (
            <div
              key={entry.id}
              onClick={() => onSelectPlayer(entry)}
              className={cn(
                "group/podium relative rounded-2xl transition-all duration-300 cursor-pointer select-none",
                "bg-gradient-to-b from-[#101524]/90 via-[#0A0D18]/95 to-[#060810]/98",
                "border hover:-translate-y-1 hover:brightness-110 shadow-lg",
                isFirst
                  ? "p-2.5 sm:p-4 z-20 border-2"
                  : "p-2 sm:p-3.5 z-10 opacity-90 hover:opacity-100 border"
              )}
              style={{
                borderColor: isFirst ? theme.primaryHex : `${rankColor}40`,
                boxShadow: isFirst ? `0 10px 30px ${theme.glowRgba || 'rgba(204,253,1,0.2)'}` : undefined,
              }}
              title={`Klik untuk melihat statistik lengkap ${entry.playerName}`}
            >
              {/* Top Accent Strip */}
              <div
                className="absolute top-0 left-4 right-4 h-[2px] rounded-full opacity-80"
                style={{
                  background: `linear-gradient(90deg, transparent, ${rankColor}, transparent)`,
                }}
              />

              {/* Card Header: Rank Tag & MMR Tier */}
              <div className="flex items-center justify-between gap-1 mb-2">
                <div
                  className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-body font-bold text-[8px] sm:text-[9.5px] uppercase tracking-[0.14em]",
                    isFirst ? "text-black shadow-sm font-extrabold" : "text-white/80 bg-white/10"
                  )}
                  style={
                    isFirst
                      ? { backgroundColor: theme.primaryHex, color: theme.themeKey === 'crimson' ? '#ffffff' : '#000000' }
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
                      <Award className="w-2.5 h-2.5 text-sky-400" />
                      <span>#2 RANK</span>
                    </>
                  ) : (
                    <>
                      <Award className="w-2.5 h-2.5 text-amber-400" />
                      <span>#3 RANK</span>
                    </>
                  )}
                </div>

                {/* Tier Badge */}
                {mmrStyle && (
                  <span
                    className={cn(
                      "text-[7px] sm:text-[8px] font-body font-bold uppercase tracking-[0.14em] px-1.5 py-0.5 rounded",
                      tierId === 'LEGEND'
                        ? "bg-yellow-400/15 text-yellow-400 border border-yellow-400/30"
                        : tierId === 'TOP_PLAYER'
                        ? "bg-lime-400/15 text-lime-400 border border-lime-400/30"
                        : "bg-white/10 text-white/60"
                    )}
                  >
                    {tierId === 'LEGEND' ? '★ LGD' : tierId === 'TOP_PLAYER' ? 'TOP' : 'REG'}
                  </span>
                )}
              </div>

              {/* Center: Avatar & Team Logo */}
              <div className="flex flex-col items-center text-center my-1">
                <div className="relative mb-1.5">
                  <Avatar
                    className={cn(
                      "border-2 transition-transform duration-300 group-hover/podium:scale-105 shadow-md",
                      isDefendingChampion && !isFirst && "border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.4)]",
                      isFirst ? "h-11 w-11 sm:h-14 sm:w-14" : "h-9 w-9 sm:h-12 sm:w-12"
                    )}
                    style={{ borderColor: isDefendingChampion && !isFirst ? '#FBBF24' : rankColor }}
                  >
                    <AvatarImage
                      src={entry.logoUrl || undefined}
                      alt={entry.playerName}
                      className="object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <AvatarFallback className="bg-black/80 font-bold text-xs text-white/60">
                      <User className="w-4 h-4 sm:w-5 sm:h-5 text-white/40" />
                    </AvatarFallback>
                  </Avatar>

                  {/* Floating Golden Crown Medallion for Defending Champion */}
                  {isDefendingChampion && (
                    <div
                      className="absolute -top-1 -left-1 z-20 w-4 h-4 rounded bg-gradient-to-br from-yellow-300 via-amber-500 to-yellow-600 p-[1px] shadow-[0_0_10px_rgba(251,191,36,0.8)] flex items-center justify-center border border-black"
                      title="Defending Champion — Juara Bertahan"
                    >
                      <div className="w-full h-full rounded-[3px] bg-black/85 flex items-center justify-center">
                        <Crown className="w-2.5 h-2.5 text-amber-400 fill-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.9)]" />
                      </div>
                    </div>
                  )}

                  {/* MMR Number Chip */}
                  <div
                    className="absolute -bottom-1 -right-1 px-1 py-[0.5px] rounded font-headline font-bold tabular-nums tracking-wider text-[7.5px] sm:text-[8.5px] bg-black border border-white/20 text-white shadow"
                    title={`MMR: ${mmr}`}
                  >
                    {mmr}
                  </div>
                </div>

                {/* Player Name */}
                <h3 className="font-ti font-bold uppercase tracking-wide truncate w-full text-xs sm:text-sm text-white px-0.5">
                  {entry.playerName}
                </h3>

                {/* Defending Champion Podium Badge */}
                {isDefendingChampion && (
                  <div
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 mt-0.5 mb-0.5 rounded-full bg-gradient-to-r from-amber-500/25 via-yellow-400/20 to-amber-500/25 border border-amber-400/70 shadow-[0_0_10px_rgba(251,191,36,0.3)]"
                    title="Defending Champion — Juara Bertahan"
                  >
                    <Crown className="w-2 h-2 text-amber-300 fill-amber-400" />
                    <span className="text-[6.5px] sm:text-[7.5px] font-headline font-bold uppercase tracking-[0.14em] bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400 bg-clip-text text-transparent leading-none">
                      CHAMP
                    </span>
                  </div>
                )}

                {/* Team Name */}
                <p className="text-[7px] sm:text-[9px] font-body font-semibold uppercase tracking-[0.14em] text-white/40 truncate w-full">
                  {entry.team?.name || entry.teamName || 'Independent'}
                </p>
              </div>

              {/* Match Summary Strip (P • W • D • L • GD) */}
              <div className="grid grid-cols-4 gap-0.5 py-1 my-1.5 bg-black/40 border border-white/5 rounded-lg text-center">
                <div className="flex flex-col">
                  <span className="text-[6.5px] font-body font-semibold text-white/30 uppercase tracking-wider">MAIN</span>
                  <span className="text-[9px] sm:text-xs font-headline font-bold tabular-nums tracking-wider text-white/80">{entry.played}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[6.5px] font-body font-semibold text-emerald-400/80 uppercase tracking-wider">M</span>
                  <span className="text-[9px] sm:text-xs font-headline font-bold tabular-nums tracking-wider text-emerald-400">{entry.win}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[6.5px] font-body font-semibold text-amber-400/80 uppercase tracking-wider">S</span>
                  <span className="text-[9px] sm:text-xs font-headline font-bold tabular-nums tracking-wider text-amber-400">{entry.draw}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[6.5px] font-body font-semibold text-white/30 uppercase tracking-wider">SG</span>
                  <span className={cn(
                    "text-[9px] sm:text-xs font-headline font-bold tabular-nums tracking-wider",
                    entry.goalDifference > 0 ? "text-emerald-400" : entry.goalDifference < 0 ? "text-rose-400" : "text-white/60"
                  )}>
                    {entry.goalDifference > 0 ? `+${entry.goalDifference}` : entry.goalDifference}
                  </span>
                </div>
              </div>

              {/* Bottom: RELEVAN - TOTAL POIN LIGA */}
              <div
                className="py-1 px-2 rounded-xl flex items-center justify-between border shadow-inner"
                style={{
                  backgroundColor: `${rankColor}15`,
                  borderColor: `${rankColor}40`,
                }}
              >
                <span className="text-[8px] sm:text-[9px] font-body font-bold uppercase tracking-[0.14em] text-white/60">
                  TOTAL POIN
                </span>
                <span
                  className="font-headline font-bold text-sm sm:text-lg tracking-wider tabular-nums"
                  style={{ color: rankColor }}
                >
                  {entry.points} <span className="text-[8px] font-body font-bold">PTS</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

BroadcastPodium.displayName = 'BroadcastPodium';
