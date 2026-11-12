'use client';

import { useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Swords, Trophy, User, Calendar as CalendarIcon, Clock, ChevronRight, Scan, CheckCircle2, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { resolveLogo } from "@/lib/logo-utils";
import type { WithId, Team, Match } from "@/lib/types";
import type { TISeasonTheme as SeasonDesignTheme } from "@/lib/season-theme";

export interface MatchCardProps {
  bid: string;
  label: string;
  bracketData: Record<string, any>;
  projections: Record<string, any> | null;
  handleCardClick: (matchData: any) => void;
  teamsById: Record<string, WithId<Team>>;
  theme?: SeasonDesignTheme;
  isLower?: boolean;
}

const CHAMFER_CLIP = 'polygon(8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px)';

export const MatchCard = ({
  bid,
  label,
  bracketData,
  projections,
  handleCardClick,
  teamsById,
  theme,
  isLower = false,
}: MatchCardProps) => {
  const m = bracketData[bid];
  const p = projections ? projections[bid] : null;

  // Dynamic Theme Palette from Season
  const primaryHex = isLower && theme?.lowerConnectorColor === 'amber' && theme?.themeKey !== 'crimson'
    ? '#F59E0B'
    : (theme?.primaryHex || '#CCFD01');
  const secondaryHex = theme?.secondaryHex || primaryHex;
  const glowRgba = theme?.glowRgba || 'rgba(204, 253, 1, 0.8)';

  if (!m && p) {
    const p1 = p.p1;
    const p2 = p.p2;
    const team1Id = p1.teamId || p1.player1TeamId || '';
    const team2Id = p2.teamId || p2.player1TeamId || '';
    const team1 = team1Id ? teamsById[team1Id] : null;
    const team2 = team2Id ? teamsById[team2Id] : null;
    const p1Name = p1.playerName || p1.name || p1.teamName || 'TBD';
    const p2Name = p2.playerName || p2.name || p2.teamName || 'TBD';
    const logo1 = resolveLogo(team1?.logoUrl, team1Id || p1.playerId || p1.id, p1Name);
    const logo2 = resolveLogo(team2?.logoUrl, team2Id || p2.playerId || p2.id, p2Name);

    return (
      <div className="flex flex-col gap-1 items-center group/proj w-full select-none">
        {/* Match Header Tag - TI Octagonal / Diamond Micro-Ornament */}
        <div className="flex items-center justify-between w-full max-w-[320px] 2xl:max-w-[340px] px-1 font-mono">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[9px] text-[#FBBF24] leading-none shrink-0 drop-shadow-[0_0_4px_#FBBF24]">◆</span>
            <span
              className="text-[8px] font-black tracking-widest uppercase font-headline truncate"
              style={{ color: primaryHex }}
            >
              {label}
            </span>
          </div>
          <Badge
            variant="outline"
            className="h-3.5 text-[6.5px] py-0 px-1.5 font-black uppercase rounded-sm border shadow-sm"
            style={{
              borderColor: '#FBBF2466',
              color: '#FDE68A',
              backgroundColor: 'rgba(251, 191, 36, 0.12)',
              boxShadow: `0 0 8px ${primaryHex}33`
            }}
          >
            PROYEKSI
          </Badge>
        </div>

        {/* TI10 Chamfered Outer Chassis Plate */}
        <div
          className="w-full min-w-[195px] sm:min-w-[215px] max-w-[320px] 2xl:max-w-[340px] p-[1.5px] cursor-pointer transition-all duration-300 relative group-hover/proj:scale-[1.02]"
          style={{
            clipPath: CHAMFER_CLIP,
            background: `linear-gradient(135deg, #FBBF24 0%, ${primaryHex} 50%, #D97706 100%)`,
            filter: `drop-shadow(0 8px 20px rgba(0,0,0,0.85)) drop-shadow(0 0 12px ${primaryHex}26)`
          }}
          onClick={() => handleCardClick({
            ...p,
            player1Id: p.p1.playerId || p.p1.id || 'TBD',
            player2Id: p.p2.playerId || p.p2.id || 'TBD',
            id: `proj-${bid}`,
            isProjection: true,
            round: label,
            p1: { name: p1Name, playerId: p.p1.playerId || p.p1.id },
            p2: { name: p2Name, playerId: p.p2.playerId || p.p2.id }
          })}
        >
          {/* Inner Chamfered Dark Plate */}
          <div
            className="w-full h-[68px] relative overflow-hidden flex flex-col justify-center"
            style={{
              clipPath: CHAMFER_CLIP,
              background: 'radial-gradient(circle at 50% 0%, rgba(20, 14, 30, 0.98) 0%, rgba(8, 7, 13, 0.98) 100%)'
            }}
          >
            {/* Interactive Light Sweep */}
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/proj:translate-x-full transition-transform duration-700 pointer-events-none z-20" />

            {/* Contender Rows */}
            <div className="divide-y divide-white/10 relative z-10">
              {[p1, p2].map((player, idx) => {
                const name = player.playerName || player.name || player.teamName || 'TBD';
                const logoUrl = idx === 0 ? logo1 : logo2;
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between px-2.5 h-[34px] group-hover/proj:bg-white/[0.04] transition-colors relative"
                  >
                    {/* Left Chamfer Accent Bar */}
                    <div
                      className="absolute left-0 top-0 bottom-0 w-[2.5px]"
                      style={{
                        background: `linear-gradient(to bottom, #FBBF24, ${primaryHex})`
                      }}
                    />

                    <div className="flex items-center gap-2 min-w-0 flex-1 pr-2 pl-1">
                      <Avatar className="h-5 w-5 sm:h-6 sm:w-6 border border-white/20 opacity-80 group-hover/proj:opacity-100 transition-opacity rounded-sm shrink-0 bg-black/80 overflow-hidden flex items-center justify-center p-0.5">
                        <AvatarImage key={logoUrl} src={logoUrl} className="object-contain w-full h-full" referrerPolicy="no-referrer" />
                        <AvatarFallback className="bg-black/60 font-black text-[7px] rounded-sm text-white/70"><User className="w-2.5 h-2.5"/></AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <span
                          className="text-[10px] sm:text-[11px] font-bold truncate uppercase text-white/85 group-hover/proj:text-white transition-colors font-headline inline-block pr-1 max-w-full"
                          title={name}
                          suppressHydrationWarning
                        >
                          {name}
                        </span>
                      </div>
                    </div>
                    <div
                      className="w-5 h-4.5 sm:w-6 sm:h-5 rounded-sm border flex items-center justify-center text-center shrink-0 font-mono"
                      style={{
                        borderColor: `${primaryHex}4D`,
                        backgroundColor: 'rgba(0,0,0,0.5)'
                      }}
                    >
                      <span className="text-[9px] sm:text-[10px] font-bold text-white/35 tabular-nums leading-none">-</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!m) {
    return (
      <div className="flex flex-col gap-1 items-center group/calib w-full select-none">
        <div className="flex items-center gap-1 w-full max-w-[320px] 2xl:max-w-[340px] px-1 font-mono">
          <span className="text-[8px] text-white/30">◆</span>
          <span className="text-[8px] font-black tracking-widest text-white/30 uppercase font-headline">{label}</span>
        </div>
        <div
          className="w-full min-w-[195px] sm:min-w-[215px] max-w-[320px] 2xl:max-w-[340px] p-[1px] relative shadow-md"
          style={{
            clipPath: CHAMFER_CLIP,
            background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 100%)'
          }}
        >
          <div
            className="w-full h-[68px] flex flex-col items-center justify-center gap-0.5 relative overflow-hidden backdrop-blur-xl"
            style={{
              clipPath: CHAMFER_CLIP,
              background: 'radial-gradient(circle at 50% 0%, #100f14 0%, #06050a 100%)'
            }}
          >
            <div className="flex items-center gap-1.5 opacity-80">
              <Scan className="w-3 h-3 animate-pulse" style={{ color: primaryHex }} />
              <span className="text-[7.5px] font-black tracking-[0.2em] uppercase text-white/60 font-mono">STANDBY // TBD</span>
            </div>
            <span className="text-[6.5px] font-black tracking-[0.2em] text-white/30 uppercase font-mono">AWAITING RESULTS</span>
          </div>
        </div>
      </div>
    );
  }

  const isBattleReady = !m.isCompleted && m.player1Id !== 'TBD' && m.player2Id !== 'TBD';

  return (
    <div className="flex flex-col gap-1 relative items-center group/match w-full select-none">
      {/* Match Header Tag - TI Octagonal / Diamond Micro-Ornament */}
      <div className="flex items-center justify-between w-full max-w-[320px] 2xl:max-w-[340px] px-1 font-mono">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className="text-[9px] leading-none shrink-0"
            style={{
              color: m.isCompleted || isBattleReady ? '#FBBF24' : 'rgba(255,255,255,0.3)',
              filter: m.isCompleted || isBattleReady ? 'drop-shadow(0 0 4px #FBBF24)' : undefined
            }}
          >
            ◆
          </span>
          <span
            className="text-[8px] font-black tracking-widest uppercase font-headline transition-colors truncate"
            style={{
              color: m.isCompleted ? primaryHex : isBattleReady ? primaryHex : 'rgba(255,255,255,0.5)',
              filter: isBattleReady ? `drop-shadow(0 0 8px ${primaryHex}99)` : undefined
            }}
          >
            {label}
          </span>
        </div>

        {m.isCompleted ? (
          <Badge
            variant="outline"
            className="h-3.5 text-[7px] py-0 px-1.5 font-black uppercase rounded-sm border shadow-sm flex items-center gap-1"
            style={{
              borderColor: '#FBBF2480',
              color: '#FDE68A',
              backgroundColor: 'rgba(251, 191, 36, 0.15)',
              boxShadow: `0 0 10px ${primaryHex}40`
            }}
          >
            <CheckCircle2 className="w-2.5 h-2.5 text-[#FBBF24]" /> FINAL
          </Badge>
        ) : isBattleReady ? (
          <div
            className="flex items-center gap-1 px-1.5 py-0.5 rounded-sm border shadow-sm"
            style={{
              backgroundColor: `${primaryHex}1A`,
              borderColor: '#FBBF2480',
              boxShadow: `0 0 10px ${primaryHex}4D`
            }}
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-sm opacity-75" style={{ backgroundColor: '#FBBF24' }}></span>
              <span className="relative inline-flex rounded-sm h-1.5 w-1.5" style={{ backgroundColor: '#FBBF24' }}></span>
            </span>
            <span className="text-[6.5px] font-black uppercase tracking-widest text-[#FDE68A]">LIVE BO3</span>
          </div>
        ) : (
          <span className="text-[7px] font-mono text-white/40 uppercase">BO3</span>
        )}
      </div>

      {/* TI10 Chamfered Outer Chassis Plate */}
      <div
        className="w-full xl:min-w-[195px] sm:min-w-[215px] xl:max-w-[320px] 2xl:max-w-[340px] p-[1.5px] transition-all duration-300 cursor-pointer relative group-hover/match:scale-[1.02]"
        style={{
          clipPath: CHAMFER_CLIP,
          background: m.isCompleted
            ? `linear-gradient(135deg, #FBBF24 0%, ${primaryHex} 50%, #D97706 100%)`
            : isBattleReady
            ? `linear-gradient(135deg, #FDE047 0%, ${primaryHex} 50%, #F59E0B 100%)`
            : 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.06) 100%)',
          filter: m.isCompleted
            ? `drop-shadow(0 10px 25px rgba(0,0,0,0.9)) drop-shadow(0 0 16px ${primaryHex}33)`
            : isBattleReady
            ? `drop-shadow(0 10px 25px rgba(0,0,0,0.9)) drop-shadow(0 0 20px ${primaryHex}55)`
            : 'drop-shadow(0 8px 18px rgba(0,0,0,0.8))'
        }}
        onClick={() => handleCardClick(m)}
      >
        {/* Inner Chamfered Dark Plate */}
        <div
          className="w-full h-[64px] sm:h-[68px] relative overflow-hidden flex flex-col justify-center"
          style={{
            clipPath: CHAMFER_CLIP,
            background: m.isCompleted || isBattleReady
              ? 'radial-gradient(circle at 50% 0%, rgba(20, 14, 30, 0.98) 0%, rgba(8, 7, 13, 0.98) 100%)'
              : 'radial-gradient(circle at 50% 0%, rgba(15, 14, 20, 0.95) 0%, rgba(6, 6, 10, 0.95) 100%)'
          }}
        >
          {isBattleReady && (
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
              <div
                className="w-full h-1 blur-[1px] animate-scanning"
                style={{ backgroundColor: `${primaryHex}33` }}
              />
            </div>
          )}

          {/* Interactive Light Sweep on hover */}
          <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/match:translate-x-full transition-transform duration-700 pointer-events-none z-20" />

          {/* Contender Rows */}
          <div className="divide-y divide-white/10 relative z-10">
            {[1, 2].map(i => {
              const isW = i === 1 ? m.isW1 : m.isW2;
              const p = i === 1 ? m.p1 : m.p2;
              const t = i === 1 ? m.t1 : m.t2;
              const s = i === 1 ? m.s1 : m.s2;
              const logoUrl = resolveLogo(t?.logoUrl, m[`player${i}Id`], p.name);

              return (
                <div
                  key={i}
                  className="flex items-center justify-between px-2 sm:px-2.5 h-[31px] sm:h-[34px] relative transition-colors"
                  style={isW ? {
                    background: `linear-gradient(90deg, ${primaryHex}35 0%, rgba(251, 191, 36, 0.12) 60%, transparent 100%)`
                  } : undefined}
                >
                  {/* Left Accent Bar - Gold for Winner, Season Hex for Contender */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-[2.5px] transition-all duration-300"
                    style={{
                      backgroundColor: isW ? '#FBBF24' : (isBattleReady ? primaryHex : 'rgba(255,255,255,0.15)'),
                      boxShadow: isW ? '0 0 10px #FBBF24' : (isBattleReady ? `0 0 8px ${primaryHex}` : undefined)
                    }}
                  />

                  <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1 pr-1.5 sm:pr-2 pl-1">
                    <Avatar
                      className="h-5 w-5 sm:h-6 sm:w-6 border transition-all duration-300 rounded-sm shrink-0 bg-black/80 overflow-hidden flex items-center justify-center p-0.5"
                      style={isW ? {
                        borderColor: '#FBBF24',
                        boxShadow: '0 0 8px rgba(251, 191, 36, 0.8)',
                      } : {
                        borderColor: 'rgba(255,255,255,0.15)'
                      }}
                    >
                      <AvatarImage
                        key={logoUrl}
                        src={logoUrl}
                        className="object-contain w-full h-full"
                        referrerPolicy="no-referrer"
                      />
                      <AvatarFallback className="bg-black/60 font-black text-[7.5px] rounded-sm text-white/70">
                        <User className="w-2.5 h-2.5" />
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex items-center gap-1 sm:gap-1.5 min-w-0 flex-1">
                      <span
                        className={cn(
                          "text-[10px] sm:text-[11px] font-bold truncate uppercase font-headline transition-colors inline-block pr-1 max-w-full",
                          !isW && "text-white/85"
                        )}
                        style={isW ? {
                          color: '#FFFBEB',
                          textShadow: `0 0 10px ${primaryHex}`
                        } : undefined}
                        title={p.name}
                        suppressHydrationWarning
                      >
                        {p.name}
                      </span>
                      {isW && (
                        <Crown
                          className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0 text-[#FBBF24] animate-bounce"
                          style={{ filter: 'drop-shadow(0 0 4px #FBBF24)' }}
                        />
                      )}
                    </div>
                  </div>

                  {/* Score Indicator Box */}
                  <div
                    className="w-5 h-4.5 sm:w-6 sm:h-5 rounded-sm border flex items-center justify-center transition-all shrink-0 font-mono"
                    style={isW ? {
                      backgroundColor: 'rgba(251, 191, 36, 0.2)',
                      borderColor: '#FBBF2480',
                      boxShadow: '0 0 8px rgba(251, 191, 36, 0.5)'
                    } : {
                      backgroundColor: 'rgba(255,255,255,0.04)',
                      borderColor: 'rgba(255,255,255,0.12)'
                    }}
                  >
                    <span
                      className="text-[10px] sm:text-[11px] font-black tabular-nums leading-none font-headline"
                      style={{
                        color: isW ? '#FDE68A' : 'rgba(255,255,255,0.4)',
                        filter: isW ? 'drop-shadow(0 0 6px #FBBF24)' : undefined
                      }}
                      suppressHydrationWarning
                    >
                      {m.isCompleted ? s : '-'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
