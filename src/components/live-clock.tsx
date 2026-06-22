'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Zap, Clock, Activity, Scan, Binary } from 'lucide-react';
import { cn } from '@/lib/utils';

export function LiveClock() {
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
        <div className="flex justify-center w-full">
            <div className="h-32 sm:h-40 bg-white/5 rounded-[2rem] w-full max-w-md animate-pulse border-2 border-white/5" />
        </div>
    );
  }
  
  const formattedDate = format(currentTime, "eeee, d MMMM yyyy", { locale: id });
  const formattedTime = format(currentTime, "HH:mm:ss");

  return (
    <div className="flex flex-col items-center justify-center w-full">
        <div className="relative group w-full max-w-md animate-in fade-in slide-in-from-right-8 duration-1000">
            {/* Massive Ambient Glow behind the clock */}
            <div className="absolute -inset-10 bg-primary/5 rounded-full blur-[100px] opacity-0 group-hover:opacity-40 transition-opacity duration-1000" />
            
            <div className="relative flex flex-col bg-black/80 border-b-4 border-primary/20 rounded-none shadow-[0_30px_100px_rgba(0,0,0,0.8)] backdrop-blur-3xl overflow-hidden transition-all duration-500 hover:border-primary/40">
                
                {/* HUD Decorative Scanning Layer */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                    <div className="w-full h-[2px] bg-primary/30 blur-[2px] absolute top-0 left-0 animate-scanning" />
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:25px_25px] opacity-20" />
                </div>

                {/* Left Aggressive Border */}
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary shadow-[0_0_30px_rgba(204,253,1,0.8)] z-20" />

                {/* ULTRA SPORT SOLID HEADER (PRIMARY COLOR) */}
                <div className="bg-primary px-8 sm:px-12 py-3 flex items-center justify-between relative z-10 overflow-hidden -skew-x-[15deg] ml-[-15px] w-[calc(100%+30px)] shadow-xl">
                    <div className="absolute top-0 right-0 w-1/2 h-full bg-black/10 -skew-x-[25deg] translate-x-1/4 pointer-events-none" />
                    
                    <div className="flex items-center gap-3 relative z-10 skew-x-[15deg]">
                        <Zap className="w-4 h-4 text-black fill-black animate-pulse" />
                        <span className="text-[9px] sm:text-[11px] font-black uppercase tracking-[0.3em] text-black italic">System Temporal Sync</span>
                    </div>
                    
                    <div className="flex items-center gap-3 relative z-10 opacity-60 skew-x-[15deg]">
                        <Scan className="w-4 h-4 text-black" />
                        <span className="text-[8px] font-black uppercase tracking-widest text-black hidden xs:block">CORE_NODE_88</span>
                    </div>
                </div>

                <div className="p-8 sm:p-12 flex flex-col items-center relative z-10">
                    {/* Main Time Display - High Performance HUD Style */}
                    <div className="flex flex-col items-center relative mb-6">
                        <div className="absolute -inset-16 bg-primary/5 rounded-full blur-[80px] opacity-40 group-hover:opacity-100 transition-opacity" />
                        
                        <div className="flex items-baseline gap-1">
                             <span className="text-6xl sm:text-9xl font-black tracking-tighter text-white uppercase italic font-headline tabular-nums drop-shadow-[0_0_50px_rgba(255,255,255,0.1)] leading-none pr-4 group-hover:text-primary transition-colors duration-700" suppressHydrationWarning>
                                {formattedTime.split(':')[0]}<span className="text-primary animate-pulse">:</span>{formattedTime.split(':')[1]}
                            </span>
                            <span className="text-2xl sm:text-4xl font-black text-primary/40 italic tabular-nums leading-none">
                                {formattedTime.split(':')[2]}
                            </span>
                        </div>
                    </div>
                    
                    {/* HUD Tactical Separator */}
                    <div className="flex items-center gap-6 w-full opacity-30">
                        <div className="h-[2px] flex-1 bg-gradient-to-r from-transparent via-primary to-transparent" />
                        <div className="flex items-center gap-3 bg-black/60 px-4 py-1.5 rounded-none border-x-2 border-primary/40 -skew-x-[20deg]">
                            <Binary className="w-4 h-4 text-primary skew-x-[20deg]" />
                            <span className="text-[8px] font-black text-white uppercase tracking-[0.4em] skew-x-[20deg]">UPLINK_SECURE</span>
                        </div>
                        <div className="h-[2px] flex-1 bg-gradient-to-l from-transparent via-primary to-transparent" />
                    </div>
                    
                    {/* Date Display Section - Aggressive Horizontal Layout */}
                    <div className="mt-8 flex flex-col items-center w-full">
                        <div className="flex items-center gap-4 group/date cursor-default">
                            <div className="p-2 bg-white/5 rounded-lg border border-white/10 group-hover/date:border-primary/40 group-hover/date:bg-primary/10 transition-all duration-500">
                                <Activity className="w-5 h-5 text-primary/60" />
                            </div>
                            <span className="text-sm sm:text-2xl font-black tracking-[0.2em] sm:tracking-[0.4em] text-white/90 uppercase italic pr-4 whitespace-nowrap drop-shadow-lg transition-colors group-hover/date:text-white" suppressHydrationWarning>
                                {formattedDate}
                            </span>
                        </div>
                        
                        {/* Dynamic Progress Bar Micro-Detail */}
                        <div className="h-1 w-full max-w-[240px] bg-white/5 rounded-full mt-6 overflow-hidden border border-white/5 relative">
                            <div className="absolute inset-y-0 left-0 bg-primary/40 w-1/4 animate-[marquee_2s_linear_infinite]" />
                            <div className="absolute inset-y-0 left-1/3 bg-primary/20 w-1/6 animate-[marquee_3s_linear_infinite_reverse]" />
                        </div>
                    </div>
                </div>

                {/* HUD Corner Accents */}
                <div className="absolute bottom-4 left-6 flex items-center gap-2 opacity-20">
                    <div className="w-4 h-4 border-b-2 border-l-2 border-primary" />
                    <span className="text-[7px] font-black text-white uppercase">SGNL_OK</span>
                </div>
                
                <div className="absolute bottom-4 right-6 flex items-center gap-2 opacity-20">
                    <span className="text-[7px] font-black text-white uppercase">LAT_0.0ms</span>
                    <div className="w-4 h-4 border-b-2 border-r-2 border-primary" />
                </div>
            </div>
        </div>
    </div>
  );
}
