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
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 px-3 pb-3 pt-1 pointer-events-none">
      {/* Floating Cyber Glass Dock */}
      <nav className="pointer-events-auto max-w-md mx-auto relative bg-black/85 backdrop-blur-2xl border border-white/15 rounded-[2rem] shadow-[0_-5px_30px_rgba(0,0,0,0.8),0_0_20px_rgba(204,253,1,0.1)] p-1.5 flex items-center justify-around overflow-hidden">
        
        {/* Subtle Cyber Scan Line */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname ? pathname.startsWith(item.href) : false;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-2xl transition-all duration-300 group",
                isActive
                  ? "text-black"
                  : "text-white/45 hover:text-white hover:bg-white/[0.04]"
              )}
            >
              {/* Active Neon Volt Pill Background */}
              {isActive && (
                <div className="absolute inset-0 bg-primary rounded-2xl shadow-[0_0_20px_rgba(204,253,1,0.5)] z-0 transition-all duration-300" />
              )}

              {/* Icon & Label Container */}
              <div className="relative z-10 flex flex-col items-center gap-0.5">
                <Icon className={cn(
                  "w-4 h-4 transition-transform duration-300",
                  isActive ? "text-black scale-110" : "text-white/60 group-hover:scale-105"
                )} />
                <span className={cn(
                  "text-[8px] font-black uppercase tracking-wider italic leading-none truncate max-w-[58px]",
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
