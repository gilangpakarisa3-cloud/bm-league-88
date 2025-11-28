
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
        <div className="text-center font-mono tracking-wider">
            <div className="h-6 bg-muted/50 rounded-md w-64 animate-pulse mx-auto" />
        </div>
    );
  }
  
  const formattedDate = format(currentTime, "eeee, d MMMM yyyy", { locale: id });
  const formattedTime = format(currentTime, "HH:mm:ss");

  return (
    <div className="text-center font-mono tracking-wider">
        <span className="text-lg font-semibold text-foreground">{formattedTime}</span>
        <span className="text-primary mx-2">|</span>
        <span className="text-sm font-medium text-primary">{formattedDate}</span>
    </div>
  );
}
