
'use client';

import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trophy, Shield, ArrowRight, Info, User } from 'lucide-react';
import { EditableNotice } from '@/components/editable-notice';
import { useTranslation } from '@/hooks/use-translation';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { Season, LeagueEntry, WithId, Player, Team } from '@/lib/types';
import { useState, useMemo, useEffect } from 'react';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


const LEAGUE_ID = 'main-league';

function TopPlayersTable() {
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
        setActiveSeasonId(sortedSeasons[0].id);
      }
    }
  }, [seasons]);

  const leagueTableQuery = useMemoFirebase(
    () => {
      if (!firestore || !activeSeasonId) return null;
      const tableRef = collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/leagueTable`);
      return query(
        tableRef,
        orderBy('points', 'desc'),
        orderBy('goalDifference', 'desc'),
        orderBy('goalsFor', 'desc'),
        limit(5)
      );
    },
    [firestore, activeSeasonId]
  );

  const { data: topPlayers, isLoading: isLoadingTable } = useCollection<LeagueEntry>(leagueTableQuery);
  
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


  const sortedTable = useMemo(() => {
    if (!topPlayers) return [];
    
    return topPlayers.map((entry, index) => ({
      ...entry,
      rank: index + 1,
      team: teamsById[entry.teamId],
    }));
  }, [topPlayers, teamsById]);

  const isLoading = isLoadingSeasons || isLoadingTable || isLoadingTeams;
  
  if (isLoading) {
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
            {[...Array(5)].map((_, i) => (
                 <TableRow key={i}>
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

  return (
      <>
        {sortedTable.length > 0 ? (
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
                {sortedTable.map((entry) => (
                <TableRow key={entry.id}>
                    <TableCell className="font-bold text-lg pl-4">{entry.rank}</TableCell>
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
        ) : (
            <div className="p-8 text-center text-muted-foreground h-full flex items-center justify-center">
            {t('no_players_yet')}
            </div>
        )}
    </>
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

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          <div className="flex flex-col">
            <h2 className="text-3xl font-bold mb-4">{t('home_league_standings_title')}</h2>
            <Link href="/league" className="block group">
              <Card className="hover:border-primary transition-colors duration-300 flex flex-col">
                <CardHeader>
                  <div className="flex flex-row items-center justify-between">
                      <CardTitle className="text-2xl">{t('home_league_standings_title')}</CardTitle>
                      <Trophy className="w-8 h-8 text-primary" />
                  </div>
                </CardHeader>
                <CardContent className="flex-grow">
                  <CardDescription>{t('home_league_standings_desc')}</CardDescription>
                </CardContent>
                <CardContent>
                  <div className="flex items-center font-semibold text-primary">
                    {t('go_to_league')}
                    <ArrowRight className="ml-2 h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
          <div className="flex flex-col">
             <h2 className="text-3xl font-bold mb-4">{t('home_top_players')}</h2>
            <Card>
                <TopPlayersTable />
            </Card>
          </div>
        </section>

        <section className="mb-12">
            <EditableNotice />
        </section>
        
      </div>
    </div>
  );
}
