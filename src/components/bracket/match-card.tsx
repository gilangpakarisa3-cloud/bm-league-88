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
      <div className="flex flex-col gap-1 items-center group/proj w-full">
        {/* Match Header Tag */}
        <div className="flex items-center justify-between w-full max-w-[320px] 2xl:max-w-[340px] px-1">
          <span
            className="text-[8px] font-black tracking-widest uppercase italic font-headline"
            style={{ color: primaryHex }}
          >
            {label}
          </span>
          <Badge
            variant="outline"
            className="h-3 text-[6.5px] py-0 px-1 font-black uppercase italic rounded-full"
            style={{
              borderColor: `${primaryHex}66`,
              color: primaryHex,
              backgroundColor: `${primaryHex}1A`
            }}
          >
            PROYEKSI
          </Badge>
        </div>

        {/* Cockpit Card Plate */}
        <div
          className="w-full min-w-[195px] sm:min-w-[215px] max-w-[320px] 2xl:max-w-[340px] h-[70px] rounded-xl border bg-gradient-to-r from-black/95 via-[#0c0e14]/90 to-black/95 backdrop-blur-2xl cursor-pointer transition-all duration-300 relative overflow-hidden group-hover/proj:scale-[1.02] flex flex-col justify-center"
          style={{
            borderColor: `${primaryHex}4D`,
            boxShadow: `0 8px 25px rgba(0,0,0,0.8), 0 0 15px ${primaryHex}20`
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
          {/* Active Left Neon Line */}
          <div
            className="absolute left-0 top-0 bottom-0 w-1 rounded-l-full"
            style={{
              background: `linear-gradient(to bottom, ${secondaryHex}, ${primaryHex})`,
              boxShadow: `0 0 8px ${primaryHex}`
            }}
          />
          
          {/* Interactive Light Sweep */}
          <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover/proj:translate-x-full transition-transform duration-700 pointer-events-none" />

          {/* Rows */}
          <div className="divide-y divide-white/10 relative z-10">
            {[p1, p2].map((player, idx) => {
              const name = player.playerName || player.name || player.teamName || 'TBD';
              const logoUrl = idx === 0 ? logo1 : logo2;
              return (
                <div key={idx} className="flex items-center justify-between px-2.5 h-[35px] group-hover/proj:bg-white/[0.03] transition-colors">
                  <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                    <Avatar className="h-6 w-6 border border-white/15 opacity-80 group-hover/proj:opacity-100 transition-opacity rounded-md shrink-0 bg-black/60 overflow-hidden flex items-center justify-center p-0.5">
                      <AvatarImage key={logoUrl} src={logoUrl} className="object-contain w-full h-full" referrerPolicy="no-referrer" />
                      <AvatarFallback className="bg-black/60 font-black text-[7px] rounded-md text-white/70"><User className="w-2.5 h-2.5"/></AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <span
                        className="text-[10.5px] sm:text-[11.5px] font-black truncate uppercase italic text-white/80 group-hover/proj:text-white transition-colors font-headline inline-block pr-1.5 max-w-full"
                        title={name}
                        suppressHydrationWarning
                      >
                        {name}
                      </span>
                    </div>
                  </div>
                  <div className="w-6 h-5 rounded border border-white/10 bg-white/[0.03] flex items-center justify-center text-center shrink-0">
                    <span className="text-[10px] font-black italic text-white/30 tabular-nums leading-none font-mono">-</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (!m) {
    return (
      <div className="flex flex-col gap-1 items-center group/calib w-full">
        <span className="text-[8px] font-black tracking-widest text-white/30 uppercase italic font-headline">{label}</span>
        <div className="w-full min-w-[195px] sm:min-w-[215px] max-w-[320px] 2xl:max-w-[340px] h-[70px] bg-gradient-to-b from-white/[0.02] to-black/80 border border-white/10 rounded-xl flex flex-col items-center justify-center gap-0.5 backdrop-blur-xl relative overflow-hidden transition-all shadow-md">
          <div className="flex items-center gap-1.5 opacity-80">
            <Scan className="w-3 h-3 animate-pulse" style={{ color: primaryHex }} />
            <span className="text-[7.5px] font-black tracking-[0.2em] uppercase italic text-white/60">STANDBY // TBD</span>
          </div>
          <span className="text-[6.5px] font-black tracking-[0.2em] text-white/25 uppercase font-mono">AWAITING RESULTS</span>
        </div>
      </div>
    );
  }

  const isBattleReady = !m.isCompleted && m.player1Id !== 'TBD' && m.player2Id !== 'TBD';

  return (
    <div className="flex flex-col gap-1 relative items-center group/match w-full">
      {/* Match Header Tag */}
      <div className="flex items-center justify-between w-full max-w-[320px] 2xl:max-w-[340px] px-1">
        <span
          className="text-[8px] font-black tracking-widest uppercase italic font-headline transition-colors"
          style={{
            color: m.isCompleted ? primaryHex : isBattleReady ? primaryHex : 'rgba(255,255,255,0.4)',
            filter: isBattleReady ? `drop-shadow(0 0 8px ${primaryHex}99)` : undefined
          }}
        >
          {label}
        </span>
        {m.isCompleted ? (
          <span
            className="text-[7.5px] font-black uppercase tracking-wider flex items-center gap-1 font-mono"
            style={{ color: primaryHex }}
          >
            <CheckCircle2 className="w-2.5 h-2.5" style={{ color: primaryHex }} /> FINAL
          </span>
        ) : isBattleReady ? (
          <div
            className="flex items-center gap-1 px-1.5 py-0.2 rounded-full border shadow-sm"
            style={{
              backgroundColor: `${primaryHex}1A`,
              borderColor: `${primaryHex}4D`,
              boxShadow: `0 0 8px ${primaryHex}40`
            }}
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: primaryHex }}></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ backgroundColor: primaryHex }}></span>
            </span>
            <span className="text-[6px] font-black uppercase tracking-widest italic" style={{ color: primaryHex }}>LIVE BO3</span>
          </div>
        ) : (
          <span className="text-[7px] font-mono text-white/30 uppercase">BO3</span>
        )}
      </div>

      {/* Cockpit Card Plate */}
      <div
        className="w-full xl:min-w-[195px] sm:min-w-[215px] xl:max-w-[320px] 2xl:max-w-[340px] h-[64px] sm:h-[70px] overflow-hidden border transition-all duration-300 cursor-pointer rounded-xl relative group-hover/match:scale-[1.02] backdrop-blur-2xl flex flex-col justify-center"
        style={
          m.isCompleted ? {
            borderColor: `${primaryHex}66`,
            background: 'linear-gradient(to right, rgba(0,0,0,0.95), rgba(12,14,20,0.92), rgba(0,0,0,0.95))',
            boxShadow: `0 8px 25px rgba(0,0,0,0.8), 0 0 16px ${primaryHex}26`
          } : isBattleReady ? {
            borderColor: `${primaryHex}B3`,
            background: 'linear-gradient(to right, rgba(0,0,0,0.95), rgba(15,18,24,0.92), rgba(0,0,0,0.95))',
            boxShadow: `0 8px 30px rgba(0,0,0,0.8), 0 0 20px ${primaryHex}40`
          } : {
            borderColor: 'rgba(255,255,255,0.15)',
            background: 'rgba(0,0,0,0.8)'
          }
        }
        onClick={() => handleCardClick(m)}
      >
        {isBattleReady && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
            <div
              className="w-full h-1 blur-[1px] animate-scanning"
              style={{ backgroundColor: `${primaryHex}33` }}
            />
          </div>
        )}

        {/* Left Neon Accent Bar */}
        <div
          className="absolute left-0 top-0 bottom-0 w-1 transition-all duration-500 rounded-l-full"
          style={
            m.isCompleted ? {
              backgroundColor: primaryHex,
              boxShadow: `0 0 10px ${primaryHex}`
            } : isBattleReady ? {
              backgroundColor: primaryHex,
              boxShadow: `0 0 8px ${primaryHex}`
            } : {
              backgroundColor: 'rgba(255,255,255,0.1)'
            }
          }
        />

        {/* Interactive Light Sweep on hover */}
        <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover/match:translate-x-full transition-transform duration-700 pointer-events-none" />

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
                className="flex items-center justify-between px-2 sm:px-2.5 h-[32px] sm:h-[35px] relative transition-colors"
                style={isW ? {
                  backgroundColor: `${primaryHex}1A`
                } : undefined}
              >
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1 pr-1.5 sm:pr-2">
                  <Avatar
                    className="h-5 w-5 sm:h-6 sm:w-6 border transition-all duration-300 rounded-md shrink-0 bg-black/60 overflow-hidden flex items-center justify-center p-0.5"
                    style={isW ? {
                      borderColor: primaryHex,
                      boxShadow: `0 0 8px ${primaryHex}99`,
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
                    <AvatarFallback className="bg-black/60 font-black text-[7.5px] rounded-md text-white/70">
                      <User className="w-2.5 h-2.5" />
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex items-center gap-1 sm:gap-1.5 min-w-0 flex-1">
                    <span
                      className={cn(
                        "text-[10px] sm:text-[11.5px] font-black truncate uppercase italic font-headline transition-colors inline-block pr-1 max-w-full",
                        !isW && "text-white/85"
                      )}
                      style={isW ? {
                        color: primaryHex,
                        filter: `drop-shadow(0 0 8px ${primaryHex}B3)`
                      } : undefined}
                      title={p.name}
                      suppressHydrationWarning
                    >
                      {p.name}
                    </span>
                    {isW && (
                      <Crown
                        className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0 animate-bounce"
                        style={{ color: primaryHex }}
                      />
                    )}
                  </div>
                </div>

                {/* Score Indicator Box */}
                <div
                  className="w-5 h-4.5 sm:w-6 sm:h-5 rounded border flex items-center justify-center transition-all shrink-0 font-mono"
                  style={isW ? {
                    backgroundColor: `${primaryHex}33`,
                    borderColor: `${primaryHex}B3`,
                    boxShadow: `0 0 8px ${primaryHex}66`
                  } : {
                    backgroundColor: 'rgba(255,255,255,0.04)',
                    borderColor: 'rgba(255,255,255,0.1)'
                  }}
                >
                  <span
                    className="text-[10px] sm:text-[11px] font-black italic tabular-nums leading-none font-headline"
                    style={{
                      color: isW ? primaryHex : 'rgba(255,255,255,0.4)',
                      filter: isW ? `drop-shadow(0 0 6px ${primaryHex}80)` : undefined
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
  );
};

