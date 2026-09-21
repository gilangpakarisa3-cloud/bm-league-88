'use client';

import { useMemo, useState, useRef, useEffect, useCallback, memo } from 'react';
import type { Match, Season, Team, Player, WithId, LeagueEntry } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Swords, Trophy, User, Award, Zap, Loader2, ChevronRight, Binary, BarChart3, Scan, Percent, Star, Undo2, Flame, ShieldAlert, Target, Calendar as CalendarIcon, Clock, Save, Settings2, Shield, Activity, Sparkles, TrendingUp, CheckCircle2, Crown, Layers, Share2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { KnockoutShareDialog } from './knockout-share-dialog';
import { Badge } from './ui/badge';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { ScrollArea } from './ui/scroll-area';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Calendar } from './ui/calendar';
import { useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { doc, Timestamp, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/use-translation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { resolveLogo } from '@/lib/logo-utils';

interface TournamentBracketProps {
  matches: WithId<Match>[];
  playersById: Record<string, WithId<Player>>;
  teamsById: Record<string, WithId<Team>>;
  leagueTable: (WithId<LeagueEntry> & { player?: WithId<Player>, team?: WithId<Team> })[];
  season: WithId<Season> | null;
  isAdmin?: boolean;
  defendingChampionId?: string;
  onRevertMatch?: (match: WithId<Match>) => void;
}

interface CyberConnectorForkProps {
  color?: "primary" | "amber" | "cyan" | "rose" | "purple";
  customHex?: string;
  customGlow?: string;
  height?: "standard" | "tall";
  className?: string;
}

const CyberConnectorFork = ({ color = "primary", customHex, customGlow, height = "standard", className }: CyberConnectorForkProps) => {
  const isTall = height === "tall";
  const defaultStrokeColor = color === "amber" ? "#FBBF24" : color === "cyan" ? "#06B6D4" : color === "rose" ? "#F43F5E" : color === "purple" ? "#A855F7" : "#CCFD01";
  const defaultGlowRgba = color === "amber" ? "rgba(251, 191, 36, 0.9)" : color === "cyan" ? "rgba(6, 182, 212, 0.9)" : color === "rose" ? "rgba(244, 63, 94, 0.9)" : color === "purple" ? "rgba(168, 85, 247, 0.9)" : "rgba(204, 253, 1, 0.9)";
  
  const strokeColor = customHex || defaultStrokeColor;
  const glowRgba = customGlow || defaultGlowRgba;
  const safeId = (customHex || color).replace(/[^a-zA-Z0-9]/g, '');
  const gradientId = `cyber-fork-grad-${safeId}-${height}`;

  // High-precision dimensions aligned to card centers
  const w = 56;
  const h = isTall ? 376 : 176;
  const y1 = isTall ? 88 : 42;
  const y2 = isTall ? 288 : 134;
  const midY = isTall ? 188 : 88;
  const splitX = 22;
  const joinX = 36;

  // Path 1 (Top branch to mid)
  const pathTop = `M 0,${y1} L ${splitX},${y1} Q ${joinX},${y1} ${joinX},${midY}`;
  // Path 2 (Bottom branch to mid)
  const pathBottom = `M 0,${y2} L ${splitX},${y2} Q ${joinX},${y2} ${joinX},${midY}`;
  // Path 3 (Stem to next node)
  const pathStem = `M ${joinX},${midY} L ${w},${midY}`;
  const fullRail = `${pathTop} ${pathBottom} ${pathStem}`;

  return (
    <div className={cn("relative shrink-0 pointer-events-none flex items-center justify-center", isTall ? "w-12 sm:w-14 h-[376px]" : "w-10 sm:w-14 h-[176px]", className)}>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full h-full overflow-visible"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.4" />
            <stop offset="70%" stopColor={strokeColor} stopOpacity="0.95" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="1" />
          </linearGradient>
          <filter id={`glow-${gradientId}`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* 1. Ambient Neon Aura Tube */}
        <path d={fullRail} stroke={strokeColor} strokeWidth="6" strokeOpacity="0.15" strokeLinecap="round" filter={`url(#glow-${gradientId})`} />
        
        {/* 2. Core Laser Conduit */}
        <path d={fullRail} stroke={`url(#${gradientId})`} strokeWidth="1.75" strokeLinecap="round" />

        {/* 3. Traveling Energy Photon Stream (Animated Light Flow) */}
        <path
          d={fullRail}
          stroke="#FFFFFF"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="6 10"
          className="animate-energy-flow"
          opacity="0.9"
          style={{ filter: `drop-shadow(0 0 4px ${glowRgba})` }}
        />

        {/* 4. Start Point Input Terminals (Top & Bottom) */}
        <g transform={`translate(0, ${y1})`}>
          <circle cx="0" cy="0" r="4" fill={strokeColor} opacity="0.35" />
          <circle cx="0" cy="0" r="2.5" fill="#FFFFFF" stroke={strokeColor} strokeWidth="1" />
        </g>
        <g transform={`translate(0, ${y2})`}>
          <circle cx="0" cy="0" r="4" fill={strokeColor} opacity="0.35" />
          <circle cx="0" cy="0" r="2.5" fill="#FFFFFF" stroke={strokeColor} strokeWidth="1" />
        </g>

        {/* 5. Junction Energy Hub (Center Convergence Point) */}
        <g transform={`translate(${joinX}, ${midY})`}>
          {/* Pulsing Radar Ring */}
          <circle cx="0" cy="0" r="8" stroke={strokeColor} strokeWidth="1" strokeOpacity="0.6" className="animate-ping" />
          {/* Micro Telemetry Ticks */}
          <line x1="-7" y1="0" x2="-4" y2="0" stroke={strokeColor} strokeWidth="1" />
          <line x1="4" y1="0" x2="7" y2="0" stroke={strokeColor} strokeWidth="1" />
          {/* Diamond Energy Core */}
          <rect x="-4" y="-4" width="8" height="8" transform="rotate(45)" fill="#070B12" stroke={strokeColor} strokeWidth="1.5" style={{ filter: `drop-shadow(0 0 6px ${glowRgba})` }} />
          <circle cx="0" cy="0" r="1.5" fill="#FFFFFF" />
        </g>

        {/* 6. Output Terminal & Directional Photon Bullet */}
        <g transform={`translate(${w - 2}, ${midY})`}>
          <circle cx="0" cy="0" r="3" fill="#FFFFFF" style={{ filter: `drop-shadow(0 0 8px ${glowRgba})` }} className="animate-pulse" />
          <path d="M -5,-3 L -1,0 L -5,3" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" fill="none" />
        </g>
      </svg>
    </div>
  );
};

const BracketConnectorFork = CyberConnectorFork;

const BracketConnectorStraight = ({ 
  color = "primary", 
  customHex, 
  customGlow 
}: { 
  color?: "primary" | "amber" | "cyan" | "rose" | "purple";
  customHex?: string;
  customGlow?: string;
}) => {
  const defaultStrokeColor = color === "amber" ? "#FBBF24" : color === "cyan" ? "#06B6D4" : color === "rose" ? "#F43F5E" : color === "purple" ? "#A855F7" : "#CCFD01";
  const strokeColor = customHex || defaultStrokeColor;
  const glowShadow = customGlow ? `0 0 10px ${customGlow}` : `0 0 10px ${strokeColor}`;

  return (
    <div className="w-8 sm:w-12 h-full flex items-center relative justify-center shrink-0 pointer-events-none">
      <div 
        className="w-full h-[2px] relative"
        style={{
          background: `linear-gradient(to right, ${strokeColor}66, ${strokeColor}, ${strokeColor}66)`,
          boxShadow: glowShadow
        }}
      >
        <div 
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full" 
          style={{ backgroundColor: strokeColor, boxShadow: glowShadow }} 
        />
      </div>
    </div>
  );
};

import { getSeasonTheme, type TISeasonTheme as SeasonDesignTheme } from '@/lib/season-theme';
export { getSeasonTheme, type SeasonDesignTheme };

interface MatchCardProps {
  bid: string;
  label: string;
  bracketData: Record<string, any>;
  projections: Record<string, any> | null;
  handleCardClick: (matchData: any) => void;
  teamsById: Record<string, WithId<Team>>;
  theme?: SeasonDesignTheme;
  isLower?: boolean;
}

const MatchCard = ({
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
        className="w-full xl:min-w-[195px] sm:min-w-[215px] xl:max-w-[320px] 2xl:max-w-[340px] h-[70px] overflow-hidden border transition-all duration-300 cursor-pointer rounded-xl relative group-hover/match:scale-[1.02] backdrop-blur-2xl flex flex-col justify-center"
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
                className="flex items-center justify-between px-2.5 h-[35px] relative transition-colors"
                style={isW ? {
                  backgroundColor: `${primaryHex}1A`
                } : undefined}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                  <Avatar
                    className="h-6 w-6 border transition-all duration-300 rounded-md shrink-0 bg-black/60 overflow-hidden flex items-center justify-center p-0.5"
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
                    <AvatarFallback className="bg-black/60 font-black text-[8px] rounded-md text-white/70">
                      <User className="w-2.5 h-2.5" />
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <span
                      className={cn(
                        "text-[10.5px] sm:text-[11.5px] font-black truncate uppercase italic font-headline transition-colors inline-block pr-1.5 max-w-full",
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
                        className="w-3 h-3 shrink-0 animate-bounce"
                        style={{ color: primaryHex }}
                      />
                    )}
                  </div>
                </div>

                {/* Score Indicator Box */}
                <div
                  className="w-6 h-5 rounded border flex items-center justify-center transition-all shrink-0 font-mono"
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
                    className="text-[11px] font-black italic tabular-nums leading-none font-headline"
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

interface GrandFinalPodiumProps {
  bid: string;
  label?: string;
  bracketData: Record<string, any>;
  projections: Record<string, any> | null;
  handleCardClick: (matchData: any) => void;
  teamsById: Record<string, WithId<Team>>;
  seriesLabel?: string;
  season?: WithId<Season> | null;
}

const GrandFinalPodium = ({
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
        <div className="relative group/trophy cursor-default flex flex-col items-center my-2 sm:my-3 z-10">
          {/* Floating Golden Crown above the emblem */}
          <div className="mb-2 sm:mb-2.5 flex items-center justify-center">
            <div className={cn("px-3.5 sm:px-4 py-1 rounded-full bg-black/90 border shadow-lg flex items-center gap-2", theme.tagBorder)}>
              <Crown className={cn("w-4 h-4 sm:w-5 sm:h-5", theme.trophyColor)} />
              <span className={cn("text-[8px] sm:text-[10px] font-black tracking-[0.25em] uppercase font-mono", theme.primaryText)}>
                {theme.trophyCrownText}
              </span>
            </div>
          </div>

          {/* Concentric Geometric Orbit (Adaptive Scale: 144px -> 192px -> 224px -> 256px) */}
          <div className="relative w-36 h-36 sm:w-48 sm:h-48 md:w-56 md:h-56 2xl:w-64 2xl:h-64 flex items-center justify-center">
            {/* Ambient Radiance Halo */}
            <div className={cn("absolute inset-0 rounded-full bg-gradient-to-tr blur-2xl opacity-85 pointer-events-none", theme.concentricHalo)} />

            {/* Outer Precision Orbital Ring with Cardinal Satellites */}
            <div className="absolute inset-0 m-auto w-[94%] h-[94%] rounded-full border border-amber-400/40 pointer-events-none flex items-center justify-center">
              <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,1)]" />
              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,1)]" />
              <div className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,1)]" />
              <div className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,1)]" />
            </div>

            {/* Middle Concentric Dashed Ring */}
            <div className="absolute inset-0 m-auto w-[78%] h-[78%] rounded-full border border-dashed border-amber-300/35 pointer-events-none" />

            {/* Central 24K Gold Crystal Core Shield (Aegis Throneroom) */}
            <div className={cn("relative w-[60%] h-[60%] rounded-full bg-gradient-to-br border-2 flex items-center justify-center shadow-2xl backdrop-blur-md transition-transform duration-500 group-hover/trophy:scale-105 holo-shimmer-gold", theme.trophyShield)}>
              <Trophy className={cn("w-[62%] h-[62%] animate-float", theme.trophyColor)} />
              <Sparkles className="absolute top-2.5 right-2.5 w-3 h-3 sm:w-4 sm:h-4 text-amber-200 animate-pulse" />
              <Sparkles className="absolute bottom-2.5 left-2.5 w-3 h-3 sm:w-4 sm:h-4 text-primary animate-pulse" />
            </div>
          </div>

          {/* Pedestal Base cleanly spaced below */}
          <div className="flex flex-col items-center mt-3 sm:mt-4">
            <div className="h-[2.5px] w-36 sm:w-52 2xl:w-64 bg-gradient-to-r from-transparent via-amber-400/90 to-transparent rounded-full shadow-[0_0_10px_rgba(251,191,36,0.9)]" />
            <div className={cn("mt-1.5 px-4 sm:px-5 py-1 rounded-full bg-black/90 border font-mono text-[8.5px] sm:text-[10.5px] font-black tracking-[0.25em] uppercase italic shadow-sm text-center", theme.tagBorder, theme.primaryText)}>
              {seasonPedestal}
            </div>
          </div>
        </div>

        {/* 3. Ultra-Sporty Championship Typography */}
        <div className="text-center space-y-1.5 relative z-10 my-1 sm:my-2">
          <div className="inline-flex items-center gap-1.5 px-4 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 via-black to-primary/20 border border-amber-400/50 text-amber-300 font-black uppercase text-[8.5px] sm:text-[9.5px] tracking-[0.25em] italic shadow-[0_0_10px_rgba(251,191,36,0.2)]">
            <Zap className="w-2.5 h-2.5 fill-amber-400 text-amber-400 animate-pulse" />
            <span>{seasonSeriesBadge}</span>
            <Zap className="w-2.5 h-2.5 fill-primary text-primary animate-pulse" />
          </div>
          
          <div className="relative">
            <h3 className={cn("inline-block pr-4 pb-1 text-2xl sm:text-3xl 2xl:text-4xl font-black tracking-tight uppercase italic leading-none font-headline text-white [webkit-background-clip:text] bg-clip-text [-webkit-text-fill-color:transparent] bg-gradient-to-b", theme.gfTitleGradient)}>
              {seasonGfTitle}
            </h3>
            <div className="h-[2px] w-36 sm:w-48 mx-auto bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_8px_rgba(251,191,36,0.9)] mt-1.5" />
          </div>

          <p className="text-[8px] font-mono font-bold tracking-[0.25em] text-white/50 uppercase">
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
              "flex items-center justify-between p-2.5 sm:p-3 rounded-xl transition-all relative",
              isW1 ? "border shadow-lg" : "bg-white/[0.02] border border-white/5 hover:border-white/20"
            )}
            style={isW1 ? {
              backgroundColor: `${theme.primaryHex}20`,
              borderColor: `${theme.primaryHex}99`,
              boxShadow: `0 0 16px ${theme.primaryHex}40`
            } : undefined}
          >
            <div className="flex items-center gap-3 overflow-hidden pr-2 min-w-0 flex-1">
              <div className="relative shrink-0">
                <Avatar
                  className="h-10 w-10 sm:h-11 sm:w-11 border-2 transition-all duration-300 rounded-xl bg-black/60 overflow-hidden flex items-center justify-center p-1"
                  style={isW1 ? {
                    borderColor: theme.primaryHex,
                    boxShadow: `0 0 12px ${theme.primaryHex}99`,
                  } : {
                    borderColor: 'rgba(255,255,255,0.2)'
                  }}
                >
                  <AvatarImage key={logo1} src={logo1} className="object-contain w-full h-full" referrerPolicy="no-referrer" />
                  <AvatarFallback className="bg-black/60 font-black text-[10px] rounded-xl"><User className="w-4 h-4"/></AvatarFallback>
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
              "flex items-center justify-between p-2.5 sm:p-3 rounded-xl transition-all relative",
              isW2 ? "border shadow-lg" : "bg-white/[0.02] border border-white/5 hover:border-white/20"
            )}
            style={isW2 ? {
              backgroundColor: `${theme.primaryHex}20`,
              borderColor: `${theme.primaryHex}99`,
              boxShadow: `0 0 16px ${theme.primaryHex}40`
            } : undefined}
          >
            <div className="flex items-center gap-3 overflow-hidden pr-2 min-w-0 flex-1">
              <div className="relative shrink-0">
                <Avatar
                  className="h-10 w-10 sm:h-11 sm:w-11 border-2 transition-all duration-300 rounded-xl bg-black/60 overflow-hidden flex items-center justify-center p-1"
                  style={isW2 ? {
                    borderColor: theme.primaryHex,
                    boxShadow: `0 0 12px ${theme.primaryHex}99`,
                  } : {
                    borderColor: 'rgba(255,255,255,0.2)'
                  }}
                >
                  <AvatarImage key={logo2} src={logo2} className="object-contain w-full h-full" referrerPolicy="no-referrer" />
                  <AvatarFallback className="bg-black/60 font-black text-[10px] rounded-xl"><User className="w-4 h-4"/></AvatarFallback>
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

