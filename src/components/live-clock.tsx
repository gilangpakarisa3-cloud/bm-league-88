'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export function LiveClock() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, []);
  
  const formattedDate = format(currentTime, "eeee, d MMMM yyyy", { locale: id });
  const formattedTime = format(currentTime, "HH:mm:ss");

  return (
    <div className="text-center bg-card/80 border border-primary/50 rounded-lg p-4 max-w-md mx-auto shadow-lg shadow-primary/10">
        <p className="font-mono text-4xl md:text-5xl font-bold tracking-widest text-foreground">
            {formattedTime}
        </p>
        <p className="text-lg font-semibold text-primary mt-1">
            {formattedDate}
        </p>
    </div>
  );
}
