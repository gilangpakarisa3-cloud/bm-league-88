
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
import { PlayerMarquee } from '@/components/player-marquee';
import { LiveClock } from '@/components/live-clock';


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

  const activeSeason = useMemo(() => seasons?.find(s => s.id === activeSeasonId), [seasons, activeSeasonId]);
  const isCoop = activeSeason?.type === 'Co-Op';

  const leagueTableQuery = useMemoFirebase(
    () => {
      if (!firestore || !activeSeasonId) return null;
      const tableName = isCoop ? 'coopLeagueTable' : 'leagueTable';
      
      if (isCoop) {
          return query(collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/${tableName}`), orderBy('points', 'desc'));
      }
      return query(
          collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/${tableName}`),
          orderBy('points', 'desc'),
          orderBy('goalDifference', 'desc'),
          orderBy('goalsFor', 'desc')
      );
    },
    [firestore, activeSeasonId, isCoop]
  );

  const { data: allLeaguePlayers, isLoading: isLoadingTable } = useCollection<LeagueEntry>(leagueTableQuery);
  
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
  
  const { topPlayers, bottomPlayers } = useMemo(() => {
    if (!allLeaguePlayers) return { topPlayers: [], bottomPlayers: [] };

    let enrichedTable: any[];
    if (isCoop) {
        enrichedTable = allLeaguePlayers.map(entry => {
            const coopEntry = entry as any; // Cast to access CoOpLeagueEntry fields
            return {
                ...coopEntry,
                playerName: coopEntry.teamName,
                teamName: teamsById[coopEntry.player1TeamId]?.name,
                team: teamsById[coopEntry.player1TeamId]
            }
        });
    } else {
        enrichedTable = allLeaguePlayers.map(entry => ({
            ...entry,
            team: teamsById[entry.teamId],
        }));
    }
    
    // Add rank
    const sorted = enrichedTable.map((entry, index) => ({...entry, rank: index + 1}));
    
    const top = sorted.slice(0, 3);
    
    let bottom = [];
    if(sorted.length > 3) {
      bottom = sorted.slice(-3);
    }
    
    return { topPlayers: top, bottomPlayers: bottom };
  }, [allLeaguePlayers, teamsById, isCoop]);

  const isLoading = isLoadingSeasons || isLoadingTable || isLoadingTeams;

  return (
     <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="flex flex-col">
            <h2 className="text-xl font-bold mb-4 text-primary flex items-center justify-center gap-2">
            <Trophy className="w-5 h-5"/>{t('home_top_players')}
            </h2>
            <Card className="border-2 border-primary shadow-lg shadow-primary/20 overflow-hidden">
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
          <Card className="border-2 border-destructive/50 shadow-lg shadow-destructive/10 overflow-hidden">
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

const LeaderboardTable = ({ players, isBottom = false }: { players: (WithId<LeagueEntry> & { rank: number, team?: WithId<Team> })[], isBottom?: boolean }) => {
  const { t } = useTranslation();
  return (
     <Table>
      <TableHeader>
          <TableRow className="hover:bg-transparent">
          <TableHead className="w-1 p-0"></TableHead>
          <TableHead className="w-[50px] pl-4">#</TableHead>
          <TableHead>{t('player')}</TableHead>
          <TableHead className="text-right">{t('pts')}</TableHead>
          </TableRow>
      </TableHeader>
      <TableBody>
          {players.map((entry) => {
            const isFirst = entry.rank === 1 && !isBottom;
            return (
              <TableRow key={entry.id} className={cn(
                  isFirst && "bg-yellow-400/10 hover:bg-yellow-400/20",
                  isBottom && "bg-destructive/10 hover:bg-destructive/20"
                )}>
                  <TableCell className={cn("p-0 w-1", 
                    isFirst ? 'bg-yellow-400' :
                    isBottom ? 'bg-destructive' : 'bg-transparent'
                  )}></TableCell>
                  <TableCell className={cn("font-bold text-lg pl-4", 
                    isFirst ? "text-yellow-400 text-xl" : (isBottom ? "text-destructive" : "text-foreground")
                  )}>{entry.rank}</TableCell>
                  <TableCell>
                  <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                          <AvatarImage src={entry.team?.logoUrl} alt={entry.playerName} />
                          <AvatarFallback><User className="w-4 h-4" /></AvatarFallback>
                      </Avatar>
                      <div>
                      <div className="font-bold">{entry.playerName}</div>
                      <div className="text-xs sm:text-sm text-muted-foreground">{entry.team?.name}</div>
                      </div>
                  </div>
                  </TableCell>
                  <TableCell className="text-right font-semibold">{entry.points}</TableCell>
              </TableRow>
            )
          })}
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
          <TableHead className="w-1 p-0"></TableHead>
          <TableHead className="w-[50px] pl-4">#</TableHead>
          <TableHead>{t('player')}</TableHead>
          <TableHead className="text-right">{t('pts')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {[...Array(3)].map((_, i) => (
             <TableRow key={i} className={cn(isBottom && "bg-destructive/10")}>
                <TableCell className="w-1 p-0"></TableCell>
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
        <section className="text-center mb-8">
          <h1 className="font-headline text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-primary">
            BM League EightyEight
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-foreground">
            {t('home_welcome')}
          </p>
        </section>

        <section className="mb-12">
          <LiveClock />
        </section>

        <section className="mb-12">
            <EditableNotice />
        </section>
        
        <section className="mb-12 space-y-4">
            <h2 className="text-xl font-bold text-primary text-center">Participants</h2>
            <PlayerMarquee />
        </section>

        <LeaderboardSection />

      </div>
    </div>
  );
}
