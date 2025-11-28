
"use client";

import { useEffect, useState } from 'react';

export function Footer() {
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  useEffect(() => {
    // This will only run on the client side after hydration
    setCurrentYear(new Date().getFullYear());
  }, []);

  return (
    <footer className="bg-card border-t border-border mt-12">
      <div className="container mx-auto px-4 py-6 text-center text-xs text-muted-foreground">
        {currentYear ? (
            <p>&copy; {currentYear} Engineering EightyEight. All rights reserved.</p>
        ) : (
            <div className="h-4 bg-muted/50 rounded-md w-1/2 mx-auto animate-pulse" />
        )}
      </div>
    </footer>
  );
}
