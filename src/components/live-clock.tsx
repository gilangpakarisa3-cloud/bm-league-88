
'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Zap, Clock, Activity } from 'lucide-react';
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
            <div className="h-24 sm:h-32 bg-white/5 rounded-3xl w-full max-w-md animate-pulse border-2 border-white/5" />
        </div>
    );
  }
  
  const formattedDate = format(currentTime, "eeee, d MMMM yyyy", { locale: id });
  const formattedTime = format(currentTime, "HH:mm:ss");

  return (
    <div className="flex flex-col items-center justify-center w-full">
        <div className="relative group w-fit animate-in fade-in slide-in-from-top-4 duration-1000">
            {/* Dynamic Ambient Glow */}
            <div className="absolute -inset-2 bg-gradient-to-r from-primary/30 via-accent/20 to-primary/30 rounded-[2rem] blur-2xl opacity-20 group-hover:opacity-40 transition duration-1000" />
            
            <div className="relative flex flex-col items-center bg-[#0A192F]/80 border-2 border-white/10 px-10 sm:px-16 py-6 sm:py-8 rounded-[2rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] backdrop-blur-2xl overflow-hidden group-hover:border-primary/30 transition-all duration-500">
                
                {/* HUD Decorative Corners */}
                <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-primary/40 rounded-tl-[2rem] pointer-events-none group-hover:border-primary transition-colors duration-500" />
                <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-primary/40 rounded-br-[2rem] pointer-events-none group-hover:border-primary transition-colors duration-500" />

                {/* Status Bar */}
                <div className="flex items-center gap-3 mb-4 self-start sm:self-center">
                    <div className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 px-3 py-0.5 rounded-full">
                        <Zap className="w-2.5 h-2.5 text-primary fill-primary animate-pulse" />
                        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-primary italic pr-0.5">Real-Time Log</span>
                    </div>
                    <div className="h-px w-8 bg-white/10" />
                    <span className="text-[8px] font-black text-white/30 uppercase tracking-[0.3em]">Sync Active</span>
                </div>

                {/* Main Time Display */}
                <div className="flex flex-col items-center relative">
                    <div className="absolute -inset-4 bg-primary/5 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span className="text-5xl sm:text-8xl font-black tracking-tighter text-white uppercase italic font-headline tabular-nums drop-shadow-[0_0_30px_rgba(255,255,255,0.1)] leading-none pr-2 group-hover:text-primary transition-colors duration-500" suppressHydrationWarning>
                        {formattedTime}
                    </span>
                </div>
                
                {/* Visual Separator with Pulse */}
                <div className="relative w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-5 sm:my-6">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-primary rounded-full blur-sm animate-ping opacity-40" />
                </div>
                
                {/* Date Display */}
                <div className="flex items-center gap-4 text-center">
                    <div className="hidden sm:block p-2 bg-white/5 rounded-lg border border-white/5">
                        <Clock className="w-4 h-4 text-white/40" />
                    </div>
                    <span className="text-xs sm:text-xl font-black tracking-[0.3em] text-white/60 uppercase italic pr-2 leading-none whitespace-nowrap" suppressHydrationWarning>
                        {formattedDate}
                    </span>
                    <div className="hidden sm:block p-2 bg-white/5 rounded-lg border border-white/5">
                        <Activity className="w-4 h-4 text-white/40" />
                    </div>
                </div>

                {/* HUD Geometric Details */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1 opacity-20">
                    <div className="w-6 h-0.5 bg-primary" />
                    <div className="w-2 h-0.5 bg-primary" />
                    <div className="w-12 h-0.5 bg-primary" />
                </div>
            </div>
        </div>
    </div>
  );
}
