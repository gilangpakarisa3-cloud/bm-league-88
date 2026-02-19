
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
        <div className="flex justify-center">
            <div className="h-16 bg-muted/20 rounded-2xl w-80 animate-pulse" />
        </div>
    );
  }
  
  const formattedDate = format(currentTime, "eeee, d MMMM yyyy", { locale: id });
  const formattedTime = format(currentTime, "HH:mm:ss");

  return (
    <div className="flex flex-col items-center justify-center">
        <div className="relative group">
            {/* Outer Glow Effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-accent/20 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
            
            <div className="relative flex items-center gap-6 bg-card/80 border-2 border-primary/30 px-8 py-3 rounded-2xl shadow-2xl backdrop-blur-md">
                {/* Time Section */}
                <div className="flex flex-col items-center">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/50 leading-none mb-1">Live Match Time</span>
                    <span className="text-4xl sm:text-5xl font-black italic tracking-tighter text-primary font-headline tabular-nums drop-shadow-[0_0_10px_rgba(204,253,1,0.4)]">
                        {formattedTime}
                    </span>
                </div>
                
                {/* Separator */}
                <div className="w-px h-12 bg-gradient-to-b from-transparent via-primary/30 to-transparent" />
                
                {/* Date Section */}
                <div className="flex flex-col items-start">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground leading-none mb-1">Tournament Date</span>
                    <span className="text-sm sm:text-base font-black uppercase tracking-tight text-foreground italic">
                        {formattedDate}
                    </span>
                </div>
            </div>
        </div>
    </div>
  );
}
