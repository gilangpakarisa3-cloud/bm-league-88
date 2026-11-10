'use client';

import * as React from 'react';
import { useState } from 'react';
import { Flame, Scan } from 'lucide-react';
import { EditableNotice } from '@/components/notice/editable-notice';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';
import { PlayerMarquee } from '@/components/player-marquee';
import { LiveClock } from '@/components/live-clock';
import { LeaderboardSection } from '@/components/home/leaderboard-section';
import { useGlobalSeasonTheme } from '@/context/season-theme-context';

export default function Home() {
  const { t } = useTranslation();
  const { theme } = useGlobalSeasonTheme();
  const [isWideMode, setIsWideMode] = useState(false);

  const handlePlayoffStatusChange = React.useCallback((active: boolean) => {
    setIsWideMode(active);
  }, []);

  return (
    <div className="mx-auto px-2 sm:px-4 py-6 sm:py-12 relative w-full">
      <div
        className="absolute top-0 right-0 -z-10 w-[300px] sm:w-[600px] h-[300px] sm:h-[600px] rounded-full blur-[100px] sm:blur-[150px] pointer-events-none opacity-20 transition-all duration-700"
        style={{ backgroundColor: theme.primaryHex }}
      />
      <div
        className="absolute top-1/2 left-0 -z-10 w-[250px] sm:w-[500px] h-[250px] sm:h-[500px] rounded-full blur-[80px] sm:blur-[120px] pointer-events-none opacity-15 transition-all duration-700"
        style={{ backgroundColor: theme.secondaryHex || theme.primaryHex }}
      />

      <div className="max-w-[92rem] mx-auto space-y-6 sm:space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <section className="text-center space-y-2 sm:space-y-6 relative px-2 sm:px-4">
          <div
            style={{
              backgroundColor: `${theme.primaryHex}1a`,
              borderColor: `${theme.primaryHex}4d`,
              color: theme.primaryHex,
            }}
            className="inline-flex items-center gap-1.5 sm:gap-2 border px-2.5 sm:px-4 py-0.5 sm:py-1 rounded-full text-[7.5px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] italic mb-1"
          >
            <Flame
              className="w-2.5 h-2.5 sm:w-3 sm:h-3"
              style={{ color: theme.primaryHex, fill: theme.primaryHex }}
            />{' '}
            Official League Station
          </div>
          <h1 className="font-headline text-3xl sm:text-7xl md:text-8xl font-black tracking-tighter text-white uppercase italic drop-shadow-[0_0_30px_rgba(255,255,255,0.05)] leading-tight">
            BM{' '}
            <span
              style={{
                color: theme.primaryHex,
                textShadow: `0 0 20px ${theme.glowRgba || theme.primaryHex}`,
              }}
            >
              LEAGUE 88
            </span>
          </h1>
          <p className="mt-1 sm:mt-4 max-w-2xl mx-auto text-[10px] sm:text-base font-bold text-white/60 uppercase tracking-wider sm:tracking-widest leading-relaxed">
            {t('home_welcome')}
          </p>
        </section>

        <section className="max-w-4xl mx-auto w-full px-1 sm:px-2">
          <LiveClock />
        </section>

        <section className="max-w-5xl mx-auto w-full px-2 sm:px-0">
          <EditableNotice />
        </section>

        <section className="space-y-6 sm:space-y-8 relative overflow-hidden">
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-4">
              <div
                className="h-px w-12 sm:w-20"
                style={{
                  background: `linear-gradient(90deg, transparent, ${theme.primaryHex}66)`,
                }}
              />
              <h2
                style={{ color: theme.primaryHex }}
                className="text-[10px] sm:text-xs font-black uppercase tracking-[0.4em] sm:tracking-[0.6em] flex items-center justify-center gap-3 italic pr-4"
              >
                <Scan
                  className="w-4 h-4 animate-pulse"
                  style={{ color: theme.primaryHex }}
                />{' '}
                ROSTER TRANSMISSION
              </h2>
              <div
                className="h-px w-12 sm:w-20"
                style={{
                  background: `linear-gradient(90deg, ${theme.primaryHex}66, transparent)`,
                }}
              />
            </div>
            <div className="flex gap-1">
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: `${theme.primaryHex}66` }}
              />
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: `${theme.primaryHex}33` }}
              />
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: `${theme.primaryHex}1a` }}
              />
            </div>
          </div>
          <PlayerMarquee />
        </section>
      </div>

      <div className={cn(
        "mx-auto transition-all duration-1000 ease-in-out mt-16 px-2 sm:px-4",
        isWideMode ? "max-w-[98vw] sm:max-w-[95vw]" : "max-w-[92rem]"
      )}>
        <LeaderboardSection onPlayoffStatusChange={handlePlayoffStatusChange} />
      </div>
    </div>
  );
}
