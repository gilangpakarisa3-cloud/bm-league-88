'use client';

import * as React from 'react';
import { useState } from 'react';
import Link from 'next/link';
import { Flame, Scan, Trophy, Calendar, Users, Shield, ArrowUpRight, Radio, Sparkles } from 'lucide-react';
import { EditableNotice } from '@/components/notice/editable-notice';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';
import { PlayerMarquee } from '@/components/player-marquee';
import { LiveClock } from '@/components/live-clock';
import { LeaderboardSection } from '@/components/home/leaderboard-section';
import { BentoLeaderboardPreview } from '@/components/home/bento-leaderboard-preview';
import { useGlobalSeasonTheme } from '@/context/season-theme-context';
import { Button } from '@/components/ui/button';

export default function Home() {
  const { t } = useTranslation();
  const { theme } = useGlobalSeasonTheme();
  const [isWideMode, setIsWideMode] = useState(false);

  const handlePlayoffStatusChange = React.useCallback((active: boolean) => {
    setIsWideMode(active);
  }, []);

  return (
    <div className="mx-auto px-2 sm:px-4 py-4 sm:py-8 relative w-full overflow-hidden">
      {/* Dynamic Ambient Background Glows */}
      <div
        className="absolute top-0 right-0 -z-10 w-[320px] sm:w-[650px] h-[320px] sm:h-[650px] rounded-full blur-[100px] sm:blur-[160px] pointer-events-none opacity-20 transition-all duration-700"
        style={{ backgroundColor: theme.primaryHex }}
      />
      <div
        className="absolute top-1/3 left-0 -z-10 w-[260px] sm:w-[550px] h-[260px] sm:h-[550px] rounded-full blur-[90px] sm:blur-[140px] pointer-events-none opacity-15 transition-all duration-700"
        style={{ backgroundColor: theme.secondaryHex || theme.primaryHex }}
      />

      <div className="max-w-[94rem] mx-auto space-y-5 sm:space-y-8 animate-in fade-in slide-in-from-bottom-3 duration-700">
        
        {/* ======================================================== */}
        {/* OPTION 1: CYBER-TACTICAL BENTO GRID COMMAND CENTER       */}
        {/* ======================================================== */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-stretch">
          
          {/* BENTO CARD 1: HERO HUB (Lg: 7 Columns) */}
          <div className="lg:col-span-7 flex flex-col justify-between relative overflow-hidden rounded-2xl sm:rounded-[2.5rem] border border-white/10 bg-gradient-to-br from-black/85 via-[#06090e]/95 to-black/75 backdrop-blur-3xl p-5 sm:p-9 shadow-[0_20px_50px_rgba(0,0,0,0.8)] group hover:border-white/20 transition-all duration-500 min-h-[380px]">
            {/* Cyber Grid Background Accent */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none opacity-40" />
            
            {/* Ambient Radial Accent */}
            <div 
              className="absolute -top-24 -left-24 w-72 h-72 rounded-full blur-3xl opacity-20 pointer-events-none"
              style={{ backgroundColor: theme.primaryHex }}
            />

            {/* Corner Decorative Cut */}
            <div 
              className="absolute top-0 right-0 w-24 h-24 border-t-2 border-r-2 opacity-30 pointer-events-none rounded-tr-2xl sm:rounded-tr-[2.5rem]"
              style={{ borderColor: theme.primaryHex }}
            />

            <div className="relative z-10 flex-1 flex flex-col justify-between space-y-4">
              {/* Header Title Section */}
              <div className="space-y-4">
                {/* Top Badge Indicators */}
                <div className="flex flex-wrap items-center gap-2">
                  <div
                    style={{
                      backgroundColor: `${theme.primaryHex}1a`,
                      borderColor: `${theme.primaryHex}4d`,
                      color: theme.primaryHex,
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[8px] sm:text-[10px] font-black uppercase tracking-[0.25em] border shadow-sm"
                  >
                    <Flame
                      className="w-3 h-3 animate-pulse"
                      style={{ color: theme.primaryHex, fill: theme.primaryHex }}
                    />
                    Official League Station
                  </div>

                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] border border-white/10 bg-white/[0.03] text-white/70">
                    <Radio className="w-2.5 h-2.5 text-emerald-400 animate-ping" />
                    Live HUD v2.5
                  </div>
                </div>

                {/* Main Headline */}
                <div className="space-y-1.5">
                  <h1 className="font-headline text-4xl sm:text-7xl md:text-8xl font-black tracking-tight text-white uppercase leading-none drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
                    BM{' '}
                    <span
                      style={{
                        color: theme.primaryHex,
                        textShadow: `0 0 16px ${theme.primaryHex}66`,
                      }}
                    >
                      LEAGUE 88
                    </span>
                  </h1>

                  <p className="max-w-xl text-xs sm:text-sm md:text-base font-bold text-white/70 uppercase tracking-wider leading-relaxed">
                    {t('home_welcome')}
                  </p>
                </div>

                {/* Tactical Quick Specs Matrix */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3 pt-1">
                  <div className="bg-white/[0.03] border border-white/5 rounded-xl sm:rounded-2xl p-2.5 sm:p-3 flex items-center gap-2.5 hover:border-white/15 transition-all">
                    <div 
                      className="p-1.5 sm:p-2 rounded-lg text-black font-black"
                      style={{ backgroundColor: theme.primaryHex }}
                    >
                      <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[7px] sm:text-[7.5px] font-black uppercase tracking-wider text-white/40">Championship</span>
                      <span className="text-[10px] sm:text-xs font-black uppercase text-white truncate">Engineering Cup</span>
                    </div>
                  </div>

                  <div className="bg-white/[0.03] border border-white/5 rounded-xl sm:rounded-2xl p-2.5 sm:p-3 flex items-center gap-2.5 hover:border-white/15 transition-all">
                    <div className="p-1.5 sm:p-2 rounded-lg bg-white/10 text-white font-black">
                      <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[7px] sm:text-[7.5px] font-black uppercase tracking-wider text-white/40">Community</span>
                      <span className="text-[10px] sm:text-xs font-black uppercase text-white truncate">Tarkam & E-Football</span>
                    </div>
                  </div>

                  <div className="col-span-2 sm:col-span-1 bg-white/[0.03] border border-white/5 rounded-xl sm:rounded-2xl p-2.5 sm:p-3 flex items-center gap-2.5 hover:border-white/15 transition-all">
                    <div className="p-1.5 sm:p-2 rounded-lg bg-white/10 text-white font-black">
                      <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[7px] sm:text-[7.5px] font-black uppercase tracking-wider text-white/40">Arena</span>
                      <span className="text-[10px] sm:text-xs font-black uppercase text-white truncate">EightyEight Stadium</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* LIVE LEADERBOARD PREVIEW (Auto-stretched to fill available vertical space) */}
              <div className="flex-1 flex flex-col pt-1">
                <BentoLeaderboardPreview />
              </div>
            </div>

            {/* Quick Action Dock */}
            <div className="relative z-10 pt-4 sm:pt-5 mt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <Button
                  asChild
                  style={{
                    backgroundColor: theme.primaryHex,
                    color: '#000000',
                    boxShadow: `0 0 16px ${theme.primaryHex}4d`,
                  }}
                  className="font-black text-[10px] sm:text-xs uppercase tracking-wider h-9 sm:h-10 px-4 sm:px-5 rounded-xl sm:rounded-2xl hover:brightness-110 transition-all"
                >
                  <Link href="/fixtures" className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {t('header_fixtures')}
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </Button>

                <Button
                  asChild
                  variant="outline"
                  className="bg-white/[0.03] border-white/15 hover:border-white/40 font-black text-[10px] sm:text-xs uppercase tracking-wider h-9 sm:h-10 px-3.5 sm:px-4 rounded-xl sm:rounded-2xl text-white transition-all"
                >
                  <Link href="/players" className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    {t('header_players')}
                  </Link>
                </Button>

                <Button
                  asChild
                  variant="outline"
                  className="bg-white/[0.03] border-white/15 hover:border-white/40 font-black text-[10px] sm:text-xs uppercase tracking-wider h-9 sm:h-10 px-3.5 sm:px-4 rounded-xl sm:rounded-2xl text-white transition-all"
                >
                  <Link href="/hall-of-fame" className="flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5 text-amber-400" />
                    {t('header_hall_of_fame')}
                  </Link>
                </Button>
              </div>

              <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest text-white/30 font-mono">
                <Sparkles className="w-3 h-3" style={{ color: theme.primaryHex }} />
                <span>COMMAND_READY</span>
              </div>
            </div>
          </div>

          {/* BENTO RIGHT STACK (Lg: 5 Columns) - LIVE CLOCK & COMPACT NOTICE */}
          <div className="lg:col-span-5 flex flex-col gap-4 sm:gap-6">
            <div className="h-[210px] sm:h-[220px]">
              <LiveClock theme={theme} className="h-full" />
            </div>
            <div className="flex-1">
              <EditableNotice isBento={true} className="h-full" />
            </div>
          </div>
        </section>

        {/* BENTO CARD 4: ROSTER TRANSMISSION STREAM */}
        <section className="space-y-3 relative overflow-hidden">
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-4">
              <div
                className="h-px w-10 sm:w-20"
                style={{
                  background: `linear-gradient(90deg, transparent, ${theme.primaryHex}66)`,
                }}
              />
              <h2
                style={{ color: theme.primaryHex }}
                className="text-[9px] sm:text-xs font-black uppercase tracking-[0.35em] sm:tracking-[0.5em] flex items-center justify-center gap-2 sm:gap-3 pr-2 sm:pr-4"
              >
                <Scan
                  className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-pulse"
                  style={{ color: theme.primaryHex }}
                />{' '}
                ROSTER TRANSMISSION
              </h2>
              <div
                className="h-px w-10 sm:w-20"
                style={{
                  background: `linear-gradient(90deg, ${theme.primaryHex}66, transparent)`,
                }}
              />
            </div>
          </div>
          <PlayerMarquee />
        </section>
      </div>

      {/* ======================================================== */}
      {/* LEADERBOARD & PLAYOFF BRACKET SECTION                    */}
      {/* ======================================================== */}
      <div 
        id="leaderboard-anchor"
        className={cn(
          "mx-auto transition-all duration-1000 ease-in-out mt-10 sm:mt-14 px-1 sm:px-4 scroll-mt-24",
          isWideMode ? "max-w-[98vw] sm:max-w-[95vw]" : "max-w-[94rem]"
        )}
      >
        <LeaderboardSection onPlayoffStatusChange={handlePlayoffStatusChange} />
      </div>
    </div>
  );
}
