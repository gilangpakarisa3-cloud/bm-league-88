'use client';

import * as React from 'react';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { collection, doc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import type { Season, LeagueEntry, WithId } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/use-translation';
import { useSharedPassword } from '@/context/password-context';
import { cn } from '@/lib/utils';

// Modular Hooks
import { useLeagueData, LEAGUE_ID } from '@/hooks/use-league-data';
import { useLeagueStandings } from '@/hooks/use-league-standings';
import { useLeagueActions } from '@/hooks/use-league-actions';

// Modular UI Components
import { LeagueHeader } from '@/components/league/league-header';
import { LiveScoreTicker } from '@/components/live-score-ticker';
import { LeagueCockpitDeck } from '@/components/league/league-cockpit-deck';
import { LeagueTable } from '@/components/league-table';
import { LeagueStats } from '@/components/league-stats';
import { SeasonFinancialHub } from '@/components/league/season-financial-hub';
import { LeagueDialogsDeck } from '@/components/league/league-dialogs-deck';

export default function LeaguePage() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const { password: ADMIN_PASSWORD, isLoaded: isPasswordLoaded } = useSharedPassword();

  // 1. Data Subscriptions & State from Hook
  const {
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
  } = useLeagueData();

  // 2. Standings & Groups Hook
  const { sortedTable, groupA, groupB } = useLeagueStandings({
    singleLeagueTable,
    coopLeagueTable,
    activeSeason,
    playersById,
    teamsById,
    isSeasonCoop,
    isHybrid,
  });

  // 3. UI State
  const [isAdmin, setIsAdmin] = useState(false);
  const [passwordPrompt, setPasswordPrompt] = useState<{ open: boolean; action?: () => void }>({
    open: false,
  });
  const [passwordInput, setPasswordInput] = useState('');

  const [activeLeagueTab, setActiveLeagueTab] = useState('group_a');
  const [selectedDivision, setSelectedDivision] = useState<'div-1' | 'div-2'>('div-1');

  // Dialog Visibilities
  const [showCreateSeason, setShowCreateSeason] = useState(false);
  const [showRegisterPlayers, setShowRegisterPlayers] = useState(false);
  const [showDrawDialog, setShowDrawDialog] = useState(false);
  const [showManualPairingDialog, setShowManualPairingDialog] = useState(false);
  const [showGroupDrawDialog, setShowGroupDrawDialog] = useState(false);
  const [showTeamDraftDialog, setShowTeamDraftDialog] = useState(false);
  const [showFinishSeasonConfirm, setShowFinishSeasonConfirm] = useState(false);
  const [showFinishGroupStageConfirm, setShowFinishGroupStageConfirm] = useState(false);
  const [showGenerateConfirm, setShowGenerateConfirm] = useState(false);
  const [showStartSeasonConfirm, setShowStartSeasonConfirm] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareText, setShareText] = useState('');
  const [selectedPlayerForStats, setSelectedPlayerForStats] = useState<WithId<LeagueEntry> | null>(
    null
  );
  const [deletingSeason, setDeletingSeason] = useState<WithId<Season> | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<WithId<LeagueEntry> | null>(null);

  // Create / Edit Season Form State
  const [editingSeason, setEditingSeason] = useState<WithId<Season> | null>(null);
  const [newSeasonName, setNewSeasonName] = useState('');
  const [newSeasonFee, setNewSeasonFee] = useState<number | string>('');
  const [newSponsorshipAmount, setNewSponsorshipAmount] = useState<number | string>('');
  const [newSeasonType, setNewSeasonType] = useState<Season['type']>('Single');
  const [newSeasonThemeKey, setNewSeasonThemeKey] = useState<Season['themeKey']>('auto');
  const [newHybridMeetings, setNewHybridMeetings] = useState<1 | 2>(1);
  const [newHasDivisions, setNewHasDivisions] = useState(false);
  const [newDivision1Name, setNewDivision1Name] = useState('Divisi 1');
  const [newDivision2Name, setNewDivision2Name] = useState('Divisi 2');
  const [newDivision2Format, setNewDivision2Format] = useState<Season['division2Format']>('Single');
  const [newDivision2HasPlayoff, setNewDivision2HasPlayoff] = useState<boolean>(false);
  const [newPromotionSpots, setNewPromotionSpots] = useState<number>(2);
  const [newRelegationSpots, setNewRelegationSpots] = useState<number>(2);
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });

  // 4. Actions Hook
  const {
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
  } = useLeagueActions({
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
  });

  // Tab Auto-Sync based on Tournament Type
  useEffect(() => {
    if (activeSeason?.type === 'Co-Op Hybrid' || activeSeason?.type === 'Single Hybrid') {
      if (
        activeLeagueTab !== 'standings' &&
        activeLeagueTab !== 'playoff' &&
        activeLeagueTab !== 'topskor'
      ) {
        setActiveLeagueTab('standings');
      }
    } else if (activeSeason?.type === 'Hybrid') {
      if (activeLeagueTab === 'standings' || activeLeagueTab === 'topskor') {
        setActiveLeagueTab('group_a');
      }
    }
  }, [activeSeason, activeLeagueTab]);

  // Admin Verification Gate
  const handlePasswordCheck = useCallback(() => {
    if (passwordInput === ADMIN_PASSWORD) {
      setIsAdmin(true);
      if (passwordPrompt.action) passwordPrompt.action();
      toast({
        title: t('admin_mode_unlocked_title'),
        description: t('admin_mode_unlocked_desc'),
      });
    } else {
      toast({ variant: 'destructive', title: t('incorrect_password') });
    }
    setPasswordPrompt({ open: false });
    setPasswordInput('');
  }, [passwordInput, ADMIN_PASSWORD, passwordPrompt, t, toast]);

  const withAdminCheck = useCallback(
    (action: () => void) => {
      if (isAdmin) action();
      else setPasswordPrompt({ open: true, action });
    },
    [isAdmin]
  );

  // Season Dialog Form Handlers
  const handleSeasonDialogSubmit = useCallback(() => {
    if (firestore && newSeasonName.trim()) {
      const fee = typeof newSeasonFee === 'string' ? parseFloat(newSeasonFee) : newSeasonFee;
      const sponsorship =
        typeof newSponsorshipAmount === 'string'
          ? parseFloat(newSponsorshipAmount)
          : newSponsorshipAmount;

      const seasonData: Partial<Omit<Season, 'createdAt' | 'status'>> = {
        name: newSeasonName.trim(),
        type: newSeasonType,
        themeKey: newSeasonThemeKey,
        ...((newSeasonType === 'Hybrid' ||
          newSeasonType === 'Co-Op Hybrid' ||
          newSeasonType === 'Single Hybrid') && { hybridGroupMeetings: newHybridMeetings }),
        ...(dateRange.from && { startDate: Timestamp.fromDate(dateRange.from) }),
        ...(dateRange.to && { endDate: Timestamp.fromDate(dateRange.to) }),
        registrationFee: isNaN(fee) ? 0 : fee,
        sponsorshipAmount: isNaN(sponsorship) ? 0 : sponsorship,
        hasDivisions: newHasDivisions,
        ...(newHasDivisions
          ? {
              division1Name: newDivision1Name.trim() || 'Divisi 1',
              division2Name: newDivision2Name.trim() || 'Divisi 2',
              division2Format: newDivision2HasPlayoff
                ? newDivision2Format && newDivision2Format !== 'Single'
                  ? newDivision2Format
                  : 'Single Hybrid'
                : newDivision2Format || 'Single',
              division2HasPlayoff: newDivision2HasPlayoff,
              promotionSpots: Number(newPromotionSpots) || 2,
              relegationSpots: Number(newRelegationSpots) || 2,
            }
          : {
              isDiv2Merged: false,
            }),
      };

      if (editingSeason) {
        updateDocumentNonBlocking(
          doc(firestore, `leagues/${LEAGUE_ID}/seasons`, editingSeason.id),
          seasonData
        );
        toast({
          title: t('success'),
          description: t('season_updated_desc', { seasonName: newSeasonName.trim() }),
        });
      } else {
        addDocumentNonBlocking(collection(firestore, `leagues/${LEAGUE_ID}/seasons`), {
          ...seasonData,
          status: 'Not Started',
          createdAt: serverTimestamp(),
        });
        toast({
          title: t('success'),
          description: t('season_created_desc', { seasonName: newSeasonName.trim() }),
        });
      }

      setShowCreateSeason(false);
      setEditingSeason(null);
    }
  }, [
    firestore,
    newSeasonName,
    newSeasonFee,
    newSponsorshipAmount,
    newSeasonType,
    newSeasonThemeKey,
    newHybridMeetings,
    dateRange,
    newHasDivisions,
    newDivision1Name,
    newDivision2Name,
    newDivision2HasPlayoff,
    newDivision2Format,
    newPromotionSpots,
    newRelegationSpots,
    editingSeason,
    t,
    toast,
  ]);

  const handleOpenEditDialog = useCallback(() => {
    if (activeSeason) {
      setEditingSeason(activeSeason);
      setNewSeasonName(activeSeason.name);
      setNewSeasonFee(activeSeason.registrationFee || '');
      setNewSponsorshipAmount(activeSeason.sponsorshipAmount || '');
      setNewSeasonType(activeSeason.type || 'Single');
      setNewSeasonThemeKey(activeSeason.themeKey || 'auto');
      setNewHybridMeetings(activeSeason.hybridGroupMeetings || 1);
      setNewHasDivisions(activeSeason.hasDivisions || false);
      setNewDivision1Name(activeSeason.division1Name || 'Divisi 1');
      setNewDivision2Name(activeSeason.division2Name || 'Divisi 2');
      setNewDivision2Format(activeSeason.division2Format || 'Single');
      setNewDivision2HasPlayoff(activeSeason.division2HasPlayoff ?? false);
      setNewPromotionSpots(activeSeason.promotionSpots ?? 2);
      setNewRelegationSpots(activeSeason.relegationSpots ?? 2);
      setDateRange({
        from: activeSeason.startDate?.toDate(),
        to: activeSeason.endDate?.toDate(),
      });
      setShowCreateSeason(true);
    }
  }, [activeSeason]);

  const handleOpenCreateDialog = useCallback(() => {
    setEditingSeason(null);
    setNewSeasonName('');
    setNewSeasonFee('');
    setNewSponsorshipAmount('');
    setNewSeasonType('Single');
    setNewSeasonThemeKey('auto');
    setNewHybridMeetings(1);
    setNewHasDivisions(false);
    setNewDivision1Name('Divisi 1');
    setNewDivision2Name('Divisi 2');
    setNewDivision2Format('Single');
    setNewDivision2HasPlayoff(false);
    setNewPromotionSpots(2);
    setNewRelegationSpots(2);
    setDateRange({ from: undefined, to: undefined });
    setShowCreateSeason(true);
  }, []);

  const handleShareParticipants = useCallback(() => {
    if (!activeSeason || !sortedTable || sortedTable.length === 0) return;
    const hdr = `*${t('share_participants_header', { seasonName: activeSeason.name })}*\n\n`;
    const pList = sortedTable
      .map((p, index) => `${index + 1}. ${p.playerName} (${p.teamName || 'Tanpa Tim'})`)
      .join('\n');
    setShareText(hdr + pList);
    setShareDialogOpen(true);
  }, [activeSeason, sortedTable, t]);

  const isLoadingTableFinal =
    isLoadingTable || isLoadingMatches || isLoadingPlayers || isLoadingTeams || !isPasswordLoaded;

  // Active Division View Logic
  const isDiv2Active =
    activeSeason?.hasDivisions && !activeSeason?.isDiv2Merged && selectedDivision === 'div-2';
  const activeDivisionTable =
    activeSeason?.hasDivisions && !activeSeason?.isDiv2Merged
      ? sortedTable.filter((e) =>
          selectedDivision === 'div-2' ? e.division === 'div-2' : e.division !== 'div-2'
        )
      : sortedTable;
  const currentTableForWidth =
    activeDivisionTable && activeDivisionTable.length > 0 ? activeDivisionTable : sortedTable;
  const activeDivisionFormat = isDiv2Active
    ? activeSeason?.division2Format || 'Single'
    : activeSeason?.type || 'Single';
  const formatHasPlayoff = isDiv2Active
    ? Boolean(
        activeSeason?.division2HasPlayoff &&
          (activeDivisionFormat === 'Single Hybrid' ||
            activeDivisionFormat === 'Hybrid' ||
            activeDivisionFormat === 'Co-Op Hybrid')
      )
    : activeDivisionFormat === 'Single Hybrid' ||
      activeDivisionFormat === 'Hybrid' ||
      activeDivisionFormat === 'Co-Op Hybrid';
  const isPlayoffActive = activeLeagueTab === 'playoff' && formatHasPlayoff;

  return (
    <div className="w-full">
      <div className="max-w-[92rem] mx-auto px-2 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6 animate-in fade-in duration-500">
        <LeagueHeader
          theme={theme}
          activeSeason={activeSeason}
          matches={matches}
          formattedDateRange={formattedDateRange}
          seasonProgress={seasonProgress}
          completedMatchesCount={completedMatchesCount}
        />

        <LiveScoreTicker
          activeSeasonId={activeSeasonId}
          teamsById={teamsById}
          playersById={playersById}
          isAdmin={isAdmin}
          theme={theme}
        />

        <LeagueCockpitDeck
          theme={theme}
          activeSeasonId={activeSeasonId}
          setActiveSeasonId={setActiveSeasonId}
          activeSeason={activeSeason}
          seasons={seasons}
          isLoadingSeasons={isLoadingSeasons}
          isAdmin={isAdmin}
          setIsAdmin={setIsAdmin}
          withAdminCheck={withAdminCheck}
          handleOpenCreateDialog={handleOpenCreateDialog}
          handleOpenEditDialog={handleOpenEditDialog}
          setDeletingSeason={setDeletingSeason}
          setPasswordPrompt={setPasswordPrompt}
          handleShareParticipants={handleShareParticipants}
          sortedTable={sortedTable}
          participantEntries={participantEntries || []}
          hasFixtures={hasFixtures}
          individualPool={individualPool || []}
          isSeasonCoop={isSeasonCoop}
          isHybrid={isHybrid}
          groupStageMatches={groupStageMatches}
          hasPlayoffs={hasPlayoffs}
          areGroupStageMatchesComplete={areGroupStageMatchesComplete}
          handleGeneratePlayoffs={handleGeneratePlayoffs}
          setShowRegisterPlayers={setShowRegisterPlayers}
          setShowTeamDraftDialog={setShowTeamDraftDialog}
          setShowGenerateConfirm={setShowGenerateConfirm}
          setShowStartSeasonConfirm={setShowStartSeasonConfirm}
          setShowDrawDialog={setShowDrawDialog}
          setShowManualPairingDialog={setShowManualPairingDialog}
          setShowGroupDrawDialog={setShowGroupDrawDialog}
          setShowFinishGroupStageConfirm={setShowFinishGroupStageConfirm}
          setShowFinishSeasonConfirm={setShowFinishSeasonConfirm}
        />
      </div>

      {/* Main Tournament Table & Insights Container */}
      <div
        className={cn(
          'w-full mx-auto px-2 sm:px-4 pb-8 transition-all duration-700 ease-in-out mt-6',
          isPlayoffActive
            ? 'w-full max-w-[100vw] xl:max-w-[98vw] 2xl:max-w-[96vw] px-1 sm:px-3 xl:px-6'
            : 'w-full max-w-5xl xl:max-w-6xl'
        )}
      >
        <div className="space-y-6 sm:space-y-10">
          <div className="w-full">
            <LeagueTable
              tableData={sortedTable as any}
              isLoading={isLoadingTableFinal}
              onRemovePlayer={(entry) => withAdminCheck(() => setDeletingEntry(entry))}
              onToggleDivision={(entry) => withAdminCheck(() => handleTogglePlayerDivision(entry))}
              onSelectPlayer={setSelectedPlayerForStats}
              seasonStatus={activeSeason?.status}
              seasonType={activeSeason?.type}
              isAdmin={isAdmin}
              defendingChampionId={defendingChampionId}
              matches={matches || []}
              playersById={playersById}
              teamsById={teamsById}
              activeSeason={activeSeason}
              activeTab={activeLeagueTab}
              onTabChange={setActiveLeagueTab}
              selectedDivision={selectedDivision}
              onDivisionChange={(div) => {
                setSelectedDivision(div);
                if (div === 'div-2') {
                  setActiveLeagueTab('standings');
                } else {
                  if (activeSeason?.type === 'Hybrid') {
                    setActiveLeagueTab('group_a');
                  } else {
                    setActiveLeagueTab('standings');
                  }
                }
              }}
            />
          </div>

          <div className="space-y-6 sm:space-y-8">
            <div className="flex flex-col gap-1 items-center justify-center">
              <h2 className="font-black text-lg sm:text-2xl uppercase tracking-[0.2em] sm:tracking-[0.3em] text-primary italic pr-4 text-center">
                Season Insights & Management
              </h2>
              <div className="h-1 w-16 sm:w-20 bg-primary rounded-full shadow-[0_0_15px_rgba(204,253,1,0.6)]" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
              <div className="lg:col-span-8">
                <LeagueStats
                  tableData={currentTableForWidth as any}
                  matches={matches || []}
                  isLoading={isLoadingTable || isLoadingPlayers || isLoadingMatches}
                  seasonType={activeDivisionFormat}
                  isSeasonCoop={
                    activeDivisionFormat === 'Co-Op' || activeDivisionFormat === 'Co-Op Hybrid'
                  }
                />
              </div>
              <div className="lg:col-span-4">
                <SeasonFinancialHub
                  activeSeason={activeSeason}
                  participantEntries={participantEntries}
                  teamsById={teamsById}
                  isAdmin={isAdmin}
                  onPaymentToggle={handlePaymentToggle}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modularized Popups and Alert Dialogs */}
      <LeagueDialogsDeck
        passwordPrompt={passwordPrompt}
        setPasswordPrompt={setPasswordPrompt}
        passwordInput={passwordInput}
        setPasswordInput={setPasswordInput}
        handlePasswordCheck={handlePasswordCheck}
        isAdmin={isAdmin}
        showCreateSeason={showCreateSeason}
        setShowCreateSeason={setShowCreateSeason}
        editingSeason={editingSeason}
        setEditingSeason={setEditingSeason}
        newSeasonName={newSeasonName}
        setNewSeasonName={setNewSeasonName}
        newSeasonFee={newSeasonFee}
        setNewSeasonFee={setNewSeasonFee}
        newSponsorshipAmount={newSponsorshipAmount}
        setNewSponsorshipAmount={setNewSponsorshipAmount}
        newSeasonType={newSeasonType}
        setNewSeasonType={setNewSeasonType}
        newSeasonThemeKey={newSeasonThemeKey}
        setNewSeasonThemeKey={setNewSeasonThemeKey}
        newHybridMeetings={newHybridMeetings}
        setNewHybridMeetings={setNewHybridMeetings}
        newHasDivisions={newHasDivisions}
        setNewHasDivisions={setNewHasDivisions}
        newDivision1Name={newDivision1Name}
        setNewDivision1Name={setNewDivision1Name}
        newDivision2Name={newDivision2Name}
        setNewDivision2Name={setNewDivision2Name}
        newDivision2Format={newDivision2Format}
        setNewDivision2Format={setNewDivision2Format}
        newDivision2HasPlayoff={newDivision2HasPlayoff}
        setNewDivision2HasPlayoff={setNewDivision2HasPlayoff}
        newPromotionSpots={newPromotionSpots}
        setNewPromotionSpots={setNewPromotionSpots}
        newRelegationSpots={newRelegationSpots}
        setNewRelegationSpots={setNewRelegationSpots}
        dateRange={dateRange}
        setDateRange={setDateRange}
        handleSeasonDialogSubmit={handleSeasonDialogSubmit}
        deletingSeason={deletingSeason}
        setDeletingSeason={setDeletingSeason}
        handleDeleteSeason={() => deletingSeason && handleDeleteSeason(deletingSeason)}
        deletingEntry={deletingEntry}
        setDeletingEntry={setDeletingEntry}
        handleDeleteEntry={() => deletingEntry && handleDeleteEntry(deletingEntry)}
        showFinishSeasonConfirm={showFinishSeasonConfirm}
        setShowFinishSeasonConfirm={setShowFinishSeasonConfirm}
        handleUpdateSeasonStatus={handleUpdateSeasonStatus}
        showFinishGroupStageConfirm={showFinishGroupStageConfirm}
        setShowFinishGroupStageConfirm={setShowFinishGroupStageConfirm}
        handleGeneratePlayoffs={handleGeneratePlayoffs}
        showGenerateConfirm={showGenerateConfirm}
        setShowGenerateConfirm={setShowGenerateConfirm}
        handleGenerateFixtures={handleGenerateFixtures}
        showStartSeasonConfirm={showStartSeasonConfirm}
        setShowStartSeasonConfirm={setShowStartSeasonConfirm}
        showRegisterPlayers={showRegisterPlayers}
        setShowRegisterPlayers={setShowRegisterPlayers}
        handleRegisterPlayers={handleRegisterPlayers}
        showDrawDialog={showDrawDialog}
        setShowDrawDialog={setShowDrawDialog}
        showManualPairingDialog={showManualPairingDialog}
        setShowManualPairingDialog={setShowManualPairingDialog}
        showGroupDrawDialog={showGroupDrawDialog}
        setShowGroupDrawDialog={setShowGroupDrawDialog}
        showTeamDraftDialog={showTeamDraftDialog}
        setShowTeamDraftDialog={setShowTeamDraftDialog}
        handleSavePairs={handleSavePairs}
        handleSaveGroups={handleSaveGroups}
        handleSaveTeamDraftResults={handleSaveTeamDraftResults}
        handleRemovePlayerFromRegistration={handleRemovePlayerFromRegistration}
        selectedPlayerForStats={selectedPlayerForStats}
        setSelectedPlayerForStats={setSelectedPlayerForStats}
        shareDialogOpen={shareDialogOpen}
        setShareDialogOpen={setShareDialogOpen}
        shareText={shareText}
        activeSeason={activeSeason}
        allPlayers={allPlayers}
        individualPool={individualPool}
        coopLeagueTable={coopLeagueTable}
        singleLeagueTable={singleLeagueTable}
        allTeams={allTeams}
        matches={matches}
        playersById={playersById}
        teamsById={teamsById}
        defendingChampionId={defendingChampionId}
        isSeasonCoop={isSeasonCoop}
        hasFixtures={hasFixtures}
        participantEntries={participantEntries || []}
        isLoadingPlayers={isLoadingPlayers}
      />
    </div>
  );
}
