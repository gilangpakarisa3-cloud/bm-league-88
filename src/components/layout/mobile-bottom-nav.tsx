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
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 px-3 pb-[max(0.6rem,env(safe-area-inset-bottom))] pt-1 pointer-events-none">
      {/* Solid Futuristic Cyber Dock with Solid Deep-Tech Background */}
      <nav className="pointer-events-auto max-w-md mx-auto relative bg-[#070d18] border border-primary/30 rounded-2xl shadow-[0_-10px_35px_rgba(0,0,0,0.95),0_0_20px_rgba(204,253,1,0.2)] p-1.5 flex items-center justify-around overflow-hidden">
        
        {/* Futuristic Cyber Neon Glow Ambient Underlay */}
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-accent/40 to-transparent" />

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname ? pathname.startsWith(item.href) : false;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all duration-200 group min-w-0 active:scale-95 touch-manipulation select-none",
                isActive
                  ? "text-black"
                  : "text-white/60 hover:text-white hover:bg-white/[0.06]"
              )}
            >
              {/* Active Neon Volt Pill Background */}
              {isActive && (
                <div className="absolute inset-0 bg-primary rounded-xl shadow-[0_0_16px_rgba(204,253,1,0.55)] z-0 transition-all duration-300" />
              )}

              {/* Icon & Label Container */}
              <div className="relative z-10 flex flex-col items-center gap-1 min-w-0 w-full px-0.5">
                <Icon className={cn(
                  "w-5 h-5 transition-transform duration-200 shrink-0",
                  isActive ? "text-black scale-110" : "text-white/70 group-hover:scale-105"
                )} />
                <span className={cn(
                  "text-[9px] font-black uppercase tracking-tight italic leading-tight truncate w-full text-center",
                  isActive ? "text-black font-black" : "text-white/60"
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
