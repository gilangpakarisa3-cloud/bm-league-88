
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Flame, Languages, Settings, Scan, Activity, Zap } from 'lucide-react';
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
      
      <div className="container mx-auto flex h-16 sm:h-24 items-center justify-between px-2 sm:px-6 gap-2 sm:gap-6">
        {/* Brand/Logo Section */}
        <Link href="/" className="flex items-center gap-3 sm:gap-4 group relative shrink-0">
          <div className="relative">
            <div className="absolute -inset-2 bg-primary/20 rounded-xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="bg-primary p-2 sm:p-2.5 rounded-xl rotate-12 group-hover:rotate-0 transition-all duration-500 shadow-[0_0_20px_rgba(204,253,1,0.5)] border-2 border-black/10 relative z-10">
              <Flame className="h-5 w-5 sm:h-7 sm:w-7 text-black" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="font-black text-xl sm:text-3xl tracking-tighter uppercase italic text-white leading-none pr-4">
              BM <span className="text-primary drop-shadow-[0_0_12px_rgba(204,253,1,0.4)]">88</span>
            </span>
            <span className="text-[7px] sm:text-[9px] font-black uppercase tracking-[0.4em] text-white/30 italic">Engineering EightyEight</span>
          </div>
        </Link>

        {/* Super Sport Navigation Section */}
        <div className="flex-1 flex justify-center items-center overflow-hidden h-full py-2">
          <div className="relative bg-black/40 border-2 border-white/5 rounded-none sm:rounded-none h-12 sm:h-14 flex items-center px-1 sm:px-2 overflow-hidden shadow-inner group/nav-container">
            {/* HUD Pattern Overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:15px_15px] pointer-events-none" />
            
            <nav className="flex items-center gap-1 sm:gap-3 overflow-x-auto no-scrollbar py-1 px-1 scroll-smooth relative z-10">
              {navLinks.map((link) => {
                const isActive = pathname ? pathname.startsWith(link.href) : false;
                return (
                  <Link 
                    key={link.href} 
                    href={link.href}
                    className={cn(
                      "relative px-4 sm:px-6 py-2 sm:py-2.5 text-[10px] sm:text-xs font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] italic transition-all duration-500 whitespace-nowrap group/link overflow-hidden",
                      isActive ? "text-black" : "text-white/40 hover:text-primary"
                    )}
                  >
                    {/* Sport Slanted Background Layer */}
                    <div className={cn(
                      "absolute inset-0 -skew-x-[15deg] transition-all duration-500 -z-10 origin-bottom",
                      isActive 
                        ? "bg-primary translate-y-0 shadow-[0_0_30px_rgba(204,253,1,0.4)] border-r-4 border-black/20" 
                        : "bg-white/[0.03] translate-y-full group-hover/link:translate-y-0 group-hover/link:bg-primary/10 border-r-2 border-white/5"
                    )} />
                    
                    <span className="relative z-10 flex items-center gap-2 pr-1">
                      {isActive && <Zap className="w-3 h-3 fill-current animate-pulse hidden sm:block" />}
                      {link.label}
                    </span>
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>

        {/* Action Section */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <div className="hidden lg:flex flex-col items-end gap-0.5 opacity-40">
            <div className="flex gap-1">
              <div className="w-1 h-1 bg-primary rounded-full animate-pulse" />
              <div className="w-1 h-1 bg-primary rounded-full animate-pulse delay-75" />
              <div className="w-1 h-1 bg-primary rounded-full animate-pulse delay-150" />
            </div>
            <span className="text-[7px] font-black uppercase tracking-widest">System Link</span>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-white/5 border-2 border-white/10 hover:border-primary/50 hover:bg-primary/10 hover:text-primary transition-all shadow-lg group/lang">
                <Languages className="h-5 w-5 sm:h-6 sm:w-6 transition-transform group-hover/lang:rotate-12" />
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
              "h-10 w-10 sm:h-12 sm:w-12 rounded-xl transition-all duration-500 border-2 shadow-lg group/settings",
              pathname === '/settings' 
                ? "bg-primary text-black border-black shadow-[0_0_20px_rgba(204,253,1,0.5)]" 
                : "bg-white/5 border-white/10 hover:border-primary/50 hover:bg-primary/10 hover:text-primary"
            )}
          >
            <Link href="/settings">
              <Settings className="h-5 w-5 sm:h-6 sm:w-6 group-hover/settings:rotate-90 transition-transform duration-500" />
              <span className="sr-only">{t('header_settings')}</span>
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
