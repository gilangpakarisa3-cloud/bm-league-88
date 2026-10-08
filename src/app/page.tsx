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
import type { Season, LeagueEntry, WithId, Player, Team, Match, SeasonRecord, CoOpLeagueEntry } from '@/lib/types';
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
  const isCoopType = activeSeason?.type === 'Co-Op' || activeSeason?.type === 'Co-Op Hybrid';
  const isHybrid = activeSeason?.type === 'Hybrid' || activeSeason?.type === 'Co-Op Hybrid';

  const leagueTableQuery = useMemoFirebase(
    () => {
      if (!firestore || !activeSeasonId) return null;
      const tableName = isCoopType ? 'coopLeagueTable' : 'leagueTable';
      
      if (isCoopType) {
          return query(collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/${tableName}`), orderBy('points', 'desc'));
      }
      return query(
          collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/${tableName}`),
          orderBy('points', 'desc'),
          orderBy('goalDifference', 'desc'),
          orderBy('goalsFor', 'desc')
      );
    },
    [firestore, activeSeasonId, isCoopType]
  );

  const { data: allLeaguePlayers, isLoading: isLoadingTable } = useCollection<any>(leagueTableQuery);
  
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
    if (isCoopType) {
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
            .sort((a,b) => b.points - a.points || (b.goalDifference || 0) - (a.goalDifference || 0) || (b.goalsFor || 0) - (a.goalsFor || 0));
        const groupB = enrichedTable
            .filter(p => p.group === 'B')
            .sort((a,b) => b.points - a.points || (b.goalDifference || 0) - (a.goalDifference || 0) || (b.goalsFor || 0) - (a.goalsFor || 0));
        
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
  }, [allLeaguePlayers, teamsById, playersById, isCoopType, isHybrid, activeSeason]);

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

  const formatKey = activeSeason?.type?.toLowerCase().replace(' ', '_') || 'single';

  return (
     <section className="space-y-8 w-full">
        {activeSeason && (
            <div className="flex flex-col items-center gap-3 mb-2 px-4">
                <Badge variant="outline" className="text-primary border-primary bg-primary/10 px-4 sm:px-6 py-1 font-black uppercase tracking-widest italic text-[9px] sm:text-[10px]">
                    <Activity className="w-3 h-3 mr-2 inline" />
                    Format: {activeSeason.type || 'Single'}
                </Badge>
                <h2 className="text-xl sm:text-3xl font-black text-center tracking-tighter uppercase italic pr-2 sm:pr-4">{activeSeason.name}</h2>
                <div className="h-1 w-16 sm:w-24 bg-primary rounded-full shadow-[0_0_15px_rgba(204,253,1,0.6)]" />
            </div>
        )}

        {hasPlayoffs ? (
            <div className="w-full overflow-hidden rounded-[2.5rem] border border-primary/30 bg-black/70 shadow-[0_20px_70px_rgba(0,0,0,0.8)] backdrop-blur-2xl p-4 sm:p-8">
                <div className="flex flex-col items-center gap-2 mb-6 sm:mb-10">
                    <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/30 px-4 py-1 rounded-full">
                        <Swords className="w-4 h-4 text-primary animate-pulse"/>
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary italic">Playoff Bracket Stage</span>
                    </div>
                    <h2 className="text-xl sm:text-3xl font-black text-white uppercase italic tracking-tighter">
                        Bagan Babak Playoff
                    </h2>
                    <p className="text-[8px] sm:text-[10px] font-bold text-white/40 uppercase tracking-[0.3em]">Tournament HUD System v2.0</p>
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-10 px-2 sm:px-0 max-w-[92rem] mx-auto items-start">
                {leaderboardData ? (
                    isHybrid ? (
                        <>
                            {/* Group A Column */}
                            <div className="flex flex-col group/card relative">
                                <div className="absolute -inset-2 bg-primary/5 rounded-[2.5rem] blur-2xl opacity-0 group-hover/card:opacity-100 transition-opacity duration-700 pointer-events-none" />
                                
                                <Card className="relative flex flex-col overflow-hidden bg-black/70 backdrop-blur-3xl border border-white/10 rounded-[2rem] shadow-[0_20px_60px_rgba(0,0,0,0.8)] group-hover/card:border-primary/40 transition-all duration-500 z-10">
                                    {/* Aerodynamic Pod Header */}
                                    <div className="py-3 px-4 sm:py-4 sm:px-8 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border-b border-white/10 flex items-center justify-between">
                                        <div className="flex items-center gap-2.5 sm:gap-3">
                                            <div className="bg-primary p-1.5 sm:p-2 rounded-lg sm:rounded-xl text-black shadow-[0_0_15px_rgba(204,253,1,0.5)]">
                                                <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                            </div>
                                            <div>
                                                <h2 className="text-sm sm:text-lg font-black uppercase italic tracking-wide text-white leading-none">4 Besar Grup A</h2>
                                                <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-primary/70">Top Seed Protocol</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-white/5 border border-white/10">
                                            <Scan className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-primary" />
                                            <span className="text-[7.5px] sm:text-[8px] font-black text-white/60 uppercase tracking-wider">INTEL_NODE</span>
                                        </div>
                                    </div>

                                    <div className="relative z-10">
                                        {leaderboardData.groupA && leaderboardData.groupA.length > 0 ? (
                                            <LeaderboardTable players={leaderboardData.groupA} defendingChampionId={defendingChampionId} />
                                        ) : (
                                            <div className="p-10 sm:p-16 text-center text-white/20 font-black uppercase tracking-widest text-xs italic flex flex-col items-center gap-3 sm:gap-4">
                                                <Zap className="w-8 h-8 sm:w-10 sm:h-10 opacity-30" />
                                                MENANTI SINYAL KICK-OFF
                                            </div>
                                        )}
                                    </div>
                                </Card>
                            </div>

                            {/* Group B Column */}
                            <div className="flex flex-col group/card relative">
                                <div className="absolute -inset-2 bg-primary/5 rounded-[2.5rem] blur-2xl opacity-0 group-hover/card:opacity-100 transition-opacity duration-700 pointer-events-none" />
                                
                                <Card className="relative flex flex-col overflow-hidden bg-black/70 backdrop-blur-3xl border border-white/10 rounded-[1.5rem] sm:rounded-[2rem] shadow-[0_20px_60px_rgba(0,0,0,0.8)] group-hover/card:border-primary/40 transition-all duration-500 z-10">
                                    {/* Aerodynamic Pod Header */}
                                    <div className="py-3 px-4 sm:py-4 sm:px-8 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border-b border-white/10 flex items-center justify-between">
                                        <div className="flex items-center gap-2.5 sm:gap-3">
                                            <div className="bg-primary p-1.5 sm:p-2 rounded-lg sm:rounded-xl text-black shadow-[0_0_15px_rgba(204,253,1,0.5)]">
                                                <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                            </div>
                                            <div>
                                                <h2 className="text-sm sm:text-lg font-black uppercase italic tracking-wide text-white leading-none">4 Besar Grup B</h2>
                                                <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-primary/70">Top Seed Protocol</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-white/5 border border-white/10">
                                            <Scan className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-primary" />
                                            <span className="text-[7.5px] sm:text-[8px] font-black text-white/60 uppercase tracking-wider">INTEL_NODE</span>
                                        </div>
                                    </div>

                                    <div className="relative z-10">
                                        {leaderboardData.groupB && leaderboardData.groupB.length > 0 ? (
                                            <LeaderboardTable players={leaderboardData.groupB} defendingChampionId={defendingChampionId} />
                                        ) : (
                                            <div className="p-10 sm:p-16 text-center text-white/20 font-black uppercase tracking-widest text-xs italic flex flex-col items-center gap-3 sm:gap-4">
                                                <Zap className="w-8 h-8 sm:w-10 sm:h-10 opacity-30" />
                                                MENANTI SINYAL KICK-OFF
                                            </div>
                                        )}
                                    </div>
                                </Card>
                            </div>
                        </>
                    ) : (
                        <div className="lg:col-span-2 flex flex-col max-w-4xl mx-auto w-full group/card relative">
                            <div className="absolute -inset-3 bg-primary/5 rounded-[3rem] blur-2xl opacity-0 group-hover/card:opacity-100 transition-opacity duration-700 pointer-events-none" />

                            <Card className="relative flex flex-col overflow-hidden bg-black/70 backdrop-blur-3xl border border-white/10 rounded-[1.5rem] sm:rounded-[2.5rem] shadow-[0_25px_70px_rgba(0,0,0,0.8)] group-hover/card:border-primary/40 transition-all duration-500 z-10">
                                {/* Aerodynamic Pod Header */}
                                <div className="py-3.5 px-4 sm:py-5 sm:px-10 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border-b border-white/10 flex items-center justify-between">
                                    <div className="flex items-center gap-3 sm:gap-4">
                                        <div className="bg-primary p-2 sm:p-2.5 rounded-xl sm:rounded-2xl text-black shadow-[0_0_20px_rgba(204,253,1,0.5)]">
                                            <Award className="w-4 h-4 sm:w-6 sm:h-6" />
                                        </div>
                                        <div>
                                            <h2 className="text-base sm:text-2xl font-black uppercase italic tracking-wide text-white leading-none">{t('home_top_players')}</h2>
                                            <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.25em] text-primary/70">Top Roster Standings</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-full bg-white/5 border border-white/10">
                                        <Binary className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                                        <span className="text-[7.5px] sm:text-[9px] font-black text-white/70 uppercase tracking-widest hidden xs:block">MASTER_MANIFEST</span>
                                    </div>
                                </div>

                                <div className="relative z-10">
                                    {leaderboardData.top && leaderboardData.top.length > 0 ? (
                                        <LeaderboardTable players={leaderboardData.top} defendingChampionId={defendingChampionId} />
                                    ) : (
                                        <div className="p-20 text-center text-white/20 font-black uppercase tracking-widest text-sm italic flex flex-col items-center gap-6">
                                            <Activity className="w-12 h-12 opacity-30 animate-pulse" />
                                            {t('no_players_yet')}
                                        </div>
                                    )}
                                </div>
                            </Card>
                        </div>
                    )
                ) : (
                    <div className="lg:col-span-2 p-16 text-center text-white/20 font-black uppercase tracking-[0.3em] h-full flex flex-col items-center justify-center gap-4">
                        <Zap className="w-12 h-12 opacity-30 animate-pulse" />
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
          <TableRow className="hover:bg-transparent border-b border-white/10 h-10 sm:h-12 bg-white/[0.02]">
          <TableHead className="w-1 p-0"></TableHead>
          <TableHead className="w-[32px] sm:w-[60px] pl-2 sm:pl-6 font-black text-white/30 uppercase text-[8px] sm:text-[9px] tracking-widest">#</TableHead>
          <TableHead className="font-black text-white/30 uppercase text-[8px] sm:text-[9px] tracking-widest">{t('player')}</TableHead>
          <TableHead className="text-right pr-2 sm:pr-8 font-black text-white/30 uppercase text-[8px] sm:text-[9px] tracking-widest">{t('pts')}</TableHead>
          </TableRow>
      </TableHeader>
      <TableBody>
          {players.map((entry) => {
            const isFirst = entry.rank === 1 && !isBottom;
            const pId = entry.playerId || entry.id;
            const isDefendingChampion = pId === defendingChampionId;
            return (
              <TableRow key={entry.id} className={cn(
                  "border-b border-white/5 transition-all duration-300 group/row h-13 sm:h-16",
                  isFirst ? "bg-primary/[0.04] hover:bg-primary/[0.08]" : "hover:bg-white/[0.03]"
                )}>
                  <TableCell className={cn("p-0 w-1 transition-all duration-500", 
                    isFirst ? 'bg-primary shadow-[0_0_15px_rgba(204,253,1,0.6)]' :
                    isBottom ? 'bg-red-500' : 'bg-transparent'
                  )}></TableCell>
                  <TableCell className={cn("font-black text-sm sm:text-lg pl-2 sm:pl-6 italic", 
                    isFirst ? "text-primary scale-105 drop-shadow-[0_0_10px_rgba(204,253,1,0.4)]" : "text-white/40 group-hover/row:text-white/70"
                  )}>{entry.rank}</TableCell>
                  <TableCell className="py-2">
                  <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                      <div className="relative shrink-0">
                        <Avatar className={cn("h-8 w-8 sm:h-11 sm:w-11 border-2 transition-all duration-300 rounded-xl sm:rounded-2xl", isFirst ? "border-primary shadow-[0_0_15px_rgba(204,253,1,0.3)]" : "border-white/10 group-hover/row:border-primary/50")}>
                            <AvatarImage key={entry.logoUrl} src={entry.logoUrl || undefined} alt={entry.playerName} className="object-cover" referrerPolicy="no-referrer" />
                            <AvatarFallback className="bg-black/60 font-black text-[10px] sm:text-xs rounded-xl sm:rounded-2xl"><User className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-white/30" /></AvatarFallback>
                        </Avatar>
                        {isDefendingChampion && (
                            <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-amber-500 rounded-lg p-0.5 sm:p-1 border border-black shadow-lg">
                                <Award className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-black" />
                            </div>
                        )}
                      </div>
                      <div className="overflow-hidden min-w-0 flex-1">
                        <div className={cn("font-black truncate uppercase italic transition-colors leading-tight", isFirst ? "text-primary text-xs sm:text-base" : "text-xs sm:text-sm text-white group-hover/row:text-primary")}>{entry.playerName}</div>
                        <div className="text-[7px] sm:text-[10px] text-white/40 truncate font-black uppercase tracking-wider">{entry.team?.name || entry.teamName}</div>
                      </div>
                  </div>
                  </TableCell>
                  <TableCell className="text-right pr-2 sm:pr-8 font-black text-lg sm:text-2xl tabular-nums italic">
                    <span className={cn("px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-lg sm:rounded-xl text-xs sm:text-base", isFirst ? "text-black bg-primary font-black shadow-[0_0_15px_rgba(204,253,1,0.4)]" : "text-primary bg-primary/10 border border-primary/20")}>{entry.points}</span>
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
    <div className="mx-auto px-2 sm:px-4 py-6 sm:py-12 relative w-full">
      <div className="absolute top-0 right-0 -z-10 w-[300px] sm:w-[600px] h-[300px] sm:h-[600px] bg-primary/5 rounded-full blur-[100px] sm:blur-[150px] pointer-events-none" />
      <div className="absolute top-1/2 left-0 -z-10 w-[250px] sm:w-[500px] h-[250px] sm:h-[500px] bg-accent/5 rounded-full blur-[80px] sm:blur-[120px] pointer-events-none" />

      <div className="max-w-[92rem] mx-auto space-y-6 sm:space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <section className="text-center space-y-2 sm:space-y-6 relative px-2 sm:px-4">
          <div className="inline-flex items-center gap-1.5 sm:gap-2 bg-primary/10 border border-primary/20 px-2.5 sm:px-4 py-0.5 sm:py-1 rounded-full text-[7.5px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-primary italic mb-1">
            <Flame className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-primary"/> Official League Station
          </div>
          <h1 className="font-headline text-3xl sm:text-7xl md:text-8xl font-black tracking-tighter text-white uppercase italic drop-shadow-[0_0_30px_rgba(255,255,255,0.05)] leading-tight">
            BM <span className="text-primary drop-shadow-[0_0_20px_rgba(204,253,1,0.4)]">LEAGUE 88</span>
          </h1>
          <p className="mt-1 sm:mt-4 max-w-2xl mx-auto text-[10px] sm:text-base font-bold text-white/60 uppercase tracking-wider sm:tracking-widest leading-relaxed">
            {t('home_welcome')}
          </p>
        </section>

        <section className="max-w-4xl mx-auto w-full px-1 sm:px-2">
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
