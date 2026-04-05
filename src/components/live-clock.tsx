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
        <div className="flex justify-center w-full px-4">
            <div className="h-20 sm:h-24 bg-white/5 rounded-3xl w-full max-w-md animate-pulse border-2 border-white/5" />
        </div>
    );
  }
  
  const formattedDate = format(currentTime, "eeee, d MMMM yyyy", { locale: id });
  const formattedTime = format(currentTime, "HH:mm:ss");

  return (
    <div className="flex flex-col items-center justify-center w-full">
        <div className="relative group w-fit animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {/* Dynamic Ambient Glow */}
            <div className="absolute -inset-4 bg-primary/10 rounded-[2.5rem] blur-3xl opacity-0 group-hover:opacity-40 transition-opacity duration-1000" />
            
            <div className="relative flex flex-col bg-[#0A192F]/90 border-2 border-white/5 rounded-[2rem] sm:rounded-[2.5rem] shadow-[0_20px_80px_rgba(0,0,0,0.6)] backdrop-blur-3xl overflow-hidden transition-all duration-500 group-hover:border-primary/20">
                
                {/* HUD Decorative Scanning Layer */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                    <div className="w-full h-[2px] bg-primary/20 blur-[1px] absolute top-0 left-0 animate-scanning" />
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:20px_20px]" />
                </div>

                {/* SOLID SPORT TOP BAR (PRIMARY COLOR) */}
                <div className="bg-primary px-6 sm:px-10 py-2.5 flex items-center justify-between relative z-10 overflow-hidden">
                    <div className="absolute top-0 right-0 w-1/2 h-full bg-black/10 -skew-x-[25deg] translate-x-1/4 pointer-events-none" />
                    
                    <div className="flex items-center gap-2 relative z-10">
                        <Zap className="w-3 h-3 text-black fill-black animate-pulse" />
                        <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em] text-black italic">Real-Time Sync Protocol</span>
                    </div>
                    
                    <div className="flex items-center gap-2 relative z-10 opacity-40">
                        <Scan className="w-3 h-3 text-black" />
                        <span className="text-[7px] font-black uppercase tracking-widest text-black hidden xs:block">STATION v4.0</span>
                    </div>
                </div>

                <div className="p-6 sm:p-10 flex flex-col items-center relative z-10">
                    {/* Main Time Display */}
                    <div className="flex flex-col items-center relative mb-4">
                        <div className="absolute -inset-10 bg-primary/5 rounded-full blur-3xl opacity-40 group-hover:opacity-100 transition-opacity" />
                        <span className="text-6xl sm:text-8xl font-black tracking-tighter text-white uppercase italic font-headline tabular-nums drop-shadow-[0_0_40px_rgba(204,253,1,0.3)] leading-none pr-4 group-hover:text-primary transition-colors duration-500" suppressHydrationWarning>
                            {formattedTime}
                        </span>
                    </div>
                    
                    {/* HUD Status Bar Bottom */}
                    <div className="flex items-center gap-4 w-full">
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
                        <div className="flex items-center gap-2 bg-black/40 px-3 py-1 rounded-lg border border-white/10">
                            <Binary className="w-3 h-3 text-primary/60" />
                            <span className="text-[7px] font-black text-white/40 uppercase tracking-widest">ENCRYPTED LINK</span>
                        </div>
                        <div className="h-px flex-1 bg-gradient-to-l from-transparent via-primary/40 to-transparent" />
                    </div>
                    
                    {/* Date Display Section */}
                    <div className="mt-6 flex flex-col items-center text-center space-y-1">
                        <div className="flex items-center gap-3">
                            <div className="p-1.5 bg-white/5 rounded-lg border border-white/5 group-hover:border-primary/20 transition-colors">
                                <Clock className="w-4 h-4 text-primary/60" />
                            </div>
                            <span className="text-xs sm:text-xl font-black tracking-[0.15em] sm:tracking-[0.25em] text-white/80 uppercase italic pr-2 whitespace-nowrap drop-shadow-md" suppressHydrationWarning>
                                {formattedDate}
                            </span>
                            <div className="p-1.5 bg-white/5 rounded-lg border border-white/5 group-hover:border-primary/20 transition-colors">
                                <Activity className="w-4 h-4 text-primary/60" />
                            </div>
                        </div>
                        <div className="h-1 w-12 sm:w-20 bg-primary/20 rounded-full mt-2 overflow-hidden">
                            <div className="h-full bg-primary w-1/3 animate-[marquee_3s_linear_infinite]" />
                        </div>
                    </div>
                </div>

                {/* HUD Geometric Decorative Details */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-primary/20 rounded-tl-[2rem] pointer-events-none" />
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 opacity-20 group-hover:opacity-40 transition-opacity">
                    <div className="w-6 h-0.5 bg-primary" />
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <div className="w-12 h-0.5 bg-primary" />
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <div className="w-6 h-0.5 bg-primary" />
                </div>
            </div>
        </div>
    </div>
  );
}
