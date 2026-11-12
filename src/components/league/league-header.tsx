'use client';

import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Activity } from 'lucide-react';
import { LiveClock } from '@/components/live-clock';
import { useTranslation } from '@/hooks/use-translation';
import type { Season, WithId, Match } from '@/lib/types';
import type { TISeasonTheme as SeasonTheme } from '@/lib/season-theme';

export interface LeagueHeaderProps {
  theme: SeasonTheme;
  activeSeason: WithId<Season> | null;
  matches?: WithId<Match>[] | null;
  formattedDateRange?: string | null;
  seasonProgress: number;
  completedMatchesCount: number;
}

export function LeagueHeader({
  theme,
  activeSeason,
  matches,
  formattedDateRange,
  seasonProgress,
  completedMatchesCount,
}: LeagueHeaderProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col lg:flex-row items-stretch justify-center gap-3 sm:gap-4 max-w-6xl mx-auto">
      <div className="flex flex-col justify-center flex-1 w-full min-w-0 max-w-3xl px-4 py-3 sm:px-6 sm:py-4 gap-2.5 sm:gap-3 relative overflow-hidden bg-[#0a0d14] backdrop-blur-3xl rounded-2xl sm:rounded-3xl border border-white/10 shadow-[0_15px_45px_rgba(0,0,0,0.7)]">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-2.5 sm:gap-4 min-w-0">
          <div className="space-y-1.5 min-w-0 flex-1">
            {/* Top Telemetry Strip */}
            <div className="flex flex-wrap items-center gap-2">
              <div
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full backdrop-blur-md border shrink-0"
                style={{ backgroundColor: `${theme.primaryHex}15`, borderColor: `${theme.primaryHex}40` }}
              >
                <div
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ backgroundColor: theme.primaryHex }}
                />
                <span
                  className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em]"
                  style={{ color: theme.primaryHex }}
                >
                  Live Match Centre
                </span>
              </div>

              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/[0.04] border border-white/10 backdrop-blur-sm max-w-full">
                <span className="text-[9px] font-black uppercase tracking-[0.15em] font-mono text-white/60 truncate">
                  {theme.sysTag} • {theme.editionName}
                </span>
              </div>
            </div>

            {/* Headline */}
            <div className="relative min-w-0">
              <h1 className="font-headline text-3xl sm:text-6xl font-black tracking-tight text-white uppercase leading-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] flex flex-wrap items-baseline gap-x-2.5 sm:gap-x-4 py-1 pr-4">
                <span className="inline-block text-white pr-1">
                  {t('league_standings_page_title').split(' ')[0]}
                </span>
                <span
                  className="inline-block pr-2"
                  style={{
                    color: theme.primaryHex,
                    textShadow: `0 0 25px ${theme.glowRgba}`,
                  }}
                >
                  {t('league_standings_page_title').split(' ').slice(1).join(' ')}
                </span>
              </h1>
              {/* Conduit Line */}
              <div
                className="h-[3px] w-28 sm:w-44 mt-1 rounded-full"
                style={{
                  background: `linear-gradient(to right, ${theme.primaryHex}, ${theme.secondaryHex}, transparent)`,
                  boxShadow: `0 0 12px ${theme.glowRgba}`,
                }}
              />
            </div>
          </div>

          {activeSeason && (
            <div className="flex flex-wrap md:flex-col items-start md:items-end gap-1.5 shrink-0">
              <Badge
                className="font-black tracking-[0.15em] text-[9px] sm:text-[10px] h-6 sm:h-7 px-3 sm:px-4 uppercase rounded-full backdrop-blur-md flex items-center gap-1.5 border shadow-md shrink-0"
                style={{
                  backgroundColor: `${theme.primaryHex}20`,
                  color: theme.primaryHex,
                  borderColor: `${theme.primaryHex}50`,
                  boxShadow: `0 0 15px ${theme.glowRgba}`,
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full animate-ping"
                  style={{ backgroundColor: theme.primaryHex }}
                />
                {activeSeason.status}
              </Badge>
              <div className="flex items-center gap-1.5 bg-white/[0.04] px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full border border-white/10 backdrop-blur-sm shadow-inner shrink-0">
                <CalendarIcon className="w-3 h-3 shrink-0" style={{ color: theme.primaryHex }} />
                {formattedDateRange && (
                  <p className="text-[9px] sm:text-[10px] font-black text-white/70 uppercase tracking-wider">
                    {formattedDateRange}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {activeSeason && (
          <div className="relative z-10 pt-2 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 min-w-0">
            <div className="flex items-center gap-2 bg-white/[0.03] border border-white/10 px-2.5 py-1 rounded-xl backdrop-blur-sm min-w-0 flex-1">
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: theme.primaryHex, boxShadow: `0 0 8px ${theme.glowRgba}` }}
              />
              <p className="text-xs sm:text-sm lg:text-base font-black text-white tracking-tight uppercase break-words min-w-0">
                {activeSeason.name}
              </p>
            </div>

            {matches && matches.length > 0 && (
              <div className="w-full sm:w-[200px] md:w-[220px] shrink-0 space-y-1 bg-white/[0.02] border border-white/10 px-2.5 py-1.5 rounded-xl backdrop-blur-sm">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1">
                    <Activity className="w-2.5 h-2.5 animate-pulse shrink-0" style={{ color: theme.primaryHex }} />
                    <span className="text-[8px] font-black uppercase tracking-[0.15em] text-white/50">Progress</span>
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-black" style={{ color: theme.primaryHex }} suppressHydrationWarning>
                    [{seasonProgress.toFixed(0)}%]
                  </span>
                </div>
                <div className="relative h-1 w-full bg-white/5 overflow-hidden rounded-full border border-white/5">
                  <div
                    className="absolute left-0 top-0 h-full rounded-full transition-all duration-1000 ease-out"
                    style={{
                      width: `${seasonProgress}%`,
                      background: `linear-gradient(to right, ${theme.secondaryHex}, ${theme.primaryHex})`,
                      boxShadow: `0 0 10px ${theme.glowRgba}`,
                    }}
                  />
                </div>
                <p className="text-[7px] font-black tracking-[0.15em] uppercase text-white/30 text-right">
                  {completedMatchesCount}/{matches.length} MATCHES
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="w-full lg:w-[300px] xl:w-[320px] flex items-stretch shrink-0">
        <LiveClock className="h-full" theme={theme} />
      </div>
    </div>
  );
}
