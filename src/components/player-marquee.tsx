'use client';

import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { Season, LeagueEntry, WithId, Team, Player } from '@/lib/types';
import { useState, useMemo, useEffect } from 'react';
import { collection, query, orderBy } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Shield, Zap, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from './ui/skeleton';

const LEAGUE_ID = 'main-league';

export function PlayerMarquee() {
  const firestore = useFirestore();
  const [activeSeasonId, setActiveSeasonId] = useState<string | null>(null);

  const seasonsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, `leagues/${LEAGUE_ID}/seasons`) : null),
    [firestore]
  );
  const { data: seasons, isLoading: isLoadingSeasons } = useCollection<Season>(seasonsCollection);
  
  useEffect(() => {
    if (seasons && seasons.length > 0) {
      const inProgressSeason = seasons.find(s => s.status === 'In Progress');
      if (inProgressSeason) {
        setActiveSeasonId(inProgressSeason.id);
      } else {
        const sortedSeasons = [...seasons].sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
        setActiveSeasonId(sortedSeasons.length > 0 ? sortedSeasons[0].id : null);
      }
    }
  }, [seasons]);

  const leagueTableQuery = useMemoFirebase(
    () => {
      if (!firestore || !activeSeasonId) return null;
      return query(collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/leagueTable`));
    },
    [firestore, activeSeasonId]
  );

  const { data: leaguePlayers, isLoading: isLoadingTable } = useCollection<LeagueEntry>(leagueTableQuery);
  
  const teamsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'teams') : null),
    [firestore]
  );
  const { data: allTeams, isLoading: isLoadingTeams } = useCollection<Team>(teamsCollection);

  const playersCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'players') : null),
    [firestore]
  );
  const { data: allPlayers } = useCollection<Player>(playersCollection);

  const teamsById = useMemo(() => {
    if (!allTeams) return {};
    return allTeams.reduce((acc, t) => {
        acc[t.id] = t;
        return acc;
    }, {} as Record<string, WithId<Team>>);
  }, [allTeams]);

  const playersById = useMemo(() => {
    if (!allPlayers) return {};
    return allPlayers.reduce((acc, p) => {
        acc[p.id] = p;
        return acc;
    }, {} as Record<string, WithId<Player>>);
  }, [allPlayers]);

  const participants = useMemo(() => {
    if (!leaguePlayers) return [];
    return leaguePlayers.map(p => {
        const player = playersById[p.playerId];
        const teamId = p.teamId || player?.teamId || '';
        const team = teamsById[teamId];
        
        const logoUrl = team?.logoUrl || 
                        p.logoUrl || 
                        (teamId ? `https://picsum.photos/seed/team-${teamId}/128/128` : 
                        (p.teamName ? `https://picsum.photos/seed/team-${p.teamName.toLowerCase().replace(/\s+/g, '-')}/128/128` : 
                        `https://picsum.photos/seed/player-${p.playerId}/128/128`));

        return {
            ...p,
            team,
            logoUrl
        };
    }).sort((a,b) => a.playerName.localeCompare(b.playerName));
  }, [leaguePlayers, teamsById, playersById]);

  const isLoading = isLoadingSeasons || isLoadingTable || isLoadingTeams;

  if (isLoading) {
    return <MarqueeSkeleton />;
  }

  if (!participants || participants.length === 0) {
    return null; // Don't render anything if there are no participants
  }
  
  // Duplicate the array to create a seamless loop
  const marqueeItems = [...participants, ...participants];

  // Increase rolling speed by 30% (Original factor 5 / 1.3 ≈ 3.8)
  const animationDuration = `${participants.length * 3.8}s`;

  return (
    <div className="relative w-full overflow-hidden bg-black/40 border-y-2 border-white/5 py-4 sm:py-6 group backdrop-blur-xl">
        {/* HUD Side Accents */}
        <div className="absolute top-0 left-0 w-24 sm:w-48 h-full bg-gradient-to-r from-primary/[0.07] to-transparent pointer-events-none z-20" />
        <div className="absolute top-0 right-0 w-24 sm:w-48 h-full bg-gradient-to-l from-primary/[0.07] to-transparent pointer-events-none z-20" />
        
        {/* Top/Bottom HUD Lines */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

        <div 
            className="flex gap-6 sm:gap-12 animate-marquee group-hover:[animation-play-state:paused]"
            style={{ animationDuration }}
        >
            {marqueeItems.map((participant, index) => (
                <div 
                    key={`${participant.id}-${index}`} 
                    className="flex items-center gap-3 sm:gap-5 shrink-0 px-4 sm:px-6 py-2 sm:py-3 bg-white/[0.02] border border-white/5 rounded-xl sm:rounded-2xl hover:border-primary/30 hover:bg-primary/[0.03] transition-all duration-500 group/item"
                >
                    <div className="relative">
                        <div className="absolute -inset-1.5 bg-primary/20 rounded-full blur-md opacity-0 group-hover/item:opacity-100 transition-opacity duration-500" />
                        <Avatar className="h-9 w-9 sm:h-12 sm:w-12 border-2 border-white/10 group-hover/item:border-primary transition-all duration-500 shadow-xl relative z-10">
                            <AvatarImage src={participant.logoUrl} alt={participant.teamName} className="object-cover" />
                            <AvatarFallback className="bg-black/40"><Shield className="w-5 h-5 text-white/10"/></AvatarFallback>
                        </Avatar>
                    </div>
                    
                    <div className="flex flex-col gap-0.5 relative z-10">
                        <span className="font-black text-sm sm:text-lg text-white uppercase italic tracking-tight pr-4 group-hover/item:text-primary transition-colors duration-300 leading-none">
                            {participant.playerName}
                        </span>
                        <div className="flex items-center gap-1.5 opacity-40 group-hover/item:opacity-100 transition-opacity duration-300">
                            <Zap className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-primary fill-primary" />
                            <span className="text-[8px] sm:text-[10px] font-black text-white uppercase tracking-widest truncate max-w-[100px]">
                                {participant.teamName || 'Independent'}
                            </span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </div>
  );
}

function MarqueeSkeleton() {
    return (
        <div className="relative w-full overflow-hidden bg-black/40 border-y-2 border-white/5 py-6">
             <div className="flex gap-10">
                {[...Array(10)].map((_, index) => (
                    <div key={index} className="flex items-center gap-4 shrink-0 px-6 py-3 bg-white/[0.02] rounded-2xl">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-2 w-16" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
