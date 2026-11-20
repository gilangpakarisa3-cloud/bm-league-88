'use client';

import * as React from 'react';
import { useState, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Card } from '@/components/ui/card';
import { Award, Swords, Activity, Zap, Binary } from 'lucide-react';
import { useTranslation } from '@/hooks/use-translation';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { Season, WithId, Player, Team, Match, SeasonRecord } from '@/lib/types';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { resolveLogo } from '@/lib/logo-utils';
import { LeaderboardTable, LeaderboardSkeleton } from './leaderboard-table';
import { useGlobalSeasonTheme } from '@/context/season-theme-context';
import { sortAndRankStandings } from '@/lib/tournament/tie-breaker';

const TournamentBracket = dynamic(
  () => import('@/components/tournament-bracket').then((m) => m.TournamentBracket),
  { ssr: false }
);

const LEAGUE_ID = 'main-league';

interface LeaderboardSectionProps {
  onPlayoffStatusChange: (active: boolean) => void;
}

export function LeaderboardSection({ onPlayoffStatusChange }: LeaderboardSectionProps) {
  const firestore = useFirestore();
  const { t } = useTranslation();
  const { theme } = useGlobalSeasonTheme();
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
  const hasDivisions = Boolean(activeSeason?.hasDivisions && !activeSeason?.isDiv2Merged);
  const div1Name = activeSeason?.division1Name || 'Divisi 1';
  const div2Name = activeSeason?.division2Name || 'Divisi 2';
  const isNotStarted = activeSeason?.status === 'Not Started';

  const leagueTableQuery = useMemoFirebase(
    () => {
      if (!firestore || !activeSeasonId) return null;
      const tableName = isCoopType ? 'coopLeagueTable' : 'leagueTable';
      return collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/${tableName}`);
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

    const enrichedTable = allLeaguePlayers.map((entry: any) => {
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
      const groupA = enrichedTable.filter((p: any) => p.group === 'A');
      const groupB = enrichedTable.filter((p: any) => p.group === 'B');
      return {
        groupA: sortAndRankStandings(groupA, isNotStarted).slice(0, 4),
        groupB: sortAndRankStandings(groupB, isNotStarted).slice(0, 4),
        isHybrid: true,
        hasDivisions: false,
      };
    }

    if (hasDivisions) {
      const div1 = enrichedTable.filter((p: any) => p.division !== 'div-2');
      const div2 = enrichedTable.filter((p: any) => p.division === 'div-2');
      return {
        div1: sortAndRankStandings(div1, isNotStarted).slice(0, 8),
        div2: sortAndRankStandings(div2, isNotStarted).slice(0, 8),
        isHybrid: false,
        hasDivisions: true,
      };
    }

    const sorted = sortAndRankStandings(enrichedTable, isNotStarted);
    return {
      top: sorted.slice(0, 10),
      isHybrid: false,
      hasDivisions: false,
    };
  }, [allLeaguePlayers, teamsById, playersById, isCoopType, isHybrid, hasDivisions, isNotStarted]);

  const isLoading = isLoadingSeasons || isLoadingTable || isLoadingTeams || isLoadingMatches;

  if (isLoading) {
    return (
      <section className="space-y-8 max-w-[92rem] mx-auto">
        <div className="flex flex-col items-center gap-2 mb-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="border-2 border-white/10 overflow-hidden bg-card/40 backdrop-blur-md">
            <LeaderboardSkeleton />
          </Card>
          <Card className="border-2 border-white/10 overflow-hidden bg-card/40 backdrop-blur-md">
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
          <Badge 
            variant="outline" 
            className="px-4 sm:px-6 py-1 font-black uppercase tracking-widest text-[9px] sm:text-[10px]"
            style={{ 
              color: theme.primaryHex, 
              borderColor: `${theme.primaryHex}66`, 
              backgroundColor: `${theme.primaryHex}1a` 
            }}
          >
            <Activity className="w-3 h-3 mr-2 inline" />
            Format: {activeSeason.type || 'Single'}
          </Badge>
          <h2 className="font-headline text-xl sm:text-3xl font-black text-center tracking-normal uppercase pr-2 sm:pr-4">{activeSeason.name}</h2>
          <div 
            className="h-1 w-16 sm:w-24 rounded-full" 
            style={{ 
              backgroundColor: theme.primaryHex, 
              boxShadow: `0 0 15px ${theme.primaryHex}` 
            }}
          />
        </div>
      )}

      {hasPlayoffs ? (
        <div 
          className="w-full overflow-hidden rounded-[2.5rem] border bg-black/70 shadow-[0_20px_70px_rgba(0,0,0,0.8)] backdrop-blur-2xl p-4 sm:p-8"
          style={{ borderColor: `${theme.primaryHex}4d` }}
        >
          <div className="flex flex-col items-center gap-2 mb-6 sm:mb-10">
            <div 
              className="inline-flex items-center gap-2 px-4 py-1 rounded-full border"
              style={{ 
                backgroundColor: `${theme.primaryHex}1a`, 
                borderColor: `${theme.primaryHex}4d` 
              }}
            >
              <Swords className="w-4 h-4 animate-pulse" style={{ color: theme.primaryHex }} />
              <span className="text-[10px] font-black uppercase tracking-[0.3em]" style={{ color: theme.primaryHex }}>Playoff Bracket Stage</span>
            </div>
            <h2 className="font-headline text-xl sm:text-3xl font-black text-white uppercase tracking-normal">
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
                  <div 
                    className="absolute -inset-2 rounded-[2.5rem] blur-2xl opacity-0 group-hover/card:opacity-100 transition-opacity duration-700 pointer-events-none" 
                    style={{ backgroundColor: `${theme.primaryHex}0d` }}
                  />
                  
                  <Card className="relative flex flex-col overflow-hidden bg-black/70 backdrop-blur-3xl border border-white/10 rounded-[2rem] shadow-[0_20px_60px_rgba(0,0,0,0.8)] group-hover/card:border-white/30 transition-all duration-500 z-10">
                    <div 
                      className="py-3 px-4 sm:py-4 sm:px-8 border-b border-white/10 flex items-center justify-between"
                      style={{ background: `linear-gradient(90deg, ${theme.primaryHex}33, ${theme.primaryHex}1a, transparent)` }}
                    >
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div 
                          className="p-1.5 sm:p-2 rounded-xl text-black shadow-lg"
                          style={{ backgroundColor: theme.primaryHex, boxShadow: `0 0 15px ${theme.primaryHex}80` }}
                        >
                          <Award className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                        </div>
                        <div>
                          <h2 className="font-headline text-sm sm:text-xl font-black uppercase tracking-normal text-white leading-none">GRUP A // STANDINGS</h2>
                          <span className="text-[7.5px] sm:text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: theme.primaryHex }}>Top Qualifiers</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-white/5 border border-white/10">
                        <Binary className="w-3 h-3 sm:w-3.5 sm:h-3.5" style={{ color: theme.primaryHex }} />
                        <span className="text-[7px] sm:text-[8px] font-black text-white/70 uppercase tracking-widest hidden xs:block">GRP_A</span>
                      </div>
                    </div>

                    <div className="relative z-10">
                      {leaderboardData.groupA && leaderboardData.groupA.length > 0 ? (
                        <LeaderboardTable players={leaderboardData.groupA} defendingChampionId={defendingChampionId} />
                      ) : (
                        <div className="p-10 sm:p-16 text-center text-white/20 font-black uppercase tracking-widest text-xs flex flex-col items-center gap-3 sm:gap-4">
                          <Zap className="w-8 h-8 sm:w-10 sm:h-10 opacity-30" />
                          MENANTI SINYAL KICK-OFF
                        </div>
                      )}
                    </div>
                  </Card>
                </div>

                {/* Group B Column */}
                <div className="flex flex-col group/card relative">
                  <div 
                    className="absolute -inset-2 rounded-[2.5rem] blur-2xl opacity-0 group-hover/card:opacity-100 transition-opacity duration-700 pointer-events-none" 
                    style={{ backgroundColor: `${theme.primaryHex}0d` }}
                  />
                  
                  <Card className="relative flex flex-col overflow-hidden bg-black/70 backdrop-blur-3xl border border-white/10 rounded-[2rem] shadow-[0_20px_60px_rgba(0,0,0,0.8)] group-hover/card:border-white/30 transition-all duration-500 z-10">
                    <div 
                      className="py-3 px-4 sm:py-4 sm:px-8 border-b border-white/10 flex items-center justify-between"
                      style={{ background: `linear-gradient(90deg, ${theme.primaryHex}33, ${theme.primaryHex}1a, transparent)` }}
                    >
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div 
                          className="p-1.5 sm:p-2 rounded-xl text-black shadow-lg"
                          style={{ backgroundColor: theme.primaryHex, boxShadow: `0 0 15px ${theme.primaryHex}80` }}
                        >
                          <Award className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                        </div>
                        <div>
                          <h2 className="font-headline text-sm sm:text-xl font-black uppercase tracking-normal text-white leading-none">GRUP B // STANDINGS</h2>
                          <span className="text-[7.5px] sm:text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: theme.primaryHex }}>Top Qualifiers</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-white/5 border border-white/10">
                        <Binary className="w-3 h-3 sm:w-3.5 sm:h-3.5" style={{ color: theme.primaryHex }} />
                        <span className="text-[7px] sm:text-[8px] font-black text-white/70 uppercase tracking-widest hidden xs:block">GRP_B</span>
                      </div>
                    </div>

                    <div className="relative z-10">
                      {leaderboardData.groupB && leaderboardData.groupB.length > 0 ? (
                        <LeaderboardTable players={leaderboardData.groupB} defendingChampionId={defendingChampionId} />
                      ) : (
                        <div className="p-10 sm:p-16 text-center text-white/20 font-black uppercase tracking-widest text-xs flex flex-col items-center gap-3 sm:gap-4">
                          <Zap className="w-8 h-8 sm:w-10 sm:h-10 opacity-30" />
                          MENANTI SINYAL KICK-OFF
                        </div>
                      )}
                    </div>
                  </Card>
                </div>
              </>
            ) : leaderboardData.hasDivisions ? (
              <>
                {/* Division 1 Column */}
                <div className="flex flex-col group/card relative">
                  <div 
                    className="absolute -inset-2 rounded-[2.5rem] blur-2xl opacity-0 group-hover/card:opacity-100 transition-opacity duration-700 pointer-events-none" 
                    style={{ backgroundColor: `${theme.primaryHex}0d` }}
                  />
                  
                  <Card className="relative flex flex-col overflow-hidden bg-black/70 backdrop-blur-3xl border border-white/10 rounded-[2rem] shadow-[0_20px_60px_rgba(0,0,0,0.8)] group-hover/card:border-white/30 transition-all duration-500 z-10">
                    <div 
                      className="py-3 px-4 sm:py-4 sm:px-8 border-b border-white/10 flex items-center justify-between"
                      style={{ background: `linear-gradient(90deg, ${theme.primaryHex}33, ${theme.primaryHex}1a, transparent)` }}
                    >
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div 
                          className="p-1.5 sm:p-2 rounded-xl text-black shadow-lg"
                          style={{ backgroundColor: theme.primaryHex, boxShadow: `0 0 15px ${theme.primaryHex}80` }}
                        >
                          <Award className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                        </div>
                        <div>
                          <h2 className="font-headline text-sm sm:text-xl font-black uppercase tracking-normal text-white leading-none">
                            {div1Name} // STANDINGS
                          </h2>
                          <span className="text-[7.5px] sm:text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: theme.primaryHex }}>Top Qualifiers</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-white/5 border border-white/10">
                        <Binary className="w-3 h-3 sm:w-3.5 sm:h-3.5" style={{ color: theme.primaryHex }} />
                        <span className="text-[7px] sm:text-[8px] font-black text-white/70 uppercase tracking-widest hidden xs:block">DIV_1</span>
                      </div>
                    </div>

                    <div className="relative z-10">
                      {leaderboardData.div1 && leaderboardData.div1.length > 0 ? (
                        <LeaderboardTable players={leaderboardData.div1} defendingChampionId={defendingChampionId} />
                      ) : (
                        <div className="p-10 sm:p-16 text-center text-white/20 font-black uppercase tracking-widest text-xs flex flex-col items-center gap-3 sm:gap-4">
                          <Zap className="w-8 h-8 sm:w-10 sm:h-10 opacity-30" />
                          MENANTI SINYAL KICK-OFF
                        </div>
                      )}
                    </div>
                  </Card>
                </div>

                {/* Division 2 Column */}
                <div className="flex flex-col group/card relative">
                  <div 
                    className="absolute -inset-2 rounded-[2.5rem] blur-2xl opacity-0 group-hover/card:opacity-100 transition-opacity duration-700 pointer-events-none" 
                    style={{ backgroundColor: 'rgba(34,211,238,0.05)' }}
                  />
                  
                  <Card className="relative flex flex-col overflow-hidden bg-black/70 backdrop-blur-3xl border border-white/10 rounded-[2rem] shadow-[0_20px_60px_rgba(0,0,0,0.8)] group-hover/card:border-white/30 transition-all duration-500 z-10">
                    <div 
                      className="py-3 px-4 sm:py-4 sm:px-8 border-b border-white/10 flex items-center justify-between"
                      style={{ background: 'linear-gradient(90deg, rgba(34,211,238,0.2), rgba(34,211,238,0.08), transparent)' }}
                    >
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="p-1.5 sm:p-2 rounded-xl text-black shadow-lg bg-cyan-400 shadow-cyan-400/50">
                          <Award className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                        </div>
                        <div>
                          <h2 className="font-headline text-sm sm:text-xl font-black uppercase tracking-normal text-white leading-none">
                            {div2Name} // STANDINGS
                          </h2>
                          <span className="text-[7.5px] sm:text-[9px] font-black uppercase tracking-[0.2em] text-cyan-400">Challenger Roster</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-white/5 border border-white/10">
                        <Binary className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-cyan-400" />
                        <span className="text-[7px] sm:text-[8px] font-black text-white/70 uppercase tracking-widest hidden xs:block">DIV_2</span>
                      </div>
                    </div>

                    <div className="relative z-10">
                      {leaderboardData.div2 && leaderboardData.div2.length > 0 ? (
                        <LeaderboardTable players={leaderboardData.div2} defendingChampionId={defendingChampionId} />
                      ) : (
                        <div className="p-10 sm:p-16 text-center text-white/20 font-black uppercase tracking-widest text-xs flex flex-col items-center gap-3 sm:gap-4">
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
                <div 
                  className="absolute -inset-3 rounded-[3rem] blur-2xl opacity-0 group-hover/card:opacity-100 transition-opacity duration-700 pointer-events-none" 
                  style={{ backgroundColor: `${theme.primaryHex}0d` }}
                />

                <Card className="relative flex flex-col overflow-hidden bg-black/70 backdrop-blur-3xl border border-white/10 rounded-[1.5rem] sm:rounded-[2.5rem] shadow-[0_25px_70px_rgba(0,0,0,0.8)] group-hover/card:border-white/30 transition-all duration-500 z-10">
                  <div 
                    className="py-3.5 px-4 sm:py-5 sm:px-10 border-b border-white/10 flex items-center justify-between"
                    style={{ background: `linear-gradient(90deg, ${theme.primaryHex}33, ${theme.primaryHex}1a, transparent)` }}
                  >
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div 
                        className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl text-black shadow-lg"
                        style={{ backgroundColor: theme.primaryHex, boxShadow: `0 0 20px ${theme.primaryHex}80` }}
                      >
                        <Award className="w-4 h-4 sm:w-6 sm:h-6" />
                      </div>
                      <div>
                        <h2 className="font-headline text-base sm:text-2xl font-black uppercase tracking-normal text-white leading-none">{t('home_top_players')}</h2>
                        <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.25em]" style={{ color: theme.primaryHex }}>Top Roster Standings</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-full bg-white/5 border border-white/10">
                      <Binary className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: theme.primaryHex }} />
                      <span className="text-[7.5px] sm:text-[9px] font-black text-white/70 uppercase tracking-widest hidden xs:block">MASTER_MANIFEST</span>
                    </div>
                  </div>

                  <div className="relative z-10">
                    {leaderboardData.top && leaderboardData.top.length > 0 ? (
                      <LeaderboardTable players={leaderboardData.top} defendingChampionId={defendingChampionId} />
                    ) : (
                      <div className="p-20 text-center text-white/20 font-black uppercase tracking-widest text-sm flex flex-col items-center gap-6">
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
