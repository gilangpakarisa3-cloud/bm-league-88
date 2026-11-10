'use client';

import { useCallback } from 'react';
import type { Firestore } from 'firebase/firestore';
import {
  collection,
  doc,
  writeBatch,
  getDocs,
  Timestamp,
  where,
  query,
} from 'firebase/firestore';
import {
  setDocumentNonBlocking,
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking,
} from '@/firebase';
import type {
  Season,
  LeagueEntry,
  CoOpLeagueEntry,
  WithId,
  Match,
  Player,
  PlayerWithTeam,
} from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/use-translation';
import { generateFixtures } from '@/lib/tournament/fixture-generator';
import { generatePlayoffBracket } from '@/lib/tournament/playoff-bracket';
import { calculateSeasonRecord, StandingsTableEntry } from '@/lib/tournament/season-calculator';
import { LEAGUE_ID } from './use-league-data';

export interface UseLeagueActionsParams {
  firestore: Firestore | null;
  activeSeasonId: string | null;
  activeSeason: WithId<Season> | null;
  singleLeagueTable?: WithId<LeagueEntry>[] | null;
  coopLeagueTable?: WithId<CoOpLeagueEntry>[] | null;
  allPlayers?: WithId<Player>[] | null;
  matches?: WithId<Match>[] | null;
  sortedTable: StandingsTableEntry[];
  groupA: StandingsTableEntry[];
  groupB: StandingsTableEntry[];
  isSeasonCoop: boolean;
  isHybrid: boolean;
  isAdmin: boolean;
  participantEntries: (WithId<LeagueEntry> | WithId<CoOpLeagueEntry>)[];
}

