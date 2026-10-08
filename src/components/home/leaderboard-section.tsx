'use client';

import * as React from 'react';
import { useState, useMemo, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Award, Swords, Activity, Zap, Binary } from 'lucide-react';
import { useTranslation } from '@/hooks/use-translation';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { Season, WithId, Player, Team, Match, SeasonRecord } from '@/lib/types';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { TournamentBracket } from '@/components/tournament-bracket';
import { resolveLogo } from '@/lib/logo-utils';
import { LeaderboardTable, LeaderboardSkeleton } from './leaderboard-table';

const LEAGUE_ID = 'main-league';

interface LeaderboardSectionProps {
  onPlayoffStatusChange: (active: boolean) => void;
}

export function LeaderboardSection({ onPlayoffStatusChange }: LeaderboardSectionProps) {
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
    return matches?.some(m => m.round && m.round !== 'Group') || false;
  }, [matches]);

  useEffect(() => {
    onPlayoffStatusChange(hasPlayoffs);
  }, [hasPlayoffs, onPlayoffStatusChange]);

  const leaderboardData = useMemo(() => {
    if (!allLeaguePlayers) return null;

    const enrichedTable = allLeaguePlayers.map(entry => {
      let teamId = entry.teamId;
      let pName = entry.playerName;

      if (isCoopType) {
        teamId = entry.coopTeamId || entry.id;
        pName = entry.coopTeamName || entry.teamName;
      } else {
        const pId = entry.playerId || entry.id;
        const player = playersById[pId];
        if (!teamId && player) {
          teamId = player.teamId;
        }
      }

      const team = teamId ? teamsById[teamId] : undefined;
      const logoUrl = resolveLogo(team?.logoUrl, teamId, pName);

      return {
        ...entry,
        playerName: pName,
        team,
        logoUrl
      };
    });

    if (isHybrid) {
      const groupA = enrichedTable.filter(p => p.group === 'A');
      const groupB = enrichedTable.filter(p => p.group === 'B');
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
  }, [allLeaguePlayers, teamsById, playersById, isCoopType, isHybrid]);

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
    );
  }

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
                    <div className="py-3 px-4 sm:py-4 sm:px-8 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border-b border-white/10 flex items-center justify-between">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="bg-primary p-1.5 sm:p-2 rounded-xl text-black shadow-[0_0_15px_rgba(204,253,1,0.5)]">
                          <Award className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                        </div>
                        <div>
                          <h2 className="text-sm sm:text-xl font-black uppercase italic tracking-wide text-white leading-none">GRUP A // STANDINGS</h2>
                          <span className="text-[7.5px] sm:text-[9px] font-black uppercase tracking-[0.2em] text-primary/70">Top Qualifiers</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-white/5 border border-white/10">
                        <Binary className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary" />
                        <span className="text-[7px] sm:text-[8px] font-black text-white/70 uppercase tracking-widest hidden xs:block">GRP_A</span>
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
                  
                  <Card className="relative flex flex-col overflow-hidden bg-black/70 backdrop-blur-3xl border border-white/10 rounded-[2rem] shadow-[0_20px_60px_rgba(0,0,0,0.8)] group-hover/card:border-primary/40 transition-all duration-500 z-10">
                    <div className="py-3 px-4 sm:py-4 sm:px-8 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border-b border-white/10 flex items-center justify-between">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="bg-primary p-1.5 sm:p-2 rounded-xl text-black shadow-[0_0_15px_rgba(204,253,1,0.5)]">
                          <Award className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                        </div>
                        <div>
                          <h2 className="text-sm sm:text-xl font-black uppercase italic tracking-wide text-white leading-none">GRUP B // STANDINGS</h2>
                          <span className="text-[7.5px] sm:text-[9px] font-black uppercase tracking-[0.2em] text-primary/70">Top Qualifiers</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-white/5 border border-white/10">
                        <Binary className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary" />
                        <span className="text-[7px] sm:text-[8px] font-black text-white/70 uppercase tracking-widest hidden xs:block">GRP_B</span>
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
                        <Zap className="w-12 h-12 opacity-30" />
                        MENANTI SINYAL KICK-OFF
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            )
          ) : null}
        </div>
      )}
    </section>
  );
}
