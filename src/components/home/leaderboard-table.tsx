'use client';

import * as React from 'react';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Award, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LeagueEntry, WithId, Player, Team } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

export interface LeaderboardTableProps {
  players: (WithId<LeagueEntry> & { 
    player?: WithId<Player>; 
    team?: WithId<Team>; 
    logoUrl?: string; 
    rank: number;
    teamName?: string;
  })[];
  defendingChampionId?: string;
}

export function LeaderboardTable({ players, defendingChampionId }: LeaderboardTableProps) {
  return (
    <Table>
      <TableBody>
        {players.map((entry, index) => {
          const isFirst = index === 0;
          const isBottom = players.length > 4 && index >= players.length - 2;
          const isDefendingChampion = defendingChampionId && (entry.playerId === defendingChampionId || entry.id === defendingChampionId);

          return (
            <TableRow 
              key={entry.id || index} 
              className={cn(
                "border-b border-white/5 transition-all duration-300 group/row h-13 sm:h-16",
                isFirst ? "bg-primary/[0.04] hover:bg-primary/[0.08]" : "hover:bg-white/[0.03]"
              )}
            >
              <TableCell className={cn("p-0 w-1 transition-all duration-500", 
                isFirst ? 'bg-primary shadow-[0_0_15px_rgba(204,253,1,0.6)]' :
                isBottom ? 'bg-red-500' : 'bg-transparent'
              )} />
              
              <TableCell className={cn("font-black text-sm sm:text-lg pl-2 sm:pl-6 italic", 
                isFirst ? "text-primary scale-105 drop-shadow-[0_0_10px_rgba(204,253,1,0.4)]" : "text-white/40 group-hover/row:text-white/70"
              )}>
                {entry.rank}
              </TableCell>

              <TableCell className="py-2">
                <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                  <div className="relative shrink-0">
                    <Avatar className={cn(
                      "h-8 w-8 sm:h-11 sm:w-11 border-2 transition-all duration-300 rounded-xl sm:rounded-2xl", 
                      isFirst ? "border-primary shadow-[0_0_15px_rgba(204,253,1,0.3)]" : "border-white/10 group-hover/row:border-primary/50"
                    )}>
                      <AvatarImage 
                        key={entry.logoUrl} 
                        src={entry.logoUrl || undefined} 
                        alt={entry.playerName} 
                        className="object-cover" 
                        referrerPolicy="no-referrer" 
                      />
                      <AvatarFallback className="bg-black/60 font-black text-[10px] sm:text-xs rounded-xl sm:rounded-2xl">
                        <User className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-white/30" />
                      </AvatarFallback>
                    </Avatar>
                    {isDefendingChampion && (
                      <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-amber-500 rounded-lg p-0.5 sm:p-1 border border-black shadow-lg">
                        <Award className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-black" />
                      </div>
                    )}
                  </div>
                  <div className="overflow-hidden min-w-0 flex-1">
                    <div className={cn(
                      "font-black truncate uppercase italic transition-colors leading-tight", 
                      isFirst ? "text-primary text-xs sm:text-base" : "text-xs sm:text-sm text-white group-hover/row:text-primary"
                    )}>
                      {entry.playerName}
                    </div>
                    <div className="text-[7px] sm:text-[10px] text-white/40 truncate font-black uppercase tracking-wider">
                      {entry.team?.name || entry.teamName}
                    </div>
                  </div>
                </div>
              </TableCell>

              <TableCell className="text-right pr-2 sm:pr-8 font-black text-lg sm:text-2xl tabular-nums italic">
                <span className={cn(
                  "px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-lg sm:rounded-xl text-xs sm:text-base", 
                  isFirst ? "text-black bg-primary font-black shadow-[0_0_15px_rgba(204,253,1,0.4)]" : "text-primary bg-primary/10 border border-primary/20"
                )}>
                  {entry.points}
                </span>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

export function LeaderboardSkeleton() {
  return (
    <div className="p-6 space-y-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-2 border-b border-white/5 last:border-0">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <div className="flex items-center gap-3 flex-1">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <Skeleton className="h-8 w-12 rounded-lg" />
        </div>
      ))}
    </div>
  );
}
