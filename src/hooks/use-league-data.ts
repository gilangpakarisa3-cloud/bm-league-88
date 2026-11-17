'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit, doc, writeBatch } from 'firebase/firestore';
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
        ? query(collection(firestore, 'hallOfFame'), orderBy('completedAt', 'desc'), limit(5))
        : null,
    [firestore]
  );
  const { data: latestHallOfFame } = useCollection<SeasonRecord>(hallOfFameCollection);
  const defendingChampionId = useMemo(() => {
    if (!latestHallOfFame || latestHallOfFame.length === 0) return undefined;
    if (activeSeasonId && latestHallOfFame[0]?.seasonId === activeSeasonId) {
      return latestHallOfFame[1]?.winnerPlayerId;
    }
    return latestHallOfFame[0]?.winnerPlayerId;
  }, [latestHallOfFame, activeSeasonId]);

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

  // 8. Auto-heal data Season Aktif (Normalisasi Baseline 700 & Koreksi Anomali MMR Chandra vs Adityo)
  const healedSeasonRef = useRef<string | null>(null);
  useEffect(() => {
    if (
      !firestore ||
      !activeSeasonId ||
      !activeSeason ||
      !singleLeagueTable ||
      singleLeagueTable.length === 0 ||
      !allPlayers ||
      allPlayers.length === 0 ||
      !matches
    ) {
      return;
    }
    if (healedSeasonRef.current === activeSeasonId) return;

    let hasUpdates = false;
    const batch = writeBatch(firestore);

    // a. Normalisasi Baseline Peserta (played === 0) yang masih menyimpan angka legacy 700 / salah baseline & sinkronisasi division
    singleLeagueTable.forEach((entry) => {
      if (entry.playerId) {
        const playerDoc = allPlayers.find((p) => p.id === entry.playerId);
        if (playerDoc) {
          const isDiv2 = entry.division === 'div-2';
          const currentMmr = playerDoc.mmr;
          const playedCareer = playerDoc.overallPlayed || 0;
          const isPlayedZero = (entry.played || 0) === 0;

          const playerUpdates: any = {};

          // Sinkronkan division jika berbeda dengan entry
          if (entry.division && playerDoc.division !== entry.division) {
            playerUpdates.division = entry.division;
          }

          if (isPlayedZero) {
            if (isDiv2 && (currentMmr === 700 || (playedCareer < 20 && (currentMmr || 0) >= 750))) {
              playerUpdates.division = 'div-2';
              playerUpdates.mmr = 600;
              playerUpdates.peakMmr = 600;
            } else if (!isDiv2 && (currentMmr === 700 || (playedCareer === 0 && (currentMmr || 0) <= 650))) {
              playerUpdates.division = 'div-1';
              playerUpdates.mmr = 800;
              playerUpdates.peakMmr = Math.max(playerDoc.peakMmr || 800, 800);
            }
          }

          if (Object.keys(playerUpdates).length > 0) {
            batch.update(doc(firestore, 'players', entry.playerId), playerUpdates);
            hasUpdates = true;
          }
        }
      }
    });

    // b. Deteksi dan koreksi match divisi 2 yang terhitung 600 vs 700 (delta +/- 30)
    matches.forEach((m) => {
      if (m.isCompleted && m.division === 'div-2' && Math.abs(m.player1MmrDelta || 0) === 30) {
        const p1 = allPlayers.find((p) => p.id === m.player1Id);
        const p2 = allPlayers.find((p) => p.id === m.player2Id);
        const e1 = singleLeagueTable.find((e) => e.playerId === m.player1Id);
        const e2 = singleLeagueTable.find((e) => e.playerId === m.player2Id);

        const oldDelta1 = m.player1MmrDelta || 0;
        const oldDelta2 = m.player2MmrDelta || 0;

        const rawPreMmr1 = (p1?.mmr || 600) - oldDelta1;
        const rawPreMmr2 = (p2?.mmr || 600) - oldDelta2;

        // Hanya koreksi jika laga ini memang bermasalah akibat legacy MMR 700 dan merupakan laga ke-1 kedua atlet
        if (!(rawPreMmr1 === 700 || rawPreMmr2 === 700) || !(e1?.played === 1 && e2?.played === 1)) {
          return;
        }

        const s1 = m.player1Wins !== null && m.player1Wins !== undefined && m.round !== 'Group' ? (m.player1Wins ?? 0) : (m.player1Score ?? 0);
        const s2 = m.player1Wins !== null && m.player1Wins !== undefined && m.round !== 'Group' ? (m.player2Wins ?? 0) : (m.player2Score ?? 0);
        const res = s1 > s2 ? 'W' : (s1 < s2 ? 'L' : 'D');

        // Laga 600 vs 600 normal menghasilkan delta +/- 25
        const newDelta1 = res === 'W' ? 25 : (res === 'L' ? -25 : 0);
        const newDelta2 = -newDelta1;

        const matchDocRef = doc(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/matches`, m.id);
        batch.update(matchDocRef, {
          player1MmrDelta: newDelta1,
          player2MmrDelta: newDelta2,
        });

        if (p1 && m.player1Id) {
          let preMmr1 = rawPreMmr1;
          if (preMmr1 >= 680) {
            preMmr1 = 600;
          }
          const correctedMmr1 = preMmr1 + newDelta1;
          const correctedPeak1 = (p1.peakMmr === 630 || p1.peakMmr === 700)
            ? Math.max(600, correctedMmr1)
            : Math.max(p1.peakMmr || correctedMmr1, correctedMmr1);

          batch.update(doc(firestore, 'players', m.player1Id), {
            mmr: correctedMmr1,
            peakMmr: correctedPeak1,
            division: 'div-2',
          });
        }

        if (p2 && m.player2Id) {
          let preMmr2 = rawPreMmr2;
          if (preMmr2 >= 680) {
            preMmr2 = 600;
          }
          const correctedMmr2 = preMmr2 + newDelta2;
          const correctedPeak2 = (p2.peakMmr === 630 || p2.peakMmr === 700)
            ? Math.max(600, correctedMmr2)
            : Math.max(p2.peakMmr || 600, 600);

          batch.update(doc(firestore, 'players', m.player2Id), {
            mmr: correctedMmr2,
            peakMmr: correctedPeak2,
            division: 'div-2',
          });
        }

        hasUpdates = true;
      }
    });

    healedSeasonRef.current = activeSeasonId;

    if (hasUpdates) {
      batch.commit().catch((err) => {
        console.error('Error executing MMR auto-heal:', err);
      });
    }
  }, [firestore, activeSeasonId, activeSeason, singleLeagueTable, allPlayers, matches]);

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

