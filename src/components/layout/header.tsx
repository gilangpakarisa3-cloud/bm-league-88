
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
    { href: '/players', label: 'Players' },
  ];

  return (
    <header className="bg-card/80 border-b border-border sticky top-0 z-50 backdrop-blur-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 group">
          <Flame className="h-7 w-7 text-primary group-hover:animate-pulse" />
          <span className="font-headline font-bold text-lg hidden sm:inline tracking-tighter">Engineering EightyEight</span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          {navLinks.map((link) => (
            <Button
              key={link.href}
              variant="ghost"
              asChild
              className={cn(
                'transition-colors',
                pathname.startsWith(link.href) ? 'text-primary hover:text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Link href={link.href}>{link.label}</Link>
            </Button>
          ))}
        </nav>
      </div>
    </header>
  );
}
