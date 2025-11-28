"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Flame, Languages, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useLanguage } from '@/context/language-context';
import { useTranslation } from '@/hooks/use-translation';


export function Header() {
  const pathname = usePathname();
  const { setLanguage } = useLanguage();
  const { t } = useTranslation();

  const navLinks = [
    { href: '/league', label: t('header_league') },
    { href: '/fixtures', label: t('header_fixtures') },
    { href: '/players', label: t('header_players') },
    { href: '/teams', label: t('header_teams') },
    { href: '/hall-of-fame', label: t('header_hall_of_fame') },
  ];

  return (
    <header className="bg-card/80 border-b border-border sticky top-0 z-50 backdrop-blur-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 gap-4">
        <Link href="/" className="flex items-center gap-2 group">
          <Flame className="h-7 w-7 text-primary group-hover:animate-pulse" />
          <span className="font-headline font-bold text-2xl hidden sm:inline tracking-tighter">BM League 88</span>
        </Link>
        <div className="flex-1 overflow-hidden sm:flex sm:justify-center">
            <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-4 -mb-4 sm:pb-0 sm:mb-0">
              {navLinks.map((link) => {
                const isActive = pathname ? pathname.startsWith(link.href) : false;
                return (
                  <Button
                    key={link.href}
                    variant={isActive ? "default" : "ghost"}
                    asChild
                    className={cn(
                      'transition-colors text-sm font-bold shrink-0',
                      !isActive && 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Link href={link.href}>{link.label}</Link>
                  </Button>
                )
              })}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="shrink-0">
                    <Languages className="h-5 w-5" />
                    <span className="sr-only">Change language</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setLanguage('id')}>
                    Bahasa Indonesia
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLanguage('en')}>
                    English
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
               <Button asChild variant={pathname === '/settings' ? "default" : "ghost"} size="icon" className="shrink-0">
                  <Link href="/settings">
                    <Settings className="h-5 w-5" />
                    <span className="sr-only">{t('header_settings')}</span>
                  </Link>
              </Button>
            </nav>
        </div>
      </div>
    </header>
  );
}
