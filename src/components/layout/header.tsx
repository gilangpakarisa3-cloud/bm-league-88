
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Flame, Languages, Settings, Zap } from 'lucide-react';
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
    <header className="sticky top-0 z-50 w-full border-b-4 border-primary/20 bg-[#0A192F]/95 backdrop-blur-3xl shadow-[0_10px_50px_rgba(0,0,0,0.6)]">
      {/* High-Performance Top Signal Bar */}
      <div className="h-1.5 w-full bg-black relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/40 to-transparent animate-pulse" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(204,253,1,0.2)_50%,transparent_100%)] bg-[length:200%_100%] animate-marquee" />
      </div>
      
      <div className="container mx-auto flex h-16 sm:h-24 items-center justify-between px-2 sm:px-6 gap-1 sm:gap-6">
        {/* Brand/Logo Section - Compact Version */}
        <Link href="/" className="flex items-center gap-1.5 sm:gap-3 group relative shrink-0">
          <div className="relative">
            <div className="absolute -inset-2 bg-primary/20 rounded-xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="bg-primary p-1.5 sm:p-2 rounded-lg sm:rounded-xl rotate-12 group-hover:rotate-0 transition-all duration-500 shadow-[0_0_20px_rgba(204,253,1,0.5)] border-2 border-black/10 relative z-10">
              <Flame className="h-3.5 w-3.5 sm:h-6 sm:w-6 text-black" />
            </div>
          </div>
          <span className="font-black text-base sm:text-2xl tracking-tighter uppercase italic text-white leading-none pr-1 sm:pr-2">
            BM <span className="text-primary drop-shadow-[0_0_12px_rgba(204,253,1,0.4)]">88</span>
          </span>
        </Link>

        {/* Super Sport Navigation Section - Adaptive Layout */}
        <div className="flex-1 flex justify-center items-center h-full py-2 min-w-0">
          <div className="relative bg-black/40 border-2 border-white/5 w-full max-w-full sm:max-w-none h-11 sm:h-14 flex items-center px-0.5 sm:px-2 overflow-hidden shadow-inner group/nav-container">
            {/* HUD Pattern Overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:10px_10px] pointer-events-none" />
            
            <nav className="flex items-center justify-around sm:justify-center gap-0 sm:gap-3 w-full h-full relative z-10">
              {navLinks.map((link) => {
                const isActive = pathname ? pathname.startsWith(link.href) : false;
                return (
                  <Link 
                    key={link.href} 
                    href={link.href}
                    className={cn(
                      "relative flex-1 sm:flex-none flex items-center justify-center px-1 sm:px-6 py-2 sm:py-2.5 text-[8px] sm:text-xs font-black uppercase tracking-tighter sm:tracking-[0.2em] italic transition-all duration-500 whitespace-nowrap group/link overflow-hidden h-full",
                      isActive ? "text-black" : "text-white/40 hover:text-primary"
                    )}
                  >
                    {/* Sport Slanted Background Layer */}
                    <div className={cn(
                      "absolute inset-0 -skew-x-[10deg] sm:-skew-x-[15deg] transition-all duration-500 -z-10 origin-bottom",
                      isActive 
                        ? "bg-primary translate-y-0 shadow-[0_0_30px_rgba(204,253,1,0.4)] border-r-2 sm:border-r-4 border-black/20" 
                        : "bg-white/[0.03] translate-y-full group-hover/link:translate-y-0 group-hover/link:bg-primary/10 border-r border-white/5"
                    )} />
                    
                    <span className="relative z-10 flex items-center gap-1 sm:gap-2">
                      {isActive && <Zap className="w-2.5 h-2.5 fill-current animate-pulse hidden md:block" />}
                      {link.label}
                    </span>
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>

        {/* Action Section */}
        <div className="flex items-center gap-1 sm:gap-4 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 sm:h-12 sm:w-12 rounded-lg sm:rounded-xl bg-white/5 border-2 border-white/10 hover:border-primary/50 hover:bg-primary/10 hover:text-primary transition-all shadow-lg group/lang">
                <Languages className="h-4 w-4 sm:h-6 sm:w-6 transition-transform group-hover/lang:rotate-12" />
                <span className="sr-only">Change language</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-[#0A192F] border-primary/30 backdrop-blur-xl rounded-xl p-1.5 shadow-2xl">
              <DropdownMenuItem onClick={() => setLanguage('id')} className="font-black text-[10px] uppercase tracking-widest focus:bg-primary focus:text-black py-2.5 px-4 rounded-lg italic">
                Bahasa Indonesia
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLanguage('en')} className="font-black text-[10px] uppercase tracking-widest focus:bg-primary focus:text-black py-2.5 px-4 rounded-lg italic">
                English
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button 
            asChild 
            variant="ghost" 
            size="icon" 
            className={cn(
              "h-9 w-9 sm:h-12 sm:w-12 rounded-lg sm:rounded-xl transition-all duration-500 border-2 shadow-lg group/settings",
              pathname === '/settings' 
                ? "bg-primary text-black border-black shadow-[0_0_20px_rgba(204,253,1,0.5)]" 
                : "bg-white/5 border-white/10 hover:border-primary/50 hover:bg-primary/10 hover:text-primary"
            )}
          >
            <Link href="/settings">
              <Settings className="h-4 w-4 sm:h-6 sm:w-6 group-hover/settings:rotate-90 transition-transform duration-500" />
              <span className="sr-only">{t('header_settings')}</span>
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
