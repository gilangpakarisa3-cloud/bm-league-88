
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function Header() {
  const pathname = usePathname();

  const navLinks = [
    { href: '/league', label: 'League' },
    { href: '/cup', label: 'Cup' },
    { href: '/fixtures', label: 'Fixtures' },
    { href: '/players', label: 'Players' },
    { href: '/teams', label: 'Teams' },
  ];

  return (
    <header className="bg-card/80 border-b border-border sticky top-0 z-50 backdrop-blur-sm">
      <div className="container mx-auto flex h-20 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-3 group">
          <Flame className="h-9 w-9 text-primary group-hover:animate-pulse" />
          <span className="font-headline font-bold text-xl hidden sm:inline tracking-tighter">Engineering EightyEight</span>
        </Link>
        <nav className="flex items-center gap-2 sm:gap-4">
          {navLinks.map((link) => {
            const isActive = pathname ? pathname.startsWith(link.href) : false;
            return (
              <Button
                key={link.href}
                variant={isActive ? "default" : "ghost"}
                asChild
                className={cn(
                  'transition-colors text-base',
                  !isActive && 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Link href={link.href}>{link.label}</Link>
              </Button>
            )
          })}
        </nav>
      </div>
    </header>
  );
}
