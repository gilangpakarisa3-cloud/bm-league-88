
'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

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
        <div className="flex justify-center px-4">
            <div className="h-12 sm:h-16 bg-muted/20 rounded-xl sm:rounded-2xl w-full max-w-sm animate-pulse" />
        </div>
    );
  }
  
  const formattedDate = format(currentTime, "eeee, d MMMM yyyy", { locale: id });
  const formattedTime = format(currentTime, "HH:mm:ss");

  return (
    <div className="flex flex-col items-center justify-center px-2">
        <div className="relative group w-full max-w-sm">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-accent/20 rounded-xl sm:rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
            
            <div className="relative flex items-center gap-3 sm:gap-6 bg-card/80 border-2 border-primary/30 px-4 sm:px-8 py-2 sm:py-3 rounded-xl sm:rounded-2xl shadow-2xl backdrop-blur-md">
                <div className="flex flex-col items-center flex-1">
                    <span className="text-[7px] sm:text-[10px] font-black tracking-[0.2em] sm:tracking-[0.3em] text-primary/50 leading-none mb-1">Live match time</span>
                    <span className="text-2xl sm:text-5xl font-black tracking-tighter text-primary font-headline tabular-nums drop-shadow-[0_0_10px_rgba(204,253,1,0.4)]">
                        {formattedTime}
                    </span>
                </div>
                
                <div className="w-px h-8 sm:h-12 bg-gradient-to-b from-transparent via-primary/30 to-transparent" />
                
                <div className="flex flex-col items-center text-center flex-1">
                    <span className="text-[7px] sm:text-[10px] font-black tracking-[0.15em] sm:tracking-[0.2em] text-muted-foreground leading-none mb-1">Tournament date</span>
                    <span className="text-[9px] sm:text-base font-black tracking-tight text-foreground uppercase">
                        {formattedDate}
                    </span>
                </div>
            </div>
        </div>
    </div>
  );
}
