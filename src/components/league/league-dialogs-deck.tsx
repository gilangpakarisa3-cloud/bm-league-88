'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { UserPlus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AdminAuthDialog } from '@/components/league/admin-auth-dialog';
import { useTranslation } from '@/hooks/use-translation';
import type {
  Season,
  LeagueEntry,
  Player,
  WithId,
  Match,
  Team,
  CoOpLeagueEntry,
  PlayerWithTeam,
} from '@/lib/types';

const CreateSeasonDialog = dynamic(
  () => import('@/components/league/create-season-dialog').then((mod) => mod.CreateSeasonDialog),
  { ssr: false }
);
const GenerateFixturesDialog = dynamic(
  () => import('@/components/league/generate-fixtures-dialog').then((mod) => mod.GenerateFixturesDialog),
  { ssr: false }
);
const StartSeasonDialog = dynamic(
  () => import('@/components/league/start-season-dialog').then((mod) => mod.StartSeasonDialog),
  { ssr: false }
);
const RegisterPlayersForm = dynamic(
  () => import('@/components/register-players-form').then((mod) => mod.RegisterPlayersForm),
  { ssr: false }
);
const CoopDrawDialog = dynamic(
  () => import('@/components/coop-draw-dialog').then((mod) => mod.CoopDrawDialog),
  { ssr: false }
);
const CoopManualPairingDialog = dynamic(
  () => import('@/components/coop-manual-pairing-dialog').then((mod) => mod.CoopManualPairingDialog),
  { ssr: false }
);
const GroupDrawDialog = dynamic(
  () => import('@/components/group-draw-dialog').then((mod) => mod.GroupDrawDialog),
  { ssr: false }
);
const TeamDraftDialog = dynamic(
  () => import('@/components/team-draft-dialog').then((mod) => mod.TeamDraftDialog),
  { ssr: false }
);
const ShareDialog = dynamic(
  () => import('@/components/share-dialog').then((mod) => mod.ShareDialog),
  { ssr: false }
);
const PlayerPerformanceDialog = dynamic(
  () => import('@/components/player-performance-dialog').then((mod) => mod.PlayerPerformanceDialog),
  { ssr: false }
);

export interface LeagueDialogsDeckProps {
  // Admin auth
  passwordPrompt: { open: boolean; action?: () => void };
  setPasswordPrompt: React.Dispatch<React.SetStateAction<{ open: boolean; action?: () => void }>>;
  passwordInput: string;
  setPasswordInput: (val: string) => void;
  handlePasswordCheck: () => void;
  isAdmin: boolean;

  // Create / Edit Season
  showCreateSeason: boolean;
  setShowCreateSeason: (open: boolean) => void;
  editingSeason: WithId<Season> | null;
  setEditingSeason: (season: WithId<Season> | null) => void;
  newSeasonName: string;
  setNewSeasonName: (val: string) => void;
  newSeasonFee: number | string;
  setNewSeasonFee: (val: number | string) => void;
  newSponsorshipAmount: number | string;
  setNewSponsorshipAmount: (val: number | string) => void;
  newSeasonType: Season['type'];
  setNewSeasonType: (val: Season['type']) => void;
  newSeasonThemeKey: Season['themeKey'];
  setNewSeasonThemeKey: (val: Season['themeKey']) => void;
  newHybridMeetings: 1 | 2;
  setNewHybridMeetings: (val: 1 | 2) => void;
  newHasDivisions: boolean;
  setNewHasDivisions: (val: boolean) => void;
  newDivision1Name: string;
  setNewDivision1Name: (val: string) => void;
  newDivision2Name: string;
  setNewDivision2Name: (val: string) => void;
  newDivision2Format: Season['division2Format'];
  setNewDivision2Format: (val: Season['division2Format']) => void;
  newDivision2HasPlayoff: boolean;
  setNewDivision2HasPlayoff: (val: boolean) => void;
  newPromotionSpots: number;
  setNewPromotionSpots: (val: number) => void;
  newRelegationSpots: number;
  setNewRelegationSpots: (val: number) => void;
  dateRange: { from: Date | undefined; to: Date | undefined };
  setDateRange: (val: { from: Date | undefined; to: Date | undefined }) => void;
  handleSeasonDialogSubmit: () => void;

