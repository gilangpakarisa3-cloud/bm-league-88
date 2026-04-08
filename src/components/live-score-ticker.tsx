'use client';

import { useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import type { Match, Season, Team, Player, WithId } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Zap, Activity, Scan, Swords } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { resolveLogo } from '@/lib/logo-utils';

interface LiveScoreTickerProps {
  activeSeasonId: string | null;
  teamsById: Record<string, WithId<Team>>;
  playersById: Record<string, WithId<Player>>;
}

export function LiveScoreTicker({ activeSeasonId, teamsById, playersById }: LiveScoreTickerProps) {
  const firestore = useFirestore();

  const liveMatchesQuery = useMemoFirebase(() => {
    if (!firestore || !activeSeasonId) return null;
    return query(
      collection(firestore, `leagues/main-league/seasons/${activeSeasonId}/matches`),
      where('status', '==', 'Live')
    );
  }, [firestore, activeSeasonId]);

  const { data: liveMatches, isLoading } = useCollection<Match>(liveMatchesQuery);

  if (isLoading || !liveMatches || liveMatches.length === 0) return null;

  return (
    <div className="w-full bg-black/40 border-y-2 border-primary/20 py-4 sm:py-6 overflow-hidden relative group backdrop-blur-xl animate-in fade-in duration-1000 mb-10">
      {/* HUD Background Decoration */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(204,253,1,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(204,253,1,0.02)_1px,transparent_1px)] bg-[size:30px_30px] opacity-20 pointer-events-none" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
            <h2 className="text-[10px] sm:text-xs font-black text-red-500 uppercase tracking-[0.4em] italic">LIVE ENGAGEMENTS</h2>
          </div>
          <div className="h-px flex-1 bg-gradient-to-r from-red-500/40 to-transparent" />
        </div>

        <div className="flex flex-wrap gap-4 sm:gap-6 justify-center sm:justify-start">
          {liveMatches.map((match) => {
            const p1 = playersById[match.player1Id];
            const p2 = playersById[match.player2Id];
            const t1 = teamsById[p1?.teamId || ''];
            const t2 = teamsById[p2?.teamId || ''];
            
            const logo1 = resolveLogo(t1?.logoUrl, match.player1Id, p1?.name || match.player1Id);
            const logo2 = resolveLogo(t2?.logoUrl, match.player2Id, p2?.name || match.player2Id);

            return (
              <div key={match.id} className="bg-black/60 border-2 border-white/10 rounded-2xl p-3 sm:p-4 flex items-center gap-4 sm:gap-6 shadow-2xl hover:border-primary/40 transition-all duration-500 group/live">
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-center gap-1">
                    <Avatar className="h-10 w-10 border-2 border-white/10 group-hover/live:border-primary transition-colors">
                      <AvatarImage src={logo1} className="object-cover" />
                      <AvatarFallback className="bg-black/40 text-[8px]">P1</AvatarFallback>
                    </Avatar>
                    <span className="text-[8px] font-black text-white/40 uppercase tracking-tighter truncate max-w-[60px]">{p1?.name || match.player1Id}</span>
                  </div>
                  
                  <div className="flex items-center gap-3 bg-black/40 px-4 py-2 rounded-xl border border-white/5 ring-4 ring-black/20">
                    <span className="text-2xl sm:text-3xl font-black text-primary italic tabular-nums">{match.player1Score ?? 0}</span>
                    <div className="w-px h-6 bg-white/10" />
                    <span className="text-2xl sm:text-3xl font-black text-primary italic tabular-nums">{match.player2Score ?? 0}</span>
                  </div>

                  <div className="flex flex-col items-center gap-1">
                    <Avatar className="h-10 w-10 border-2 border-white/10 group-hover/live:border-primary transition-colors">
                      <AvatarImage src={logo2} className="object-cover" />
                      <AvatarFallback className="bg-black/40 text-[8px]">P2</AvatarFallback>
                    </Avatar>
                    <span className="text-[8px] font-black text-white/40 uppercase tracking-tighter truncate max-w-[60px]">{p2?.name || match.player2Id}</span>
                  </div>
                </div>

                <div className="hidden sm:flex flex-col items-end gap-1">
                  <Badge className="bg-primary/10 text-primary border-primary/20 text-[7px] font-black px-2 h-4 uppercase">IN PROGRESS</Badge>
                  <span className="text-[7px] font-black text-white/20 uppercase tracking-widest">{match.round || 'MATCH'}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
