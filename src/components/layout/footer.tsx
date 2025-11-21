
"use client";

import { useEffect, useState } from 'react';

export function Footer() {
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  return (
    <footer className="bg-card border-t border-border mt-12">
      <div className="container mx-auto px-4 py-6 text-center text-xs text-muted-foreground">
        <p>&copy; {currentYear} Engineering EightyEight. All rights reserved.</p>
      </div>
    </footer>
  );
}