export function TournamentBracket({ matches, playersById, teamsById, leagueTable, season, isAdmin = false, defendingChampionId, onRevertMatch }: TournamentBracketProps) {
  const { t } = useTranslation();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [selectedMatch, setSelectedMatch] = useState<any | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);
  const mouseMoved = useRef(false);

  const [editDate, setEditDate] = useState<Date | undefined>(undefined);
  const [editTime, setEditTime] = useState<string>('00:00');
  const [isUpdatingSchedule, setIsUpdatingSchedule] = useState(false);

  useEffect(() => { setIsMounted(true); }, []);

  useEffect(() => {
    if (selectedMatch && !selectedMatch.isProjection && selectedMatch.matchDate) {
        const d = selectedMatch.matchDate.toDate();
        setEditDate(d);
        setEditTime(format(d, 'HH:mm'));
    }
  }, [selectedMatch]);

  const onMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    isDragging.current = true; mouseMoved.current = false;
    startX.current = e.pageX - scrollRef.current.offsetLeft; scrollLeft.current = scrollRef.current.scrollLeft;
    document.body.style.userSelect = 'none';
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !scrollRef.current) return;
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX.current);
    if (Math.abs(walk) > 10) { mouseMoved.current = true; scrollRef.current.scrollLeft = scrollLeft.current - walk; }
  };

  const onMouseUp = () => { isDragging.current = false; document.body.style.userSelect = ''; };
  const onMouseLeave = () => { isDragging.current = false; document.body.style.userSelect = ''; };
  const handleCardClick = (matchData: any) => { if (!mouseMoved.current) setSelectedMatch(matchData); };

  const handleSaveManualSchedule = async () => {
    if (!firestore || !season || !selectedMatch || !editDate || !editTime) return;
    setIsUpdatingSchedule(true);
    const [h, m] = editTime.split(':').map(Number);
    const newDate = new Date(editDate);
    newDate.setHours(h, m, 0, 0);
    const matchRef = doc(firestore, 'leagues', 'main-league', 'seasons', season.id, 'matches', selectedMatch.id);
    try {
        await updateDoc(matchRef, { matchDate: Timestamp.fromDate(newDate) });
        toast({ title: "Jadwal Diperbarui", description: "Waktu pertandingan telah berhasil disinkronisasi." });
    } catch (error: any) {
        const permissionError = new FirestorePermissionError({ path: matchRef.path, operation: 'update', requestResourceData: { matchDate: Timestamp.fromDate(newDate) } });
        errorEmitter.emit('permission-error', permissionError);
    } finally {
        setIsUpdatingSchedule(false);
    }
  };

  const rankedTable = useMemo(() => {
    if (!leagueTable || leagueTable.length === 0) return [];
    
    const sortFn = (a: any, b: any) => {
        const nameA = a.playerName || a.teamName || "";
        const nameB = b.playerName || b.teamName || "";
        return (
            b.points - a.points || 
            (b.goalDifference || 0) - (a.goalDifference || 0) || 
            (b.goalsFor || 0) - (a.goalsFor || 0) || 
            (b.win || 0) - (a.win || 0) ||
            nameA.localeCompare(nameB)
        );
    };

    if (season?.type === 'Hybrid' || season?.type === 'Co-Op Hybrid') {
      const gA = [...leagueTable].filter(p => p.group === 'A').sort(sortFn).map((p, i) => ({ ...p, rank: i + 1 }));
      const gB = [...leagueTable].filter(p => p.group === 'B').sort(sortFn).map((p, i) => ({ ...p, rank: i + 1 }));
      const gAll = season.type === 'Co-Op Hybrid' ? [...leagueTable].sort(sortFn).map((p, i) => ({ ...p, rank: i+1 })) : [];
      return season.type === 'Co-Op Hybrid' ? gAll : [...gA, ...gB];
    }
    return [...leagueTable].sort(sortFn).map((p, i) => ({ ...p, rank: i + 1 }));
  }, [leagueTable, season]);

  const masterPlayersRanked = useMemo(() => {
    const players = Object.values(playersById);
    const withOvr = players.map(p => {
        const poss = (p.overallPlayed || 0) * 3;
        const act = ((p.overallWin || 0) * 3) + ((p.overallDraw || 0) * 1);
        return { ...p, ovrRating: poss > 0 ? (act / poss) * 100 : 0 };
    });
    return [...withOvr].sort((a, b) => b.ovrRating - a.ovrRating || b.overallPlayed - a.overallPlayed).map((p, i) => ({ ...p, masterRank: i + 1 }));
  }, [playersById]);

  const getPlayerAnalysis = (playerId: string) => {
    if (!playerId || playerId === 'TBD' || playerId.includes('TBD') || playerId.includes('Loser')) return null;
    const playerMatches = matches.filter(m => m.isCompleted && (m.player1Id === playerId || m.player2Id === playerId)).sort((a, b) => a.matchDate.toMillis() - b.matchDate.toMillis());
    const entry = rankedTable.find(e => (e.playerId || e.id) === playerId) as any;
    const teamId = entry?.teamId || entry?.player1TeamId || playersById[playerId]?.teamId || '';
    const team = teamId ? teamsById[teamId] : null;
    const masterInfo = masterPlayersRanked.find(p => p.id === playerId);
    
    const stats = playerMatches.reduce((acc, m) => {
      acc.played++; const isP1 = m.player1Id === playerId;
      const isBo3 = (season?.type === 'Co-Op' || season?.type === 'Co-Op Hybrid') ? (m.round && m.round !== 'Group') : (m.round && m.round !== 'Group');
      const s1 = isBo3 ? (m.player1Wins ?? 0) : (m.player1Score ?? 0);
      const s2 = isBo3 ? (m.player2Wins ?? 0) : (m.player2Score ?? 0);
      const pRes = isP1 ? s1 : s2; const oRes = isP1 ? s2 : s1;
      if (pRes > oRes) acc.win++; else if (pRes < oRes) acc.loss++; else acc.draw++;
      if (m.player1Score !== null && m.player2Score !== null) { acc.gf += isP1 ? m.player1Score : m.player2Score; acc.ga += isP1 ? m.player2Score : m.player1Score; }
      return acc;
    }, { played: 0, win: 0, draw: 0, loss: 0, gf: 0, ga: 0 });

    const possiblePoints = stats.played * 3;
    const actualPoints = (stats.win * 3) + (stats.draw * 1);
    const winRate = possiblePoints > 0 ? (actualPoints / possiblePoints) * 100 : 0;
    
    const form = playerMatches.slice(-5).map(m => {
      const isP1 = m.player1Id === playerId;
      const isBo3 = (season?.type === 'Co-Op' || season?.type === 'Co-Op Hybrid') ? (m.round && m.round !== 'Group') : (m.round && m.round !== 'Group');
      const s1 = isBo3 ? (m.player1Wins ?? 0) : (m.player1Score ?? 0);
      const s2 = isBo3 ? (m.player2Wins ?? 0) : (m.player2Score ?? 0);
      const pR = isP1 ? s1 : s2; const oR = isP1 ? s2 : s1;
      if (pR > oR) return 'W';
      if (pR < oR) return 'L';
      return 'D';
    });

    let cum = 0; const chartData = [{ match: 0, points: 0 }, ...playerMatches.map((m, i) => {
      const isP1 = m.player1Id === playerId;
      const isBo3 = (season?.type === 'Co-Op' || season?.type === 'Co-Op Hybrid') ? (m.round && m.round !== 'Group') : (m.round && m.round !== 'Group');
      const s1 = isBo3 ? (m.player1Wins ?? 0) : (m.player1Score ?? 0);
      const s2 = isBo3 ? (m.player2Wins ?? 0) : (m.player2Score ?? 0);
      const pR = isP1 ? s1 : s2; const oR = i+1 ? s2 : s1;
      cum += (pR > oR ? 1 : (pR < oR ? -1 : 0)); return { match: i + 1, points: cum };
    })];

    let pST = "Balance"; let pSType: 'attacking' | 'defensive' | 'balanced' = 'balanced'; let pSD = t('play_style_balanced_desc');
    if (stats.played > 0) { const avgGF = stats.gf / stats.played; const avgGA = stats.ga / stats.played; if (avgGF > 1.6) { pST = "Attacking"; pSType = 'attacking'; pSD = t('play_style_attacking_desc'); } else if (avgGA < 1.2 && stats.played >= 3) { pST = "Defense & Counter"; pSType = 'defensive'; pSD = t('play_style_defensive_desc'); } }
    
    let q = "Stabil"; let qC = "text-white/60"; const rWC = form.filter(f => f === 'W').length;
    if (rWC === 5) { q = "Tak terkalahkan"; qC = "text-green-400"; } else if (rWC >= 3) { q = "Performa bagus"; qC = "text-green-400"; } else if (form.filter(f => f === 'L').length >= 3) { q = "Performa menurun"; qC = "text-red-400"; }
    
    const logoUrl = resolveLogo(team?.logoUrl, playerId, entry?.playerName || entry?.teamName || playersById[playerId]?.name);
    return { stats, winRate, form, chartData, playStyleText: pST, playStyleType: pSType, playStyleDescription: pSD, quote: q, quoteColor: qC, team, entry, masterInfo, isDefendingChampion: playerId === defendingChampionId, logoUrl };
  };

  const projections = useMemo(() => {
    if (!rankedTable || rankedTable.length === 0) return null;
    const proj: Record<string, any> = {};
    if (season?.type === 'Single Hybrid') {
        if (rankedTable.length >= 8) {
            proj['playoff-m1'] = { p1: rankedTable[0], p2: rankedTable[7] }; // 1 vs 8
            proj['playoff-m2'] = { p1: rankedTable[3], p2: rankedTable[4] }; // 4 vs 5
            proj['playoff-m3'] = { p1: rankedTable[1], p2: rankedTable[6] }; // 2 vs 7
            proj['playoff-m4'] = { p1: rankedTable[2], p2: rankedTable[5] }; // 3 vs 6
            proj['playoff-sf1'] = { p1: { playerName: 'Pemenang QF 1', teamName: 'Unit TBD', id: 'TBD-W1' }, p2: { playerName: 'Pemenang QF 2', teamName: 'Unit TBD', id: 'TBD-W2' } };
            proj['playoff-sf2'] = { p1: { playerName: 'Pemenang QF 3', teamName: 'Unit TBD', id: 'TBD-W3' }, p2: { playerName: 'Pemenang QF 4', teamName: 'Unit TBD', id: 'TBD-W4' } };
            proj['playoff-final'] = { p1: { playerName: 'Pemenang SF 1', teamName: 'Unit TBD', id: 'TBD-WSF1' }, p2: { playerName: 'Pemenang SF 2', teamName: 'Unit TBD', id: 'TBD-WSF2' } };
            proj['playoff-m18'] = proj['playoff-final'];
        }
        return proj;
    }
    if (season?.type === 'Co-Op Hybrid') {
        if (rankedTable.length >= 4) {
            proj['playoff-m9'] = { p1: rankedTable[0], p2: rankedTable[3] };
            proj['playoff-m10'] = { p1: rankedTable[1], p2: rankedTable[2] };
        }
        if (rankedTable.length >= 6) {
            proj['playoff-m13'] = { p1: rankedTable[4], p2: { playerName: 'Loser UB-SF 1', teamName: 'Unit TBD', id: 'TBD-L1' } };
            proj['playoff-m14'] = { p1: rankedTable[5], p2: { playerName: 'Loser UB-SF 2', teamName: 'Unit TBD', id: 'TBD-L2' } };
        }
        return proj;
    }
    const sR = (data: any[]) => [...data].sort((a, b) => b.points - a.points || (b.goalDifference || 0) - (a.goalDifference || 0) || (b.goalsFor || 0) - (a.goalsFor || 0) || (b.win || 0) - (a.win || 0));
    const gA = sR(rankedTable.filter(p => p.group === 'A')); const gB = sR(rankedTable.filter(p => p.group === 'B'));
    if (gA.length >= 4 && gB.length >= 4) {
        proj['playoff-m1'] = { p1: gA[0], p2: gB[3] }; proj['playoff-m2'] = { p1: gB[1], p2: gA[2] };
        proj['playoff-m3'] = { p1: gB[0], p2: gA[3] }; proj['playoff-m4'] = { p1: gA[1], p2: gB[2] };
    }
    if (gA.length >= 6 && gB.length >= 6) {
        proj['playoff-m5'] = { p1: gA[4], p2: { playerName: 'Loser UB-QF 1', teamName: 'Unit TBD', id: 'TBD-L1' } };
        proj['playoff-m6'] = { p1: gB[4], p2: { playerName: 'Loser UB-QF 2', teamName: 'Unit TBD', id: 'TBD-L2' } };
        proj['playoff-m7'] = { p1: gA[5], p2: { playerName: 'Loser UB-QF 3', teamName: 'Unit TBD', id: 'TBD-L3' } };
        proj['playoff-m8'] = { p1: gB[5], p2: { playerName: 'Loser UB-QF 4', teamName: 'Unit TBD', id: 'TBD-L4' } };
    }
    return proj;
  }, [rankedTable, season]);

  const bracketData = useMemo(() => {
    const d: Record<string, any> = {};
    matches.forEach(m => {
      if (m.bracketId) {
        const isBo3 = (season?.type === 'Co-Op' || season?.type === 'Co-Op Hybrid') ? (m.round && m.round !== 'Group') : (m.round && m.round !== 'Group');
        const e1 = rankedTable.find(e => (e.playerId || e.id) === m.player1Id) as any; const e2 = rankedTable.find(e => (e.playerId || e.id) === m.player2Id) as any;
        const t1Id = e1?.teamId || e1?.player1TeamId || playersById[m.player1Id]?.teamId || '';
        const t2Id = e2?.teamId || e2?.player1TeamId || playersById[m.player2Id]?.teamId || '';
        const t1 = t1Id ? teamsById[t1Id] : null; const t2 = t2Id ? teamsById[t2Id] : null;
        const s1 = isBo3 ? (m.player1Wins ?? 0) : (m.player1Score ?? 0);
        const s2 = isBo3 ? (m.player2Wins ?? 0) : (m.player2Score ?? 0);
        d[m.bracketId] = { ...m, p1: e1 ? { name: e1.playerName || e1.teamName, playerId: e1.playerId || e1.id } : (playersById[m.player1Id] || { name: m.player1Id, playerId: m.player1Id }), p2: e2 ? { name: e2.playerName || e2.teamName, playerId: e2.playerId || e2.id } : (playersById[m.player2Id] || { name: m.player2Id, playerId: m.player2Id }), t1, t2, s1, s2, isW1: m.isCompleted && s1 > s2, isW2: m.isCompleted && s2 > s1 };
      }
    });
    return d;
  }, [matches, playersById, teamsById, rankedTable, season]);

  const analysis1 = useMemo(() => selectedMatch ? getPlayerAnalysis(selectedMatch.player1Id) : null, [selectedMatch, matches, rankedTable, teamsById, playersById, masterPlayersRanked, defendingChampionId, t, season]);
  const analysis2 = useMemo(() => selectedMatch ? getPlayerAnalysis(selectedMatch.player2Id) : null, [selectedMatch, matches, rankedTable, teamsById, playersById, masterPlayersRanked, defendingChampionId, t, season]);
  
  const combinedTrendData = useMemo(() => {
    if (!analysis1 && !analysis2) return [];
    const len1 = analysis1?.chartData.length || 0;
    const len2 = analysis2?.chartData.length || 0;
    const maxLen = Math.max(len1, len2);
    return Array.from({ length: maxLen }).map((_, i) => ({
        match: i,
        p1: analysis1?.chartData[i]?.points ?? (i >= len1 && len1 > 0 && analysis1 ? analysis1.chartData[len1-1].points : 0),
        p2: analysis2?.chartData[i]?.points ?? (i >= len2 && len2 > 0 && analysis2 ? analysis2.chartData[len2-1].points : 0)
    }));
  }, [analysis1, analysis2]);

  const editHour = selectedMatch?.isProjection ? '00' : (editTime || "00:00").split(':')[0];
  const editMin = selectedMatch?.isProjection ? '00' : (editTime || "00:00").split(':')[1];

  const isCoopHybrid = season?.type === 'Co-Op Hybrid';
  const isSingleHybrid = season?.type === 'Single Hybrid';
  const is12TeamHybrid = season?.type === 'Hybrid';
  const theme = getSeasonTheme(season);

  const [mobileRoundTab, setMobileRoundTab] = useState<string>('all');
  const [mobileViewMode, setMobileViewMode] = useState<'stage' | 'canvas'>('stage');

  const scrollToStage = (stage: string) => {
    setMobileRoundTab(stage);
    if (!scrollRef.current) return;
    if (stage === 'all' || stage === 'qf' || stage === 'ub') {
      scrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
    } else if (stage === 'sf' || stage === 'lb') {
      scrollRef.current.scrollTo({ left: Math.min(scrollRef.current.scrollWidth / 2, 450), behavior: 'smooth' });
    } else if (stage === 'final') {
      scrollRef.current.scrollTo({ left: scrollRef.current.scrollWidth, behavior: 'smooth' });
    }
  };

  return (
    <div className="w-full relative">
        <div className="absolute top-0 left-0 pointer-events-none opacity-[0.03] flex flex-col items-start pt-4 pl-10"><span className="text-[4rem] sm:text-[6rem] font-black italic leading-none">BM LEAGUE</span><span className="text-[1.5rem] sm:text-[2rem] font-black italic -mt-4 tracking-[0.8em]">EIGHTY EIGHT</span></div>
        
        {(!matches || matches.filter(m => m.bracketId).length === 0) && rankedTable.length > 0 && (
            <div className="mb-4 sm:mb-6 px-3 sm:px-8"><div className="relative overflow-hidden bg-amber-500/[0.03] border-2 border-amber-500/20 rounded-xl p-3 sm:p-4 backdrop-blur-sm animate-in fade-in slide-in-from-top-4 duration-700">
                <div className="absolute top-0 left-0 w-1 h-full bg-amber-500 animate-pulse" /><div className="flex items-start gap-3 sm:gap-4"><div className="p-2 sm:p-2.5 rounded-lg bg-amber-500/10 text-amber-500 shadow-lg shrink-0"><Scan className="w-4 h-4 sm:w-5 sm:h-5" /></div><div className="flex-1">
                    <div className="flex items-center gap-2 sm:gap-3 mb-1"><Badge className="bg-amber-500 text-black font-black uppercase italic text-[8.5px] sm:text-[9px]">Live Simulation v2.4</Badge></div><p className="text-[11px] sm:text-xs font-bold text-amber-200/90 leading-tight">Bagan ini adalah proyeksi dinamis berdasarkan peringkat grup saat ini. Jadwal final akan dikunci saat Admin memulai babak playoff.</p>
                </div></div>
            </div></div>
        )}

        {/* Adaptive Mobile Controls Bar (Visible on screens < xl) */}
        <div className="xl:hidden px-3 mb-3 sm:mb-4 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2 bg-black/80 backdrop-blur-2xl border border-white/10 p-1.5 rounded-2xl shadow-xl">
                <div className="flex items-center gap-1 bg-white/[0.05] p-1 rounded-xl border border-white/10">
                    <button
                        type="button"
                        onClick={() => setMobileViewMode('stage')}
                        className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-300 font-headline",
                            mobileViewMode === 'stage' 
                                ? "bg-primary text-black shadow-[0_0_12px_rgba(204,253,1,0.5)]" 
                                : "text-white/60 hover:text-white"
                        )}
                    >
                        <Layers className="w-3.5 h-3.5" />
                        <span>Per Babak</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setMobileViewMode('canvas')}
                        className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-300 font-headline",
                            mobileViewMode === 'canvas' 
                                ? "bg-primary text-black shadow-[0_0_12px_rgba(204,253,1,0.5)]" 
                                : "text-white/60 hover:text-white"
                        )}
                    >
                        <Scan className="w-3.5 h-3.5" />
                        <span>Bagan Utuh</span>
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        onClick={() => setIsShareDialogOpen(true)}
                        className="h-7 px-2.5 rounded-lg text-[9px] font-black uppercase tracking-wider italic flex items-center gap-1.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black border border-amber-300/60 shadow-sm active:scale-95 transition-all"
                    >
                        <Share2 className="w-3 h-3" />
                        <span>Share Bagan</span>
                    </Button>
                    <span className="text-[9px] font-mono font-bold text-white/40 uppercase tracking-widest hidden sm:inline-block pr-2">
                        {mobileViewMode === 'stage' ? 'Adaptive Mobile Flow' : 'Swipe Canvas'}
                    </span>
                </div>
            </div>

            {/* Quick Round Navigation Filter (Stage Mode) */}
            {mobileViewMode === 'stage' && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    {isSingleHybrid ? (
                        <>
                            <button
                                type="button"
                                onClick={() => scrollToStage('all')}
                                className={cn(
                                    "shrink-0 px-3 py-1 rounded-full text-[9px] font-black uppercase italic tracking-wider border transition-all",
                                    mobileRoundTab === 'all' 
                                        ? "bg-white/20 text-white border-white/40 shadow-sm" 
                                        : "bg-black/50 text-white/50 border-white/10 hover:border-white/20"
                                )}
                            >
                                Semua
                            </button>
                            <button
                                type="button"
                                onClick={() => scrollToStage('qf')}
                                className={cn(
                                    "shrink-0 px-3 py-1 rounded-full text-[9px] font-black uppercase italic tracking-wider border transition-all",
                                    mobileRoundTab === 'qf' 
                                        ? "bg-primary text-black border-primary shadow-[0_0_10px_rgba(204,253,1,0.5)]" 
                                        : "bg-black/50 text-white/60 border-white/10 hover:border-white/20"
                                )}
                            >
                                8 Besar (QF)
                            </button>
                            <button
                                type="button"
                                onClick={() => scrollToStage('sf')}
                                className={cn(
                                    "shrink-0 px-3 py-1 rounded-full text-[9px] font-black uppercase italic tracking-wider border transition-all",
                                    mobileRoundTab === 'sf' 
                                        ? "bg-cyan-500 text-black border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.5)]" 
                                        : "bg-black/50 text-white/60 border-white/10 hover:border-white/20"
                                )}
                            >
                                Semifinal
                            </button>
                            <button
                                type="button"
                                onClick={() => scrollToStage('final')}
                                className={cn(
                                    "shrink-0 px-3 py-1 rounded-full text-[9px] font-black uppercase italic tracking-wider border transition-all",
                                    mobileRoundTab === 'final' 
                                        ? "bg-amber-400 text-black border-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.6)]" 
                                        : "bg-black/50 text-white/60 border-white/10 hover:border-white/20"
                                )}
                            >
                                Grand Final 🏆
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                type="button"
                                onClick={() => scrollToStage('all')}
                                className={cn(
                                    "shrink-0 px-3 py-1 rounded-full text-[9px] font-black uppercase italic tracking-wider border transition-all",
                                    mobileRoundTab === 'all' 
                                        ? "bg-white/20 text-white border-white/40 shadow-sm" 
                                        : "bg-black/50 text-white/50 border-white/10 hover:border-white/20"
                                )}
                            >
                                Semua
                            </button>
                            <button
                                type="button"
                                onClick={() => scrollToStage('ub')}
                                className={cn(
                                    "shrink-0 px-3 py-1 rounded-full text-[9px] font-black uppercase italic tracking-wider border transition-all",
                                    mobileRoundTab === 'ub' 
                                        ? "bg-primary text-black border-primary shadow-[0_0_10px_rgba(204,253,1,0.5)]" 
                                        : "bg-black/50 text-white/60 border-white/10 hover:border-white/20"
                                )}
                            >
                                Upper Bracket
                            </button>
                            <button
                                type="button"
                                onClick={() => scrollToStage('lb')}
                                className={cn(
                                    "shrink-0 px-3 py-1 rounded-full text-[9px] font-black uppercase italic tracking-wider border transition-all",
                                    mobileRoundTab === 'lb' 
                                        ? "bg-rose-500 text-white border-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.5)]" 
                                        : "bg-black/50 text-white/60 border-white/10 hover:border-white/20"
                                )}
                            >
                                Lower Bracket
                            </button>
                            <button
                                type="button"
                                onClick={() => scrollToStage('final')}
                                className={cn(
                                    "shrink-0 px-3 py-1 rounded-full text-[9px] font-black uppercase italic tracking-wider border transition-all",
                                    mobileRoundTab === 'final' 
                                        ? "bg-amber-400 text-black border-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.6)]" 
                                        : "bg-black/50 text-white/60 border-white/10 hover:border-white/20"
                                )}
                            >
                                Grand Final 🏆
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>

        {/* Adaptive Stacked Mobile Cards (Visible on mobile when mobileViewMode === 'stage') */}
        {mobileViewMode === 'stage' && (
            <div className="xl:hidden px-3 space-y-4 pb-8 animate-in fade-in duration-500">
                {isSingleHybrid ? (
                    <>
                        {/* Mobile Section: Quarterfinals (8 Besar) */}
                        {(mobileRoundTab === 'all' || mobileRoundTab === 'qf') && (
                            <div className={cn("p-4 sm:p-5 rounded-2xl sm:rounded-3xl border bg-black/85 backdrop-blur-2xl relative overflow-hidden shadow-2xl", theme.primaryBorder)}>
                                <div className={cn("absolute top-0 left-0 right-0 h-[2px]", theme.topTracer)} />
                                <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
                                    <div className="flex items-center gap-2">
                                        <div className={cn("h-4 w-1 rounded-full shadow-[0_0_10px_rgba(204,253,1,0.8)]", theme.laserConduit)} />
                                        <h4 className="text-xs sm:text-sm font-black tracking-wider text-white uppercase italic font-headline">
                                            8 BESAR (QUARTERFINALS)
                                        </h4>
                                    </div>
                                    <Badge className="bg-primary/10 border border-primary/40 text-primary text-[8px] font-black uppercase">
                                        BO3 • GUGUR
                                    </Badge>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <MatchCard bid="playoff-m1" label="QF 1 (#1 vs #8)" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} theme={theme} />
                                    <MatchCard bid="playoff-m2" label="QF 2 (#4 vs #5)" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} theme={theme} />
                                    <MatchCard bid="playoff-m3" label="QF 3 (#2 vs #7)" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} theme={theme} />
                                    <MatchCard bid="playoff-m4" label="QF 4 (#3 vs #6)" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} theme={theme} />
                                </div>
                            </div>
                        )}

                        {/* Mobile Section: Semifinals */}
                        {(mobileRoundTab === 'all' || mobileRoundTab === 'sf') && (
                            <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-cyan-500/30 bg-black/85 backdrop-blur-2xl relative overflow-hidden shadow-2xl">
                                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />
                                <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
                                    <div className="flex items-center gap-2">
                                        <div className="h-4 w-1 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.8)]" />
                                        <h4 className="text-xs sm:text-sm font-black tracking-wider text-white uppercase italic font-headline">
                                            SEMIFINALS
                                        </h4>
                                    </div>
                                    <Badge className="bg-cyan-500/10 border border-cyan-500/40 text-cyan-400 text-[8px] font-black uppercase">
                                        STAGE 02
                                    </Badge>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <MatchCard bid="playoff-sf1" label="SEMIFINAL 1" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} theme={theme} />
                                    <MatchCard bid="playoff-sf2" label="SEMIFINAL 2" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} theme={theme} />
                                </div>
                            </div>
                        )}

                        {/* Mobile Section: Grand Final Podium */}
                        {(mobileRoundTab === 'all' || mobileRoundTab === 'final') && (
                            <GrandFinalPodium
                                bid={bracketData['playoff-final'] ? 'playoff-final' : (bracketData['playoff-m18'] ? 'playoff-m18' : 'playoff-final')}
                                label="CHAMPIONSHIP BATTLE"
                                bracketData={bracketData}
                                projections={projections}
                                handleCardClick={handleCardClick}
                                teamsById={teamsById}
                                seriesLabel={theme.seriesBadge}
                                season={season}
                            />
                        )}
                    </>
                ) : (
                    <>
                        {/* Double Elimination Mobile: Upper Bracket */}
                        {(mobileRoundTab === 'all' || mobileRoundTab === 'ub') && (
                            <div className={cn("p-4 sm:p-5 rounded-2xl sm:rounded-3xl border bg-black/85 backdrop-blur-2xl relative overflow-hidden shadow-2xl", theme.primaryBorder)}>
                                <div className={cn("absolute top-0 left-0 right-0 h-[2px]", theme.topTracer)} />
                                <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
                                    <div className="flex items-center gap-2">
                                        <div className={cn("h-4 w-1 rounded-full shadow-[0_0_10px_rgba(204,253,1,0.8)]", theme.laserConduit)} />
                                        <h4 className={cn("text-xs sm:text-sm font-black tracking-wider uppercase italic font-headline", theme.primaryText)}>
                                            UPPER BRACKET
                                        </h4>
                                    </div>
                                    <Badge className={cn("text-[7.5px] font-black uppercase tracking-widest px-2 py-0.2 rounded-full shadow-sm", theme.badgeClass)}>
                                        {theme.seasonBadge}
                                    </Badge>
                                </div>
                                <div className="space-y-3">
                                    {!isCoopHybrid && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                            <MatchCard bid="playoff-m1" label="UB QF 1" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} theme={theme} />
                                            <MatchCard bid="playoff-m2" label="UB QF 2" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} theme={theme} />
                                            <MatchCard bid="playoff-m3" label="UB QF 3" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} theme={theme} />
                                            <MatchCard bid="playoff-m4" label="UB QF 4" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} theme={theme} />
                                        </div>
                                    )}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                                        <MatchCard bid="playoff-m9" label="UB SEMI 1" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} theme={theme} />
                                        <MatchCard bid="playoff-m10" label="UB SEMI 2" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} theme={theme} />
                                    </div>
                                    <div className="pt-1">
                                        <MatchCard bid="playoff-m15" label="UPPER FINAL" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} theme={theme} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Double Elimination Mobile: Lower Bracket */}
                        {(mobileRoundTab === 'all' || mobileRoundTab === 'lb') && (
                            <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-rose-500/30 bg-black/85 backdrop-blur-2xl relative overflow-hidden shadow-2xl">
                                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-rose-500 to-transparent" />
                                <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
                                    <div className="flex items-center gap-2">
                                        <div className="h-4 w-1 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.8)]" />
                                        <h4 className="text-xs sm:text-sm font-black tracking-wider text-rose-400 uppercase italic font-headline">
                                            LOWER BRACKET
                                        </h4>
                                    </div>
                                    <Badge className="bg-rose-500/20 text-rose-400 border border-rose-500/40 text-[7.5px] font-black uppercase">
                                        SUDDEN DEATH
                                    </Badge>
                                </div>
                                <div className="space-y-3">
                                    {is12TeamHybrid && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                            <MatchCard bid="playoff-m5" label="LB R1" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} theme={theme} isLower={true} />
                                            <MatchCard bid="playoff-m6" label="LB R1" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} theme={theme} isLower={true} />
                                            <MatchCard bid="playoff-m7" label="LB R1" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} theme={theme} isLower={true} />
                                            <MatchCard bid="playoff-m8" label="LB R1" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} theme={theme} isLower={true} />
                                        </div>
                                    )}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                                        <MatchCard bid="playoff-m13" label="LB R3" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} theme={theme} isLower={true} />
                                        <MatchCard bid="playoff-m14" label="LB R3" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} theme={theme} isLower={true} />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                                        <MatchCard bid="playoff-m16" label="LB SEMI" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} theme={theme} isLower={true} />
                                        <MatchCard bid="playoff-m17" label="LOWER FINAL" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} theme={theme} isLower={true} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Double Elimination Mobile: Grand Final Podium */}
                        {(mobileRoundTab === 'all' || mobileRoundTab === 'final') && (
                            <GrandFinalPodium
                                bid="playoff-m18"
                                label="THE ULTIMATE BATTLE"
                                bracketData={bracketData}
                                projections={projections}
                                handleCardClick={handleCardClick}
                                teamsById={teamsById}
                                seriesLabel={theme.seriesBadge}
                                season={season}
                            />
                        )}
                    </>
                )}
            </div>
        )}

        {/* Full Interactive Canvas View (Default on desktop, and available on mobile via toggle) */}
        <div 
            ref={scrollRef} 
            onMouseDown={onMouseDown} 
            onMouseMove={onMouseMove} 
            onMouseUp={onMouseUp} 
            onMouseLeave={onMouseLeave} 
            className={cn(
                "w-full overflow-x-auto pb-10 cursor-grab active:cursor-grabbing scrollbar-thin scrollbar-thumb-primary/20",
                mobileViewMode === 'stage' ? "hidden xl:block" : "block"
            )}
        >
            {isSingleHybrid ? (
                /* SINGLE HYBRID: 8-BESAR SINGLE ELIMINATION BRACKET (BEST OF 3, KALAH = GUGUR) */
                <div className="w-full min-w-[920px] xl:min-w-0 flex flex-col xl:flex-row items-stretch justify-center gap-4 sm:gap-6 p-2 sm:p-4 2xl:p-6 animate-in fade-in duration-1000">
                    {/* KNOCKOUT ARENA: QUARTERFINALS & SEMIFINALS */}
                    <div className="flex-[1.3] 2xl:flex-[1.4] min-w-0 flex flex-col relative">
                        <div className={cn("flex-1 relative bg-gradient-to-br from-black/95 via-[#070A0F]/95 to-black/95 border-2 rounded-[2rem] p-4 sm:p-6 2xl:p-8 backdrop-blur-3xl shadow-[0_20px_60px_rgba(0,0,0,0.9)] transition-all duration-700 aero-card cyber-carbon overflow-hidden", theme.primaryBorder)}>
                            {/* Top neon racing tracer */}
                            <div className={cn("absolute top-0 left-0 right-0 h-[2px]", theme.topTracer)} />
                            <div className="absolute top-3 right-5 flex items-center gap-2 font-mono opacity-75">
                                <span className={cn("text-[7.5px] font-black tracking-[0.3em] uppercase italic", theme.primaryText)}>
                                    {theme.sysTag}
                                </span>
                                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                            </div>

                            <div className="space-y-4 relative h-full flex flex-col justify-center">
                                {/* 1. Cockpit Header Bar */}
                                <div className="flex items-center justify-between pb-2.5 border-b border-white/10">
                                    <div className="flex items-center gap-3">
                                        <div className={cn("h-7 w-1.5 rounded-full shadow-[0_0_15px_rgba(204,253,1,0.9)]", theme.laserConduit)} />
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h3 className="text-lg sm:text-xl font-black tracking-wider text-white uppercase italic font-headline">
                                                    {theme.knockoutArenaTitle}
                                                </h3>
                                                <Badge className={cn("text-[7.5px] font-black uppercase tracking-widest px-2 py-0.2 rounded-full shadow-sm", theme.badgeClass)}>
                                                    {theme.seasonBadge}
                                                </Badge>
                                            </div>
                                            <span className="text-[7.5px] font-mono font-bold text-white/40 uppercase tracking-[0.25em]">
                                                {theme.knockoutArenaSubtitle}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className={cn("hidden sm:flex px-2.5 py-0.5 rounded-full bg-black/60 border items-center gap-1.5 font-mono text-[7.5px]", theme.tagBorder, theme.primaryText)}>
                                            <span className="relative flex h-1.5 w-1.5">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary"></span>
                                            </span>
                                            <span className="font-black uppercase tracking-wider">LIVE TELEMETRY // KALAH = GUGUR</span>
                                        </div>
                                        <Button
                                            type="button"
                                            onClick={() => setIsShareDialogOpen(true)}
                                            className="h-8 sm:h-9 px-3 sm:px-4 rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-wider italic transition-all flex items-center gap-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black border border-amber-300/60 shadow-[0_0_15px_rgba(251,191,36,0.3)] active:scale-95"
                                        >
                                            <Share2 className="w-3.5 h-3.5" />
                                            <span>Share Bagan</span>
                                        </Button>
                                    </div>
                                </div>

                                {/* 2. Stage Progress Route Indicators */}
                                <div className="flex items-center justify-between px-2 font-mono text-[8px] text-white/40 border-b border-white/5 pb-2">
                                    <div className="flex items-center gap-2">
                                        <span 
                                          className="font-black uppercase px-2.5 py-0.5 rounded-full border"
                                          style={{
                                            color: theme.primaryHex,
                                            backgroundColor: `${theme.primaryHex}1A`,
                                            borderColor: `${theme.primaryHex}4D`
                                          }}
                                        >
                                            STAGE 01 // 8 BESAR (QUARTERFINALS)
                                        </span>
                                        <span className="text-white/20">❯❯❯</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span 
                                          className="font-black uppercase px-2.5 py-0.5 rounded-full border"
                                          style={{
                                            color: theme.secondaryHex || theme.primaryHex,
                                            backgroundColor: `${theme.secondaryHex || theme.primaryHex}1A`,
                                            borderColor: `${theme.secondaryHex || theme.primaryHex}4D`
                                          }}
                                        >
                                            STAGE 02 // SEMIFINALS
                                        </span>
                                        <span className="text-white/20">❯❯❯</span>
                                    </div>
                                    <div 
                                      className="flex items-center gap-1.5 font-bold uppercase"
                                      style={{ color: theme.secondaryHex || theme.primaryHex }}
                                    >
                                        <Trophy className="w-3 h-3" style={{ color: theme.secondaryHex || theme.primaryHex }} />
                                        <span>APEX GRAND FINAL</span>
                                    </div>
                                </div>

                                {/* 3. Precision Synchronized Bracket Grid */}
                                <div className="w-full flex items-center justify-between gap-1 sm:gap-2">
                                    {/* Column 1: QUARTERFINALS */}
                                    <div className="flex-1 min-w-[195px] sm:min-w-[215px] max-w-[320px] 2xl:max-w-[340px] flex flex-col gap-6">
                                        {/* Pair 1 (QF 1 & QF 2) */}
                                        <div className="flex flex-col gap-2">
                                            <MatchCard bid="playoff-m1" label="QF 1 (#1 vs #8)" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} theme={theme} />
                                            <MatchCard bid="playoff-m2" label="QF 2 (#4 vs #5)" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} theme={theme} />
                                        </div>
                                        {/* Pair 2 (QF 3 & QF 4) */}
                                        <div className="flex flex-col gap-2">
                                            <MatchCard bid="playoff-m3" label="QF 3 (#2 vs #7)" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} theme={theme} />
                                            <MatchCard bid="playoff-m4" label="QF 4 (#3 vs #6)" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} theme={theme} />
                                        </div>
                                    </div>

                                    {/* Column 2: LASER CONNECTORS QF -> SF */}
                                    <div className="shrink-0 flex flex-col gap-6 items-center justify-center">
                                        <CyberConnectorFork 
                                          color={theme.connectorColor} 
                                          customHex={theme.primaryHex} 
                                          customGlow={theme.glowRgba} 
                                          height="standard" 
                                        />
                                        <CyberConnectorFork 
                                          color={theme.connectorColor} 
                                          customHex={theme.primaryHex} 
                                          customGlow={theme.glowRgba} 
                                          height="standard" 
                                        />
                                    </div>

                                    {/* Column 3: SEMIFINALS */}
                                    <div className="flex-1 min-w-[195px] sm:min-w-[215px] max-w-[320px] 2xl:max-w-[340px] flex flex-col justify-around h-[376px] py-1">
                                        <div className="flex items-center">
                                            <MatchCard bid="playoff-sf1" label="SEMIFINAL 1" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} theme={theme} />
                                        </div>
                                        <div className="flex items-center">
                                            <MatchCard bid="playoff-sf2" label="SEMIFINAL 2" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} theme={theme} />
                                        </div>
                                    </div>

                                    {/* Column 4: TALL LASER CONNECTOR SF -> GRAND FINAL */}
                                    <div className="shrink-0 flex items-center justify-center h-[376px]">
                                        <CyberConnectorFork 
                                          color={theme.secondaryConnectorColor || "amber"} 
                                          customHex={theme.primaryHex} 
                                          customGlow={theme.glowRgba} 
                                          height="tall" 
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* GRAND FINAL PODIUM */}
                    <GrandFinalPodium
                        bid={bracketData['playoff-final'] ? 'playoff-final' : (bracketData['playoff-m18'] ? 'playoff-m18' : 'playoff-final')}
                        label="CHAMPIONSHIP BATTLE"
                        bracketData={bracketData}
                        projections={projections}
                        handleCardClick={handleCardClick}
                        teamsById={teamsById}
                        seriesLabel={theme.seriesBadge}
                        season={season}
                    />
                </div>
            ) : (
                /* DOUBLE ELIMINATION FORMAT (12-TEAM HYBRID & CO-OP HYBRID) */
                <div className={cn("w-full xl:min-w-0 flex flex-col xl:flex-row items-stretch justify-center gap-4 sm:gap-6 p-2 sm:p-4 2xl:p-6 animate-in fade-in duration-1000", isCoopHybrid ? "min-w-[960px]" : "min-w-[1100px]")}>
                    <div className="flex-[1.4] 2xl:flex-[1.5] min-w-0 flex flex-col gap-5 sm:gap-6 relative">
                        {/* UPPER BRACKET ARENA */}
                        <div className={cn("flex-1 relative bg-gradient-to-br from-black/95 via-[#070A0F]/95 to-black/95 border-2 rounded-[2.5rem] p-5 sm:p-8 backdrop-blur-3xl shadow-[0_20px_60px_rgba(0,0,0,0.9)] transition-all duration-700 aero-card cyber-carbon overflow-hidden", theme.primaryBorder)}>
                            {/* Top neon tracer */}
                            <div className={cn("absolute top-0 left-0 right-0 h-[2px]", theme.topTracer)} />
                            <div className="absolute top-4 right-6 flex items-center gap-2 opacity-75 font-mono">
                                <span className={cn("text-[7.5px] font-black tracking-[0.3em] uppercase italic", theme.primaryText)}>
                                    {`${theme.sysTag}_UB`}
                                </span>
                                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                            </div>

                            <div className="space-y-6 relative h-full flex flex-col justify-center">
                                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                                    <div className="flex items-center gap-3">
                                        <div className={cn("h-7 w-1.5 rounded-full shadow-[0_0_15px_rgba(204,253,1,0.8)]", theme.laserConduit)} />
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h3 className={cn("text-lg sm:text-xl font-black tracking-widest uppercase italic font-headline", theme.primaryText)}>
                                                    {theme.upperTitle}
                                                </h3>
                                                <Badge className={cn("text-[7.5px] font-black uppercase tracking-widest px-2 py-0.2 rounded-full shadow-sm", theme.badgeClass)}>
                                                    {theme.seasonBadge}
                                                </Badge>
                                            </div>
                                            <span className="text-[8px] font-black text-white/40 uppercase tracking-[0.3em]">
                                                {theme.upperSubtitle}
                                            </span>
                                        </div>
                                    </div>
                                    <Button
                                        type="button"
                                        onClick={() => setIsShareDialogOpen(true)}
                                        className="h-8 sm:h-9 px-3 sm:px-4 rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-wider italic transition-all flex items-center gap-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black border border-amber-300/60 shadow-[0_0_15px_rgba(251,191,36,0.3)] active:scale-95"
                                    >
                                        <Share2 className="w-3.5 h-3.5" />
                                        <span>Share Bagan</span>
                                    </Button>
                                </div>
                                <div className="w-full flex items-center justify-between gap-2 sm:gap-4 pl-1 sm:pl-3">
                                    {!isCoopHybrid && (
                                      <>
                                        <div className="flex-1 min-w-[195px] sm:min-w-[215px] max-w-[320px] 2xl:max-w-[340px] flex flex-col gap-6 relative">
                                          <MatchCard bid="playoff-m1" label="UB QF 1" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} theme={theme} />
                                          <MatchCard bid="playoff-m2" label="UB QF 2" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} theme={theme} />
                                          <MatchCard bid="playoff-m3" label="UB QF 3" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} theme={theme} />
                                          <MatchCard bid="playoff-m4" label="UB QF 4" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} theme={theme} />
                                        </div>
                                        <div className="shrink-0 flex flex-col gap-6 py-2">
                                          <BracketConnectorFork 
                                            color={theme.connectorColor} 
                                            customHex={theme.primaryHex} 
                                            customGlow={theme.glowRgba} 
                                          />
                                          <BracketConnectorFork 
                                            color={theme.connectorColor} 
                                            customHex={theme.primaryHex} 
                                            customGlow={theme.glowRgba} 
                                          />
                                        </div>
                                      </>
                                    )}
                                    <div className={cn("flex-1 min-w-[195px] sm:min-w-[215px] max-w-[320px] 2xl:max-w-[340px] flex flex-col", isCoopHybrid ? "justify-around h-[220px] py-2" : "gap-32 py-10")}>
                                      <MatchCard bid="playoff-m9" label={isCoopHybrid ? "UB SEMI 1" : "UB SEMI 1"} bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} theme={theme} />
                                      <MatchCard bid="playoff-m10" label={isCoopHybrid ? "UB SEMI 2" : "UB SEMI 2"} bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} theme={theme} />
                                    </div>
                                    <div className="shrink-0 flex flex-col justify-center">
                                      <BracketConnectorFork 
                                        color={theme.connectorColor} 
                                        customHex={theme.primaryHex} 
                                        customGlow={theme.glowRgba} 
                                      />
                                    </div>
                                    <div className="flex-1 min-w-[195px] sm:min-w-[215px] max-w-[320px] 2xl:max-w-[340px] flex flex-col justify-center">
                                      <MatchCard bid="playoff-m15" label="UPPER FINAL" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} theme={theme} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* LOWER BRACKET ARENA */}
                        <div
                          className="flex-1 relative bg-gradient-to-br from-black/95 via-[#070A0F]/95 to-black/95 border-2 rounded-[2.5rem] p-5 sm:p-8 backdrop-blur-3xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] transition-all duration-700 aero-card cyber-carbon overflow-hidden"
                          style={{ borderColor: `${theme.primaryHex}4D` }}
                        >
                            {/* Top neon tracer */}
                            <div
                              className="absolute top-0 left-0 right-0 h-[2px]"
                              style={{
                                background: `linear-gradient(to right, transparent, ${theme.secondaryHex || theme.primaryHex}, transparent)`,
                                boxShadow: `0 0 20px ${theme.primaryHex}`
                              }}
                            />
                            <div className="absolute top-4 right-6 flex items-center gap-2 opacity-75 font-mono">
                                <span
                                  className="text-[7.5px] font-black tracking-[0.3em] uppercase italic"
                                  style={{ color: theme.secondaryHex || theme.primaryHex }}
                                >
                                    {`${theme.sysTag}_LB`}
                                </span>
                                <div
                                  className="w-1.5 h-1.5 rounded-full animate-pulse"
                                  style={{ backgroundColor: theme.primaryHex }}
                                />
                            </div>

                            <div className="space-y-6 relative h-full flex flex-col justify-center">
                                <div className="flex items-center gap-3">
                                    <div
                                      className="h-7 w-1 rounded-full shadow-md"
                                      style={{
                                        backgroundColor: theme.primaryHex,
                                        boxShadow: `0 0 15px ${theme.primaryHex}`
                                      }}
                                    />
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3
                                              className="text-lg sm:text-xl font-black tracking-widest uppercase italic font-headline"
                                              style={{ color: theme.secondaryHex || theme.primaryHex }}
                                            >
                                                {theme.lowerTitle}
                                            </h3>
                                            <Badge
                                              className="text-[7.5px] font-black uppercase tracking-widest px-2 py-0.2 rounded-full shadow-sm"
                                              style={{
                                                backgroundColor: `${theme.primaryHex}26`,
                                                borderColor: `${theme.primaryHex}66`,
                                                color: theme.secondaryHex || theme.primaryHex
                                              }}
                                            >
                                                SUDDEN DEATH PROTOCOL
                                            </Badge>
                                        </div>
                                        <span className="text-[8px] font-black text-white/40 uppercase tracking-[0.3em]">
                                            {theme.lowerSubtitle}
                                        </span>
                                    </div>
                                </div>
                                <div className="w-full flex items-center justify-between gap-2 sm:gap-4 pl-1 sm:pl-3">
                                    {is12TeamHybrid && (
                                      <>
                                        <div className="flex-1 min-w-[195px] sm:min-w-[215px] max-w-[320px] 2xl:max-w-[340px] flex flex-col gap-6">
                                          <MatchCard bid="playoff-m5" label="LB R1" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} theme={theme} isLower={true} />
                                          <MatchCard bid="playoff-m6" label="LB R1" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} theme={theme} isLower={true} />
                                          <MatchCard bid="playoff-m7" label="LB R1" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} theme={theme} isLower={true} />
                                          <MatchCard bid="playoff-m8" label="LB R1" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} theme={theme} isLower={true} />
                                        </div>
                                        <div className="shrink-0 flex flex-col gap-6 py-2">
                                          <BracketConnectorFork 
                                            color={theme.lowerConnectorColor} 
                                            customHex={theme.secondaryHex || theme.primaryHex} 
                                            customGlow={theme.glowRgba} 
                                          />
                                          <BracketConnectorFork 
                                            color={theme.lowerConnectorColor} 
                                            customHex={theme.secondaryHex || theme.primaryHex} 
                                            customGlow={theme.glowRgba} 
                                          />
                                        </div>
                                      </>
                                    )}
                                    <div className={cn("flex-1 min-w-[195px] sm:min-w-[215px] max-w-[320px] 2xl:max-w-[340px] flex flex-col", isCoopHybrid ? "justify-around h-[220px] py-2" : "gap-32 py-10")}>
                                      <MatchCard bid="playoff-m13" label="LB R3" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} theme={theme} isLower={true} />
                                      <MatchCard bid="playoff-m14" label="LB R3" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} theme={theme} isLower={true} />
                                    </div>
                                    <div className="shrink-0 flex flex-col justify-center">
                                      <BracketConnectorFork 
                                        color={theme.lowerConnectorColor} 
                                        customHex={theme.secondaryHex || theme.primaryHex} 
                                        customGlow={theme.glowRgba} 
                                      />
                                    </div>
                                    <div className="flex-1 min-w-[195px] sm:min-w-[215px] max-w-[320px] 2xl:max-w-[340px] flex flex-col justify-center gap-8">
                                      <MatchCard bid="playoff-m16" label="LB SEMI" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} theme={theme} isLower={true} />
                                      <MatchCard bid="playoff-m17" label="LOWER FINAL" bracketData={bracketData} projections={projections} handleCardClick={handleCardClick} teamsById={teamsById} theme={theme} isLower={true} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* GRAND FINAL PODIUM */}
                    <GrandFinalPodium
                        bid="playoff-m18"
                        label="THE ULTIMATE BATTLE"
                        bracketData={bracketData}
                        projections={projections}
                        handleCardClick={handleCardClick}
                        teamsById={teamsById}
                        seriesLabel={theme.seriesBadge}
                        season={season}
                    />
                </div>
            )}
        </div>

        <Dialog open={!!selectedMatch} onOpenChange={(o) => !o && setSelectedMatch(null)}>
            <DialogContent 
                onOpenAutoFocus={(e) => e.preventDefault()}
                onCloseAutoFocus={(e) => e.preventDefault()}
                className="!fixed !left-1/2 !top-1/2 !-translate-x-1/2 !-translate-y-1/2 z-50 w-[95vw] sm:w-[88vw] max-w-3xl max-h-[88vh] flex flex-col border p-0 overflow-hidden bg-black/95 backdrop-blur-3xl rounded-[2rem] shadow-[0_25px_80px_rgba(0,0,0,0.95)] focus:outline-none focus-visible:outline-none [&>button:last-child]:top-3.5 [&>button:last-child]:right-3.5 [&>button:last-child]:h-8 [&>button:last-child]:w-8 [&>button:last-child]:rounded-full [&>button:last-child]:bg-white/10 [&>button:last-child]:border [&>button:last-child]:border-white/20 [&>button:last-child]:text-white [&>button:last-child]:hover:bg-white [&>button:last-child]:hover:text-black [&>button:last-child]:transition-all [&>button:last-child]:z-50 [&>button:last-child]:flex [&>button:last-child]:items-center [&>button:last-child]:justify-center [&>button:last-child]:opacity-100"
                style={{
                    borderColor: `${theme.primaryHex}40`,
                    boxShadow: `0 25px 80px rgba(0,0,0,0.95), 0 0 35px ${theme.primaryHex}26`
                }}
            >
                {/* Top Racing Tracer */}
                <div 
                    className="absolute top-0 left-0 right-0 h-[2px] z-20" 
                    style={{
                        background: `linear-gradient(to right, transparent, ${theme.primaryHex}, transparent)`,
                        boxShadow: `0 0 16px ${theme.primaryHex}`
                    }}
                />
                
                <ScrollArea className="max-h-[88vh] scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
                    <div className="p-3.5 sm:p-6 space-y-4 sm:space-y-5 relative">
                        <div 
                            className="absolute inset-0 pointer-events-none opacity-25"
                            style={{
                                backgroundImage: `radial-gradient(${theme.primaryHex}33 1px, transparent 1px)`,
                                backgroundSize: '18px 18px'
                            }}
                        />

                        {/* Compact Header Bar */}
                        <DialogHeader className="p-3.5 sm:p-4.5 bg-gradient-to-b from-white/[0.05] via-white/[0.02] to-transparent border-b border-white/10 relative z-10 rounded-t-[2rem] -mx-3.5 -mt-3.5 sm:-mx-6 sm:-mt-6 mb-1">
                            <div className="flex items-center gap-3 justify-center sm:justify-start">
                                <div 
                                    className="p-2 border rounded-xl shadow-md shrink-0 flex items-center justify-center"
                                    style={{
                                        backgroundColor: `${theme.primaryHex}1A`,
                                        borderColor: `${theme.primaryHex}4D`,
                                        color: theme.primaryHex,
                                        boxShadow: `0 0 15px ${theme.primaryHex}33`
                                    }}
                                >
                                    <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6" />
                                </div>
                                <div className="text-center sm:text-left min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
                                        <DialogTitle className="text-lg sm:text-2xl font-black tracking-tight uppercase italic leading-none text-white font-headline drop-shadow-md">
                                            HUD ANALISIS PERTANDINGAN
                                        </DialogTitle>
                                        <Badge 
                                            className="font-black tracking-widest text-[8px] sm:text-[9px] px-2.5 h-4.5 rounded-full uppercase italic border shadow-sm"
                                            style={{
                                                backgroundColor: `${theme.primaryHex}1A`,
                                                borderColor: `${theme.primaryHex}4D`,
                                                color: theme.primaryHex
                                            }}
                                        >
                                            {selectedMatch?.round || theme.seasonBadge || 'Playoff Battle'}
                                        </Badge>
                                    </div>
                                    <p className="text-[8px] sm:text-[9px] font-mono font-bold uppercase tracking-[0.2em] text-white/40 mt-1">
                                        {theme.sysTag} • TELEMETRY COMBAT MATRIX
                                    </p>
                                </div>
                            </div>
                        </DialogHeader>

                        {/* Admin Schedule Configuration */}
                        {!selectedMatch?.isProjection && (
                            <div className="relative z-10 animate-in slide-in-from-top-3 duration-500">
                                <div className="bg-black/80 backdrop-blur-2xl border border-white/10 p-3 sm:p-4 rounded-2xl relative overflow-hidden shadow-lg">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center text-center">
                                        <div className="flex flex-col items-center space-y-1.5">
                                            <Label 
                                                className="text-[9px] font-black uppercase tracking-[0.2em] italic flex items-center gap-1.5"
                                                style={{ color: theme.primaryHex }}
                                            >
                                                <CalendarIcon className="w-3 h-3" /> Tanggal Pertandingan
                                            </Label>
                                            <Popover>
                                                <PopoverTrigger asChild disabled={!isAdmin}>
                                                    <Button variant="outline" className="w-full h-9 bg-white/[0.03] border border-white/10 font-black text-xs uppercase rounded-xl tracking-tight transition-all px-3 text-center hover:border-white/30">
                                                        {editDate ? format(editDate, "eeee, d MMM yyyy", { locale: localeId }) : "TBD"}
                                                    </Button>
                                                </PopoverTrigger>
                                                {isAdmin && (
                                                    <PopoverContent className="w-auto p-0 bg-black/95 border-white/20 rounded-2xl" align="center">
                                                        <Calendar mode="single" selected={editDate} onSelect={setEditDate} initialFocus className="rounded-2xl" />
                                                    </PopoverContent>
                                                )}
                                            </Popover>
                                        </div>
                                        <div className="flex flex-col items-center space-y-1.5">
                                            <Label 
                                                className="text-[9px] font-black uppercase tracking-[0.2em] italic flex items-center gap-1.5"
                                                style={{ color: theme.primaryHex }}
                                            >
                                                <Clock className="w-3 h-3" /> Waktu Kick-Off (24H)
                                            </Label>
                                            <div className="flex items-center justify-center gap-2">
                                                <Select value={editHour} onValueChange={(val) => setEditTime(`${val}:${editMin}`)} disabled={!isAdmin}>
                                                    <SelectTrigger className="h-9 bg-white/[0.03] border border-white/10 focus:border-white/40 font-black text-sm tabular-nums w-20 rounded-xl text-center">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-black/95 border-white/20 rounded-xl">
                                                        {Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0')).map(v => (<SelectItem key={v} value={v}>{v}</SelectItem>))}
                                                    </SelectContent>
                                                </Select>
                                                <span className="font-black text-base" style={{ color: theme.primaryHex }}>:</span>
                                                <Select value={editMin} onValueChange={(val) => setEditTime(`${editHour}:${val}`)} disabled={!isAdmin}>
                                                    <SelectTrigger className="h-9 bg-white/[0.03] border border-white/10 focus:border-white/40 font-black text-sm tabular-nums w-20 rounded-xl text-center">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-black/95 border-white/20 rounded-xl">
                                                        {Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0')).map(v => (<SelectItem key={v} value={v}>{v}</SelectItem>))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </div>
                                    {isAdmin && (
                                        <div className="mt-3 pt-2.5 border-t border-white/10 flex flex-wrap items-center justify-center gap-2">
                                            <Button 
                                                onClick={handleSaveManualSchedule} 
                                                disabled={isUpdatingSchedule} 
                                                className="h-8 px-6 font-black uppercase italic tracking-wider text-[10px] gap-1.5 rounded-lg text-black transition-all"
                                                style={{
                                                    backgroundColor: theme.primaryHex,
                                                    boxShadow: `0 0 15px ${theme.primaryHex}4D`
                                                }}
                                            >
                                                {isUpdatingSchedule ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} SIMPAN JADWAL
                                            </Button>
                                            {selectedMatch?.isCompleted && onRevertMatch && (
                                                <Button 
                                                    variant="outline" 
                                                    className="bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500 hover:text-black font-black uppercase italic tracking-wider text-[9px] h-8 px-4 rounded-lg transition-all gap-1.5" 
                                                    onClick={() => { onRevertMatch(selectedMatch); setSelectedMatch(null); }}
                                                >
                                                    <Undo2 className="w-3 h-3" /> RESET SKOR
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* VS Matchup Section (Compact & Proportional) */}
                        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4 relative z-10 py-1">
                            {/* Player 1 */}
                            <div className="flex flex-col items-center text-center gap-2 w-full min-w-0">
                                {analysis1 ? (
                                    <>
                                        <div className="relative">
                                            <Avatar 
                                                className="h-16 w-16 sm:h-20 sm:w-20 border-2 sm:border-[3px] shadow-xl relative z-10 transition-transform duration-300 bg-black/70 overflow-hidden flex items-center justify-center p-1.5"
                                                style={{
                                                    borderColor: theme.primaryHex,
                                                    boxShadow: `0 0 20px ${theme.primaryHex}4D`
                                                }}
                                            >
                                                <AvatarImage key={analysis1.logoUrl} src={analysis1.logoUrl} className="object-contain w-full h-full" referrerPolicy="no-referrer" />
                                                <AvatarFallback className="bg-black/50 font-black text-xs"><User className="w-8 h-8 text-white/20"/></AvatarFallback>
                                            </Avatar>
                                            <div 
                                                className="absolute -bottom-1 -right-1 flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg bg-black border text-[10px] sm:text-xs font-black z-20 rotate-6 shadow-md" 
                                                style={{
                                                    borderColor: theme.primaryHex,
                                                    color: theme.primaryHex
                                                }}
                                                suppressHydrationWarning
                                            >
                                                {analysis1.entry?.rank || '?'}
                                            </div>
                                        </div>
                                        <h3 className="text-sm sm:text-lg font-black uppercase italic text-white text-center w-full leading-tight truncate px-1" suppressHydrationWarning>
                                            {selectedMatch?.p1?.name}
                                        </h3>
                                        <Badge 
                                            variant="outline" 
                                            className="text-[7.5px] sm:text-[8px] uppercase tracking-wider font-bold max-w-[130px] truncate"
                                            style={{
                                                borderColor: `${theme.primaryHex}40`,
                                                color: theme.primaryHex,
                                                backgroundColor: `${theme.primaryHex}0D`
                                            }}
                                        >
                                            {analysis1.team?.name || 'Independent'}
                                        </Badge>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center gap-2 opacity-20">
                                        <div className="h-16 w-16 rounded-full border-2 border-dashed border-white/30 flex items-center justify-center">
                                            <User className="w-8 h-8 text-white/30" />
                                        </div>
                                        <h3 className="text-xs font-black uppercase italic">SLOT TERSEDIA</h3>
                                    </div>
                                )}
                            </div>

                            {/* Center VS Emblem */}
                            <div className="flex items-center justify-center px-1">
                                <div 
                                    className="border-2 rounded-xl w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center z-10 rotate-45 group/vs transition-transform shadow-lg"
                                    style={{
                                        backgroundColor: '#070C14',
                                        borderColor: theme.primaryHex,
                                        boxShadow: `0 0 20px ${theme.primaryHex}40`
                                    }}
                                >
                                    <span 
                                        className="font-black text-xs sm:text-base italic -rotate-45 font-headline"
                                        style={{ color: theme.primaryHex }}
                                    >
                                        VS
                                    </span>
                                </div>
                            </div>

                            {/* Player 2 */}
                            <div className="flex flex-col items-center text-center gap-2 w-full min-w-0">
                                {analysis2 ? (
                                    <>
                                        <div className="relative">
                                            <Avatar 
                                                className="h-16 w-16 sm:h-20 sm:w-20 border-2 sm:border-[3px] shadow-xl relative z-10 transition-transform duration-300 bg-black/70 overflow-hidden flex items-center justify-center p-1.5"
                                                style={{
                                                    borderColor: theme.secondaryHex || '#FFFFFF',
                                                    boxShadow: `0 0 20px ${(theme.secondaryHex || '#FFFFFF')}4D`
                                                }}
                                            >
                                                <AvatarImage key={analysis2.logoUrl} src={analysis2.logoUrl} className="object-contain w-full h-full" referrerPolicy="no-referrer" />
                                                <AvatarFallback className="bg-black/50 font-black text-xs"><User className="w-8 h-8 text-white/20"/></AvatarFallback>
                                            </Avatar>
                                            <div 
                                                className="absolute -bottom-1 -right-1 flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg bg-black border text-[10px] sm:text-xs font-black z-20 -rotate-6 shadow-md"
                                                style={{
                                                    borderColor: theme.secondaryHex || '#FFFFFF',
                                                    color: theme.secondaryHex || '#FFFFFF'
                                                }}
                                                suppressHydrationWarning
                                            >
                                                {analysis2.entry?.rank || '?'}
                                            </div>
                                        </div>
                                        <h3 className="text-sm sm:text-lg font-black uppercase italic text-white text-center w-full leading-tight truncate px-1" suppressHydrationWarning>
                                            {selectedMatch?.p2?.name}
                                        </h3>
                                        <Badge 
                                            variant="outline" 
                                            className="text-[7.5px] sm:text-[8px] uppercase tracking-wider font-bold max-w-[130px] truncate"
                                            style={{
                                                borderColor: `${theme.secondaryHex || '#FFFFFF'}40`,
                                                color: theme.secondaryHex || 'rgba(255,255,255,0.7)',
                                                backgroundColor: `${theme.secondaryHex || '#FFFFFF'}0D`
                                            }}
                                        >
                                            {analysis2.team?.name || 'Independent'}
                                        </Badge>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center gap-2 opacity-20">
                                        <div className="h-16 w-16 rounded-full border-2 border-dashed border-white/30 flex items-center justify-center">
                                            <User className="w-8 h-8 text-white/30" />
                                        </div>
                                        <h3 className="text-xs font-black uppercase italic">SLOT TERSEDIA</h3>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Telemetry Matrix & Playstyle Cards */}
                        {analysis1 && analysis2 && (
                            <div className="space-y-3 sm:space-y-4 relative z-10 animate-in fade-in duration-700">
                                {/* Probability Matrix Card */}
                                <div 
                                    className="bg-black/60 border rounded-2xl p-3.5 sm:p-4.5 space-y-3 relative overflow-hidden"
                                    style={{ borderColor: `${theme.primaryHex}26` }}
                                >
                                     {/* Probability Bar */}
                                     <div className="flex flex-col items-center gap-1.5">
                                         <h4 
                                            className="text-[9px] font-black tracking-[0.25em] uppercase italic flex items-center gap-1.5"
                                            style={{ color: theme.primaryHex }}
                                         >
                                             <Zap className="w-3 h-3" style={{ color: theme.primaryHex }} /> Probability Matrix
                                         </h4>
                                         <div className="flex items-center gap-3 w-full max-w-xs">
                                             <span 
                                                className="text-lg sm:text-xl font-black italic tabular-nums" 
                                                style={{ color: theme.primaryHex }}
                                                suppressHydrationWarning
                                             >
                                                 {analysis1.winRate.toFixed(0)}%
                                             </span>
                                             <div className="h-2 flex-1 bg-white/10 rounded-full overflow-hidden flex border border-white/10">
                                                 <div 
                                                    className="h-full transition-all duration-700" 
                                                    style={{ 
                                                        width: `${analysis1.winRate}%`,
                                                        backgroundColor: theme.primaryHex,
                                                        boxShadow: `0 0 10px ${theme.primaryHex}`
                                                    }} 
                                                 />
                                                 <div 
                                                    className="h-full transition-all duration-700" 
                                                    style={{ 
                                                        width: `${analysis2.winRate}%`,
                                                        backgroundColor: theme.secondaryHex || '#94A3B8'
                                                    }} 
                                                 />
                                             </div>
                                             <span 
                                                className="text-lg sm:text-xl font-black italic tabular-nums" 
                                                style={{ color: theme.secondaryHex || 'rgba(255,255,255,0.5)' }}
                                                suppressHydrationWarning
                                             >
                                                 {analysis2.winRate.toFixed(0)}%
                                             </span>
                                         </div>
                                     </div>

                                     {/* Stats Breakdown Bars */}
                                     <div className="space-y-2 pt-1 border-t border-white/5">
                                         {[
                                             { label: 'MATCH LOGS', v1: analysis1.stats.played, v2: analysis2.stats.played },
                                             { label: 'TOTAL VICTORIES', v1: analysis1.stats.win, v2: analysis2.stats.win, customColor: theme.primaryHex },
                                             { label: 'UNIT GOALS', v1: analysis1.stats.gf, v2: analysis2.stats.gf, customColor: theme.secondaryHex || theme.primaryHex },
                                             { label: 'MASTER OVR', v1: analysis1.masterInfo?.ovrRating.toFixed(0) || '0', v2: analysis2.masterInfo?.ovrRating.toFixed(0) || '0', customColor: '#F59E0B' }
                                         ].map((stat, i) => (
                                             <div key={i} className="space-y-1">
                                                 <div className="flex justify-between items-center text-[7.5px] sm:text-[8px] font-black uppercase tracking-widest text-white/30">
                                                     <span suppressHydrationWarning className="text-white/60 font-mono">{stat.v1} Units</span>
                                                     <span className="text-white/50 italic font-headline">{stat.label}</span>
                                                     <span suppressHydrationWarning className="text-white/60 font-mono">{stat.v2} Units</span>
                                                 </div>
                                                 <div className="flex items-center gap-1.5 h-1.5 w-full">
                                                     <div className="flex-1 bg-white/5 h-full rounded-full overflow-hidden flex justify-end">
                                                         <div 
                                                             className="h-full transition-all duration-700" 
                                                             style={{ 
                                                                 width: `${(Number(stat.v1) / (Number(stat.v1) + Number(stat.v2) || 1)) * 100}%`,
                                                                 backgroundColor: stat.customColor || theme.primaryHex
                                                             }} 
                                                         />
                                                     </div>
                                                     <div className="w-1 h-1 rounded-full bg-white/20 shrink-0" />
                                                     <div className="flex-1 bg-white/5 h-full rounded-full overflow-hidden">
                                                         <div 
                                                             className="h-full transition-all duration-700" 
                                                             style={{ 
                                                                 width: `${(Number(stat.v2) / (Number(stat.v1) + Number(stat.v2) || 1)) * 100}%`,
                                                                 backgroundColor: stat.customColor ? `${stat.customColor}99` : 'rgba(255,255,255,0.3)'
                                                             }} 
                                                         />
                                                     </div>
                                                 </div>
                                             </div>
                                         ))}
                                     </div>
                                </div>

                                {/* Compact Play Style Cards */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                     <Card 
                                        className="bg-black/60 border rounded-xl p-3 relative overflow-hidden"
                                        style={{ borderColor: `${theme.primaryHex}33` }}
                                     >
                                         <div 
                                            className="absolute top-0 left-0 w-1 h-full" 
                                            style={{ 
                                                backgroundColor: theme.primaryHex,
                                                boxShadow: `0 0 8px ${theme.primaryHex}`
                                            }} 
                                         />
                                         <div className="flex flex-col gap-1.5 relative z-10 pl-1.5">
                                             <div className="flex justify-between items-start">
                                                 <div className="flex flex-col">
                                                     <span 
                                                        className="text-[6.5px] font-black uppercase tracking-[0.25em] italic"
                                                        style={{ color: theme.primaryHex }}
                                                     >
                                                         Play Style
                                                     </span>
                                                     <h4 className="text-xs sm:text-sm font-black uppercase italic text-white pr-1">
                                                         {analysis1.playStyleText}
                                                     </h4>
                                                 </div>
                                                 <div className="flex gap-0.5">
                                                     {analysis1.form.map((f, i) => (
                                                         <div 
                                                             key={i} 
                                                             className={cn(
                                                                 "w-4 h-4 rounded flex items-center justify-center text-[7px] font-black", 
                                                                 f === 'W' ? "bg-green-500/20 text-green-400 border border-green-500/30" : 
                                                                 f === 'L' ? "bg-red-500/20 text-red-400 border border-red-500/30" : 
                                                                 "bg-yellow-500/20 text-yellow-400 border border-yellow-500/50"
                                                             )}
                                                         >
                                                             {f}
                                                         </div>
                                                     ))}
                                                 </div>
                                             </div>
                                             <p className="text-[8.5px] sm:text-[9px] font-semibold text-white/40 leading-snug italic line-clamp-2" suppressHydrationWarning>
                                                 "{analysis1.playStyleDescription}"
                                             </p>
                                         </div>
                                     </Card>

                                     <Card 
                                        className="bg-black/60 border rounded-xl p-3 relative overflow-hidden"
                                        style={{ borderColor: `${theme.secondaryHex || 'rgba(255,255,255,0.2)'}33` }}
                                     >
                                         <div 
                                            className="absolute right-0 top-0 w-1 h-full" 
                                            style={{ 
                                                backgroundColor: theme.secondaryHex || 'rgba(255,255,255,0.5)',
                                                boxShadow: theme.secondaryHex ? `0 0 8px ${theme.secondaryHex}` : undefined
                                            }} 
                                         />
                                         <div className="flex flex-col gap-1.5 relative z-10 text-right pr-1.5">
                                             <div className="flex justify-between items-start flex-row-reverse">
                                                 <div className="flex flex-col">
                                                     <span 
                                                        className="text-[6.5px] font-black uppercase tracking-[0.25em] italic"
                                                        style={{ color: theme.secondaryHex || 'rgba(255,255,255,0.5)' }}
                                                     >
                                                         Tactical DNA
                                                     </span>
                                                     <h4 className="text-xs sm:text-sm font-black uppercase italic text-white pl-1">
                                                         {analysis2.playStyleText}
                                                     </h4>
                                                 </div>
                                                 <div className="flex gap-0.5">
                                                     {analysis2.form.map((f, i) => (
                                                         <div 
                                                             key={i} 
                                                             className={cn(
                                                                 "w-4 h-4 rounded flex items-center justify-center text-[7px] font-black", 
                                                                 f === 'W' ? "bg-green-500/20 text-green-400 border border-green-500/30" : 
                                                                 f === 'L' ? "bg-red-500/20 text-red-400 border border-red-500/30" : 
                                                                 "bg-yellow-500/20 text-yellow-400 border border-yellow-500/50"
                                                             )}
                                                         >
                                                             {f}
                                                         </div>
                                                     ))}
                                                 </div>
                                             </div>
                                             <p className="text-[8.5px] sm:text-[9px] font-semibold text-white/40 leading-snug italic line-clamp-2" suppressHydrationWarning>
                                                 "{analysis2.playStyleDescription}"
                                             </p>
                                         </div>
                                     </Card>
                                </div>
                            </div>
                        )}

                        {/* Live Sync Footer Notice */}
                        <div 
                            className="rounded-xl p-2.5 text-center relative overflow-hidden border"
                            style={{
                                backgroundColor: `${theme.primaryHex}0D`,
                                borderColor: `${theme.primaryHex}26`
                            }}
                        >
                            <p 
                                className="text-[8px] font-bold italic leading-tight uppercase tracking-tight"
                                style={{ color: `${theme.primaryHex}CC` }}
                            >
                                Data disinkronisasi real-time sesuai performa season & telemetry match {theme.seasonBadge}.
                            </p>
                        </div>
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>

        {/* Playoff Knockout Share Dialog */}
        <KnockoutShareDialog
          open={isShareDialogOpen}
          onOpenChange={setIsShareDialogOpen}
          matches={matches || []}
          playersById={playersById}
          teamsById={teamsById}
          leagueTable={leagueTable}
          season={season}
        />
    </div>
  );
}
