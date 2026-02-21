'use client';

import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trophy, Shield, ArrowRight, Info, User, LayoutGrid, Swords, Award } from 'lucide-react';
import { EditableNotice } from '@/components/editable-notice';
import { useTranslation } from '@/hooks/use-translation';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { Season, LeagueEntry, WithId, Player, Team, Match, SeasonRecord } from '@/lib/types';
import { useState, useMemo, useEffect } from 'react';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { PlayerMarquee } from '@/components/player-marquee';
import { LiveClock } from '@/components/live-clock';
import { Badge } from '@/components/ui/badge';
import { TournamentBracket } from '@/components/tournament-bracket';


const LEAGUE_ID = 'main-league';

function LeaderboardSection({ onPlayoffStatusChange }: { onPlayoffStatusChange: (active: boolean) => void }) {
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
  const isHybrid = activeSeason?.type === 'Hybrid';

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
  
  const matchesQuery = useMemoFirebase(
    () => (firestore && activeSeasonId ? collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/matches`) : null),
    [firestore, activeSeasonId]
  );
  const { data: matches, isLoading: isLoadingMatches } = useCollection<Match>(matchesQuery);

  const playersQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'players') : null),
    [firestore]
  );
  const { data: allPlayers } = useCollection<Player>(playersQuery);

  const teamsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'teams') : null),
    [firestore]
  );
  const { data: allTeams, isLoading: isLoadingTeams } = useCollection<Team>(teamsCollection);

  const hallOfFameCollection = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'hallOfFame'), orderBy('completedAt', 'desc'), limit(1)) : null),
    [firestore]
  );
  const { data: latestHallOfFame } = useCollection<SeasonRecord>(hallOfFameCollection);
  const defendingChampionId = latestHallOfFame?.[0]?.winnerPlayerId;

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
  
  const hasPlayoffs = useMemo(() => {
    const active = matches?.some(m => m.round && m.round !== 'Group') || false;
    return active;
  }, [matches]);

  useEffect(() => {
    onPlayoffStatusChange(hasPlayoffs);
  }, [hasPlayoffs, onPlayoffStatusChange]);

  const leaderboardData = useMemo(() => {
    if (!allLeaguePlayers || !activeSeason) return null;

    let enrichedTable: any[];
    if (isCoop) {
        enrichedTable = allLeaguePlayers.map(entry => {
            const coopEntry = entry as any;
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
    
    if (isHybrid) {
        const groupA = enrichedTable
            .filter(p => p.group === 'A')
            .sort((a,b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor);
        const groupB = enrichedTable
            .filter(p => p.group === 'B')
            .sort((a,b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor);
        
        return {
            groupA: groupA.slice(0, 4).map((p, i) => ({ ...p, rank: i + 1 })),
            groupB: groupB.slice(0, 4).map((p, i) => ({ ...p, rank: i + 1 })),
            isHybrid: true
        };
    }

    const sorted = enrichedTable.map((entry, index) => ({...entry, rank: index + 1}));
    return {
        top: sorted.slice(0, 10),
        isHybrid: false
    };
  }, [allLeaguePlayers, teamsById, isCoop, isHybrid, activeSeason]);

  const isLoading = isLoadingSeasons || isLoadingTable || isLoadingTeams || isLoadingMatches;

  if (isLoading) {
      return (
          <section className="space-y-8">
              <div className="flex flex-col items-center gap-2 mb-2">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-8 w-64" />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <Card className="border-2 border-primary overflow-hidden bg-card">
                      <LeaderboardSkeleton />
                  </Card>
                  <Card className="border-2 border-primary overflow-hidden bg-card">
                      <LeaderboardSkeleton />
                  </Card>
              </div>
          </section>
      )
  }

  return (
     <section className="space-y-8">
        {activeSeason && (
            <div className="flex flex-col items-center gap-2 mb-2">
                <Badge variant="outline" className="text-primary border-primary bg-primary/5 px-4 py-1">
                    {t(`home_format_${activeSeason.type?.toLowerCase() || 'single'}`)}
                </Badge>
                <h2 className="text-2xl font-bold text-center tracking-tight">{activeSeason.name}</h2>
            </div>
        )}

        {hasPlayoffs ? (
            <div className="w-full overflow-hidden rounded-lg border-2 border-primary bg-card shadow-lg shadow-primary/20 p-4">
                <h2 className="text-xl font-bold mb-6 text-primary flex items-center justify-center gap-2">
                    <Swords className="w-5 h-5"/> Bagan Babak Playoff
                </h2>
                <TournamentBracket 
                    matches={matches || []}
                    playersById={playersById}
                    teamsById={teamsById}
                    leagueTable={allLeaguePlayers || []}
                    season={activeSeason || null}
                    defendingChampionId={defendingChampionId}
                />
            </div>
        ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {leaderboardData ? (
                    isHybrid ? (
                        <>
                            <div className="flex flex-col">
                                <h2 className="text-xl font-bold mb-4 text-primary flex items-center justify-center gap-2">
                                    <Trophy className="w-5 h-5"/>4 Besar Grup A
                                </h2>
                                <Card className="border-2 border-primary shadow-lg shadow-primary/20 overflow-hidden bg-card">
                                    {leaderboardData.groupA && leaderboardData.groupA.length > 0 ? (
                                        <LeaderboardTable players={leaderboardData.groupA} defendingChampionId={defendingChampionId} />
                                    ) : (
                                        <div className="p-8 text-center text-muted-foreground">Belum ada data grup A</div>
                                    )}
                                </Card>
                            </div>
                            <div className="flex flex-col">
                                <h2 className="text-xl font-bold mb-4 text-primary flex items-center justify-center gap-2">
                                    <Trophy className="w-5 h-5"/>4 Besar Grup B
                                </h2>
                                <Card className="border-2 border-primary shadow-lg shadow-primary/20 overflow-hidden bg-card">
                                    {leaderboardData.groupB && leaderboardData.groupB.length > 0 ? (
                                        <LeaderboardTable players={leaderboardData.groupB} defendingChampionId={defendingChampionId} />
                                    ) : (
                                        <div className="p-8 text-center text-muted-foreground">Belum ada data grup B</div>
                                    )}
                                </Card>
                            </div>
                        </>
                    ) : (
                        <div className="lg:col-span-2 flex flex-col max-w-3xl mx-auto w-full">
                            <h2 className="text-xl font-bold mb-4 text-primary flex items-center justify-center gap-2">
                                <Trophy className="w-5 h-5"/>{t('home_top_players')}
                            </h2>
                            <Card className="border-2 border-primary shadow-lg shadow-primary/20 overflow-hidden bg-card">
                                {leaderboardData.top && leaderboardData.top.length > 0 ? (
                                    <LeaderboardTable players={leaderboardData.top} defendingChampionId={defendingChampionId} />
                                ) : (
                                    <div className="p-8 text-center text-muted-foreground">Belum ada pemain di liga.</div>
                                )}
                            </Card>
                        </div>
                    )
                ) : (
                    <div className="lg:col-span-2 p-8 text-center text-muted-foreground h-full flex items-center justify-center">
                        {t('no_players_yet')}
                    </div>
                )}
            </div>
        )}
    </section>
  )
}

const LeaderboardTable = ({ players, isBottom = false, defendingChampionId }: { players: any[], isBottom?: boolean, defendingChampionId?: string }) => {
  const { t } = useTranslation();
  return (
     <Table>
      <TableHeader>
          <TableRow className="hover:bg-transparent border-b-muted/20">
          <TableHead className="w-1 p-0"></TableHead>
          <TableHead className="w-[50px] pl-4">#</TableHead>
          <TableHead>{t('player')}</TableHead>
          <TableHead className="text-right">{t('pts')}</TableHead>
          </TableRow>
      </TableHeader>
      <TableBody>
          {players.map((entry) => {
            const isFirst = entry.rank === 1 && !isBottom;
            const isDefendingChampion = entry.playerId === defendingChampionId;
            return (
              <TableRow key={entry.id} className={cn(
                  "border-b-muted/10",
                  isFirst && "bg-yellow-400/5 hover:bg-yellow-400/10",
                  isBottom && "bg-destructive/5 hover:bg-destructive/10"
                )}>
                  <TableCell className={cn("p-0 w-1", 
                    isFirst ? 'bg-yellow-400' :
                    isBottom ? 'bg-destructive' : 'bg-transparent'
                  )}></TableCell>
                  <TableCell className={cn("font-bold text-lg pl-4", 
                    isFirst ? "text-yellow-400 text-xl" : (isBottom ? "text-destructive text-sm" : "text-foreground")
                  )}>{entry.rank}</TableCell>
                  <TableCell>
                  <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="h-8 w-8 border">
                            <AvatarImage src={entry.team?.logoUrl} alt={entry.playerName} />
                            <AvatarFallback><User className="w-4 h-4" /></AvatarFallback>
                        </Avatar>
                        {isDefendingChampion && (
                            <div className="absolute -top-1 -right-1 bg-amber-500 rounded-full p-0.5 border border-background shadow-sm">
                                <Award className="w-2 h-2 text-white" />
                            </div>
                        )}
                      </div>
                      <div className="overflow-hidden">
                        <div className="font-bold truncate text-sm sm:text-base pr-2">{entry.playerName}</div>
                        <div className="text-[10px] sm:text-xs text-muted-foreground truncate font-semibold uppercase">{entry.team?.name || entry.teamName}</div>
                      </div>
                  </div>
                  </TableCell>
                  <TableCell className="text-right font-bold text-primary">{entry.points}</TableCell>
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
        {[...Array(4)].map((_, i) => (
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
  const [isWideMode, setIsWideMode] = useState(false);
  
  return (
    <div className={cn(
        "mx-auto px-4 py-8 transition-all duration-1000 ease-in-out",
        isWideMode ? "max-w-[95vw]" : "container"
    )}>
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <section className="text-center mb-8">
          <h1 className="font-headline text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-primary">
            BM League EightyEight
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-foreground opacity-90">
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
            <h2 className="text-sm font-bold text-primary text-center uppercase tracking-widest flex items-center justify-center gap-2">
                <LayoutGrid className="w-4 h-4"/> Participants
            </h2>
            <PlayerMarquee />
        </section>

        <LeaderboardSection onPlayoffStatusChange={setIsWideMode} />

      </div>
    </div>
  );
}
