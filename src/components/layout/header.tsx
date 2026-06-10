"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Flame, Languages, Settings, Zap, Scan, Binary, Activity } from 'lucide-react';
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
    <header className="sticky top-0 z-50 w-full border-b-4 border-primary/20 bg-[#0A192F]/95 backdrop-blur-3xl shadow-[0_10px_60px_rgba(0,0,0,0.8)]">
      {/* High-Performance Top Signal Bar */}
      <div className="h-2 w-full bg-black relative overflow-hidden border-b border-primary/10">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/60 to-transparent animate-pulse" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(204,253,1,0.3)_50%,transparent_100%)] bg-[length:200%_100%] animate-marquee" />
      </div>
      
      <div className="container mx-auto flex h-16 sm:h-24 items-center justify-between px-2 sm:px-6 gap-2 sm:gap-6">
        {/* Brand/Logo Section */}
        <Link href="/" className="flex items-center gap-2 group relative shrink-0">
          <div className="relative">
            <div className="absolute -inset-4 bg-primary/20 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="bg-primary p-1.5 sm:p-2.5 rounded-xl rotate-[15deg] group-hover:rotate-0 transition-all duration-500 shadow-[0_0_30px_rgba(204,253,1,0.6)] border-2 border-black/20 relative z-10">
              <Flame className="h-5 w-5 sm:h-7 sm:w-7 text-black" />
            </div>
          </div>
          <span className="font-black text-xl sm:text-3xl tracking-tighter uppercase italic text-white leading-none pr-1 sm:pr-2 hidden md:block">
            BM <span className="text-primary drop-shadow-[0_0_15px_rgba(204,253,1,0.5)]">88</span>
          </span>
        </Link>

        {/* ULTRA AGGRESSIVE HUD NAVIGATION */}
        <div className="flex-1 flex justify-center items-center h-full min-w-0 px-1">
          <div className="relative bg-black/60 border-2 border-white/10 w-full h-12 sm:h-16 flex items-center px-0 overflow-hidden shadow-[inset_0_0_40px_rgba(0,0,0,0.5)] group/nav-container rounded-none">
            {/* HUD Pattern Overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:15px_15px] pointer-events-none opacity-40" />
            
            <nav className="flex items-center justify-between w-full h-full relative z-10">
              {navLinks.map((link) => {
                const isActive = pathname ? pathname.startsWith(link.href) : false;
                return (
                  <Link 
                    key={link.href} 
                    href={link.href}
                    className={cn(
                      "relative flex-1 flex flex-col items-center justify-center text-[10px] sm:text-[15px] font-black uppercase tracking-tighter sm:tracking-[0.1em] italic transition-all duration-500 whitespace-nowrap group/link overflow-hidden h-full",
                      isActive ? "text-black" : "text-white/30 hover:text-primary"
                    )}
                  >
                    {/* Aggressive Skewed Active Layer */}
                    <div className={cn(
                      "absolute inset-0 -skew-x-[20deg] transition-all duration-700 -z-10 origin-bottom",
                      isActive 
                        ? "bg-primary translate-y-0 shadow-[0_0_40px_rgba(204,253,1,0.5)] border-r-4 border-black/30" 
                        : "bg-white/[0.02] translate-y-full group-hover/link:translate-y-0 group-hover/link:bg-primary/20 border-r border-white/5"
                    )}>
                      {isActive && (
                        <>
                          <div className="absolute top-0 right-0 w-1/2 h-full bg-black/10 -skew-x-[25deg] translate-x-1/4 pointer-events-none" />
                          {/* Laser Scanning Animation */}
                          <div className="absolute inset-0 overflow-hidden pointer-events-none">
                            <div className="w-full h-[3px] bg-black/20 absolute top-0 left-0 animate-scanning opacity-50" />
                          </div>
                        </>
                      )}
                    </div>
                    
                    <div className="relative z-10 flex flex-col items-center gap-0.5">
                      {isActive && (
                         <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[6px] font-black text-black/40 tracking-[0.4em] animate-pulse">
                            ACTIVE_LINK
                         </span>
                      )}
                      <span className="relative flex items-center gap-1 sm:gap-2 px-1">
                        {isActive && <Activity className="w-2.5 h-2.5 animate-pulse hidden md:block" />}
                        {link.label}
                      </span>
                      {!isActive && (
                        <div className="h-0.5 w-0 bg-primary/40 transition-all duration-500 group-hover/link:w-1/2 rounded-full" />
                      )}
                    </div>
                    
                    {/* HUD Decorative Details */}
                    <div className={cn(
                        "absolute bottom-0.5 right-1 w-1 h-1 rounded-full transition-all duration-500",
                        isActive ? "bg-black/20" : "bg-white/5 group-hover/link:bg-primary/20"
                    )} />
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>

        {/* Action Tools Section */}
        <div className="flex items-center gap-1.5 sm:gap-4 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 sm:h-14 sm:w-14 rounded-none -skew-x-[15deg] bg-white/5 border border-white/10 hover:border-primary/50 hover:bg-primary/10 hover:text-primary transition-all shadow-xl group/lang relative overflow-hidden">
                <div className="skew-x-[15deg] flex flex-col items-center">
                    <Languages className="h-4 w-4 sm:h-6 sm:w-6" />
                    <span className="text-[6px] font-black mt-1 opacity-20 group-hover/lang:opacity-100 uppercase tracking-widest">SYS_LNG</span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-[#0A192F] border-2 border-primary/40 backdrop-blur-3xl rounded-none p-1 shadow-2xl">
              <DropdownMenuItem onClick={() => setLanguage('id')} className="font-black text-[10px] uppercase tracking-widest focus:bg-primary focus:text-black py-3 px-6 italic cursor-pointer transition-colors">
                ID_TRANSMISSION
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLanguage('en')} className="font-black text-[10px] uppercase tracking-widest focus:bg-primary focus:text-black py-3 px-6 italic cursor-pointer transition-colors">
                EN_TRANSMISSION
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button 
            asChild 
            variant="ghost" 
            size="icon" 
            className={cn(
              "h-9 w-9 sm:h-14 sm:w-14 rounded-none -skew-x-[15deg] transition-all duration-500 border shadow-2xl group/settings relative overflow-hidden",
              pathname === '/settings' 
                ? "bg-primary text-black border-black shadow-[0_0_30px_rgba(204,253,1,0.6)]" 
                : "bg-white/5 border-white/10 hover:border-primary/50 hover:bg-primary/10 hover:text-primary"
            )}
          >
            <Link href="/settings">
              <div className="skew-x-[15deg] flex flex-col items-center">
                <Settings className={cn("h-4 w-4 sm:h-6 sm:w-6", pathname === '/settings' ? "animate-spin-slow" : "group-hover/settings:rotate-90 transition-transform duration-700")} />
                <span className={cn("text-[6px] font-black mt-1 uppercase tracking-widest", pathname === '/settings' ? "opacity-60" : "opacity-20")}>CFG_HUB</span>
              </div>
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