  // Delete Alert Dialogs
  deletingSeason: WithId<Season> | null;
  setDeletingSeason: (s: WithId<Season> | null) => void;
  handleDeleteSeason: () => void;
  deletingEntry: WithId<LeagueEntry> | null;
  setDeletingEntry: (e: WithId<LeagueEntry> | null) => void;
  handleDeleteEntry: () => void;

  // Status & Confirmation Dialogs
  showFinishSeasonConfirm: boolean;
  setShowFinishSeasonConfirm: (open: boolean) => void;
  handleUpdateSeasonStatus: (status: 'In Progress' | 'Completed') => void;
  showFinishGroupStageConfirm: boolean;
  setShowFinishGroupStageConfirm: (open: boolean) => void;
  handleGeneratePlayoffs: () => void;
  showGenerateConfirm: boolean;
  setShowGenerateConfirm: (open: boolean) => void;
  handleGenerateFixtures: () => void;
  showStartSeasonConfirm: boolean;
  setShowStartSeasonConfirm: (open: boolean) => void;

  // Registration & Tournament Dialogs
  showRegisterPlayers: boolean;
  setShowRegisterPlayers: (open: boolean) => void;
  handleRegisterPlayers: (playerIds: string[], targetDivision?: 'div-1' | 'div-2') => void;
  showDrawDialog: boolean;
  setShowDrawDialog: (open: boolean) => void;
  showManualPairingDialog: boolean;
  setShowManualPairingDialog: (open: boolean) => void;
  showGroupDrawDialog: boolean;
  setShowGroupDrawDialog: (open: boolean) => void;
  showTeamDraftDialog: boolean;
  setShowTeamDraftDialog: (open: boolean) => void;
  handleSavePairs: (pairs: any[]) => void;
  handleSaveGroups: (groups: { groupA: any[]; groupB: any[] }) => void;
  handleSaveTeamDraftResults: (assignments: any[]) => void;
  handleRemovePlayerFromRegistration: (id: string, name: string) => void;

  // Stats & Share
  selectedPlayerForStats: WithId<LeagueEntry> | null;
  setSelectedPlayerForStats: (p: WithId<LeagueEntry> | null) => void;
  shareDialogOpen: boolean;
  setShareDialogOpen: (open: boolean) => void;
  shareText: string;

  // Collections
  activeSeason: WithId<Season> | null;
  allPlayers?: WithId<Player>[] | null;
  individualPool?: WithId<LeagueEntry>[] | null;
  coopLeagueTable?: WithId<CoOpLeagueEntry>[] | null;
  singleLeagueTable?: WithId<LeagueEntry>[] | null;
  allTeams?: WithId<Team>[] | null;
  matches?: WithId<Match>[] | null;
  playersById: Record<string, PlayerWithTeam>;
  teamsById: Record<string, WithId<Team>>;
  defendingChampionId?: string;
  isSeasonCoop: boolean;
  hasFixtures: boolean;
  participantEntries: (WithId<LeagueEntry> | WithId<CoOpLeagueEntry>)[];
  isLoadingPlayers?: boolean;
}

