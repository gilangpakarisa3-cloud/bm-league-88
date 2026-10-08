'use client';

import { useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Swords, Trophy, Crown, Sparkles, User, Calendar as CalendarIcon, Clock, ChevronRight, Zap, Flame, Scan } from "lucide-react";
import { cn } from "@/lib/utils";
import { resolveLogo } from "@/lib/logo-utils";
import { getSeasonTheme, type TISeasonTheme as SeasonDesignTheme } from "@/lib/season-theme";
import type { WithId, Team, Match, Season, LeagueEntry, Player } from "@/lib/types";
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

export interface GrandFinalPodiumProps {
  bid: string;
  label?: string;
  bracketData: Record<string, any>;
  projections: Record<string, any> | null;
  handleCardClick: (matchData: any) => void;
  teamsById: Record<string, WithId<Team>>;
  seriesLabel?: string;
  season?: WithId<Season> | null;
}

export const GrandFinalPodium = ({
  bid,
  label = "CHAMPIONSHIP BATTLE",
  bracketData,
  projections,
  handleCardClick,
  teamsById,
  seriesLabel,
  season
}: GrandFinalPodiumProps) => {
  const m = bracketData[bid];
  const p = projections ? projections[bid] : null;

  const isCompleted = m?.isCompleted;
  const isBattleReady = m && !m.isCompleted && m.player1Id !== 'TBD' && m.player2Id !== 'TBD';
  const isProjection = !m && !!p;

  // Season-specific dynamic branding
  const theme = getSeasonTheme(season);
  const seasonSysTag = theme.sysTag;
  const seasonPedestal = theme.pedestalText;
  const seasonGfTitle = theme.gfTitle;
  const seasonGfSubtitle = theme.gfSubtitle;
  const seasonSeriesBadge = seriesLabel || theme.seriesBadge;

  // Extract fighter 1 & 2 details
  let p1Name = 'TBD';
  let p2Name = 'TBD';
  let t1Name = 'UNIT CONTENDER';
  let t2Name = 'UNIT CONTENDER';
  let logo1 = '';
  let logo2 = '';
  let s1: number | string = '-';
  let s2: number | string = '-';
  let isW1 = false;
  let isW2 = false;

  if (m) {
    p1Name = m.p1?.name || m.player1Id || 'TBD';
    p2Name = m.p2?.name || m.player2Id || 'TBD';
    t1Name = m.t1?.name || 'UNIT CONTENDER';
    t2Name = m.t2?.name || 'UNIT CONTENDER';
    logo1 = resolveLogo(m.t1?.logoUrl, m.player1Id, p1Name);
    logo2 = resolveLogo(m.t2?.logoUrl, m.player2Id, p2Name);
    s1 = m.s1 ?? 0;
    s2 = m.s2 ?? 0;
    isW1 = m.isW1;
    isW2 = m.isW2;
  } else if (p) {
    p1Name = p.p1?.playerName || p.p1?.name || p.p1?.teamName || 'TBD';
    p2Name = p.p2?.playerName || p.p2?.name || p.p2?.teamName || 'TBD';
    const team1Id = p.p1?.teamId || p.p1?.player1TeamId || '';
    const team2Id = p.p2?.teamId || p.p2?.player1TeamId || '';
    const team1 = team1Id ? teamsById[team1Id] : null;
    const team2 = team2Id ? teamsById[team2Id] : null;
    t1Name = team1?.name || p.p1?.teamName || 'UNIT CONTENDER';
    t2Name = team2?.name || p.p2?.teamName || 'UNIT CONTENDER';
    logo1 = resolveLogo(team1?.logoUrl, team1Id || p.p1?.playerId || p.p1?.id, p1Name);
    logo2 = resolveLogo(team2?.logoUrl, team2Id || p.p2?.playerId || p.p2?.id, p2Name);
  }

  const formattedDate = m?.matchDate ? format(m.matchDate.toDate(), "eeee, d MMM yyyy", { locale: localeId }) : null;

  const onCardClick = () => {
    if (m) {
      handleCardClick(m);
    } else if (p) {
      handleCardClick({
        ...p,
        player1Id: p.p1.playerId || p.p1.id || 'TBD',
        player2Id: p.p2.playerId || p.p2.id || 'TBD',
        id: `proj-${bid}`,
        isProjection: true,
        round: label,
        p1: { name: p1Name, playerId: p.p1.playerId || p.p1.id },
        p2: { name: p2Name, playerId: p.p2.playerId || p.p2.id }
      });
    }
  };

  return (
    <div className="w-full xl:w-auto flex-1 2xl:flex-[1.1] min-w-0 sm:min-w-[320px] max-w-[620px] 2xl:max-w-[680px] flex flex-col relative">
      <div className={cn(
        "flex-1 relative flex flex-col items-center justify-between border-2 rounded-[2rem] p-4 sm:p-6 2xl:p-8 backdrop-blur-3xl cyber-carbon overflow-hidden gap-2 sm:gap-3",
        theme.podiumBg,
        theme.primaryBorder,
        theme.glowShadow
      )}>
        {/* Top Racing Tracer */}
        <div className={cn("absolute top-0 left-0 right-0 h-[2px]", theme.topTracer)} />

        {/* Left Laser Power Conduit */}
        <div className={cn("absolute left-0 top-0 bottom-0 w-[2.5px] z-20", theme.laserConduit)}>
          <div className="w-full h-20 bg-white blur-[1px] animate-scanning" />
        </div>

        {/* Atmospheric Stage Lighting & God Rays */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[420px] h-[220px] bg-gradient-to-b from-amber-400/12 via-amber-500/5 to-transparent blur-[60px] -translate-y-1/3" />
          <div className="absolute top-1/4 -left-12 w-[180px] h-[180px] bg-primary/[0.03] rounded-full blur-[80px] animate-pulse-soft" />
          <div className="absolute bottom-4 -right-12 w-[200px] h-[200px] bg-amber-500/[0.05] rounded-full blur-[90px] animate-pulse-soft" />
          <div className="absolute bottom-0 left-0 right-0 h-28 cyber-grid-overlay opacity-5 [mask-image:linear-gradient(to_bottom,transparent,black_70%)]" />
        </div>

        {/* 1. HUD Telemetry Bar */}
        <div className="w-full flex items-center justify-between gap-2 border-b border-white/10 pb-2.5 mb-1 relative z-10 font-mono text-[8px]">
          <div className={cn("flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/60 border shadow-sm max-w-[50%] overflow-hidden", theme.tagBorder)}>
            <span className="relative flex h-1.5 w-1.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-400"></span>
            </span>
            <span className={cn("font-black uppercase tracking-[0.2em] italic truncate", theme.primaryText)}>{seasonSysTag}</span>
          </div>
          <div className="flex items-center gap-1.5 text-white/40 uppercase tracking-[0.2em] font-bold shrink-0">
            <span>OLYMPUS</span>
            <span className={theme.primaryText}>❯❯</span>
            <span>GLORY</span>
          </div>
          <div>
            {isCompleted ? (
              <Badge className="bg-amber-400 text-black font-black uppercase tracking-widest text-[7.5px] px-2.5 py-0.5 rounded-full shadow-[0_0_10px_rgba(251,191,36,0.6)]">
                🏆 CHAMPION DECIDED
              </Badge>
            ) : isBattleReady ? (
              <Badge className="bg-primary/20 border border-primary/50 text-primary font-black uppercase tracking-widest text-[7.5px] px-2.5 py-0.5 rounded-full animate-pulse">
                ⚡ LIVE BATTLE
              </Badge>
            ) : (
              <Badge className="bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-black uppercase tracking-widest text-[7.5px] px-2.5 py-0.5 rounded-full">
                SIMULASI PROYEKSI
              </Badge>
            )}
          </div>
        </div>

        {/* 2. Concentric & Pristine Championship Trophy Crest Lockup (Adaptive & Enlarged) */}
        <div className="relative group/trophy cursor-default flex flex-col items-center my-1 sm:my-3 z-10">
          {/* Floating Golden Crown above the emblem */}
          <div className="mb-1 sm:mb-2.5 flex items-center justify-center">
            <div className={cn("px-2.5 sm:px-4 py-0.5 sm:py-1 rounded-full bg-black/90 border shadow-lg flex items-center gap-1.5 sm:gap-2", theme.tagBorder)}>
              <Crown className={cn("w-3.5 h-3.5 sm:w-5 sm:h-5", theme.trophyColor)} />
              <span className={cn("text-[7.5px] sm:text-[10px] font-black tracking-[0.2em] sm:tracking-[0.25em] uppercase font-mono", theme.primaryText)}>
                {theme.trophyCrownText}
              </span>
            </div>
          </div>

          {/* Concentric Geometric Orbit (Adaptive Scale: 112px mobile -> 192px -> 224px -> 256px) */}
          <div className="relative w-28 h-28 sm:w-48 sm:h-48 md:w-56 md:h-56 2xl:w-64 2xl:h-64 flex items-center justify-center">
            {/* Ambient Radiance Halo */}
            <div className={cn("absolute inset-0 rounded-full bg-gradient-to-tr blur-xl sm:blur-2xl opacity-85 pointer-events-none", theme.concentricHalo)} />

            {/* Outer Precision Orbital Ring with Cardinal Satellites */}
            <div className="absolute inset-0 m-auto w-[94%] h-[94%] rounded-full border border-amber-400/40 pointer-events-none flex items-center justify-center">
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,1)]" />
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,1)]" />
              <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,1)]" />
              <div className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,1)]" />
            </div>

            {/* Middle Concentric Dashed Ring */}
            <div className="absolute inset-0 m-auto w-[78%] h-[78%] rounded-full border border-dashed border-amber-300/35 pointer-events-none" />

            {/* Central 24K Gold Crystal Core Shield (Aegis Throneroom) */}
            <div className={cn("relative w-[60%] h-[60%] rounded-full bg-gradient-to-br border-2 flex items-center justify-center shadow-2xl backdrop-blur-md transition-transform duration-500 group-hover/trophy:scale-105 holo-shimmer-gold", theme.trophyShield)}>
              <Trophy className={cn("w-[62%] h-[62%] animate-float", theme.trophyColor)} />
              <Sparkles className="absolute top-2 right-2 w-2.5 h-2.5 sm:w-4 sm:h-4 text-amber-200 animate-pulse" />
              <Sparkles className="absolute bottom-2 left-2 w-2.5 h-2.5 sm:w-4 sm:h-4 text-primary animate-pulse" />
            </div>
          </div>

          {/* Pedestal Base cleanly spaced below */}
          <div className="flex flex-col items-center mt-2 sm:mt-4">
            <div className="h-[2px] sm:h-[2.5px] w-28 sm:w-52 2xl:w-64 bg-gradient-to-r from-transparent via-amber-400/90 to-transparent rounded-full shadow-[0_0_8px_rgba(251,191,36,0.9)]" />
            <div className={cn("mt-1 px-3 sm:px-5 py-0.5 sm:py-1 rounded-full bg-black/90 border font-mono text-[7.5px] sm:text-[10.5px] font-black tracking-[0.2em] sm:tracking-[0.25em] uppercase italic shadow-sm text-center", theme.tagBorder, theme.primaryText)}>
              {seasonPedestal}
            </div>
          </div>
        </div>

        {/* 3. Ultra-Sporty Championship Typography */}
        <div className="text-center space-y-1 sm:space-y-1.5 relative z-10 my-1 sm:my-2 px-2">
          <div className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 via-black to-primary/20 border border-amber-400/50 text-amber-300 font-black uppercase text-[7.5px] sm:text-[9.5px] tracking-[0.2em] sm:tracking-[0.25em] italic shadow-[0_0_10px_rgba(251,191,36,0.2)]">
            <Zap className="w-2.5 h-2.5 fill-amber-400 text-amber-400 animate-pulse" />
            <span>{seasonSeriesBadge}</span>
            <Zap className="w-2.5 h-2.5 fill-primary text-primary animate-pulse" />
          </div>
          
          <div className="relative">
            <h3 className={cn("inline-block pr-2 sm:pr-4 pb-0.5 sm:pb-1 text-xl sm:text-3xl 2xl:text-4xl font-black tracking-tight uppercase italic leading-none font-headline text-white [webkit-background-clip:text] bg-clip-text [-webkit-text-fill-color:transparent] bg-gradient-to-b", theme.gfTitleGradient)}>
              {seasonGfTitle}
            </h3>
            <div className="h-[2px] w-28 sm:w-48 mx-auto bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_8px_rgba(251,191,36,0.9)] mt-1 sm:mt-1.5" />
          </div>

          <p className="text-[7.5px] sm:text-[8px] font-mono font-bold tracking-[0.2em] sm:tracking-[0.25em] text-white/50 uppercase">
            {seasonGfSubtitle}
          </p>
        </div>

        <div 
          className="w-full max-w-[560px] 2xl:max-w-[620px] rounded-2xl border bg-gradient-to-br from-black/95 via-[#0d1017]/95 to-black/95 backdrop-blur-2xl p-3 sm:p-4 2xl:p-5 relative overflow-hidden transition-all duration-300 hover:scale-[1.01] cursor-pointer group/duel shadow-[0_12px_40px_rgba(0,0,0,0.95)] z-10"
          style={{
            borderColor: `${theme.primaryHex}66`,
            boxShadow: `0 12px 40px rgba(0,0,0,0.95), 0 0 25px ${theme.primaryHex}26`
          }}
          onClick={onCardClick}
        >
          {/* Holographic light sweep on hover */}
          <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/duel:translate-x-full transition-transform duration-700 pointer-events-none" />

          {/* Top Card Banner */}
          <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2 font-mono">
            <div className="flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 animate-pulse" style={{ color: theme.secondaryHex || theme.primaryHex }} />
              <span className="text-[8.5px] font-black uppercase tracking-widest italic font-headline" style={{ color: theme.secondaryHex || theme.primaryHex }}>{label}</span>
            </div>
            <div className="flex items-center gap-1 text-[8px] font-bold text-white/50 uppercase tracking-wider">
              {formattedDate ? (
                <span className="flex items-center gap-1"><CalendarIcon className="w-3 h-3" style={{ color: theme.secondaryHex || theme.primaryHex }} /> {formattedDate}</span>
              ) : isProjection ? (
                <Badge variant="outline" className="h-4 text-[7.5px] border-cyan-500/40 text-cyan-300 py-0 px-2 font-black uppercase italic bg-cyan-500/10 rounded-full">SIMULASI PROYEKSI</Badge>
              ) : (
                <span className="flex items-center gap-1 text-white/40"><Clock className="w-3 h-3" /> JADWAL TBD</span>
              )}
            </div>
          </div>

          {/* Fighter 1 Showcase */}
          <div
            className={cn(
              "flex items-center justify-between p-2 sm:p-3 rounded-xl transition-all relative",
              isW1 ? "border shadow-lg" : "bg-white/[0.02] border border-white/5 hover:border-white/20"
            )}
            style={isW1 ? {
              backgroundColor: `${theme.primaryHex}20`,
              borderColor: `${theme.primaryHex}99`,
              boxShadow: `0 0 16px ${theme.primaryHex}40`
            } : undefined}
          >
            <div className="flex items-center gap-2 sm:gap-3 overflow-hidden pr-1.5 sm:pr-2 min-w-0 flex-1">
              <div className="relative shrink-0">
                <Avatar
                  className="h-8 w-8 sm:h-11 sm:w-11 border-2 transition-all duration-300 rounded-lg sm:rounded-xl bg-black/60 overflow-hidden flex items-center justify-center p-0.5 sm:p-1"
                  style={isW1 ? {
                    borderColor: theme.primaryHex,
                    boxShadow: `0 0 12px ${theme.primaryHex}99`,
                  } : {
                    borderColor: 'rgba(255,255,255,0.2)'
                  }}
                >
                  <AvatarImage key={logo1} src={logo1} className="object-contain w-full h-full" referrerPolicy="no-referrer" />
                  <AvatarFallback className="bg-black/60 font-black text-[9px] rounded-lg"><User className="w-3.5 h-3.5"/></AvatarFallback>
                </Avatar>
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={cn(
                      "text-sm sm:text-[15px] font-black uppercase italic font-headline transition-colors inline-block pr-1.5 truncate max-w-[140px] sm:max-w-[200px]",
                      !isW1 && "text-white"
                    )}
                    style={isW1 ? {
                      color: theme.secondaryHex || theme.primaryHex,
                      filter: `drop-shadow(0 0 8px ${theme.primaryHex}99)`
                    } : undefined}
                    title={p1Name}
                    suppressHydrationWarning
                  >
                    {p1Name}
                  </span>
                  {isW1 && (
                    <Badge
                      className="text-black font-black uppercase text-[7.5px] px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1 shadow-md font-sans"
                      style={{
                        background: `linear-gradient(to right, ${theme.secondaryHex || '#FBBF24'}, ${theme.primaryHex || '#F59E0B'})`,
                        boxShadow: `0 0 10px ${theme.primaryHex}80`
                      }}
                    >
                      <Crown className="w-3 h-3 fill-current" />
                      CHAMPION
                    </Badge>
                  )}
                </div>
                <span className="text-[9.5px] font-bold text-white/40 truncate uppercase tracking-wider font-mono">
                  {t1Name}
                </span>
              </div>
            </div>
            
            {/* LED Score Box 1 */}
            <div
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl border flex flex-col items-center justify-center shrink-0 transition-all font-mono"
              style={isW1 ? {
                backgroundColor: `${theme.primaryHex}33`,
                borderColor: `${theme.primaryHex}B3`,
                boxShadow: `0 0 12px ${theme.primaryHex}66`,
                color: theme.secondaryHex || theme.primaryHex
              } : {
                backgroundColor: 'rgba(0,0,0,0.7)',
                borderColor: 'rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.4)'
              }}
            >
              <span
                className="text-base sm:text-lg font-black italic leading-none font-headline tabular-nums"
                style={isW1 ? {
                  color: theme.secondaryHex || theme.primaryHex,
                  filter: `drop-shadow(0 0 6px ${theme.primaryHex}80)`
                } : undefined}
                suppressHydrationWarning
              >
                {m ? s1 : '-'}
              </span>
            </div>
          </div>

          {/* The Duel Nexus Center Divider */}
          <div className="relative py-1.5 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div
              className="relative px-3 py-0.5 rounded-full bg-black/95 border shadow-sm flex items-center gap-1.5"
              style={{
                borderColor: `${theme.primaryHex}66`,
                boxShadow: `0 0 10px ${theme.primaryHex}40`
              }}
            >
              <Swords className="w-3 h-3 animate-pulse" style={{ color: theme.secondaryHex || theme.primaryHex }} />
              <span className="text-[8px] font-black italic tracking-wider uppercase font-headline" style={{ color: theme.secondaryHex || theme.primaryHex }}>VS</span>
              <Zap className="w-3 h-3 animate-pulse" style={{ color: theme.primaryHex }} />
            </div>
          </div>

          {/* Fighter 2 Showcase */}
          <div
            className={cn(
              "flex items-center justify-between p-2 sm:p-3 rounded-xl transition-all relative",
              isW2 ? "border shadow-lg" : "bg-white/[0.02] border border-white/5 hover:border-white/20"
            )}
            style={isW2 ? {
              backgroundColor: `${theme.primaryHex}20`,
              borderColor: `${theme.primaryHex}99`,
              boxShadow: `0 0 16px ${theme.primaryHex}40`
            } : undefined}
          >
            <div className="flex items-center gap-2 sm:gap-3 overflow-hidden pr-1.5 sm:pr-2 min-w-0 flex-1">
              <div className="relative shrink-0">
                <Avatar
                  className="h-8 w-8 sm:h-11 sm:w-11 border-2 transition-all duration-300 rounded-lg sm:rounded-xl bg-black/60 overflow-hidden flex items-center justify-center p-0.5 sm:p-1"
                  style={isW2 ? {
                    borderColor: theme.primaryHex,
                    boxShadow: `0 0 12px ${theme.primaryHex}99`,
                  } : {
                    borderColor: 'rgba(255,255,255,0.2)'
                  }}
                >
                  <AvatarImage key={logo2} src={logo2} className="object-contain w-full h-full" referrerPolicy="no-referrer" />
                  <AvatarFallback className="bg-black/60 font-black text-[9px] rounded-lg"><User className="w-3.5 h-3.5"/></AvatarFallback>
                </Avatar>
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={cn(
                      "text-sm sm:text-[15px] font-black uppercase italic font-headline transition-colors inline-block pr-1.5 truncate max-w-[140px] sm:max-w-[200px]",
                      !isW2 && "text-white"
                    )}
                    style={isW2 ? {
                      color: theme.secondaryHex || theme.primaryHex,
                      filter: `drop-shadow(0 0 8px ${theme.primaryHex}99)`
                    } : undefined}
                    title={p2Name}
                    suppressHydrationWarning
                  >
                    {p2Name}
                  </span>
                  {isW2 && (
                    <Badge
                      className="text-black font-black uppercase text-[7.5px] px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1 shadow-md font-sans"
                      style={{
                        background: `linear-gradient(to right, ${theme.secondaryHex || '#FBBF24'}, ${theme.primaryHex || '#F59E0B'})`,
                        boxShadow: `0 0 10px ${theme.primaryHex}80`
                      }}
                    >
                      <Crown className="w-3 h-3 fill-current" />
                      CHAMPION
                    </Badge>
                  )}
                </div>
                <span className="text-[9.5px] font-bold text-white/40 truncate uppercase tracking-wider font-mono">
                  {t2Name}
                </span>
              </div>
            </div>
            
            {/* LED Score Box 2 */}
            <div
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl border flex flex-col items-center justify-center shrink-0 transition-all font-mono"
              style={isW2 ? {
                backgroundColor: `${theme.primaryHex}33`,
                borderColor: `${theme.primaryHex}B3`,
                boxShadow: `0 0 12px ${theme.primaryHex}66`,
                color: theme.secondaryHex || theme.primaryHex
              } : {
                backgroundColor: 'rgba(0,0,0,0.7)',
                borderColor: 'rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.4)'
              }}
            >
              <span
                className="text-base sm:text-lg font-black italic leading-none font-headline tabular-nums"
                style={isW2 ? {
                  color: theme.secondaryHex || theme.primaryHex,
                  filter: `drop-shadow(0 0 6px ${theme.primaryHex}80)`
                } : undefined}
                suppressHydrationWarning
              >
                {m ? s2 : '-'}
              </span>
            </div>
          </div>

          {/* Card Footer HUD Action Pill */}
          <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-white/50 font-mono transition-colors">
            <span className="flex items-center gap-1" style={{ color: theme.primaryHex }}>
              <Scan className="w-3 h-3" style={{ color: theme.primaryHex }} /> APEX CONTROL
            </span>
            <span className="flex items-center gap-1 group-hover/duel:translate-x-1 transition-transform font-bold" style={{ color: theme.secondaryHex || theme.primaryHex }}>
              HUD ANALISIS ❯❯
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
