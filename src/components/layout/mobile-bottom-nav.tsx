"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Trophy, Swords, Users, Shield, Crown, Activity } from 'lucide-react';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';

export function MobileBottomNav() {
  const pathname = usePathname();
  const { t } = useTranslation();

  const navItems = [
    {
      href: '/league',
      label: t('header_league'),
      icon: Trophy,
    },
    {
      href: '/fixtures',
      label: t('header_fixtures'),
      icon: Swords,
    },
    {
      href: '/players',
      label: t('header_players'),
      icon: Users,
    },
    {
      href: '/teams',
      label: t('header_teams'),
      icon: Shield,
    },
    {
      href: '/hall-of-fame',
      label: t('header_hall_of_fame'),
      icon: Crown,
    },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 px-2.5 pb-2 pt-1 pointer-events-none">
      {/* Floating Cyber Glass Dock with Mobile Safe Area awareness */}
      <nav className="pointer-events-auto max-w-sm mx-auto relative bg-black/90 backdrop-blur-2xl border border-white/15 rounded-2xl sm:rounded-[2rem] shadow-[0_-5px_30px_rgba(0,0,0,0.85),0_0_20px_rgba(204,253,1,0.15)] p-1 flex items-center justify-around overflow-hidden">
        
        {/* Subtle Cyber Scan Line */}
        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-primary/70 to-transparent" />

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname ? pathname.startsWith(item.href) : false;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex-1 flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl transition-all duration-300 group min-w-0",
                isActive
                  ? "text-black"
                  : "text-white/45 hover:text-white hover:bg-white/[0.04]"
              )}
            >
              {/* Active Neon Volt Pill Background */}
              {isActive && (
                <div className="absolute inset-0 bg-primary rounded-xl shadow-[0_0_15px_rgba(204,253,1,0.5)] z-0 transition-all duration-300" />
              )}

              {/* Icon & Label Container */}
              <div className="relative z-10 flex flex-col items-center gap-0.5 min-w-0 w-full px-0.5">
                <Icon className={cn(
                  "w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform duration-300 shrink-0",
                  isActive ? "text-black scale-110" : "text-white/60 group-hover:scale-105"
                )} />
                <span className={cn(
                  "text-[7.5px] sm:text-[8px] font-black uppercase tracking-tight italic leading-none truncate w-full text-center",
                  isActive ? "text-black font-black" : "text-white/50"
                )}>
                  {item.label}
                </span>
              </div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