export function LeagueDialogsDeck({
  passwordPrompt,
  setPasswordPrompt,
  passwordInput,
  setPasswordInput,
  handlePasswordCheck,
  isAdmin,
  showCreateSeason,
  setShowCreateSeason,
  editingSeason,
  setEditingSeason,
  newSeasonName,
  setNewSeasonName,
  newSeasonFee,
  setNewSeasonFee,
  newSponsorshipAmount,
  setNewSponsorshipAmount,
  newSeasonType,
  setNewSeasonType,
  newSeasonThemeKey,
  setNewSeasonThemeKey,
  newHybridMeetings,
  setNewHybridMeetings,
  newHasDivisions,
  setNewHasDivisions,
  newDivision1Name,
  setNewDivision1Name,
  newDivision2Name,
  setNewDivision2Name,
  newDivision2Format,
  setNewDivision2Format,
  newDivision2HasPlayoff,
  setNewDivision2HasPlayoff,
  newPromotionSpots,
  setNewPromotionSpots,
  newRelegationSpots,
  setNewRelegationSpots,
  dateRange,
  setDateRange,
  handleSeasonDialogSubmit,
  deletingSeason,
  setDeletingSeason,
  handleDeleteSeason,
  deletingEntry,
  setDeletingEntry,
  handleDeleteEntry,
  showFinishSeasonConfirm,
  setShowFinishSeasonConfirm,
  handleUpdateSeasonStatus,
  showFinishGroupStageConfirm,
  setShowFinishGroupStageConfirm,
  handleGeneratePlayoffs,
  showGenerateConfirm,
  setShowGenerateConfirm,
  handleGenerateFixtures,
  showStartSeasonConfirm,
  setShowStartSeasonConfirm,
  showRegisterPlayers,
  setShowRegisterPlayers,
  handleRegisterPlayers,
  showDrawDialog,
  setShowDrawDialog,
  showManualPairingDialog,
  setShowManualPairingDialog,
  showGroupDrawDialog,
  setShowGroupDrawDialog,
  showTeamDraftDialog,
  setShowTeamDraftDialog,
  handleSavePairs,
  handleSaveGroups,
  handleSaveTeamDraftResults,
  handleRemovePlayerFromRegistration,
  selectedPlayerForStats,
  setSelectedPlayerForStats,
  shareDialogOpen,
  setShareDialogOpen,
  shareText,
  activeSeason,
  allPlayers,
  individualPool,
  coopLeagueTable,
  singleLeagueTable,
  allTeams,
  matches,
  playersById,
  teamsById,
  defendingChampionId,
  isSeasonCoop,
  hasFixtures,
  participantEntries,
  isLoadingPlayers,
}: LeagueDialogsDeckProps) {
  const { t } = useTranslation();

  return (
    <>
      <AdminAuthDialog
        open={passwordPrompt.open}
        onOpenChange={(isOpen) => !isOpen && setPasswordPrompt({ open: false })}
        passwordInput={passwordInput}
        setPasswordInput={setPasswordInput}
        onAuthorize={handlePasswordCheck}
      />

      {showCreateSeason && (
        <CreateSeasonDialog
        open={showCreateSeason}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setShowCreateSeason(false);
            setEditingSeason(null);
          }
        }}
        editingSeason={editingSeason}
        newSeasonType={newSeasonType}
        setNewSeasonType={setNewSeasonType}
        newHybridMeetings={newHybridMeetings}
        setNewHybridMeetings={setNewHybridMeetings}
        newHasDivisions={newHasDivisions}
        setNewHasDivisions={setNewHasDivisions}
        newDivision1Name={newDivision1Name}
        setNewDivision1Name={setNewDivision1Name}
        newDivision2Name={newDivision2Name}
        setNewDivision2Name={setNewDivision2Name}
        newDivision2HasPlayoff={newDivision2HasPlayoff}
        setNewDivision2HasPlayoff={setNewDivision2HasPlayoff}
        newRelegationSpots={newRelegationSpots}
        setNewRelegationSpots={setNewRelegationSpots}
        newPromotionSpots={newPromotionSpots}
        setNewPromotionSpots={setNewPromotionSpots}
        newSeasonName={newSeasonName}
        setNewSeasonName={setNewSeasonName}
        newSeasonThemeKey={newSeasonThemeKey}
        setNewSeasonThemeKey={setNewSeasonThemeKey}
        newSeasonFee={newSeasonFee}
        setNewSeasonFee={setNewSeasonFee}
        newSponsorshipAmount={newSponsorshipAmount}
        setNewSponsorshipAmount={setNewSponsorshipAmount}
        dateRange={dateRange}
        setDateRange={setDateRange}
        onSubmit={handleSeasonDialogSubmit}
        />
      )}

      <AlertDialog open={Boolean(deletingSeason)} onOpenChange={(isOpen) => !isOpen && setDeletingSeason(null)}>
        <AlertDialogContent className="max-w-[calc(100vw-32px)] sm:max-w-md border-red-500/50 bg-card/95 backdrop-blur-xl rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl sm:text-2xl font-black tracking-tighter uppercase italic text-red-500 pr-4">
              {t('are_you_sure')}
            </AlertDialogTitle>
            <AlertDialogDescription className="font-bold text-muted-foreground uppercase tracking-widest text-[8px] sm:text-[10px]">
              {t('delete_season_confirm_desc', { seasonName: deletingSeason?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-3">
            <AlertDialogCancel className="font-black tracking-widest text-[8px] sm:text-[10px] uppercase h-10 sm:h-12 flex-1 italic">
              {t('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSeason}
              className="bg-red-500 text-white hover:bg-red-600 font-black tracking-widest text-[8px] sm:text-[10px] uppercase h-10 sm:h-12 flex-1 italic"
            >
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(deletingEntry)} onOpenChange={(isOpen) => !isOpen && setDeletingEntry(null)}>
        <AlertDialogContent className="max-w-[calc(100vw-32px)] sm:max-w-md border-red-500/50 bg-card/95 backdrop-blur-xl rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl sm:text-2xl font-black tracking-tighter uppercase italic text-red-500 pr-4">
              {t('remove_player_from_season_title')}
            </AlertDialogTitle>
            <AlertDialogDescription className="font-bold text-muted-foreground uppercase tracking-widest text-[8px] sm:text-[10px]">
              {t('remove_player_from_season_desc', { playerName: deletingEntry?.playerName })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-3">
            <AlertDialogCancel className="font-black tracking-widest text-[8px] sm:text-[10px] uppercase h-10 sm:h-12 flex-1 italic">
              {t('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteEntry}
              className="bg-red-500 text-white hover:bg-red-600 font-black tracking-widest text-[8px] sm:text-[10px] uppercase h-10 sm:h-12 flex-1 italic"
            >
              {t('remove')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showFinishSeasonConfirm} onOpenChange={setShowFinishSeasonConfirm}>
        <AlertDialogContent className="max-w-[calc(100vw-32px)] sm:max-w-md border-primary border-2 bg-card/95 backdrop-blur-xl rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl sm:text-2xl font-black tracking-tighter uppercase italic pr-4">
              {t('are_you_sure')}
            </AlertDialogTitle>
            <AlertDialogDescription className="font-bold text-muted-foreground uppercase tracking-widest text-[8px] sm:text-[10px]">
              Tindakan ini akan selesaikan musim <strong>{activeSeason?.name}</strong> secara permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-3">
            <AlertDialogCancel className="font-black tracking-widest text-[8px] sm:text-[10px] uppercase h-10 sm:h-12 flex-1 italic">
              {t('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                handleUpdateSeasonStatus('Completed');
                setShowFinishSeasonConfirm(false);
              }}
              className="bg-primary text-black hover:bg-primary/90 font-black tracking-widest text-[8px] sm:text-[10px] uppercase h-10 sm:h-12 flex-1 italic"
            >
              Ya, Selesaikan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showFinishGroupStageConfirm} onOpenChange={setShowFinishGroupStageConfirm}>
        <AlertDialogContent className="max-w-[calc(100vw-32px)] sm:max-w-md border-primary border-2 bg-card/95 backdrop-blur-xl rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl sm:text-2xl font-black tracking-tighter uppercase italic pr-4">
              Selesaikan Fase Grup?
            </AlertDialogTitle>
            <AlertDialogDescription className="font-bold text-muted-foreground uppercase tracking-widest text-[8px] sm:text-[10px]">
              Masih ada pertandingan yang belum dimainkan. Jika dilanjutkan, sisa pertandingan akan diabaikan dan format Playoff akan dibuat.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-3">
            <AlertDialogCancel className="font-black tracking-widest text-[8px] sm:text-[10px] uppercase h-10 sm:h-12 flex-1 italic">
              {t('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleGeneratePlayoffs}
              className="bg-primary text-black hover:bg-primary/90 font-black tracking-widest text-[8px] sm:text-[10px] uppercase h-10 sm:h-12 flex-1 italic"
            >
              Lanjutkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {showGenerateConfirm && (
        <GenerateFixturesDialog
        open={showGenerateConfirm}
        onOpenChange={setShowGenerateConfirm}
        activeSeason={activeSeason}
        participantCount={participantEntries?.length || 0}
        hasFixtures={hasFixtures}
        onGenerate={handleGenerateFixtures}
        />
      )}

      {showStartSeasonConfirm && (
        <StartSeasonDialog
        open={showStartSeasonConfirm}
        onOpenChange={setShowStartSeasonConfirm}
        activeSeason={activeSeason}
        participantCount={participantEntries?.length || 0}
        matchesCount={matches?.length || 0}
        onStartSeason={() => {
          handleUpdateSeasonStatus('In Progress');
          setShowStartSeasonConfirm(false);
        }}
        />
      )}

      {/* Roster Intake Dialog */}
      {showRegisterPlayers && (
      <Dialog open={showRegisterPlayers} onOpenChange={setShowRegisterPlayers}>
        <DialogContent className="max-w-[96vw] sm:max-w-xl p-0 overflow-hidden border-2 border-primary/40 bg-[#070B14]/98 backdrop-blur-3xl rounded-3xl shadow-[0_0_90px_rgba(204,253,1,0.25)]">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_20px_rgba(204,253,1,0.9)] pointer-events-none" />

          <div className="p-5 sm:p-7 space-y-4">
            <DialogHeader className="space-y-1.5 text-left">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/15 border border-primary/40 text-primary flex items-center justify-center shadow-[0_0_20px_rgba(204,253,1,0.3)] shrink-0">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg sm:text-xl font-black uppercase italic tracking-tight font-headline text-white">
                    Registrasi Skuad <span className="text-primary">Pemain</span>
                  </DialogTitle>
                  <p className="text-[9px] font-black uppercase tracking-[0.25em] text-primary/80 font-mono">
                    ROSTER_REGISTRATION // {activeSeason?.name}
                  </p>
                </div>
              </div>
              <DialogDescription className="sr-only">
                Daftarkan atlet ke dalam turnamen {activeSeason?.name}
              </DialogDescription>
            </DialogHeader>

            <RegisterPlayersForm
              allPlayers={allPlayers || []}
              registeredPlayers={individualPool || []}
              onRegister={handleRegisterPlayers}
              isLoading={isLoadingPlayers}
              hasDivisions={activeSeason?.hasDivisions}
              division1Name={activeSeason?.division1Name}
              division2Name={activeSeason?.division2Name}
            />
          </div>
        </DialogContent>
      </Dialog>
      )}

      {showDrawDialog && (
        <CoopDrawDialog
        open={showDrawDialog}
        onOpenChange={setShowDrawDialog}
        season={activeSeason}
        registeredPlayers={individualPool || []}
        allPlayers={allPlayers || []}
        onSavePairs={handleSavePairs}
        isAdmin={isAdmin}
        onRemovePlayer={handleRemovePlayerFromRegistration}
        />
      )}

      {showManualPairingDialog && (
        <CoopManualPairingDialog
        open={showManualPairingDialog}
        onOpenChange={setShowManualPairingDialog}
        season={activeSeason}
        registeredPlayers={individualPool || []}
        allPlayersMap={playersById as Record<string, PlayerWithTeam>}
        onSavePairs={handleSavePairs}
        />
      )}

      {showGroupDrawDialog && (
        <GroupDrawDialog
        open={showGroupDrawDialog}
        onOpenChange={setShowGroupDrawDialog}
        season={activeSeason}
        registeredPlayers={(() => {
          const rawList = (activeSeason?.type === 'Co-Op Hybrid' ? coopLeagueTable : individualPool) || [];
          if (activeSeason?.hasDivisions && !activeSeason?.isDiv2Merged) {
            return rawList.filter((p) => p.division !== 'div-2');
          }
          return rawList;
        })()}
        onSaveGroups={handleSaveGroups}
        />
      )}

      {showTeamDraftDialog && (
        <TeamDraftDialog
        open={showTeamDraftDialog}
        onOpenChange={setShowTeamDraftDialog}
        season={activeSeason}
        registeredPlayers={(() => {
          if (isSeasonCoop) return coopLeagueTable || [];
          return (singleLeagueTable || []).map((entry) => {
            const player = playersById[entry.playerId];
            const tid = entry.teamId || player?.teamId || '';
            const team = teamsById[tid];
            return {
              ...entry,
              teamId: tid,
              teamName: team ? team.name : entry.teamName,
              player,
              team,
            };
          });
        })()}
        allTeams={allTeams || []}
        onSaveAssignments={handleSaveTeamDraftResults}
        isAdmin={isAdmin}
        />
      )}

      {shareDialogOpen && (
        <ShareDialog
          open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        title={t('share_league_participants')}
        shareText={shareText}
        />
      )}

      {Boolean(selectedPlayerForStats) && (
        <PlayerPerformanceDialog
          player={selectedPlayerForStats}
        matches={matches || []}
        allPlayers={allPlayers || []}
        allTeams={allTeams || []}
        coopLeagueTable={coopLeagueTable || []}
        singleLeagueTable={singleLeagueTable || []}
        activeSeason={activeSeason}
        totalPlayersInSeason={(isSeasonCoop ? coopLeagueTable?.length : singleLeagueTable?.length) || 0}
        open={Boolean(selectedPlayerForStats)}
        onOpenChange={() => setSelectedPlayerForStats(null)}
        isAdmin={isAdmin}
        defendingChampionId={defendingChampionId}
        />
      )}
    </>
  );
}

