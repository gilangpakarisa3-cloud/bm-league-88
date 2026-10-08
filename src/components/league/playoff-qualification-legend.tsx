'use client';

import { Scan } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Season } from "@/lib/types";
import { getSeasonTheme, type TISeasonTheme } from "@/lib/season-theme";

interface PlayoffQualificationLegendProps {
  seasonType?: Season['type'];
  theme?: TISeasonTheme;
  hasDivisions?: boolean;
  isDivision2?: boolean;
  div1Name?: string;
  div2Name?: string;
  promotionSpots?: number;
  relegationSpots?: number;
  totalPlayers?: number;
}

export const PlayoffQualificationLegend = ({ 
  seasonType, 
  theme,
  hasDivisions = false,
  isDivision2 = false,
  div1Name = 'Divisi 1',
  div2Name = 'Divisi 2',
  promotionSpots = 2,
  relegationSpots = 2,
  totalPlayers = 0,
}: PlayoffQualificationLegendProps) => {
  const isSingleHybrid = seasonType === 'Single Hybrid';
  const isCoopHybrid = seasonType === 'Co-Op Hybrid';
  const currentTheme = theme || getSeasonTheme(null);
  const actualPromotionSpots = Math.max(1, promotionSpots || 2);
  const actualRelegationSpots = Math.max(1, relegationSpots || 2);

  if (isDivision2) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 p-2.5 sm:p-4 px-3 sm:px-8 bg-gradient-to-r from-black/95 via-white/[0.02] to-black/95 border-b border-white/10 backdrop-blur-3xl relative overflow-hidden shrink-0">
        <div className="flex items-center gap-2">
          <Scan className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.15em] sm:tracking-[0.25em] text-cyan-400 italic">
            {div2Name.toUpperCase()} • PROMOTION ZONE
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-3">
          <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-lg sm:rounded-xl bg-emerald-500/[0.08] border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.15)]">
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-pulse" />
            <span className="text-[9px] sm:text-[11px] font-black uppercase italic text-emerald-400">
              Zona Promosi ({actualPromotionSpots === 1 ? '#1' : `#1 - #${actualPromotionSpots}`} Promosi ke {div1Name})
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (isSingleHybrid) {
    const nonPlayoffSpots = Math.max(0, totalPlayers - 8);
    const directRelegationCount = Math.min(actualRelegationSpots, nonPlayoffSpots);
    const playoffRelegationCount = Math.max(0, actualRelegationSpots - directRelegationCount);
    const startDirectRelegationRank = totalPlayers - directRelegationCount + 1;

    return (
      <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 p-2.5 sm:p-4 px-3 sm:px-8 bg-gradient-to-r from-black/95 via-white/[0.02] to-black/95 border-b border-white/10 backdrop-blur-3xl relative overflow-hidden shrink-0">
        <div className="flex items-center gap-2">
          <Scan className={cn("w-3.5 h-3.5 animate-pulse", currentTheme.primaryText)} />
          <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.15em] sm:tracking-[0.25em] text-white/50 italic">
            {currentTheme.editionName} • LEAGUE TABLE
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-3">
          <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-lg sm:rounded-xl bg-emerald-500/[0.08] border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.15)]">
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-pulse" />
            <span className="text-[9px] sm:text-[11px] font-black uppercase italic text-emerald-400">
              Playoff 8 Besar <span className="text-white/40 font-normal">(#1 - #8 Bertarung Gelar Juara)</span>
            </span>
          </div>

          {hasDivisions ? (
            <>
              {directRelegationCount > 0 && (
                <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-lg sm:rounded-xl bg-rose-500/[0.08] border border-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.15)]">
                  <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.9)]" />
                  <span className="text-[9px] sm:text-[11px] font-black uppercase italic text-rose-400">
                    Degradasi Langsung {directRelegationCount === 1 ? `(#${totalPlayers})` : `(#${startDirectRelegationRank} - #${totalPlayers})`}
                  </span>
                </div>
              )}
              {playoffRelegationCount > 0 && (
                <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-lg sm:rounded-xl bg-amber-500/[0.08] border border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.15)]">
                  <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]" />
                  <span className="text-[9px] sm:text-[11px] font-black uppercase italic text-amber-300">
                    +{playoffRelegationCount} Slot Degradasi dari Gugur Playoff
                  </span>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-lg sm:rounded-xl bg-rose-500/[0.08] border border-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.15)]">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.9)]" />
              <span className="text-[9px] sm:text-[11px] font-black uppercase italic text-rose-400">
                Gugur <span className="text-white/40 font-normal">(#9+)</span>
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  const ubText = isCoopHybrid ? "Seed #1 - 4" : "Seed #1 - 2 (Grup)";
  const lbText = isCoopHybrid ? "Seed #5 - 6" : "Seed #3 - 4 (Grup)";
  const elimText = isCoopHybrid ? "Seed #7+" : "Seed #5+ (Grup)";
  const startRelegationRank = Math.max(1, totalPlayers - actualRelegationSpots + 1);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 p-2.5 sm:p-4 px-3 sm:px-8 bg-gradient-to-r from-black/95 via-white/[0.02] to-black/95 border-b border-white/10 backdrop-blur-3xl relative overflow-hidden shrink-0">
      <div className="flex items-center gap-2">
        <Scan className="w-3.5 h-3.5 text-primary animate-pulse" />
        <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.15em] sm:tracking-[0.25em] text-white/50 italic">
          KLASEMEN RESMI • LEAGUE STANDINGS
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 sm:gap-3">
        {(seasonType === 'Hybrid' || seasonType === 'Co-Op Hybrid') && (
          <>
            <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-lg sm:rounded-xl bg-emerald-500/[0.08] border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.15)]">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-pulse" />
              <span className="text-[9px] sm:text-[11px] font-black uppercase italic text-emerald-400">
                Playoff Utama <span className="text-white/40 font-normal">({ubText})</span>
              </span>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-lg sm:rounded-xl bg-amber-500/[0.08] border border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.15)]">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)] animate-pulse" />
              <span className="text-[9px] sm:text-[11px] font-black uppercase italic text-amber-400">
                Playoff Contender <span className="text-white/40 font-normal">({lbText})</span>
              </span>
            </div>
          </>
        )}

        {hasDivisions ? (
          <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-lg sm:rounded-xl bg-rose-500/[0.08] border border-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.15)]">
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.9)]" />
            <span className="text-[9px] sm:text-[11px] font-black uppercase italic text-rose-400">
              {seasonType === 'Hybrid'
                ? `Zona Degradasi (${Math.ceil(actualRelegationSpots / 2)} Tiap Grup • Total ${actualRelegationSpots} Turun ke ${div2Name})`
                : totalPlayers > actualRelegationSpots
                  ? `Zona Degradasi (#${startRelegationRank} - #${totalPlayers} • Total ${actualRelegationSpots} Turun ke ${div2Name})`
                  : `Zona Degradasi (Turun ke ${div2Name})`
              }
            </span>
          </div>
        ) : (
          (seasonType === 'Hybrid' || seasonType === 'Co-Op Hybrid') && (
            <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-lg sm:rounded-xl bg-rose-500/[0.08] border border-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.15)]">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.9)]" />
              <span className="text-[9px] sm:text-[11px] font-black uppercase italic text-rose-400">
                Gugur <span className="text-white/40 font-normal">({elimText})</span>
              </span>
            </div>
          )
        )}
      </div>
    </div>
  );
};
