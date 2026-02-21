
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
    <header className="sticky top-0 z-50 w-full border-b-2 border-primary/20 bg-[#0A192F]/90 backdrop-blur-xl shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
      {/* Decorative top bar */}
      <div className="h-1 w-full bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
      
      <div className="container mx-auto flex h-16 sm:h-20 items-center justify-between px-2 sm:px-4 gap-2 sm:gap-4">
        {/* Brand/Logo Section */}
        <Link href="/" className="flex items-center gap-2 sm:gap-3 group relative shrink-0">
          <div className="relative">
            <div className="absolute -inset-1.5 bg-primary/20 rounded-full blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="bg-primary p-1 sm:p-1.5 rounded-lg rotate-12 group-hover:rotate-0 transition-transform duration-500 shadow-[0_0_10px_rgba(204,253,1,0.4)]">
              <Flame className="h-4 w-4 sm:h-6 sm:w-6 text-black" />
            </div>
          </div>
          <span className="font-black text-lg sm:text-2xl tracking-tighter uppercase italic text-white pr-1 sm:pr-2">
            BM <span className="text-primary drop-shadow-[0_0_8px_rgba(204,253,1,0.3)]">88</span>
          </span>
        </Link>

        {/* Navigation Section */}
        <div className="flex-1 flex justify-center items-center overflow-hidden h-full">
          <nav className="flex items-center gap-0.5 sm:gap-2 overflow-x-auto no-scrollbar py-2 px-1 scroll-smooth">
            {navLinks.map((link) => {
              const isActive = pathname ? pathname.startsWith(link.href) : false;
              return (
                <Link 
                  key={link.href} 
                  href={link.href}
                  className={cn(
                    "relative px-3 sm:px-4 py-1.5 sm:py-2 text-[9px] sm:text-xs font-black uppercase tracking-[0.1em] sm:tracking-[0.15em] italic transition-all duration-300 whitespace-nowrap group/nav",
                    isActive ? "text-primary" : "text-white/60 hover:text-white"
                  )}
                >
                  {/* Slanted indicator for active/hover */}
                  <span className={cn(
                    "absolute inset-0 -skew-x-12 transition-all duration-300 -z-10 rounded-md",
                    isActive ? "bg-primary/10 border-r-2 sm:border-r-4 border-primary" : "bg-transparent group-hover/nav:bg-white/5"
                  )} />
                  {link.label}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Action Section */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-white/5 border border-white/10 hover:bg-primary/10 hover:text-primary transition-all">
                <Languages className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="sr-only">Change language</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-[#0A192F] border-primary/30 backdrop-blur-xl">
              <DropdownMenuItem onClick={() => setLanguage('id')} className="font-bold text-xs uppercase tracking-widest focus:bg-primary focus:text-black">
                Bahasa Indonesia
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLanguage('en')} className="font-bold text-xs uppercase tracking-widest focus:bg-primary focus:text-black">
                English
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button 
            asChild 
            variant="ghost" 
            size="icon" 
            className={cn(
              "h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl transition-all duration-300 border",
              pathname === '/settings' 
                ? "bg-primary text-black border-primary shadow-[0_0_10px_rgba(204,253,1,0.4)]" 
                : "bg-white/5 border-white/10 hover:bg-primary/10 hover:text-primary"
            )}
          >
            <Link href="/settings">
              <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="sr-only">{t('header_settings')}</span>
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
