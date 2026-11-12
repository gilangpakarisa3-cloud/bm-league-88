'use client';

import { useMemo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { User, Calendar as CalendarIcon, Clock, Zap, Flame, Scan, ChevronRight, Swords, Sparkles, Crown } from "lucide-react";
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

const PODIUM_CHAMFER = 'polygon(14px 0, calc(100% - 14px) 0, 100% 14px, 100% calc(100% - 14px), calc(100% - 14px) 100%, 14px 100%, 0 calc(100% - 14px), 0 14px)';
const BANNER_CHAMFER = 'polygon(10px 0, calc(100% - 10px) 0, 100% 10px, 100% calc(100% - 10px), calc(100% - 10px) 100%, 10px 100%, 0 calc(100% - 10px), 0 10px)';

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
      {/* Outer TI Aegis Altar Wrapper with Gold & Season Gradient */}
      <div
        onClick={onCardClick}
        className="flex-1 relative flex flex-col justify-between p-[2px] transition-all duration-300 hover:scale-[1.01] cursor-pointer group/vct"
        style={{
          clipPath: PODIUM_CHAMFER,
          background: `linear-gradient(135deg, #FBBF24 0%, ${primaryHex} 35%, #0B0E17 50%, ${secondaryHex} 65%, #F59E0B 100%)`,
          filter: `drop-shadow(0 20px 60px rgba(0,0,0,0.95)) drop-shadow(0 0 30px ${primaryHex}35)`
        }}
      >
        {/* Inner Chamber Plate */}
        <div
          className="flex-1 w-full relative flex flex-col justify-between p-4 sm:p-6 2xl:p-7 overflow-hidden gap-3"
          style={{
            clipPath: PODIUM_CHAMFER,
            background: 'radial-gradient(circle at 50% 0%, rgba(25, 16, 40, 0.98) 0%, rgba(9, 7, 14, 0.98) 60%, rgba(5, 4, 8, 0.99) 100%)'
          }}
        >
          {/* Top Tracer Line with Dynamic Gold + Season Gradient */}
          <div
            className="absolute top-0 left-0 right-0 h-[3px] z-20 pointer-events-none"
            style={{
              background: `linear-gradient(90deg, transparent, #FBBF24, ${primaryHex}, #FFFFFF, ${primaryHex}, #FBBF24, transparent)`
            }}
          />

          {/* TI Four Corner Metal Filigree Brackets */}
          <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-[#FBBF24] pointer-events-none opacity-85 z-20" />
          <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-[#FBBF24] pointer-events-none opacity-85 z-20" />
          <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-[#FBBF24] pointer-events-none opacity-85 z-20" />
          <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-[#FBBF24] pointer-events-none opacity-85 z-20" />

          {/* Ambient Tactical Grid and Soft Glow Background */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
            <div
              className="absolute -top-16 left-1/2 -translate-x-1/2 w-[380px] h-[190px] rounded-full blur-[70px] opacity-30"
              style={{ backgroundColor: primaryHex }}
            />
            <div
              className="absolute -bottom-16 right-0 w-[260px] h-[180px] rounded-full blur-[80px] opacity-25"
              style={{ backgroundColor: secondaryHex }}
            />
            <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:16px_16px] opacity-25" />
          </div>

          {/* 1. HUD Telemetry Bar */}
          <div className="w-full flex items-center justify-between gap-2 border-b border-white/10 pb-2.5 relative z-10 font-mono text-[8px] sm:text-[8.5px]">
            <div
              className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-sm bg-black/70 border shadow-sm max-w-[55%] overflow-hidden"
              style={{ borderColor: '#FBBF2480' }}
            >
              <span className="text-[#FBBF24] text-[9px] leading-none shrink-0 drop-shadow-[0_0_4px_#FBBF24]">◆</span>
              <span className="font-black uppercase tracking-[0.2em] truncate" style={{ color: '#FDE68A' }}>
                {divisionName ? `${seasonSysTag} • ${divisionName}` : seasonSysTag}
              </span>
            </div>

            <div className="flex items-center gap-1 text-[8px] font-bold text-white/50 uppercase tracking-wider">
              {formattedDate ? (
                <span className="flex items-center gap-1 text-[#FDE68A]"><CalendarIcon className="w-3 h-3 text-[#FBBF24]" /> {formattedDate}</span>
              ) : isProjection ? (
                <Badge variant="outline" className="h-4 text-[7px] border-amber-400/50 text-[#FDE68A] py-0 px-2 font-black uppercase bg-amber-500/10 rounded-sm">SIMULASI PROYEKSI</Badge>
              ) : (
                <span className="flex items-center gap-1 text-white/40"><Clock className="w-3 h-3" /> JADWAL TBD</span>
              )}
            </div>

            <div>
              {isCompleted ? (
                <Badge
                  className="text-black font-black uppercase tracking-widest text-[7.5px] px-2.5 py-0.5 rounded-sm shadow-md font-mono"
                  style={{ backgroundColor: '#FBBF24', boxShadow: '0 0 10px #FBBF24' }}
                >
                  DECIDED
                </Badge>
              ) : isBattleReady ? (
                <Badge
                  className="border font-black uppercase tracking-widest text-[7.5px] px-2.5 py-0.5 rounded-sm animate-pulse font-mono"
                  style={{
                    backgroundColor: `${primaryHex}20`,
                    borderColor: '#FBBF24',
                    color: '#FDE68A',
                    boxShadow: '0 0 8px rgba(251, 191, 36, 0.4)'
                  }}
                >
                  ⚡ LIVE BO3
                </Badge>
              ) : (
                <Badge className="bg-amber-500/10 border border-amber-400/40 text-[#FDE68A] font-black uppercase tracking-widest text-[7.5px] px-2 py-0.5 rounded-sm font-mono">
                  PROYEKSI
                </Badge>
              )}
            </div>
          </div>

          {/* 2. Tactical Head Title (TI Aegis Altar Inscription) */}
          <div className="text-center space-y-1 relative z-10 px-1 py-1">
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-0.5 rounded-sm bg-black/60 border border-[#FBBF2466] text-[#FDE68A] font-mono text-[8px] sm:text-[9px] font-black uppercase tracking-[0.25em] shadow-[0_0_10px_rgba(251,191,36,0.15)]">
              <span className="text-[#FBBF24]">◆</span>
              <span>{divisionName ? `${seasonSeriesBadge} • ${divisionName.toUpperCase()}` : seasonSeriesBadge}</span>
              <span className="text-[#FBBF24]">◆</span>
            </div>

            <div className="relative pt-1">
              <h3
                className="text-xl sm:text-2xl 2xl:text-3xl font-black tracking-tight uppercase leading-none font-headline text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]"
                style={{
                  textShadow: `0 0 25px ${primaryHex}50`
                }}
              >
                {divisionName ? `${seasonGfTitle} - ${divisionName.toUpperCase()}` : seasonGfTitle}
              </h3>
              <div
                className="h-[2px] w-36 sm:w-52 mx-auto mt-1.5"
                style={{
                  background: `linear-gradient(90deg, transparent, #FBBF24, ${primaryHex}, #FBBF24, transparent)`
                }}
              />
            </div>

            <p className="text-[7.5px] sm:text-[8px] font-mono font-bold tracking-[0.22em] text-[#FDE68A]/75 uppercase pt-0.5">
              {divisionName ? `PENENTUAN JUARA ${divisionName.toUpperCase()} • ${seasonGfSubtitle}` : seasonGfSubtitle}
            </p>
          </div>

          {/* 3. VCT Tactical Split-Poster Face-Off Layout with Chamfered Plates */}
          <div className="relative z-10 flex flex-col gap-2 my-1">
            {/* Fighter 1 Tactical Banner (Upper Slot) */}
            <div
              className={cn(
                "p-[1.5px] transition-all relative group/f1",
                isW1 ? "shadow-[0_0_25px_rgba(251,191,36,0.3)]" : ""
              )}
              style={{
                clipPath: BANNER_CHAMFER,
                background: isW1
                  ? `linear-gradient(135deg, #FBBF24 0%, ${primaryHex} 50%, #F59E0B 100%)`
                  : 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.06) 100%)'
              }}
            >
              <div
                className="flex items-center justify-between p-3 sm:p-4 relative overflow-hidden"
                style={{
                  clipPath: BANNER_CHAMFER,
                  background: isW1
                    ? 'radial-gradient(circle at 10% 50%, rgba(35, 22, 55, 0.98) 0%, rgba(12, 10, 18, 0.98) 100%)'
                    : 'radial-gradient(circle at 10% 50%, rgba(18, 16, 24, 0.9) 0%, rgba(8, 7, 12, 0.9) 100%)'
                }}
              >
                {/* Left Accent Color Strip */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-1 sm:w-1.5"
                  style={{
                    backgroundColor: isW1 ? '#FBBF24' : 'rgba(255,255,255,0.2)',
                    boxShadow: isW1 ? '0 0 10px #FBBF24' : undefined
                  }}
                />

                <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1 pl-1">
                  <Avatar
                    className="h-10 w-10 sm:h-12 sm:w-12 rounded-sm bg-black/80 border-2 shrink-0 p-1 transition-transform duration-300 group-hover/f1:scale-105"
                    style={{
                      borderColor: isW1 ? '#FBBF24' : 'rgba(255,255,255,0.2)',
                      boxShadow: isW1 ? '0 0 14px rgba(251, 191, 36, 0.8)' : undefined
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
                          className="text-[7px] font-mono font-black uppercase px-2 py-0.2 rounded-sm text-black shadow-sm flex items-center gap-1"
                          style={{ backgroundColor: '#FBBF24' }}
                        >
                          <Crown className="w-2.5 h-2.5" /> WINNER
                        </span>
                      )}
                    </div>
                    <div
                      className={cn(
                        "text-base sm:text-lg font-black uppercase font-headline truncate tracking-wide",
                        isW1 ? "text-white" : "text-white/90"
                      )}
                      style={isW1 ? {
                        color: '#FFFBEB',
                        textShadow: `0 0 14px ${primaryHex}`
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
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-sm border flex items-center justify-center font-mono text-lg sm:text-2xl font-black shrink-0 transition-all ml-2"
                  style={{
                    borderColor: isW1 ? '#FBBF24' : 'rgba(255,255,255,0.15)',
                    backgroundColor: isW1 ? 'rgba(251, 191, 36, 0.2)' : 'rgba(0,0,0,0.6)',
                    color: isW1 ? '#FDE68A' : 'rgba(255,255,255,0.6)',
                    boxShadow: isW1 ? '0 0 15px rgba(251, 191, 36, 0.5)' : undefined
                  }}
                >
                  {m ? s1 : '-'}
                </div>
              </div>
            </div>

            {/* TI Aegis Shield / Center Diamond Divider */}
            <div className="relative py-1 flex items-center justify-center">
              <div className="w-full h-px bg-gradient-to-r from-transparent via-[#FBBF2480] to-transparent" />
              <div
                className="absolute px-4 py-0.5 rounded-sm bg-[#090712] border shadow-lg flex items-center gap-2 text-[8.5px] font-mono font-black uppercase tracking-[0.25em]"
                style={{
                  borderColor: '#FBBF24',
                  boxShadow: `0 0 14px ${primaryHex}4D, 0 0 8px #FBBF2440`
                }}
              >
                <span className="text-[#FBBF24]">◆</span>
                <span className="text-white">BO3 GRAND FINAL</span>
                <span className="text-[#FBBF24]">◆</span>
              </div>
            </div>

            {/* Fighter 2 Tactical Banner (Lower Slot) */}
            <div
              className={cn(
                "p-[1.5px] transition-all relative group/f2",
                isW2 ? "shadow-[0_0_25px_rgba(251,191,36,0.3)]" : ""
              )}
              style={{
                clipPath: BANNER_CHAMFER,
                background: isW2
                  ? `linear-gradient(135deg, #FBBF24 0%, ${primaryHex} 50%, #F59E0B 100%)`
                  : 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.06) 100%)'
              }}
            >
              <div
                className="flex items-center justify-between p-3 sm:p-4 relative overflow-hidden"
                style={{
                  clipPath: BANNER_CHAMFER,
                  background: isW2
                    ? 'radial-gradient(circle at 10% 50%, rgba(35, 22, 55, 0.98) 0%, rgba(12, 10, 18, 0.98) 100%)'
                    : 'radial-gradient(circle at 10% 50%, rgba(18, 16, 24, 0.9) 0%, rgba(8, 7, 12, 0.9) 100%)'
                }}
              >
                {/* Left Accent Color Strip */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-1 sm:w-1.5"
                  style={{
                    backgroundColor: isW2 ? '#FBBF24' : 'rgba(255,255,255,0.2)',
                    boxShadow: isW2 ? '0 0 10px #FBBF24' : undefined
                  }}
                />

                <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1 pl-1">
                  <Avatar
                    className="h-10 w-10 sm:h-12 sm:w-12 rounded-sm bg-black/80 border-2 shrink-0 p-1 transition-transform duration-300 group-hover/f2:scale-105"
                    style={{
                      borderColor: isW2 ? '#FBBF24' : 'rgba(255,255,255,0.2)',
                      boxShadow: isW2 ? '0 0 14px rgba(251, 191, 36, 0.8)' : undefined
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
                          className="text-[7px] font-mono font-black uppercase px-2 py-0.2 rounded-sm text-black shadow-sm flex items-center gap-1"
                          style={{ backgroundColor: '#FBBF24' }}
                        >
                          <Crown className="w-2.5 h-2.5" /> WINNER
                        </span>
                      )}
                    </div>
                    <div
                      className={cn(
                        "text-base sm:text-lg font-black uppercase font-headline truncate tracking-wide",
                        isW2 ? "text-white" : "text-white/90"
                      )}
                      style={isW2 ? {
                        color: '#FFFBEB',
                        textShadow: `0 0 14px ${primaryHex}`
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
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-sm border flex items-center justify-center font-mono text-lg sm:text-2xl font-black shrink-0 transition-all ml-2"
                  style={{
                    borderColor: isW2 ? '#FBBF24' : 'rgba(255,255,255,0.15)',
                    backgroundColor: isW2 ? 'rgba(251, 191, 36, 0.2)' : 'rgba(0,0,0,0.6)',
                    color: isW2 ? '#FDE68A' : 'rgba(255,255,255,0.6)',
                    boxShadow: isW2 ? '0 0 15px rgba(251, 191, 36, 0.5)' : undefined
                  }}
                >
                  {m ? s2 : '-'}
                </div>
              </div>
            </div>
          </div>

          {/* 4. Card Tactical Action Footer Bar */}
          <div className="border-t border-white/10 pt-2.5 flex items-center justify-between text-[8px] sm:text-[8.5px] font-mono font-black uppercase tracking-widest relative z-10">
            <div className="flex items-center gap-1.5 text-[#FDE68A]">
              <Scan className="w-3.5 h-3.5 text-[#FBBF24]" />
              <span>TACTICAL APEX CONTROL</span>
            </div>

            <div className="flex items-center gap-1 text-white/60 group-hover/vct:text-white transition-colors">
              <span>HUD ANALISIS & H2H</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover/vct:translate-x-1 transition-transform text-[#FBBF24]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
