'use client';

import { useState, useMemo, useEffect } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import type {
  Season,
  LeagueEntry,
  Player,
  WithId,
  Match,
  Team,
  SeasonRecord,
  CoOpLeagueEntry,
  PlayerWithTeam,
} from '@/lib/types';
import { getSeasonTheme } from '@/lib/season-theme';
import { format } from 'date-fns';
import { useGlobalSeasonTheme } from '@/context/season-theme-context';

export const LEAGUE_ID = 'main-league';

export function useLeagueData() {
  const firestore = useFirestore();
  const {
    activeSeasonId,
    setActiveSeasonId,
    seasons,
    isLoading: isLoadingSeasons,
    activeSeason,
    theme,
  } = useGlobalSeasonTheme();

  const isSeasonCoop = activeSeason?.type === 'Co-Op' || activeSeason?.type === 'Co-Op Hybrid';
  const isHybrid =
    activeSeason?.type === 'Hybrid' ||
    activeSeason?.type === 'Co-Op Hybrid' ||
    activeSeason?.type === 'Single Hybrid';

  // 2. League Tables
  const leagueTableCollection = useMemoFirebase(
    () =>
      firestore &&
        activeSeasonId &&
        activeSeason?.type !== 'Co-Op' &&
        activeSeason?.type !== 'Co-Op Hybrid'
        ? query(collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/leagueTable`))
        : null,
    [firestore, activeSeasonId, activeSeason]
  );
  const { data: singleLeagueTable, isLoading: isLoadingSingleTable } =
    useCollection<LeagueEntry>(leagueTableCollection);

  const coopLeagueTableCollection = useMemoFirebase(
    () =>
      firestore && activeSeasonId && isSeasonCoop
        ? query(collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/coopLeagueTable`))
        : null,
    [firestore, activeSeasonId, isSeasonCoop]
  );
  const { data: coopLeagueTable, isLoading: isLoadingCoopTable } =
    useCollection<CoOpLeagueEntry>(coopLeagueTableCollection);

  const isLoadingTable = isLoadingSingleTable || isLoadingCoopTable;

  // Individual pool (always leagueTable) for registration & drafts
  const individualPoolCollection = useMemoFirebase(
    () =>
      firestore && activeSeasonId
        ? collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/leagueTable`)
        : null,
    [firestore, activeSeasonId]
  );
  const { data: individualPool } = useCollection<LeagueEntry>(individualPoolCollection);

  const participantEntries = useMemo(() => {
    if (isSeasonCoop) return coopLeagueTable || [];
    return singleLeagueTable || [];
  }, [isSeasonCoop, coopLeagueTable, singleLeagueTable]);

  // 3. Teams Collection
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

  // 4. Players Collection
  const playersCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'players') : null),
    [firestore]
  );
  const { data: allPlayers, isLoading: isLoadingPlayers } = useCollection<Player>(playersCollection);

  const playersById = useMemo(() => {
    if (!allPlayers) return {};
    return allPlayers.reduce((acc, p) => {
      acc[p.id] = p as PlayerWithTeam;
      return acc;
    }, {} as Record<string, PlayerWithTeam>);
  }, [allPlayers]);

  // 5. Matches Collection
  const matchesCollection = useMemoFirebase(
    () =>
      firestore && activeSeasonId
        ? collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/matches`)
        : null,
    [firestore, activeSeasonId]
  );
  const { data: matches, isLoading: isLoadingMatches } = useCollection<Match>(matchesCollection);

  // 6. Hall of Fame (Defending champion)
  const hallOfFameCollection = useMemoFirebase(
    () =>
      firestore
        ? query(collection(firestore, 'hallOfFame'), orderBy('completedAt', 'desc'), limit(1))
        : null,
    [firestore]
  );
  const { data: latestHallOfFame } = useCollection<SeasonRecord>(hallOfFameCollection);
  const defendingChampionId = latestHallOfFame?.[0]?.winnerPlayerId;

  // 7. Derived Metrics
  const hasFixtures = useMemo(() => (matches || []).length > 0, [matches]);

  const { prizePool, registrationPool, sponsorshipPool } = useMemo(() => {
    if (!activeSeason) {
      return { prizePool: 0, registrationPool: 0, sponsorshipPool: 0 };
    }
    const registrationFee = activeSeason.registrationFee || 0;
    const sponsorship = activeSeason.sponsorshipAmount || 0;

    const paidCount = (participantEntries || []).filter((p) => p.hasPaid).length;
    const regPool = paidCount * registrationFee;
    const totalPool = regPool + sponsorship;

    return {
      prizePool: totalPool,
      registrationPool: regPool,
      sponsorshipPool: sponsorship,
    };
  }, [participantEntries, activeSeason]);

  const allSeasonMatches = useMemo(() => matches || [], [matches]);

  const groupStageMatches = useMemo(
    () => allSeasonMatches.filter((m) => !m.round || m.round === 'Group'),
    [allSeasonMatches]
  );

  const areGroupStageMatchesComplete = useMemo(() => {
    if (groupStageMatches.length === 0) return false;
    return groupStageMatches.every((m) => m.isCompleted);
  }, [groupStageMatches]);

  const hasPlayoffs = useMemo(
    () => allSeasonMatches.some((m) => m.round && m.round !== 'Group'),
    [allSeasonMatches]
  );

  const { seasonProgress, completedMatchesCount } = useMemo(() => {
    if (!matches || matches.length === 0) return { seasonProgress: 0, completedMatchesCount: 0 };
    const completed = matches.filter((m) => m.isCompleted).length;
    return { seasonProgress: (completed / matches.length) * 100, completedMatchesCount: completed };
  }, [matches]);

  const formattedDateRange = useMemo(() => {
    if (!activeSeason || !activeSeason.startDate || !activeSeason.endDate) return null;
    return `${format(activeSeason.startDate.toDate(), 'd LLL')} - ${format(
      activeSeason.endDate.toDate(),
      'd LLL yyyy'
    )}`;
  }, [activeSeason]);

  return {
    firestore,
    activeSeasonId,
    setActiveSeasonId,
    seasons,
    isLoadingSeasons,
    activeSeason,
    isSeasonCoop,
    isHybrid,
    singleLeagueTable,
    coopLeagueTable,
    individualPool,
    participantEntries,
    allTeams,
    teamsById,
    allPlayers,
    playersById,
    matches,
    defendingChampionId,
    hasFixtures,
    prizePool,
    registrationPool,
    sponsorshipPool,
    allSeasonMatches,
    groupStageMatches,
    areGroupStageMatchesComplete,
    hasPlayoffs,
    seasonProgress,
    completedMatchesCount,
    formattedDateRange,
    theme,
    isLoadingTable,
    isLoadingMatches,
    isLoadingPlayers,
    isLoadingTeams,
  };
}

