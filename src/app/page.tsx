
'use client';

import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trophy, Shield, ArrowRight, Info, User, Skull } from 'lucide-react';
import { EditableNotice } from '@/components/editable-notice';
import { useTranslation } from '@/hooks/use-translation';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { Season, LeagueEntry, WithId, Player, Team } from '@/lib/types';
import { useState, useMemo, useEffect } from 'react';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';


const LEAGUE_ID = 'main-league';

function LeaderboardSection() {
  const firestore = useFirestore();
  const { t } = useTranslation();
  const [activeSeasonId, setActiveSeasonId] = useState<string | null>(null);

  const seasonsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, `leagues/${LEAGUE_ID}/seasons`) : null),
    [firestore]
  );
  const { data: seasons, isLoading: isLoadingSeasons } = useCollection<Season>(seasonsCollection);
  
  useEffect(() => {
    if (seasons && seasons.length > 0) {
      const inProgressOrCompleted = seasons.filter(s => s.status !== 'Not Started');
      if (inProgressOrCompleted.length > 0) {
        const sortedSeasons = [...inProgressOrCompleted].sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
        setActiveSeasonId(sortedSeasons[0].id);
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

  const { data: allLeaguePlayers, isLoading: isLoadingTable } = useCollection<LeagueEntry>(leagueTableQuery);
  
  const playersCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'players') : null),
    [firestore]
  );
  const { data: allPlayers, isLoading: isLoadingPlayers } = useCollection<Player>(playersCollection);
  
  const teamsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'teams') : null),
    [firestore]
  );
  const { data: allTeams, isLoading: isLoadingTeams } = useCollection<Team>(teamsCollection);

  const playersById = useMemo(() => {
    if (!allPlayers) return {};
    return allPlayers.reduce((acc, player) => {
      acc[player.id] = player;
      return acc;
    }, {} as Record<string, WithId<Player>>);
  }, [allPlayers]);

  const teamsById = useMemo(() => {
    if (!allTeams) return {};
    return allTeams.reduce((acc, t) => {
        acc[t.id] = t;
        return acc;
    }, {} as Record<string, WithId<Team>>);
  }, [allTeams]);
  
  const { topPlayers, bottomPlayers } = useMemo(() => {
    if (!allLeaguePlayers) return { topPlayers: [], bottomPlayers: [] };

    const enrichedTable = allLeaguePlayers.map(entry => ({
      ...entry,
      player: playersById[entry.playerId],
      team: teamsById[entry.teamId],
      photoUrl: playersById[entry.playerId]?.photoUrl,
    }));
    
    const sorted = [...enrichedTable].sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
        if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
        return a.playerName.localeCompare(b.playerName);
    }).map((entry, index) => ({...entry, rank: index + 1}));
    
    const top = sorted.slice(0, 3);
    
    let bottom = [];
    if(sorted.length > 3) {
      bottom = sorted.slice(-3);
    }
    
    return { topPlayers: top, bottomPlayers: bottom };
  }, [allLeaguePlayers, playersById, teamsById]);

  const isLoading = isLoadingSeasons || isLoadingTable || isLoadingTeams || isLoadingPlayers;

  return (
     <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="flex flex-col">
            <h2 className="text-xl font-bold mb-4 text-primary flex items-center justify-center gap-2">
            <Trophy className="w-5 h-5"/>{t('home_top_players')}
            </h2>
            <Card className="border-2 border-primary shadow-lg shadow-primary/20">
            {isLoading ? (
                <LeaderboardSkeleton />
            ) : topPlayers.length > 0 ? (
                <LeaderboardTable players={topPlayers} />
            ) : (
                <div className="p-8 text-center text-muted-foreground h-full flex items-center justify-center">
                {t('no_players_yet')}
                </div>
            )}
            </Card>
        </div>

        <div className="flex flex-col">
          <h2 className="text-xl font-bold mb-4 text-destructive flex items-center justify-center gap-2"><Skull className="w-5 h-5"/>Pemain terancam piket Loker 1 Bulan</h2>
          <Card className="border-2 border-destructive/50 shadow-lg shadow-destructive/10">
              {isLoading ? (
                  <LeaderboardSkeleton isBottom />
              ) : bottomPlayers.length > 0 ? (
                  <LeaderboardTable players={bottomPlayers} isBottom />
              ) : (
                <div className="p-8 text-center text-muted-foreground h-full flex items-center justify-center">
                    {t('no_players_yet')}
                </div>
              )}
          </Card>
      </div>
    </section>
  )
}

const LeaderboardTable = ({ players, isBottom = false }: { players: (WithId<LeagueEntry> & { rank: number, photoUrl?: string, team?: WithId<Team> })[], isBottom?: boolean }) => {
  const { t } = useTranslation();
  return (
     <Table>
      <TableHeader>
          <TableRow>
          <TableHead className="w-[50px] pl-4">#</TableHead>
          <TableHead>{t('player')}</TableHead>
          <TableHead className="text-right">{t('pts')}</TableHead>
          <TableHead className="hidden sm:table-cell text-right pr-4">{t('gd')}</TableHead>
          </TableRow>
      </TableHeader>
      <TableBody>
          {players.map((entry) => (
          <TableRow key={entry.id} className={cn(
              !isBottom && entry.rank === 1 && "bg-yellow-400/10 hover:bg-yellow-400/20",
              isBottom && "bg-destructive/10 hover:bg-destructive/20"
            )}>
              <TableCell className={cn("font-bold text-lg pl-4", 
                !isBottom && entry.rank === 1 ? "text-yellow-400" : (isBottom ? "text-destructive" : "text-foreground")
              )}>{entry.rank}</TableCell>
              <TableCell>
              <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                      <AvatarImage src={entry.photoUrl} alt={entry.playerName} />
                      <AvatarFallback><User className="w-4 h-4" /></AvatarFallback>
                  </Avatar>
                  <div>
                  <div className="font-medium">{entry.playerName}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">{entry.team?.name}</div>
                  </div>
              </div>
              </TableCell>
              <TableCell className="text-right font-semibold">{entry.points}</TableCell>
              <TableCell className="hidden sm:table-cell text-right pr-4">{entry.goalDifference > 0 ? `+${entry.goalDifference}` : entry.goalDifference}</TableCell>
          </TableRow>
          ))}
      </TableBody>
      </Table>
  )
}

const LeaderboardSkeleton = ({ isBottom = false }) => {
  const { t } = useTranslation();
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[50px] pl-4">#</TableHead>
          <TableHead>{t('player')}</TableHead>
          <TableHead className="text-right">{t('pts')}</TableHead>
          <TableHead className="hidden sm:table-cell text-right pr-4">{t('gd')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {[...Array(3)].map((_, i) => (
             <TableRow key={i} className={cn(isBottom && "bg-destructive/10")}>
                <TableCell><Skeleton className="h-5 w-5"/></TableCell>
                <TableCell>
                    <div className="flex items-center gap-3">
                         <Skeleton className="h-8 w-8 rounded-full" />
                        <div className="space-y-1">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-3 w-20" />
                        </div>
                    </div>
                </TableCell>
                <TableCell><Skeleton className="h-5 w-6 ml-auto" /></TableCell>
                <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-6 ml-auto" /></TableCell>
             </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export default function Home() {
  const { t } = useTranslation();
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <section className="text-center mb-12">
          <h1 className="font-headline text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-primary">
            BM League EightyEight
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-foreground">
            {t('home_welcome')}
          </p>
        </section>

        <section className="mb-12">
            <EditableNotice />
        </section>

        <LeaderboardSection />

      </div>
    </div>
  );
}

    