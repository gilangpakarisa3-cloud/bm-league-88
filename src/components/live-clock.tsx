
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
            <div className="h-20 sm:h-28 bg-muted/20 rounded-2xl w-full max-w-sm animate-pulse" />
        </div>
    );
  }
  
  const formattedDate = format(currentTime, "eeee, d MMMM yyyy", { locale: id });
  const formattedTime = format(currentTime, "HH:mm:ss");

  return (
    <div className="flex flex-col items-center justify-center w-full">
        <div className="relative group w-fit">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-accent/20 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
            
            <div className="relative flex flex-col items-center bg-card/80 border-2 border-primary/30 px-8 sm:px-12 py-4 sm:py-6 rounded-2xl shadow-2xl backdrop-blur-md">
                {/* Baris 1: Waktu */}
                <div className="flex flex-col items-center">
                    <span className="text-3xl sm:text-6xl font-black tracking-tighter text-primary font-headline tabular-nums drop-shadow-[0_0_15px_rgba(204,253,1,0.4)] leading-none">
                        {formattedTime}
                    </span>
                </div>
                
                {/* Pembatas Horizontal */}
                <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/30 to-transparent my-3 sm:my-5" />
                
                {/* Baris 2: Tanggal */}
                <div className="flex flex-col items-center text-center">
                    <span className="text-xs sm:text-xl font-black tracking-[0.1em] sm:tracking-[0.2em] text-foreground uppercase italic pr-2 leading-none">
                        {formattedDate}
                    </span>
                </div>
            </div>
        </div>
    </div>
  );
}
