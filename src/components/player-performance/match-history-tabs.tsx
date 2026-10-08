'use client';

import { Badge } from "@/components/ui/badge";
import { Activity, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

interface MatchItem {
  id: string;
  opponent?: { name: string } | null;
  isPlayer1: boolean;
  matchDate?: any;
  result?: 'W' | 'L' | 'D';
  s1?: number;
  s2?: number;
  [key: string]: any;
}

interface MatchHistoryTabsProps {
  completedMatches: MatchItem[];
  upcomingMatches: MatchItem[];
  primaryHex: string;
  glowRgba: string;
}

const formatMatchDate = (d: any) => {
  if (!d) return '-';
  try {
    const dateObj = typeof d.toDate === 'function' ? d.toDate() : new Date(d);
    return format(dateObj, "d MMM, HH:mm", { locale: localeId });
  } catch {
    return '-';
  }
};

export const HistoryTab = ({
  completedMatches,
  primaryHex,
  glowRgba
}: {
  completedMatches: MatchItem[];
  primaryHex: string;
  glowRgba: string;
}) => {
  if (completedMatches.length === 0) {
    return (
      <div className="text-center py-16 opacity-30 flex flex-col items-center gap-3">
        <Activity className="w-10 h-10 text-white/40"/>
        <p className="text-xs font-black uppercase tracking-[0.25em] italic text-center">Belum Ada Pertandingan Yang Rampung</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1 scrollbar-thin scrollbar-track-transparent">
      {completedMatches.map(match => (
        <div 
          key={match.id} 
          className="group/match relative overflow-hidden transition-all duration-300 border border-white/10 bg-black/60 backdrop-blur-xl hover:border-white/30 p-3.5 sm:p-4 rounded-2xl flex items-center justify-between gap-3 shadow-lg"
        >
          <div 
            className={cn(
              "absolute left-0 top-0 bottom-0 w-1.5 transition-all duration-300",
              match.result === 'L' ? "bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.8)]" : 
              match.result === 'D' ? "bg-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.8)]" : ""
            )}
            style={match.result === 'W' ? {
              backgroundColor: primaryHex,
              boxShadow: `0 0 12px ${glowRgba}`
            } : undefined}
          />
          
          <div className="flex items-center gap-3 sm:gap-4 relative z-10 min-w-0 flex-1">
            <div 
              className={cn(
                "w-10 h-10 rounded-xl shrink-0 flex items-center justify-center text-xs font-black border transition-transform group-hover/match:scale-105", 
                match.result === 'L' ? "bg-red-500/15 text-red-400 border-red-500/40 shadow-[0_0_10px_rgba(239,68,68,0.2)]" : 
                match.result === 'D' ? "bg-amber-500/15 text-amber-400 border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.2)]" : ""
              )}
              style={match.result === 'W' ? {
                backgroundColor: `${primaryHex}20`,
                color: primaryHex,
                borderColor: `${primaryHex}50`,
                boxShadow: `0 0 10px ${primaryHex}30`
              } : undefined}
            >
              {match.result === 'W' ? 'M' : match.result === 'L' ? 'K' : 'S'}
            </div>

            <div className="min-w-0 flex-1 text-left space-y-0.5">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="text-xs sm:text-sm font-black tracking-tight uppercase italic text-white pr-1" suppressHydrationWarning>
                  vs {match.opponent?.name || 'TBD'}
                </span>
                <Badge 
                  variant="outline" 
                  className="text-[8px] h-4.5 px-2 font-black uppercase italic tracking-wider shrink-0"
                  style={match.isPlayer1 ? {
                    borderColor: `${primaryHex}40`,
                    color: primaryHex,
                    backgroundColor: `${primaryHex}10`
                  } : {
                    borderColor: 'rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.4)',
                    backgroundColor: 'rgba(255,255,255,0.05)'
                  }}
                >
                  {match.isPlayer1 ? 'Home' : 'Away'}
                </Badge>
              </div>
              <p className="text-[9px] font-bold text-white/40 uppercase tracking-wider" suppressHydrationWarning>
                {formatMatchDate(match.matchDate)}
              </p>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2 sm:gap-3 relative z-10 bg-black/80 px-3.5 sm:px-4 py-2 rounded-xl border border-white/10 shadow-inner">
            <span 
              className="text-lg sm:text-xl font-black tabular-nums italic" 
              style={match.isPlayer1 ? (
                match.result === 'W' ? { color: primaryHex, textShadow: `0 0 8px ${glowRgba}` } : 
                match.result === 'L' ? { color: '#f87171' } : { color: '#fbbf24' }
              ) : { color: 'rgba(255,255,255,0.4)' }}
              suppressHydrationWarning
            >
              {match.s1}
            </span>
            <span className="text-xs font-black text-white/20">:</span>
            <span 
              className="text-lg sm:text-xl font-black tabular-nums italic"
              style={!match.isPlayer1 ? (
                match.result === 'W' ? { color: primaryHex, textShadow: `0 0 8px ${glowRgba}` } : 
                match.result === 'L' ? { color: '#f87171' } : { color: '#fbbf24' }
              ) : { color: 'rgba(255,255,255,0.4)' }}
              suppressHydrationWarning
            >
              {match.s2}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

export const UpcomingTab = ({
  upcomingMatches,
  primaryHex
}: {
  upcomingMatches: MatchItem[];
  primaryHex: string;
}) => {
  if (upcomingMatches.length === 0) {
    return (
      <div className="text-center py-16 opacity-30 flex flex-col items-center gap-3">
        <Zap className="w-10 h-10 animate-pulse" style={{ color: primaryHex }} />
        <p className="text-xs font-black uppercase tracking-[0.25em] italic text-center">Seluruh Pertandingan Musim Telah Dimainkan</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1 scrollbar-thin scrollbar-track-transparent">
      {upcomingMatches.map(match => (
        <div 
          key={match.id} 
          className="group/match relative overflow-hidden transition-all duration-300 border border-dashed border-white/15 bg-black/40 backdrop-blur-sm hover:border-white/30 p-3.5 sm:p-4 rounded-2xl flex items-center justify-between gap-3 opacity-80 hover:opacity-100"
        >
          <div className="flex items-center gap-3 sm:gap-4 relative z-10 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center bg-white/5 border border-white/10">
              <Activity className="w-4 h-4 animate-pulse" style={{ color: primaryHex }} />
            </div>
            <div className="min-w-0 flex-1 text-left space-y-0.5">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="text-xs sm:text-sm font-black tracking-tight uppercase italic text-white/90 pr-1" suppressHydrationWarning>
                  vs {match.opponent?.name || 'TBD'}
                </span>
                <Badge 
                  variant="outline" 
                  className="text-[8px] h-4.5 px-2 font-black uppercase italic tracking-wider shrink-0"
                  style={match.isPlayer1 ? {
                    borderColor: `${primaryHex}40`,
                    color: primaryHex,
                    backgroundColor: `${primaryHex}10`
                  } : {
                    borderColor: 'rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.4)',
                    backgroundColor: 'rgba(255,255,255,0.05)'
                  }}
                >
                  {match.isPlayer1 ? 'Home' : 'Away'}
                </Badge>
              </div>
              <p className="text-[9px] font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: `${primaryHex}CC` }}>
                <span className="w-1.5 h-1.5 rounded-full animate-ping" style={{ backgroundColor: primaryHex }} />
                JADWAL MENDATANG • FIXTURE PENDING
              </p>
            </div>
          </div>
          <Badge 
            variant="outline" 
            className="text-[9px] font-black uppercase italic px-3 h-6 shrink-0 border"
            style={{
              borderColor: `${primaryHex}40`,
              color: primaryHex,
              backgroundColor: `${primaryHex}15`
            }}
          >
            UPCOMING
          </Badge>
        </div>
      ))}
    </div>
  );
};
