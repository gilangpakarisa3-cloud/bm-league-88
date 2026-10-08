"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Flame, Languages, Settings, Zap, Scan, Binary, Activity, Download } from 'lucide-react';
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
import { usePwa } from '@/context/pwa-context';

export function Header() {
  const pathname = usePathname();
  const { setLanguage } = useLanguage();
  const { t } = useTranslation();
  const { canInstall, installApp } = usePwa();

  const navLinks = [
    { href: '/league', label: t('header_league') },
    { href: '/fixtures', label: t('header_fixtures') },
    { href: '/players', label: t('header_players') },
    { href: '/teams', label: t('header_teams') },
    { href: '/hall-of-fame', label: t('header_hall_of_fame') },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/80 backdrop-blur-3xl shadow-[0_15px_50px_rgba(0,0,0,0.9)]">
      {/* High-Performance Top Aero Signal Bar */}
      <div className="h-1.5 w-full bg-black/90 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/80 to-transparent animate-pulse" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(204,253,1,0.4)_50%,transparent_100%)] bg-[length:200%_100%] animate-marquee" />
      </div>
      
      <div className="max-w-[94rem] mx-auto flex h-14 sm:h-20 items-center justify-between px-3 sm:px-8 gap-2 sm:gap-6">
        {/* Brand/Logo Section */}
        <Link href="/" className="flex items-center gap-2 sm:gap-3 group relative shrink-0">
          <div className="relative">
            <div className="absolute -inset-2 sm:-inset-3 bg-primary/20 rounded-xl sm:rounded-2xl blur-lg sm:blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
            <div className="bg-gradient-to-br from-primary via-primary to-yellow-400 p-1.5 sm:p-2.5 rounded-xl sm:rounded-2xl transition-all duration-500 shadow-[0_0_20px_rgba(204,253,1,0.4)] border border-black/20 relative z-10 group-hover:scale-105">
              <Flame className="h-4 w-4 sm:h-6 sm:w-6 text-black" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="font-black text-base sm:text-2xl tracking-tighter uppercase italic text-white leading-none">
              BM <span className="text-primary drop-shadow-[0_0_12px_rgba(204,253,1,0.5)]">LEAGUE 88</span>
            </span>
            <span className="text-[7px] sm:text-[8px] font-black uppercase tracking-[0.2em] sm:tracking-[0.25em] text-white/30 italic hidden xs:block md:block">
              ENGINEERING FOOTBALL HUD
            </span>
          </div>
        </Link>

        {/* AERODYNAMIC COCKPIT NAVIGATION DOCK (VISIBLE ON TABLET & DESKTOP) */}
        <div className="hidden md:flex flex-1 justify-center items-center h-full min-w-0 px-2 max-w-3xl">
          <div className="relative bg-black/60 border border-white/10 w-full h-11 sm:h-12 flex items-center p-1 shadow-[inset_0_2px_15px_rgba(0,0,0,0.8)] rounded-full backdrop-blur-xl">
            {/* HUD Scanning Layer */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none opacity-30 rounded-full overflow-hidden" />
            
            <nav className="flex items-center justify-between w-full h-full relative z-10 gap-0.5 sm:gap-1">
              {navLinks.map((link) => {
                const isActive = pathname ? pathname.startsWith(link.href) : false;
                return (
                  <Link 
                    key={link.href} 
                    href={link.href}
                    className={cn(
                      "relative flex-1 flex items-center justify-center text-[10px] lg:text-[11px] xl:text-xs font-black uppercase tracking-tight sm:tracking-normal italic transition-all duration-300 rounded-full h-full px-2 lg:px-3 whitespace-nowrap min-w-max",
                      isActive 
                        ? "bg-primary text-black shadow-[0_0_25px_rgba(204,253,1,0.5)] font-black" 
                        : "text-white/50 hover:text-white hover:bg-white/[0.05]"
                    )}
                  >
                    <span className="relative z-10 flex items-center gap-1 min-w-0 pr-0.5">
                      {isActive && <Activity className="w-3 h-3 animate-pulse shrink-0 hidden xl:block" />}
                      <span className="inline-block">{link.label}</span>
                    </span>
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>

        {/* Action Tools Section */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Install / Download App PWA Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={installApp}
            title="Install / Download BM LEAGUE 88 App"
            className="h-10 w-10 sm:h-11 sm:w-11 rounded-2xl bg-primary/10 border border-primary/50 text-primary hover:bg-primary hover:text-black transition-all shadow-[0_0_15px_rgba(204,253,1,0.2)] hover:shadow-[0_0_20px_rgba(204,253,1,0.5)] group/install relative overflow-hidden shrink-0"
          >
            <div className="flex flex-col items-center">
              <Download className="h-4 w-4 sm:h-5 sm:w-5 transition-transform duration-300 group-hover/install:scale-110" />
              <span className="text-[6px] font-black uppercase tracking-widest leading-none mt-0.5">APP</span>
            </div>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10 sm:h-11 sm:w-11 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-primary/50 hover:bg-primary/10 hover:text-primary transition-all shadow-lg group/lang relative overflow-hidden">
                <div className="flex flex-col items-center">
                    <Languages className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="text-[6px] font-black opacity-30 group-hover/lang:opacity-100 uppercase tracking-widest">LNG</span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-black/90 border border-primary/40 backdrop-blur-3xl rounded-2xl p-1.5 shadow-2xl">
              <DropdownMenuItem onClick={() => setLanguage('id')} className="font-black text-[11px] uppercase tracking-wider focus:bg-primary focus:text-black py-2.5 px-4 italic cursor-pointer rounded-xl transition-colors">
                ID_TRANSMISSION
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLanguage('en')} className="font-black text-[11px] uppercase tracking-wider focus:bg-primary focus:text-black py-2.5 px-4 italic cursor-pointer rounded-xl transition-colors">
                EN_TRANSMISSION
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button 
            asChild 
            variant="ghost" 
            size="icon" 
            className={cn(
              "h-10 w-10 sm:h-11 sm:w-11 rounded-2xl transition-all duration-300 border shadow-lg group/settings relative overflow-hidden",
              pathname === '/settings' 
                ? "bg-primary text-black border-primary shadow-[0_0_25px_rgba(204,253,1,0.5)]" 
                : "bg-white/[0.03] border-white/10 hover:border-primary/50 hover:bg-primary/10 hover:text-primary"
            )}
          >
            <Link href="/settings">
              <div className="flex flex-col items-center">
                <Settings className={cn("h-4 w-4 sm:h-5 sm:w-5", pathname === '/settings' ? "animate-spin-slow" : "group-hover/settings:rotate-90 transition-transform duration-500")} />
                <span className={cn("text-[6px] font-black uppercase tracking-widest", pathname === '/settings' ? "opacity-70" : "opacity-30")}>CFG</span>
              </div>
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
