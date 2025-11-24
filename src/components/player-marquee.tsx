
'use client';

import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { Season, LeagueEntry, WithId, Team } from '@/lib/types';
import { useState, useMemo, useEffect } from 'react';
import { collection, query, orderBy } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Shield } from 'lucide-react';
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

  const teamsById = useMemo(() => {
    if (!allTeams) return {};
    return allTeams.reduce((acc, t) => {
        acc[t.id] = t;
        return acc;
    }, {} as Record<string, WithId<Team>>);
  }, [allTeams]);

  const participants = useMemo(() => {
    if (!leaguePlayers) return [];
    return leaguePlayers.map(p => ({
        ...p,
        team: teamsById[p.teamId]
    })).sort((a,b) => a.playerName.localeCompare(b.playerName));
  }, [leaguePlayers, teamsById]);

  const isLoading = isLoadingSeasons || isLoadingTable || isLoadingTeams;

  if (isLoading) {
    return <MarqueeSkeleton />;
  }

  if (!participants || participants.length === 0) {
    return null; // Don't render anything if there are no participants
  }
  
  // Duplicate the array to create a seamless loop
  const marqueeItems = [...participants, ...participants];

  const animationDuration = `${participants.length * 5}s`;

  return (
    <div className="relative w-full overflow-hidden bg-card border-y border-border py-3 group">
      <div 
        className="flex gap-10 animate-marquee group-hover:[animation-play-state:paused]"
        style={{ animationDuration }}
      >
        {marqueeItems.map((participant, index) => (
          <div key={`${participant.id}-${index}`} className="flex items-center gap-3 shrink-0">
            <Avatar className="h-8 w-8 border-2 border-muted">
              <AvatarImage src={participant.team?.logoUrl} alt={participant.teamName} />
              <AvatarFallback><Shield className="w-4 h-4"/></AvatarFallback>
            </Avatar>
            <span className="font-semibold text-sm whitespace-nowrap">{participant.playerName}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MarqueeSkeleton() {
    return (
        <div className="relative w-full overflow-hidden bg-card border-y border-border py-3">
             <div className="flex gap-10">
                {[...Array(10)].map((_, index) => (
                    <div key={index} className="flex items-center gap-3 shrink-0">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <Skeleton className="h-4 w-24" />
                    </div>
                ))}
            </div>
        </div>
    )
}