export function useLeagueActions({
  firestore,
  activeSeasonId,
  activeSeason,
  singleLeagueTable,
  coopLeagueTable,
  allPlayers,
  matches,
  sortedTable,
  groupA,
  groupB,
  isSeasonCoop,
  isHybrid,
  isAdmin,
  participantEntries,
}: UseLeagueActionsParams) {
  const { toast } = useToast();
  const { t } = useTranslation();

  // 1. Generate Fixtures
  const handleGenerateFixtures = useCallback(async () => {
    if (!firestore || !activeSeasonId || !activeSeason) return;

    if (activeSeason.status !== 'Not Started') {
      toast({
        variant: 'destructive',
        title: t('error'),
        description: t('generate_fixtures_error_not_started'),
      });
      return;
    }

    const tableToUse = !isSeasonCoop ? singleLeagueTable : coopLeagueTable;
    if (!tableToUse || tableToUse.length < 2) {
      toast({
        variant: 'destructive',
        title: t('error'),
        description: t('generate_fixtures_error_min_players'),
      });
      return;
    }

    const matchesCollectionRef = collection(
      firestore,
      `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/matches`
    );
    const existingMatchesSnap = await getDocs(matchesCollectionRef);

    const batch = writeBatch(firestore);
    existingMatchesSnap.forEach((d) => batch.delete(d.ref));

    const result = generateFixtures({
      seasonId: activeSeasonId,
      season: activeSeason,
      singleLeagueTable: singleLeagueTable || [],
      coopLeagueTable: coopLeagueTable || [],
      isSeasonCoop,
    });

    // Handle Div 2 auto-merge updates in Firestore
    if (result.isDiv2Merged && result.mergedEntryIds) {
      result.mergedEntryIds.forEach((entryId) => {
        batch.update(
          doc(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/leagueTable`, entryId),
          { division: 'div-1' }
        );
      });
      batch.update(doc(firestore, `leagues/${LEAGUE_ID}/seasons`, activeSeasonId), {
        isDiv2Merged: true,
      });
    } else if (activeSeason.hasDivisions) {
      batch.update(doc(firestore, `leagues/${LEAGUE_ID}/seasons`, activeSeasonId), {
        isDiv2Merged: false,
      });
    }

    // Write all match documents
    result.fixtures.forEach((f) => {
      const matchDocRef = doc(matchesCollectionRef);
      batch.set(matchDocRef, {
        seasonId: f.seasonId,
        player1Id: f.player1Id,
        player2Id: f.player2Id,
        player1Score: null,
        player2Score: null,
        player1Wins: null,
        player2Wins: null,
        isCompleted: false,
        status: 'Scheduled',
        matchDate: Timestamp.fromMillis(f.matchDateMillis),
        round: f.round ?? 'Group',
        ...(f.division ? { division: f.division } : {}),
      });
    });

    await batch.commit();

    if (result.notice?.type === 'div2_merged') {
      toast({
        title: 'Divisi 2 Di-Merge ke Divisi 1',
        description: `Pendaftar Divisi 2 hanya ${result.notice.div2Count} pemain (minimal 3 untuk kompetisi). Seluruh peserta otomatis digabung ke ${
          activeSeason.division1Name || 'Divisi 1'
        }.`,
      });
    } else if (result.notice?.type === 'div2_active') {
      toast({
        title: 'Jadwal 2 Divisi Berhasil Dibuat!',
        description: `${activeSeason.division1Name || 'Divisi 1'} (${
          result.notice.div1Count
        } atlet) & ${activeSeason.division2Name || 'Divisi 2'} (${
          result.notice.div2Count
        } atlet) siap bertanding!`,
      });
    } else {
      toast({
        title: t('fixtures_generated_title'),
        description: `Jadwal pertandingan untuk ${activeSeason.name} telah dibuat.`,
      });
    }
  }, [
    firestore,
    activeSeasonId,
    activeSeason,
    isSeasonCoop,
    singleLeagueTable,
    coopLeagueTable,
    t,
    toast,
  ]);

  // 2. Generate Playoffs
  const handleGeneratePlayoffs = useCallback(async () => {
    if (!firestore || !activeSeasonId || !activeSeason || !isHybrid) return;
    const matchesColRef = collection(
      firestore,
      `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/matches`
    );

    const existingKnockoutSnap = await getDocs(
      query(matchesColRef, where('round', '!=', 'Group'))
    );
    const existingMatches = existingKnockoutSnap.docs.map((d) => d.data());

    const result = generatePlayoffBracket({
      seasonId: activeSeasonId,
      seasonType: activeSeason.type,
      hasDivisions: activeSeason.hasDivisions,
      isDiv2Merged: activeSeason.isDiv2Merged,
      division1Name: activeSeason.division1Name,
      division2Name: activeSeason.division2Name,
      division2HasPlayoff: activeSeason.division2HasPlayoff,
      sortedTable,
      groupA,
      groupB,
      existingKnockoutMatches: existingMatches as any,
    });

    if (result.error) {
      toast({
        variant: 'destructive',
        title: 'Gagal Membuat Playoff',
        description: result.error,
      });
      return;
    }

    const batch = writeBatch(firestore);
    result.matches.forEach((m) => {
      batch.set(doc(matchesColRef), {
        seasonId: m.seasonId,
        player1Id: m.player1Id,
        player2Id: m.player2Id,
        player1Score: null,
        player2Score: null,
        player1Wins: null,
        player2Wins: null,
        isCompleted: false,
        status: m.status,
        matchDate: Timestamp.fromMillis(m.matchDateMillis),
        round: m.round,
        bracketId: m.bracketId,
        ...(m.division ? { division: m.division } : {}),
      });
    });

    await batch.commit();

    toast({
      title: result.title || 'Playoff Dibuat!',
      description: result.description || 'Jadwal babak playoff telah berhasil dibuat.',
    });
  }, [
    firestore,
    activeSeasonId,
    activeSeason,
    isHybrid,
    sortedTable,
    groupA,
    groupB,
    toast,
  ]);

  // 3. Finish Season & Record to Hall of Fame
  const handleFinishSeason = useCallback(() => {
    if (!firestore || !activeSeason || sortedTable.length === 0) return;

    const seasonRec = calculateSeasonRecord({
      activeSeason,
      sortedTable,
      matches: matches || [],
      isSeasonCoop,
      isHybrid,
    });

    setDocumentNonBlocking(doc(firestore, `hallOfFame`, activeSeason.id), seasonRec, {});
    updateDocumentNonBlocking(
      doc(firestore, `leagues/${LEAGUE_ID}/seasons`, activeSeason.id),
      { status: 'Completed' }
    );

    toast({
      title: 'Season Completed!',
      description: `${activeSeason.name} is finished.`,
    });
  }, [firestore, activeSeason, sortedTable, matches, isSeasonCoop, isHybrid, toast]);

  // 4. Update Season Status
  const handleUpdateSeasonStatus = useCallback(
    (status: 'In Progress' | 'Completed') => {
      if (!firestore || !activeSeason) return;
      if (status === 'Completed') {
        handleFinishSeason();
        return;
      }
      updateDocumentNonBlocking(
        doc(firestore, `leagues/${LEAGUE_ID}/seasons`, activeSeason.id),
        { status }
      );
      toast({
        title: t('season_updated_title'),
        description: t('season_status_updated_desc', { status }),
      });
    },
    [firestore, activeSeason, handleFinishSeason, t, toast]
  );

  // 5. Delete Season
  const handleDeleteSeason = useCallback(
    async (deletingSeason: WithId<Season>) => {
      if (!firestore || !deletingSeason) return;
      try {
        const batch = writeBatch(firestore);
        const subcollections = ['leagueTable', 'matches', 'coopLeagueTable'];
        for (const sub of subcollections) {
          const snapshot = await getDocs(
            collection(firestore, `leagues/${LEAGUE_ID}/seasons/${deletingSeason.id}/${sub}`)
          );
          snapshot.docs.forEach((d) => batch.delete(d.ref));
        }
        batch.delete(doc(firestore, 'hallOfFame', deletingSeason.id));
        batch.delete(doc(firestore, `leagues/${LEAGUE_ID}/seasons`, deletingSeason.id));
        await batch.commit();

        toast({
          title: t('season_deleted_title'),
          description: t('season_deleted_desc', { seasonName: deletingSeason.name }),
        });
      } catch (error) {
        toast({
          variant: 'destructive',
          title: t('deletion_failed_title'),
          description: t('season_deleted_error'),
        });
      }
    },
    [firestore, t, toast]
  );

  // 6. Delete Entry
  const handleDeleteEntry = useCallback(
    (deletingEntry: WithId<LeagueEntry>) => {
      if (!firestore || !activeSeasonId || !deletingEntry) return;
      const collName = isSeasonCoop ? 'coopLeagueTable' : 'leagueTable';
      deleteDocumentNonBlocking(
        doc(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/${collName}`, deletingEntry.id)
      );
      toast({
        title: t('player_removed_title'),
        description: t('player_removed_desc', { playerName: deletingEntry.playerName }),
      });
    },
    [firestore, activeSeasonId, isSeasonCoop, t, toast]
  );

  // 7. Register Players
  const handleRegisterPlayers = useCallback(
    async (selectedPlayerIds: string[], targetDivision: 'div-1' | 'div-2' = 'div-1') => {
      if (!firestore || !activeSeasonId || !allPlayers) return;
      const playersToReg = allPlayers.filter((p) => selectedPlayerIds.includes(p.id));
      const batch = writeBatch(firestore);

      playersToReg.forEach((player) => {
        batch.set(
          doc(collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/leagueTable`)),
          {
            playerId: player.id,
            teamId: player.teamId,
            playerName: player.name,
            teamName: player.teamName,
            played: 0,
            win: 0,
            draw: 0,
            loss: 0,
            goalsFor: 0,
            goalsAgainst: 0,
            goalDifference: 0,
            points: 0,
            hasPaid: false,
            division: targetDivision,
          }
        );
      });

      await batch.commit();
      const divLabel =
        targetDivision === 'div-2'
          ? activeSeason?.division2Name || 'Divisi 2'
          : activeSeason?.division1Name || 'Divisi 1';

      toast({
        title: t('success'),
        description: `${playersToReg.length} atlet berhasil didaftarkan${
          activeSeason?.hasDivisions ? ` ke ${divLabel}` : ''
        }.`,
      });
    },
    [firestore, activeSeasonId, allPlayers, activeSeason, t, toast]
  );

  // 8. Toggle Player Division
  const handleTogglePlayerDivision = useCallback(
    async (entry: WithId<LeagueEntry>) => {
      if (!firestore || !activeSeasonId || activeSeason?.status !== 'Not Started') return;
      const nextDivision: 'div-1' | 'div-2' = entry.division === 'div-2' ? 'div-1' : 'div-2';

      try {
        const updateData: any = { division: nextDivision };

        if (activeSeason.type === 'Hybrid' && nextDivision === 'div-1') {
          if (!entry.group) {
            const div1Pool = (singleLeagueTable || []).filter(
              (p) => p.id !== entry.id && p.division !== 'div-2'
            );
            const countA = div1Pool.filter((p) => p.group === 'A').length;
            const countB = div1Pool.filter((p) => p.group === 'B').length;
            updateData.group = countA <= countB ? 'A' : 'B';
          }
        }

        await updateDocumentNonBlocking(
          doc(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/leagueTable`, entry.id),
          updateData
        );

        const divName =
          nextDivision === 'div-2'
            ? activeSeason?.division2Name || 'Divisi 2'
            : activeSeason?.division1Name || 'Divisi 1';

        toast({
          title: 'Divisi Diperbarui',
          description: `${entry.playerName} dipindahkan ke ${divName}.`,
        });
      } catch (e) {
        console.error(e);
      }
    },
    [firestore, activeSeasonId, activeSeason, singleLeagueTable, toast]
  );

  // 9. Save Co-Op Pairs
  const handleSavePairs = useCallback(
    async (
      pairs: {
        player1: PlayerWithTeam;
        player2: PlayerWithTeam;
        teamId: string;
        teamName: string;
      }[]
    ) => {
      if (!firestore || !activeSeasonId) return;
      const batch = writeBatch(firestore);
      const targetCol = collection(
        firestore,
        `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/coopLeagueTable`
      );
      const existingDocsSnap = await getDocs(targetCol);
      existingDocsSnap.forEach((d) => batch.delete(d.ref));

      pairs.forEach((pair) => {
        const tId = [pair.player1.id, pair.player2.id].sort().join('-');
        batch.set(doc(targetCol, tId), {
          teamName: `${pair.player1.name} & ${pair.player2.name}`,
          player1Id: pair.player1.id,
          player1Name: pair.player1.name,
          player1TeamId: pair.teamId || '',
          player1TeamName: pair.teamName || '',
          player1Goals: 0,
          player2Id: pair.player2.id,
          player2Name: pair.player2.name,
          player2TeamId: pair.teamId || '',
          player2TeamName: pair.teamName || '',
          player2Goals: 0,
          played: 0,
          win: 0,
          draw: 0,
          loss: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDifference: 0,
          points: 0,
          hasPaid: false,
        });
      });

      await batch.commit();
      toast({
        title: 'Pasangan Disimpan!',
        description: `${pairs.length} tim Co-Op telah dibuat.`,
      });
    },
    [firestore, activeSeasonId, toast]
  );

  // 10. Save Groups
  const handleSaveGroups = useCallback(
    async (groups: { groupA: any[]; groupB: any[] }) => {
      if (!firestore || !activeSeasonId || !activeSeason) return;
      const batch = writeBatch(firestore);
      const isCoopHybrid = activeSeason.type === 'Co-Op Hybrid';
      const targetColName = isCoopHybrid ? 'coopLeagueTable' : 'leagueTable';
      const targetCol = collection(
        firestore,
        `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/${targetColName}`
      );

      groups.groupA.forEach((player) => batch.update(doc(targetCol, player.id), { group: 'A' }));
      groups.groupB.forEach((player) => batch.update(doc(targetCol, player.id), { group: 'B' }));

      await batch.commit();
      toast({
        title: 'Grup Disimpan!',
        description: 'Pembagian grup telah disimpan.',
      });
    },
    [firestore, activeSeasonId, activeSeason, toast]
  );

  // 11. Save Team Draft Results
  const handleSaveTeamDraftResults = useCallback(
    async (assignments: { entryId: string; teamId: string; teamName: string }[]) => {
      if (!firestore || !activeSeasonId) return;
      const batch = writeBatch(firestore);
      const targetColName = isSeasonCoop ? 'coopLeagueTable' : 'leagueTable';
      const targetCol = collection(
        firestore,
        `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/${targetColName}`
      );

      const validEntryIds = new Set((participantEntries || []).map((p) => p.id));
      const validAssignments = assignments.filter((a) => validEntryIds.has(a.entryId));

      if (validAssignments.length === 0) return;

      validAssignments.forEach((a) => {
        const entryRef = doc(targetCol, a.entryId);
        if (isSeasonCoop) {
          batch.set(
            entryRef,
            {
              player1TeamId: a.teamId,
              player1TeamName: a.teamName,
              player2TeamId: a.teamId,
              player2TeamName: a.teamName,
            },
            { merge: true }
          );
        } else {
          batch.set(entryRef, { teamId: a.teamId, teamName: a.teamName }, { merge: true });
        }
      });

      try {
        await batch.commit();
        toast({ title: 'Draft Tim Selesai!', description: 'Data tim pemain telah diperbarui.' });
      } catch (err: any) {
        console.error('Error saving team draft assignments:', err);
        toast({
          variant: 'destructive',
          title: 'Gagal Menyimpan Tim',
          description: err.message || 'Terjadi kesalahan saat menyimpan draft.',
        });
      }
    },
    [firestore, activeSeasonId, isSeasonCoop, participantEntries, toast]
  );

  // 12. Remove Player From Registration
  const handleRemovePlayerFromRegistration = useCallback(
    (leagueEntryId: string, playerName: string) => {
      if (!firestore || !activeSeasonId || !isAdmin) return;
      deleteDocumentNonBlocking(
        doc(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/leagueTable`, leagueEntryId)
      );
      toast({
        title: t('player_removed_title'),
        description: t('player_removed_desc', { playerName }),
      });
    },
    [firestore, activeSeasonId, isAdmin, t, toast]
  );

  // 13. Payment Toggle
  const handlePaymentToggle = useCallback(
    (leagueEntryId: string, currentStatus: boolean) => {
      if (!firestore || !activeSeasonId || !isAdmin || !activeSeason) return;
      const collName = isSeasonCoop ? 'coopLeagueTable' : 'leagueTable';
      updateDocumentNonBlocking(
        doc(
          firestore,
          `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/${collName}`,
          leagueEntryId
        ),
        { hasPaid: !currentStatus }
      );
    },
    [firestore, activeSeasonId, isAdmin, activeSeason, isSeasonCoop]
  );

  return {
    handleGenerateFixtures,
    handleGeneratePlayoffs,
    handleFinishSeason,
    handleUpdateSeasonStatus,
    handleDeleteSeason,
    handleDeleteEntry,
    handleRegisterPlayers,
    handleTogglePlayerDivision,
    handleSavePairs,
    handleSaveGroups,
    handleSaveTeamDraftResults,
    handleRemovePlayerFromRegistration,
    handlePaymentToggle,
  };
}

