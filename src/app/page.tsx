'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trophy, Shield, ArrowRight, Info, User, LayoutGrid, Swords, Award, Zap, Activity, Flame, Scan, Binary } from 'lucide-react';
import { EditableNotice } from '@/components/notice/editable-notice';
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
import { resolveLogo } from '@/lib/logo-utils';


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
            const teamId = coopEntry.player1TeamId;
            const team = teamsById[teamId];
            const logoUrl = resolveLogo(team?.logoUrl, teamId, coopEntry.teamName);
            
            return {
                ...coopEntry,
                playerName: coopEntry.teamName,
                teamName: team?.name || coopEntry.player1TeamName,
                team: team,
                logoUrl
            }
        });
    } else {
        enrichedTable = allLeaguePlayers.map(entry => {
            const pId = entry.playerId;
            const player = playersById[pId];
            const teamId = entry.teamId || player?.teamId || '';
            const team = teamsById[teamId];
            const logoUrl = resolveLogo(team?.logoUrl, teamId, entry.playerName);

            return {
                ...entry,
                team: team,
                logoUrl
            }
        });
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
  }, [allLeaguePlayers, teamsById, playersById, isCoop, isHybrid, activeSeason]);

  const isLoading = isLoadingSeasons || isLoadingTable || isLoadingTeams || isLoadingMatches;

  if (isLoading) {
      return (
          <section className="space-y-8 max-w-[92rem] mx-auto">
              <div className="flex flex-col items-center gap-2 mb-2">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-8 w-64" />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <Card className="border-2 border-primary/20 overflow-hidden bg-card/40 backdrop-blur-md">
                      <LeaderboardSkeleton />
                  </Card>
                  <Card className="border-2 border-primary/20 overflow-hidden bg-card/40 backdrop-blur-md">
                      <LeaderboardSkeleton />
                  </Card>
              </div>
          </section>
      )
  }

  return (
     <section className="space-y-8 w-full">
        {activeSeason && (
            <div className="flex flex-col items-center gap-3 mb-2 px-4">
                <Badge variant="outline" className="text-primary border-primary bg-primary/10 px-4 sm:px-6 py-1 font-black uppercase tracking-widest italic text-[9px] sm:text-[10px]">
                    <Activity className="w-3 h-3 mr-2 inline" />
                    {t(`home_format_${activeSeason.type?.toLowerCase() || 'single'}`)}
                </Badge>
                <h2 className="text-xl sm:text-3xl font-black text-center tracking-tighter uppercase italic pr-2 sm:pr-4">{activeSeason.name}</h2>
                <div className="h-1 w-16 sm:w-24 bg-primary rounded-full shadow-[0_0_15px_rgba(204,253,1,0.6)]" />
            </div>
        )}

        {hasPlayoffs ? (
            <div className="w-full overflow-hidden rounded-2xl sm:rounded-3xl border-2 sm:border-4 border-primary/30 bg-[#0A192F]/80 shadow-[0_0_50px_rgba(204,253,1,0.1)] backdrop-blur-xl p-4 sm:p-8">
                <div className="flex flex-col items-center gap-2 mb-6 sm:mb-10">
                    <h2 className="text-lg sm:text-2xl font-black text-primary flex items-center justify-center gap-2 sm:gap-3 uppercase italic tracking-tighter pr-2 sm:pr-4">
                        <Swords className="w-6 h-6 sm:w-8 h-8"/> Bagan Babak Playoff
                    </h2>
                    <p className="text-[8px] sm:text-[10px] font-bold text-white/40 uppercase tracking-[0.3em] sm:tracking-[0.4em]">Tournament HUD System v2.0</p>
                </div>
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 px-2 sm:px-0 max-w-[92rem] mx-auto items-start">
                {leaderboardData ? (
                    isHybrid ? (
                        <>
                            {/* Group A Column */}
                            <div className="flex flex-col group/card relative">
                                <div className="bg-primary px-6 py-3 flex items-center justify-between relative overflow-hidden -skew-x-[12deg] mb-[-4px] z-20 border-r-4 border-black/20 shadow-lg">
                                    <div className="absolute top-0 right-0 w-1/2 h-full bg-black/10 -skew-x-[25deg] translate-x-1/4 pointer-events-none" />
                                    <div className="flex items-center gap-3 relative z-10 skew-x-[12deg]">
                                        <div className="bg-black/20 p-1.5 rounded-lg border border-black/10 shadow-md">
                                            <Trophy className="w-4 h-4 text-black" />
                                        </div>
                                        <h2 className="text-sm sm:text-base font-black uppercase italic tracking-widest text-black leading-none pr-2">4 Besar Grup A</h2>
                                    </div>
                                    <div className="flex items-center gap-2 relative z-10 opacity-40 skew-x-[12deg]">
                                        <Scan className="w-3.5 h-3.5 text-black" />
                                        <span className="text-[8px] font-black text-black uppercase tracking-widest hidden xs:block">INTEL_NODE</span>
                                    </div>
                                </div>

                                <Card className="border-2 border-white/10 shadow-2xl overflow-hidden bg-black/60 backdrop-blur-3xl rounded-none group-hover/card:border-primary/30 transition-all duration-500 relative z-10">
                                    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />
                                    <div className="relative z-10">
                                        {leaderboardData.groupA && leaderboardData.groupA.length > 0 ? (
                                            <LeaderboardTable players={leaderboardData.groupA} defendingChampionId={defendingChampionId} />
                                        ) : (
                                            <div className="p-16 text-center text-white/10 font-black uppercase tracking-widest text-xs italic flex flex-col items-center gap-4">
                                                <Zap className="w-10 h-10 opacity-20" />
                                                MENANTI SINYAL KICK-OFF
                                            </div>
                                        )}
                                    </div>
                                </Card>
                            </div>

                            {/* Group B Column */}
                            <div className="flex flex-col group/card relative">
                                <div className="bg-primary px-6 py-3 flex items-center justify-between relative overflow-hidden -skew-x-[12deg] mb-[-4px] z-20 border-r-4 border-black/20 shadow-lg">
                                    <div className="absolute top-0 right-0 w-1/2 h-full bg-black/10 -skew-x-[25deg] translate-x-1/4 pointer-events-none" />
                                    <div className="flex items-center gap-3 relative z-10 skew-x-[12deg]">
                                        <div className="bg-black/20 p-1.5 rounded-lg border border-black/10 shadow-md">
                                            <Trophy className="w-4 h-4 text-black" />
                                        </div>
                                        <h2 className="text-sm sm:text-base font-black uppercase italic tracking-widest text-black leading-none pr-2">4 Besar Grup B</h2>
                                    </div>
                                    <div className="flex items-center gap-2 relative z-10 opacity-40 skew-x-[12deg]">
                                        <Scan className="w-3.5 h-3.5 text-black" />
                                        <span className="text-[8px] font-black text-black uppercase tracking-widest hidden xs:block">INTEL_NODE</span>
                                    </div>
                                </div>

                                <Card className="border-2 border-white/10 shadow-2xl overflow-hidden bg-black/60 backdrop-blur-3xl rounded-none group-hover/card:border-primary/30 transition-all duration-500 relative z-10">
                                    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />
                                    <div className="relative z-10">
                                        {leaderboardData.groupB && leaderboardData.groupB.length > 0 ? (
                                            <LeaderboardTable players={leaderboardData.groupB} defendingChampionId={defendingChampionId} />
                                        ) : (
                                            <div className="p-16 text-center text-white/10 font-black uppercase tracking-widest text-xs italic flex flex-col items-center gap-4">
                                                <Zap className="w-10 h-10 opacity-20" />
                                                MENANTI SINYAL KICK-OFF
                                            </div>
                                        )}
                                    </div>
                                </Card>
                            </div>
                        </>
                    ) : (
                        <div className="lg:col-span-2 flex flex-col max-w-3xl mx-auto w-full group/card relative">
                            <div className="bg-primary px-8 py-4 flex items-center justify-between relative overflow-hidden -skew-x-[12deg] mb-[-4px] z-20 border-r-4 border-black/20 shadow-xl">
                                <div className="absolute top-0 right-0 w-1/2 h-full bg-black/10 -skew-x-[25deg] translate-x-1/4 pointer-events-none" />
                                <div className="flex items-center gap-4 relative z-10 skew-x-[12deg]">
                                    <div className="bg-black/20 p-2 rounded-lg border border-black/10 shadow-lg">
                                        <Award className="w-6 h-6 text-black" />
                                    </div>
                                    <h2 className="text-xl sm:text-2xl font-black uppercase italic tracking-widest text-black leading-none pr-4">{t('home_top_players')}</h2>
                                </div>
                                <div className="flex items-center gap-3 relative z-10 opacity-40 skew-x-[12deg]">
                                    <Binary className="w-5 h-5 text-black" />
                                    <span className="text-[10px] font-black text-black uppercase tracking-[0.3em] hidden xs:block">MASTER_MANIFEST</span>
                                </div>
                            </div>

                            <Card className="border-4 border-white/10 shadow-2xl overflow-hidden bg-black/60 backdrop-blur-3xl rounded-none group-hover/card:border-primary/40 transition-all duration-500 relative z-10">
                                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:30px_30px] pointer-events-none" />
                                <div className="relative z-10">
                                    {leaderboardData.top && leaderboardData.top.length > 0 ? (
                                        <LeaderboardTable players={leaderboardData.top} defendingChampionId={defendingChampionId} />
                                    ) : (
                                        <div className="p-20 text-center text-white/10 font-black uppercase tracking-widest text-sm italic flex flex-col items-center gap-6">
                                            <Activity className="w-12 h-12 opacity-20 animate-pulse" />
                                            {t('no_players_yet')}
                                        </div>
                                    )}
                                </div>
                            </Card>
                        </div>
                    )
                ) : (
                    <div className="lg:col-span-2 p-16 text-center text-white/10 font-black uppercase tracking-[0.3em] h-full flex flex-col items-center justify-center gap-4">
                        <Zap className="w-12 h-12 opacity-20 animate-pulse" />
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
          <TableRow className="hover:bg-transparent border-b-white/5 h-10 sm:h-12 bg-white/[0.02]">
          <TableHead className="w-1 p-0"></TableHead>
          <TableHead className="w-[40px] sm:w-[60px] pl-4 sm:pl-6 font-black text-white/20 uppercase text-[8px] sm:text-[9px] tracking-widest">#</TableHead>
          <TableHead className="font-black text-white/20 uppercase text-[8px] sm:text-[9px] tracking-widest">{t('player')}</TableHead>
          <TableHead className="text-right pr-4 sm:pr-6 font-black text-white/20 uppercase text-[8px] sm:text-[9px] tracking-widest">{t('pts')}</TableHead>
          </TableRow>
      </TableHeader>
      <TableBody>
          {players.map((entry) => {
            const isFirst = entry.rank === 1 && !isBottom;
            const isDefendingChampion = entry.playerId === defendingChampionId;
            return (
              <TableRow key={entry.id} className={cn(
                  "border-b-white/5 transition-all duration-300 group/row h-14 sm:h-16",
                  isFirst ? "bg-yellow-400/[0.03] hover:bg-yellow-400/[0.08]" : "hover:bg-white/[0.03]"
                )}>
                  <TableCell className={cn("p-0 w-1 sm:w-1.5 transition-all duration-500", 
                    isFirst ? 'bg-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.5)]' :
                    isBottom ? 'bg-destructive' : 'bg-transparent'
                  )}></TableCell>
                  <TableCell className={cn("font-black text-lg sm:text-xl pl-4 sm:pl-6 italic", 
                    isFirst ? "text-yellow-400 scale-110 drop-shadow-[0_0_10px_rgba(250,204,21,0.4)]" : "text-white/20 group-hover/row:text-white/40"
                  )}>{entry.rank}</TableCell>
                  <TableCell className="py-2">
                  <div className="flex items-center gap-2 sm:gap-4">
                      <div className="relative shrink-0">
                        <Avatar className={cn("h-8 w-8 sm:h-10 sm:w-10 border-2 transition-all duration-500", isFirst ? "border-yellow-400 scale-105 shadow-xl" : "border-white/10 group-hover/row:border-primary")}>
                            <AvatarImage key={entry.logoUrl} src={entry.logoUrl || undefined} alt={entry.playerName} className="object-cover" referrerPolicy="no-referrer" />
                            <AvatarFallback className="bg-black/40 font-black text-xs"><User className="w-4 h-4 sm:w-5 sm:h-5 text-white/20" /></AvatarFallback>
                        </Avatar>
                        {isDefendingChampion && (
                            <div className="absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 bg-amber-500 rounded-lg p-0.5 sm:p-1 border-2 border-background shadow-lg rotate-12">
                                <Award className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-white" />
                            </div>
                        )}
                      </div>
                      <div className="overflow-hidden">
                        <div className={cn("font-black truncate uppercase italic pr-4 transition-colors", isFirst ? "text-yellow-400 text-sm sm:text-lg" : "text-xs sm:text-base text-white group-hover:text-primary")}>{entry.playerName}</div>
                        <div className="text-[7px] sm:text-[9px] text-white/40 truncate font-black uppercase tracking-widest">{entry.team?.name || entry.teamName}</div>
                      </div>
                  </div>
                  </TableCell>
                  <TableCell className="text-right pr-4 sm:pr-6 font-black text-xl sm:text-2xl tabular-nums italic">
                    <span className={isFirst ? "text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.3)]" : "text-primary"}>{entry.points}</span>
                  </TableCell>
              </TableRow>
            )
          })}
      </TableBody>
      </Table>
  )
}

const LeaderboardSkeleton = () => {
  return (
    <div className="p-6 space-y-4">
        {[...Array(4)].map((_, i) => (
             <div key={i} className="flex items-center gap-4 py-2 border-b border-white/5 last:border-0">
                <Skeleton className="h-8 w-8 rounded-lg"/>
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
  )
}

export default function Home() {
  const { t } = useTranslation();
  const [isWideMode, setIsWideMode] = useState(false);
  
  const handlePlayoffStatusChange = React.useCallback((active: boolean) => {
    setIsWideMode(active);
  }, []);

  return (
    <div className="mx-auto px-2 sm:px-4 py-8 sm:py-12 relative w-full">
      <div className="absolute top-0 right-0 -z-10 w-[300px] sm:w-[600px] h-[300px] sm:h-[600px] bg-primary/5 rounded-full blur-[100px] sm:blur-[150px] pointer-events-none" />
      <div className="absolute top-1/2 left-0 -z-10 w-[250px] sm:w-[500px] h-[250px] sm:h-[500px] bg-accent/5 rounded-full blur-[80px] sm:blur-[120px] pointer-events-none" />

      <div className="max-w-[92rem] mx-auto space-y-10 sm:space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <section className="text-center space-y-4 sm:space-y-6 relative px-4">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 px-3 sm:px-4 py-1 rounded-full text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-primary italic mb-1 sm:2">
            <Flame className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-primary"/> Official League Station
          </div>
          <h1 className="font-headline text-4xl sm:text-7xl md:text-8xl font-black tracking-tighter text-white uppercase italic pr-2 sm:pr-4 drop-shadow-[0_0_30px_rgba(255,255,255,0.05)]">
            BM <span className="text-primary drop-shadow-[0_0_20px_rgba(204,253,1,0.4)]">LEAGUE 88</span>
          </h1>
          <p className="mt-2 sm:mt-4 max-w-2xl mx-auto text-xs sm:text-base font-bold text-white/60 uppercase tracking-widest leading-relaxed">
            {t('home_welcome')}
          </p>
        </section>

        <section className="max-w-4xl mx-auto w-full px-2">
          <LiveClock />
        </section>

        <section className="max-w-5xl mx-auto w-full px-2 sm:px-0">
            <EditableNotice />
        </section>
        
        <section className="space-y-6 sm:space-y-8 relative overflow-hidden">
            <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-4">
                    <div className="h-px w-12 sm:w-20 bg-gradient-to-r from-transparent to-primary/40" />
                    <h2 className="text-[10px] sm:text-xs font-black text-primary uppercase tracking-[0.4em] sm:tracking-[0.6em] flex items-center justify-center gap-3 italic pr-4">
                        <Scan className="w-4 h-4 text-primary animate-pulse"/> ROSTER TRANSMISSION
                    </h2>
                    <div className="h-px w-12 sm:w-20 bg-gradient-to-l from-transparent to-primary/40" />
                </div>
                <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-primary/40 rounded-full" />
                    <div className="w-1.5 h-1.5 bg-primary/20 rounded-full" />
                    <div className="w-1.5 h-1.5 bg-primary/10 rounded-full" />
                </div>
            </div>
            <PlayerMarquee />
        </section>
      </div>

      <div className={cn(
          "mx-auto transition-all duration-1000 ease-in-out mt-16 px-2 sm:px-4",
          isWideMode ? "max-w-[98vw] sm:max-w-[95vw]" : "max-w-[92rem]"
      )}>
        <LeaderboardSection onPlayoffStatusChange={handlePlayoffStatusChange} />
      </div>
    </div>
  );
}
