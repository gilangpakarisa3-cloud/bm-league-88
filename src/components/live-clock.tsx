'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Zap, Clock, Activity, Scan, Binary } from 'lucide-react';
import { cn } from '@/lib/utils';

import type { TISeasonTheme } from '@/lib/season-theme';

export function LiveClock({ className, theme }: { className?: string; theme?: TISeasonTheme }) {
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  useEffect(() => {
    // Run only on the client
    setCurrentTime(new Date());

    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, []);

  if (!currentTime) {
    return (
        <div className={cn("flex justify-center w-full", className)}>
            <div className="h-full min-h-[160px] bg-white/5 rounded-[2rem] w-full max-w-md animate-pulse border border-white/5" />
        </div>
    );
  }
  
  const formattedDate = format(currentTime, "eeee, d MMMM yyyy", { locale: id });
  const formattedTime = format(currentTime, "HH:mm:ss");
  const primaryColor = theme?.primaryHex || '#CCFD01';
  const glowColor = theme?.glowRgba || 'rgba(204,253,1,0.8)';

  return (
    <div className={cn("flex flex-col items-center justify-center w-full", className)}>
        <div className="relative group w-full max-w-md h-full flex flex-col animate-in fade-in slide-in-from-right-8 duration-1000">
            <div 
              className="relative flex flex-col justify-between flex-1 h-full bg-[#0a0d14] border border-white/10 rounded-2xl sm:rounded-3xl shadow-[0_15px_45px_rgba(0,0,0,0.7)] backdrop-blur-3xl overflow-hidden"
            >
                {/* Aerodynamic Cockpit Header */}
                <div className="px-3.5 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between relative z-10 border-b border-white/10 bg-white/[0.02] shrink-0">
                    <div className="flex items-center gap-1.5">
                        <div 
                          className="w-1.5 h-1.5 rounded-full animate-pulse" 
                          style={{ backgroundColor: primaryColor }}
                        />
                        <span 
                          className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] italic flex items-center gap-1.5"
                          style={{ color: primaryColor }}
                        >
                            <Zap className="w-3 h-3" style={{ fill: primaryColor, color: primaryColor }} />
                            Matchday Clock
                        </span>
                    </div>
                    
                    <div className="flex items-center gap-1.5">
                        <span className="text-[7.5px] sm:text-[8px] font-black uppercase tracking-wider text-white/40 bg-white/5 border border-white/10 rounded-full px-2 py-0.5 flex items-center gap-1 font-mono">
                            <Scan className="w-2.5 h-2.5" style={{ color: primaryColor }} />
                            STADIUM_CLOCK_88
                        </span>
                    </div>
                </div>

                <div className="p-3 sm:p-5 flex-1 flex flex-col items-center justify-center relative z-10">
                    {/* Main Time Display - High Performance Clean Style */}
                    <div className="flex flex-col items-center relative mb-1.5 sm:mb-2">
                        <div className="flex items-baseline justify-center">
                            <span className="text-4xl sm:text-6xl font-black tracking-normal text-white uppercase italic font-headline tabular-nums leading-none transition-colors duration-500 pr-0.5" suppressHydrationWarning>
                                {formattedTime.split(':')[0]}
                            </span>
                            <span 
                                className="text-4xl sm:text-6xl font-black italic font-headline leading-none animate-pulse px-0.5 select-none" 
                                style={{ color: primaryColor }}
                            >
                                :
                            </span>
                            <span className="text-4xl sm:text-6xl font-black tracking-normal text-white uppercase italic font-headline tabular-nums leading-none transition-colors duration-500 pl-0.5" suppressHydrationWarning>
                                {formattedTime.split(':')[1]}
                            </span>
                            <span className="text-base sm:text-2xl font-black italic tabular-nums leading-none ml-1 opacity-80" style={{ color: primaryColor }}>
                                {formattedTime.split(':')[2]}
                            </span>
                        </div>
                    </div>
                    
                    {/* HUD Tactical Separator */}
                    <div className="flex items-center gap-2 w-full my-1 sm:my-1.5">
                        <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                        <div 
                          className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border backdrop-blur-sm"
                          style={{ borderColor: `${primaryColor}44`, backgroundColor: `${primaryColor}12` }}
                        >
                            <Binary className="w-2.5 h-2.5" style={{ color: primaryColor }} />
                            <span className="text-[7.5px] sm:text-[8px] font-black uppercase tracking-[0.2em]" style={{ color: primaryColor }}>UPLINK_SECURE</span>
                        </div>
                        <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent via-white/20 to-transparent" />
                    </div>
                    
                    {/* Date Display Section - Clean Non-Clipping Aerodynamic Capsule */}
                    <div className="mt-1 sm:mt-1.5 flex flex-col items-center w-full">
                        <div className="flex items-center justify-center gap-2 bg-white/[0.03] border border-white/10 hover:border-white/30 rounded-lg sm:rounded-xl px-2.5 sm:px-4 py-1 sm:py-1.5 w-full transition-all duration-300 group/date shadow-inner">
                            <Activity className="w-3 h-3 shrink-0 animate-pulse" style={{ color: primaryColor }} />
                            <span className="text-[9px] sm:text-xs font-black tracking-normal uppercase italic text-white/90 text-center truncate group-hover/date:text-white" suppressHydrationWarning>
                                {formattedDate}
                            </span>
                        </div>
                        
                        {/* Dynamic Progress Bar Tracer */}
                        <div className="h-0.5 w-full max-w-[120px] sm:max-w-[160px] bg-white/5 rounded-full mt-1.5 sm:mt-2.5 overflow-hidden border border-white/5 relative">
                            <div 
                              className="absolute inset-y-0 left-0 rounded-full w-1/3 animate-[marquee_2.5s_linear_infinite]" 
                              style={{ backgroundColor: primaryColor }}
                            />
                        </div>
                    </div>
                </div>

                {/* HUD Footer Telemetry */}
                <div className="px-3.5 sm:px-4 py-1.5 sm:py-2 bg-black/40 border-t border-white/5 flex items-center justify-between text-[7.5px] sm:text-[8px] font-black tracking-wider text-white/30 uppercase mt-auto shrink-0 font-mono">
                    <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full inline-block animate-ping" style={{ backgroundColor: primaryColor }} />
                        LIVE STATUS: OK
                    </span>
                    <span style={{ color: primaryColor }}>LATENCY: 0.0MS</span>
                </div>
            </div>
        </div>
    </div>
  );
}
