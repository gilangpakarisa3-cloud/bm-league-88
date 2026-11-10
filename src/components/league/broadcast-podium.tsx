'use client';

import React from 'react';
import type { LeagueEntry, WithId, Player, Team } from "@/lib/types";
import type { TISeasonTheme } from "@/lib/season-theme";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Crown, Award, User, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { getTierFromMmr, TIER_STYLES } from "@/lib/mmr";

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

    let mmr: number = globalEnriched?.mmrRating ?? playerObj?.mmr ?? (playerDivision === 'div-2' ? 600 : 800);
    const isLowMatchOrNC = (playerObj?.overallPlayed || 0) < 20 || !playerObj?.mmr;
    if (isLowMatchOrNC) {
      if (playerDivision === 'div-1') {
        mmr = Math.max(mmr, 800);
      } else if (playerDivision === 'div-2') {
        mmr = mmr || 600;
      } else {
        mmr = mmr || 800;
      }
    }

    let tierId = (globalEnriched ? globalEnriched.tierId : null) as keyof typeof TIER_STYLES | null;
    if (!tierId || (playerDivision === 'div-1' && tierId === 'AMATEUR' && mmr >= 800)) {
      tierId = getTierFromMmr(mmr, playerObj?.overallPlayed || 0, null, playerDivision) as keyof typeof TIER_STYLES;
    }
    if (playerDivision === 'div-1' && mmr >= 800 && tierId === 'AMATEUR') {
      tierId = 'REGULER';
    }
    const style = tierId && TIER_STYLES[tierId] ? TIER_STYLES[tierId] : null;

    return { mmr: Math.round(mmr), tierId, style };
  };

  return (
    <div className="w-full relative px-2 sm:px-6 pt-3 pb-5 border-b border-white/10 bg-[#070A12]/80 backdrop-blur-xl">
      {/* Subtle Ambient Light */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[350px] sm:w-[600px] h-[100px] rounded-full blur-[60px] pointer-events-none opacity-20"
        style={{ backgroundColor: theme.primaryHex }}
      />

      {/* Header Bar */}
      <div className="relative z-10 flex items-center justify-between gap-2 max-w-4xl mx-auto mb-3 px-1">
        <div className="flex items-center gap-2">
          <Trophy className="w-3.5 h-3.5" style={{ color: theme.primaryHex }} />
          <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] font-headline text-white/90">
            Top 3 Pemimpin Klasemen
          </span>
        </div>
        <div className="text-[9px] font-mono font-bold text-white/40 uppercase tracking-wider">
          Leaderboard Race
        </div>
      </div>

      {/* 3 Clean Compact Podium Cards */}
      <div className="relative z-10 grid grid-cols-3 gap-2 sm:gap-4 max-w-4xl mx-auto items-end">
        {podiumSlots.map(({ entry, visualRank }) => {
          const isFirst = visualRank === 1;
          const isSecond = visualRank === 2;
          const isThird = visualRank === 3;
          const { mmr, tierId, style: mmrStyle } = getPlayerMmrInfo(entry);

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
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-black text-[8px] sm:text-[9.5px] uppercase tracking-wider italic",
                    isFirst ? "text-black shadow-sm" : "text-white/80 bg-white/10"
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
                      "text-[7px] sm:text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded font-mono",
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
                      isFirst ? "h-11 w-11 sm:h-14 sm:w-14" : "h-9 w-9 sm:h-12 sm:w-12"
                    )}
                    style={{ borderColor: rankColor }}
                  >
                    <AvatarImage
                      src={entry.logoUrl || undefined}
                      alt={entry.playerName}
                      className="object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <AvatarFallback className="bg-black/80 font-black text-xs text-white/60">
                      <User className="w-4 h-4 sm:w-5 sm:h-5 text-white/40" />
                    </AvatarFallback>
                  </Avatar>

                  {/* MMR Number Chip */}
                  <div
                    className="absolute -bottom-1 -right-1 px-1 py-[0.5px] rounded font-mono font-black text-[7.5px] sm:text-[8.5px] tracking-tight bg-black border border-white/20 text-white shadow"
                    title={`MMR: ${mmr}`}
                  >
                    {mmr}
                  </div>
                </div>

                {/* Player Name */}
                <h3 className="font-headline font-bold uppercase tracking-wide truncate w-full text-xs sm:text-sm text-white px-0.5">
                  {entry.playerName}
                </h3>

                {/* Team Name */}
                <p className="text-[7px] sm:text-[9px] font-black uppercase tracking-wider text-white/40 truncate w-full">
                  {entry.team?.name || entry.teamName || 'Independent'}
                </p>
              </div>

              {/* Match Summary Strip (P • W • D • L • GD) */}
              <div className="grid grid-cols-4 gap-0.5 py-1 my-1.5 bg-black/40 border border-white/5 rounded-lg text-center font-mono">
                <div className="flex flex-col">
                  <span className="text-[6.5px] font-bold text-white/30 uppercase">MAIN</span>
                  <span className="text-[9px] sm:text-xs font-black text-white/80">{entry.played}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[6.5px] font-bold text-emerald-400/80 uppercase">M</span>
                  <span className="text-[9px] sm:text-xs font-black text-emerald-400">{entry.win}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[6.5px] font-bold text-amber-400/80 uppercase">S</span>
                  <span className="text-[9px] sm:text-xs font-black text-amber-400">{entry.draw}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[6.5px] font-bold text-white/30 uppercase">SG</span>
                  <span className={cn(
                    "text-[9px] sm:text-xs font-black",
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
                <span className="text-[8px] sm:text-[9px] font-mono font-bold uppercase tracking-wider text-white/60">
                  TOTAL POIN
                </span>
                <span
                  className="font-headline font-bold text-sm sm:text-lg tracking-wide"
                  style={{ color: rankColor }}
                >
                  {entry.points} <span className="text-[8px] font-mono font-bold">PTS</span>
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
