'use client';

import { useMemo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { User, Calendar as CalendarIcon, Clock, Zap, Flame, Scan, ChevronRight, Swords, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { resolveLogo } from "@/lib/logo-utils";
import { getSeasonTheme, type TISeasonTheme as SeasonDesignTheme } from "@/lib/season-theme";
import type { WithId, Team, Match, Season } from "@/lib/types";
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
  divisionName?: string;
}

export const GrandFinalPodium = ({
  bid,
  label = "CHAMPIONSHIP BATTLE",
  bracketData,
  projections,
  handleCardClick,
  teamsById,
  seriesLabel,
  season,
  divisionName
}: GrandFinalPodiumProps) => {
  const m = bracketData[bid];
  const p = projections ? projections[bid] : null;

  const isCompleted = m?.isCompleted;
  const isBattleReady = m && !m.isCompleted && m.player1Id !== 'TBD' && m.player2Id !== 'TBD';
  const isProjection = !m && !!p;

  // Season-specific dynamic branding
  const theme = getSeasonTheme(season);
  const primaryHex = theme.primaryHex || '#A855F7';
  const secondaryHex = theme.secondaryHex || primaryHex;
  const seasonSysTag = theme.sysTag;
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
    <div className="w-full xl:w-auto flex-1 2xl:flex-[1.15] min-w-0 sm:min-w-[340px] max-w-[640px] 2xl:max-w-[700px] flex flex-col relative select-none">
      {/* VCT Tactical Cyber Card Chassis */}
      <div
        onClick={onCardClick}
        className={cn(
          "flex-1 relative flex flex-col justify-between border-2 rounded-[1.75rem] sm:rounded-[2rem] p-4 sm:p-6 2xl:p-7 backdrop-blur-3xl bg-gradient-to-br from-[#090C14]/98 via-[#06080D]/98 to-[#0B0E17]/98 overflow-hidden gap-3 cursor-pointer group/vct transition-all duration-300 hover:scale-[1.01] shadow-[0_20px_60px_rgba(0,0,0,0.92)]",
          theme.primaryBorder
        )}
        style={{
          boxShadow: `0 20px 60px rgba(0,0,0,0.92), 0 0 35px ${primaryHex}26`
        }}
      >
        {/* Top Tracer Line with Dynamic Gradient */}
        <div
          className="absolute top-0 left-0 right-0 h-[2.5px] z-20"
          style={{
            background: `linear-gradient(90deg, transparent, ${primaryHex}, #FFFFFF, ${primaryHex}, transparent)`
          }}
        />

        {/* Ambient Tactical Grid and Soft Glow Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div
            className="absolute -top-16 left-1/2 -translate-x-1/2 w-[380px] h-[190px] rounded-full blur-[70px] opacity-25"
            style={{ backgroundColor: primaryHex }}
          />
          <div
            className="absolute -bottom-16 right-0 w-[260px] h-[180px] rounded-full blur-[80px] opacity-20"
            style={{ backgroundColor: secondaryHex }}
          />
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:16px_16px] opacity-30" />
        </div>

        {/* 1. HUD Telemetry Bar */}
        <div className="w-full flex items-center justify-between gap-2 border-b border-white/10 pb-2.5 relative z-10 font-mono text-[8px] sm:text-[8.5px]">
          <div
            className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/70 border shadow-sm max-w-[55%] overflow-hidden"
            style={{ borderColor: `${primaryHex}4D` }}
          >
            <span className="relative flex h-1.5 w-1.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: primaryHex }} />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ backgroundColor: primaryHex }} />
            </span>
            <span className="font-black uppercase tracking-[0.2em] italic truncate" style={{ color: primaryHex }}>
              {divisionName ? `${seasonSysTag} • ${divisionName}` : seasonSysTag}
            </span>
          </div>

          <div className="flex items-center gap-1 text-[8px] font-bold text-white/50 uppercase tracking-wider">
            {formattedDate ? (
              <span className="flex items-center gap-1"><CalendarIcon className="w-3 h-3" style={{ color: primaryHex }} /> {formattedDate}</span>
            ) : isProjection ? (
              <Badge variant="outline" className="h-4 text-[7px] border-cyan-500/40 text-cyan-300 py-0 px-2 font-black uppercase italic bg-cyan-500/10 rounded-full">SIMULASI PROYEKSI</Badge>
            ) : (
              <span className="flex items-center gap-1 text-white/40"><Clock className="w-3 h-3" /> JADWAL TBD</span>
            )}
          </div>

          <div>
            {isCompleted ? (
              <Badge
                className="text-black font-black uppercase tracking-widest text-[7.5px] px-2.5 py-0.5 rounded-full shadow-md font-mono"
                style={{ backgroundColor: primaryHex }}
              >
                DECIDED
              </Badge>
            ) : isBattleReady ? (
              <Badge
                className="border font-black uppercase tracking-widest text-[7.5px] px-2.5 py-0.5 rounded-full animate-pulse font-mono"
                style={{
                  backgroundColor: `${primaryHex}20`,
                  borderColor: `${primaryHex}60`,
                  color: primaryHex
                }}
              >
                ⚡ LIVE BO3
              </Badge>
            ) : (
              <Badge className="bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-black uppercase tracking-widest text-[7.5px] px-2 py-0.5 rounded-full font-mono">
                PROYEKSI
              </Badge>
            )}
          </div>
        </div>

        {/* 2. Tactical Head Title (Pure Sports Typography, No Tacky Floating Trophy) */}
        <div className="text-center space-y-1 relative z-10 px-1 py-1">
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-0.5 rounded-full bg-white/[0.04] border border-white/10 text-white/80 font-mono text-[8px] sm:text-[9px] font-black uppercase tracking-[0.25em] italic">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: primaryHex }} />
            <span>{divisionName ? `${seasonSeriesBadge} • ${divisionName.toUpperCase()}` : seasonSeriesBadge}</span>
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: secondaryHex }} />
          </div>

          <div className="relative pt-1">
            <h3
              className="text-xl sm:text-2xl 2xl:text-3xl font-black tracking-tight uppercase leading-none font-headline text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]"
              style={{
                textShadow: `0 0 25px ${primaryHex}40`
              }}
            >
              {divisionName ? `${seasonGfTitle} - ${divisionName.toUpperCase()}` : seasonGfTitle}
            </h3>
            <div
              className="h-[2px] w-32 sm:w-48 mx-auto mt-1.5 rounded-full"
              style={{
                background: `linear-gradient(90deg, transparent, ${primaryHex}, transparent)`
              }}
            />
          </div>

          <p className="text-[7.5px] sm:text-[8px] font-mono font-bold tracking-[0.22em] text-white/50 uppercase pt-0.5">
            {divisionName ? `PENENTUAN JUARA ${divisionName.toUpperCase()} • ${seasonGfSubtitle}` : seasonGfSubtitle}
          </p>
        </div>

        {/* 3. VCT Tactical Split-Poster Face-Off Layout (Clean, Sharp, High Contrast) */}
        <div className="relative z-10 flex flex-col gap-2 my-1">
          {/* Fighter 1 Tactical Banner (Top Slot / Seed A) */}
          <div
            className={cn(
              "flex items-center justify-between p-3 sm:p-4 rounded-xl sm:rounded-2xl border transition-all relative overflow-hidden group/f1",
              isW1
                ? "bg-white/[0.05] border-white/30 shadow-lg"
                : "bg-black/60 border-white/10 hover:border-white/20"
            )}
            style={isW1 ? {
              borderColor: `${primaryHex}B3`,
              boxShadow: `0 0 20px ${primaryHex}33`
            } : undefined}
          >
            {/* Left Accent Color Strip */}
            <div
              className="absolute left-0 top-0 bottom-0 w-1 sm:w-1.5"
              style={{
                backgroundColor: isW1 ? primaryHex : 'rgba(255,255,255,0.2)',
                boxShadow: isW1 ? `0 0 10px ${primaryHex}` : undefined
              }}
            />

            <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1 pl-1">
              <Avatar
                className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-black/80 border-2 shrink-0 p-1 transition-transform duration-300 group-hover/f1:scale-105"
                style={{
                  borderColor: isW1 ? primaryHex : 'rgba(255,255,255,0.2)',
                  boxShadow: isW1 ? `0 0 14px ${primaryHex}80` : undefined
                }}
              >
                <AvatarImage src={logo1} className="object-contain w-full h-full" referrerPolicy="no-referrer" />
                <AvatarFallback className="bg-transparent text-white/50 text-[10px] font-mono font-bold">P1</AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[7.5px] sm:text-[8px] font-mono font-black uppercase tracking-[0.2em] text-white/40">
                    FINALIST 01 // UPPER
                  </span>
                  {isW1 && (
                    <span
                      className="text-[7px] font-mono font-black uppercase px-2 py-0.2 rounded-full text-black shadow-sm"
                      style={{ backgroundColor: primaryHex }}
                    >
                      WINNER
                    </span>
                  )}
                </div>
                <div
                  className={cn(
                    "text-base sm:text-lg font-black uppercase italic font-headline truncate tracking-wide",
                    isW1 ? "text-white" : "text-white/90"
                  )}
                  style={isW1 ? {
                    color: primaryHex,
                    textShadow: `0 0 12px ${primaryHex}80`
                  } : undefined}
                >
                  {p1Name}
                </div>
                <div className="text-[9px] sm:text-[10px] font-mono text-white/40 uppercase truncate">
                  {t1Name}
                </div>
              </div>
            </div>

            {/* Score Digit Box */}
            <div
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl border flex items-center justify-center font-mono text-lg sm:text-2xl font-black shrink-0 transition-all ml-2"
              style={{
                borderColor: isW1 ? primaryHex : 'rgba(255,255,255,0.15)',
                backgroundColor: isW1 ? `${primaryHex}33` : 'rgba(0,0,0,0.6)',
                color: isW1 ? primaryHex : 'rgba(255,255,255,0.6)',
                boxShadow: isW1 ? `0 0 15px ${primaryHex}55` : undefined
              }}
            >
              {m ? s1 : '-'}
            </div>
          </div>

          {/* VCT Diagonal Slash Ribbon Divider (Sharp & Kinetic) */}
          <div className="relative py-1 flex items-center justify-center">
            <div className="w-full h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
            <div
              className="absolute px-4 py-0.5 rounded-full bg-[#0B0E17] border shadow-lg flex items-center gap-2 text-[8.5px] font-mono font-black uppercase tracking-[0.25em]"
              style={{
                borderColor: `${primaryHex}66`,
                boxShadow: `0 0 12px ${primaryHex}33`
              }}
            >
              <span style={{ color: primaryHex }}>//</span>
              <span className="text-white italic">BO3 GRAND FINAL</span>
              <span style={{ color: secondaryHex }}>//</span>
            </div>
          </div>

          {/* Fighter 2 Tactical Banner (Bottom Slot / Seed B) */}
          <div
            className={cn(
              "flex items-center justify-between p-3 sm:p-4 rounded-xl sm:rounded-2xl border transition-all relative overflow-hidden group/f2",
              isW2
                ? "bg-white/[0.05] border-white/30 shadow-lg"
                : "bg-black/60 border-white/10 hover:border-white/20"
            )}
            style={isW2 ? {
              borderColor: `${primaryHex}B3`,
              boxShadow: `0 0 20px ${primaryHex}33`
            } : undefined}
          >
            {/* Left Accent Color Strip */}
            <div
              className="absolute left-0 top-0 bottom-0 w-1 sm:w-1.5"
              style={{
                backgroundColor: isW2 ? primaryHex : 'rgba(255,255,255,0.2)',
                boxShadow: isW2 ? `0 0 10px ${primaryHex}` : undefined
              }}
            />

            <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1 pl-1">
              <Avatar
                className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-black/80 border-2 shrink-0 p-1 transition-transform duration-300 group-hover/f2:scale-105"
                style={{
                  borderColor: isW2 ? primaryHex : 'rgba(255,255,255,0.2)',
                  boxShadow: isW2 ? `0 0 14px ${primaryHex}80` : undefined
                }}
              >
                <AvatarImage src={logo2} className="object-contain w-full h-full" referrerPolicy="no-referrer" />
                <AvatarFallback className="bg-transparent text-white/50 text-[10px] font-mono font-bold">P2</AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[7.5px] sm:text-[8px] font-mono font-black uppercase tracking-[0.2em] text-white/40">
                    FINALIST 02 // LOWER
                  </span>
                  {isW2 && (
                    <span
                      className="text-[7px] font-mono font-black uppercase px-2 py-0.2 rounded-full text-black shadow-sm"
                      style={{ backgroundColor: primaryHex }}
                    >
                      WINNER
                    </span>
                  )}
                </div>
                <div
                  className={cn(
                    "text-base sm:text-lg font-black uppercase italic font-headline truncate tracking-wide",
                    isW2 ? "text-white" : "text-white/90"
                  )}
                  style={isW2 ? {
                    color: primaryHex,
                    textShadow: `0 0 12px ${primaryHex}80`
                  } : undefined}
                >
                  {p2Name}
                </div>
                <div className="text-[9px] sm:text-[10px] font-mono text-white/40 uppercase truncate">
                  {t2Name}
                </div>
              </div>
            </div>

            {/* Score Digit Box */}
            <div
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl border flex items-center justify-center font-mono text-lg sm:text-2xl font-black shrink-0 transition-all ml-2"
              style={{
                borderColor: isW2 ? primaryHex : 'rgba(255,255,255,0.15)',
                backgroundColor: isW2 ? `${primaryHex}33` : 'rgba(0,0,0,0.6)',
                color: isW2 ? primaryHex : 'rgba(255,255,255,0.6)',
                boxShadow: isW2 ? `0 0 15px ${primaryHex}55` : undefined
              }}
            >
              {m ? s2 : '-'}
            </div>
          </div>
        </div>

        {/* 4. Card Tactical Action Footer Bar */}
        <div className="border-t border-white/10 pt-2.5 flex items-center justify-between text-[8px] sm:text-[8.5px] font-mono font-black uppercase tracking-widest relative z-10">
          <div className="flex items-center gap-1.5" style={{ color: primaryHex }}>
            <Scan className="w-3.5 h-3.5" />
            <span>TACTICAL APEX CONTROL</span>
          </div>

          <div className="flex items-center gap-1 text-white/60 group-hover/vct:text-white transition-colors">
            <span>HUD ANALISIS & H2H</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover/vct:translate-x-1 transition-transform" style={{ color: primaryHex }} />
          </div>
        </div>
      </div>
    </div>
  );
};

