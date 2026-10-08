'use client';

import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Scan,
  Plus,
  Pencil,
  Trash2,
  Lock,
  Unlock,
  Share2,
  Trophy,
  UserPlus,
  Dices,
  RefreshCw,
  Play,
  Shuffle,
  Users,
  Group,
  Swords,
  Flag,
} from 'lucide-react';
import type { TISeasonTheme } from '@/lib/season-theme';
import type { Season, WithId } from '@/lib/types';

interface LeagueCockpitDeckProps {
  theme: TISeasonTheme;
  activeSeasonId: string | null;
  setActiveSeasonId: (id: string) => void;
  activeSeason: WithId<Season> | null;
  seasons: WithId<Season>[] | null;
  isLoadingSeasons: boolean;
  isAdmin: boolean;
  setIsAdmin: (val: boolean) => void;
  withAdminCheck: (action: () => void) => void;
  handleOpenCreateDialog: () => void;
  handleOpenEditDialog: () => void;
  setDeletingSeason: (season: WithId<Season>) => void;
  setPasswordPrompt: (prompt: { open: boolean; action?: () => void }) => void;
  handleShareParticipants: () => void;
  sortedTable: any[];
  participantEntries: any[];
  hasFixtures: boolean;
  individualPool: any[];
  isSeasonCoop: boolean;
  isHybrid: boolean;
  groupStageMatches: any[];
  hasPlayoffs: boolean;
  areGroupStageMatchesComplete: boolean;
  handleGeneratePlayoffs: () => void;
  setShowRegisterPlayers: (val: boolean) => void;
  setShowTeamDraftDialog: (val: boolean) => void;
  setShowGenerateConfirm: (val: boolean) => void;
  setShowStartSeasonConfirm: (val: boolean) => void;
  setShowDrawDialog: (val: boolean) => void;
  setShowManualPairingDialog: (val: boolean) => void;
  setShowGroupDrawDialog: (val: boolean) => void;
  setShowFinishGroupStageConfirm: (val: boolean) => void;
  setShowFinishSeasonConfirm: (val: boolean) => void;
}

export const LeagueCockpitDeck = ({
  theme,
  activeSeasonId,
  setActiveSeasonId,
  activeSeason,
  seasons,
  isLoadingSeasons,
  isAdmin,
  setIsAdmin,
  withAdminCheck,
  handleOpenCreateDialog,
  handleOpenEditDialog,
  setDeletingSeason,
  setPasswordPrompt,
  handleShareParticipants,
  sortedTable,
  participantEntries,
  hasFixtures,
  individualPool,
  isSeasonCoop,
  isHybrid,
  groupStageMatches,
  hasPlayoffs,
  areGroupStageMatchesComplete,
  handleGeneratePlayoffs,
  setShowRegisterPlayers,
  setShowTeamDraftDialog,
  setShowGenerateConfirm,
  setShowStartSeasonConfirm,
  setShowDrawDialog,
  setShowManualPairingDialog,
  setShowGroupDrawDialog,
  setShowFinishGroupStageConfirm,
  setShowFinishSeasonConfirm,
}: LeagueCockpitDeckProps) => {
  const { toast } = useToast();
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        'relative w-full rounded-3xl p-3.5 sm:p-5 transition-all duration-500',
        'bg-gradient-to-b from-[#0C111D]/95 via-[#070A12]/98 to-[#030508]/95',
        'border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.8)] backdrop-blur-3xl',
        'group/command-deck',
        isAdmin ? 'w-full' : 'w-full max-w-5xl mx-auto'
      )}
      style={{
        borderColor: `${theme.primaryHex}25`,
      }}
    >
      {/* Top Edge High-Voltage Laser Tracer */}
      <div
        className="absolute top-0 left-8 right-8 h-[2px] opacity-80 pointer-events-none"
        style={{
          background: `linear-gradient(to right, transparent, ${theme.primaryHex}, transparent)`,
          boxShadow: `0 0 20px ${theme.glowRgba}`,
        }}
      />

      {/* Ambient Background Glow on Hover */}
      <div
        className="absolute -inset-1 rounded-[2.2rem] blur-2xl opacity-0 group/command-deck:opacity-100 transition-opacity pointer-events-none"
        style={{
          background: `linear-gradient(to right, ${theme.primaryHex}0D, transparent, ${theme.secondaryHex}0D)`,
        }}
      />

      {/* ------------------------------------------------------------ */}
      {/* TIER 1: COCKPIT CORE NAV & SECURITY DECK                     */}
      {/* ------------------------------------------------------------ */}
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
        {/* Zone A: Unified Season Telemetry Capsule (Fixed width & no overlap) */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 min-w-0 max-w-full">
          <div
            className="flex items-center gap-2 bg-black/60 border rounded-2xl p-1.5 transition-all w-full sm:w-auto shadow-inner min-w-0"
            style={{ borderColor: `${theme.primaryHex}33` }}
          >
            {/* Scanner Icon with Telemetry Pulse */}
            <div
              className="p-2 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${theme.primaryHex}20`, color: theme.primaryHex }}
            >
              <Scan className="w-4 h-4 animate-pulse" />
            </div>

            {/* Season Dropdown with clean width and truncation */}
            <Select
              value={activeSeasonId || ''}
              onValueChange={setActiveSeasonId}
              disabled={isLoadingSeasons}
            >
              <SelectTrigger className="w-full sm:w-auto sm:min-w-[260px] max-w-full sm:max-w-[580px] lg:max-w-[700px] h-10 bg-transparent border-0 font-black uppercase italic tracking-tight text-xs text-white focus:ring-0 px-2.5 pr-8 whitespace-nowrap min-w-0">
                <SelectValue placeholder={t('select_a_season')} />
              </SelectTrigger>
              <SelectContent className="bg-[#070B14]/98 border border-white/20 rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.9)] backdrop-blur-2xl">
                {seasons?.map((season) => (
                  <SelectItem
                    key={season.id}
                    value={season.id}
                    className="font-black uppercase italic text-xs text-white/90 focus:bg-white/10 focus:text-white py-2.5 px-3 rounded-xl cursor-pointer"
                  >
                    {season.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status Indicator Chip inside capsule */}
            {activeSeason && (
              <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/5 shrink-0 ml-auto">
                <div
                  className={cn(
                    'w-1.5 h-1.5 rounded-full',
                    activeSeason.status === 'In Progress'
                      ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                      : activeSeason.status === 'Completed'
                      ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]'
                      : 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]'
                  )}
                />
                <span className="text-[9px] font-black uppercase tracking-wider font-mono text-white/70">
                  {activeSeason.status === 'In Progress'
                    ? 'ACTIVE'
                    : activeSeason.status === 'Completed'
                    ? 'DONE'
                    : 'STANDBY'}
                </span>
              </div>
            )}
          </div>

          {/* Season Management Micro-Dock (Integrated right beside capsule) */}
          {isAdmin && (
            <div className="flex items-center gap-1.5 bg-black/40 border border-white/10 p-1 rounded-2xl shadow-inner shrink-0">
              <Button
                onClick={() => withAdminCheck(handleOpenCreateDialog)}
                size="icon"
                className="h-10 w-10 rounded-xl transition-all shadow-md"
                style={{
                  backgroundColor: `${theme.primaryHex}20`,
                  color: theme.primaryHex,
                  borderColor: `${theme.primaryHex}40`,
                }}
                title="Tambah Musim Baru"
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => withAdminCheck(handleOpenEditDialog)}
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/30 hover:bg-white/[0.08] transition-all text-white/80 disabled:opacity-30"
                disabled={!activeSeason || activeSeason.status !== 'Not Started'}
                title="Edit Musim"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => activeSeason && withAdminCheck(() => setDeletingSeason(activeSeason))}
                variant="destructive"
                size="icon"
                className="h-10 w-10 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all disabled:opacity-30"
                disabled={!activeSeason}
                title="Hapus Musim"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Zone B: Security & System Utility Pod */}
        <div className="flex items-center justify-between sm:justify-end gap-2 w-full lg:w-auto">
          {/* Admin Key Switcher */}
          <Button
            onClick={() => {
              if (isAdmin) {
                setIsAdmin(false);
                toast({
                  title: 'ADMIN MODE LOCKED',
                  description: 'Otorisasi administratif telah dikunci kembali.',
                });
              } else {
                setPasswordPrompt({ open: true, action: () => setIsAdmin(true) });
              }
            }}
            className={cn(
              'h-11 px-5 font-black text-[10px] sm:text-[11px] uppercase tracking-wider rounded-2xl transition-all duration-300 flex items-center gap-2 shadow-lg font-headline italic border',
              isAdmin ? 'text-black shadow-lg hover:brightness-110' : 'hover:brightness-125'
            )}
            style={
              isAdmin
                ? {
                    backgroundColor: theme.primaryHex,
                    color: theme.themeKey === 'crimson' ? '#ffffff' : '#000000',
                    borderColor: theme.primaryHex,
                    boxShadow: `0 0 25px ${theme.glowRgba}`,
                  }
                : {
                    backgroundColor: `${theme.primaryHex}15`,
                    color: theme.primaryHex,
                    borderColor: `${theme.primaryHex}44`,
                  }
            }
          >
            {isAdmin ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
            <span>{isAdmin ? t('lock_admin') : t('unlock_admin')}</span>
          </Button>

          {/* Utility Sub-Dock (Share & Trophy) */}
          <div className="flex items-center gap-1.5 bg-black/40 border border-white/10 p-1 rounded-2xl shadow-inner shrink-0">
            <Button
              onClick={handleShareParticipants}
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-primary/15 hover:text-primary hover:border-primary/40 transition-all text-white/70 disabled:opacity-30"
              disabled={!sortedTable || sortedTable.length === 0}
              title={t('share_participants')}
            >
              <Share2 className="h-4 w-4" />
            </Button>
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-yellow-500/20 hover:text-yellow-400 hover:border-yellow-500/40 transition-all text-white/70"
              title={t('view_champion')}
            >
              <Link href={`/league/winner?seasonId=${activeSeasonId}`}>
                <Trophy className="h-4 w-4 text-yellow-400" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------ */}
      {/* TIER 2: TACTICAL MISSION RUNWAY (When Admin is Active)       */}
      {/* ------------------------------------------------------------ */}
      {isAdmin && activeSeason && (
        <div className="mt-4 pt-3.5 border-t border-white/10 relative z-10">
          {/* Telemetry Runway Micro-Header */}
          <div className="flex items-center justify-between mb-2.5 px-1">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
              <span className="text-[9px] font-black uppercase tracking-[0.25em] text-white/40 font-mono">
                TACTICAL_MISSION_CONTROLS // STEP_SEQUENCER
              </span>
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest text-primary/70 font-mono">
              {activeSeason.type ? activeSeason.type.toUpperCase() : 'STANDARD'} LEAGUE FORMAT
            </span>
          </div>

          {/* Tournament Action Pipeline */}
          {activeSeason.status === 'Not Started' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {/* Step 01: Daftarkan Pemain */}
              <Button
                onClick={() => withAdminCheck(() => setShowRegisterPlayers(true))}
                variant="outline"
                className="h-13 py-2 px-3.5 rounded-2xl bg-[#09101C] border border-cyan-500/30 hover:border-cyan-400 hover:bg-cyan-500/10 transition-all flex items-center justify-between group/action text-left shadow-sm hover:shadow-[0_0_20px_rgba(6,182,212,0.2)]"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shrink-0 group-hover/action:scale-110 transition-transform shadow-[0_0_10px_rgba(6,182,212,0.3)]">
                    <UserPlus className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-[8px] font-black uppercase tracking-wider text-cyan-400/70 font-mono">
                      STEP 01 // ROSTER
                    </div>
                    <div className="text-[11px] font-black uppercase tracking-tight text-white font-headline italic">
                      {t('register_players')}
                    </div>
                  </div>
                </div>
                <div className="text-[10px] font-black text-white/30 group-hover/action:text-cyan-400 transition-colors font-mono">
                  [01]
                </div>
              </Button>

              {/* Step 02: Team Draft */}
              <Button
                onClick={() => withAdminCheck(() => setShowTeamDraftDialog(true))}
                disabled={(participantEntries?.length ?? 0) < 2}
                variant="outline"
                className="h-13 py-2 px-3.5 rounded-2xl bg-[#140E05] border border-amber-500/35 hover:border-amber-400 hover:bg-amber-500/15 transition-all flex items-center justify-between group/action text-left shadow-[0_0_20px_rgba(245,158,11,0.12)] hover:shadow-[0_0_25px_rgba(245,158,11,0.25)] disabled:opacity-40"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0 group-hover/action:scale-110 transition-transform shadow-[0_0_12px_rgba(245,158,11,0.3)]">
                    <Dices className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-[8px] font-black uppercase tracking-wider text-amber-400/80 font-mono">
                      STEP 02 // DRAFT
                    </div>
                    <div className="text-[11px] font-black uppercase tracking-tight text-amber-300 font-headline italic">
                      TEAM DRAFT
                    </div>
                  </div>
                </div>
                <div className="text-[10px] font-black text-amber-500/50 group-hover/action:text-amber-400 transition-colors font-mono">
                  [02]
                </div>
              </Button>

              {/* Step 03: Buat Jadwal */}
              <Button
                onClick={() => withAdminCheck(() => setShowGenerateConfirm(true))}
                disabled={(participantEntries?.length ?? 0) < 2}
                variant="outline"
                className="h-13 py-2 px-3.5 rounded-2xl bg-[#0F0C1C] border border-indigo-500/30 hover:border-indigo-400 hover:bg-indigo-500/10 transition-all flex items-center justify-between group/action text-left shadow-sm hover:shadow-[0_0_20px_rgba(99,102,241,0.2)] disabled:opacity-40"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0 group-hover/action:scale-110 transition-transform shadow-[0_0_10px_rgba(99,102,241,0.3)]">
                    <RefreshCw className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-[8px] font-black uppercase tracking-wider text-indigo-400/70 font-mono">
                      STEP 03 // MATCHES
                    </div>
                    <div className="text-[11px] font-black uppercase tracking-tight text-white font-headline italic truncate max-w-[130px]">
                      {hasFixtures ? t('regenerate_fixtures') : t('generate_fixtures')}
                    </div>
                  </div>
                </div>
                <div className="text-[10px] font-black text-white/30 group-hover/action:text-indigo-400 transition-colors font-mono">
                  [03]
                </div>
              </Button>

              {/* Step 04: Mulai Musim (Apex Launch Button) */}
              <Button
                onClick={() => withAdminCheck(() => setShowStartSeasonConfirm(true))}
                className="h-13 py-2 px-4 rounded-2xl bg-primary text-black hover:bg-primary/90 shadow-[0_0_35px_rgba(204,253,1,0.45)] hover:shadow-[0_0_45px_rgba(204,253,1,0.65)] transition-all flex items-center justify-between group/action text-left border border-primary/50 disabled:opacity-40 disabled:hover:shadow-none"
                disabled={!hasFixtures || (sortedTable || []).length < 2}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-black text-primary flex items-center justify-center shrink-0 group-hover/action:scale-110 transition-transform shadow-md">
                    <Play className="h-4 w-4 fill-primary" />
                  </div>
                  <div>
                    <div className="text-[8px] font-black uppercase tracking-wider text-black/70 font-mono">
                      APEX STEP // LAUNCH
                    </div>
                    <div className="text-[11px] font-black uppercase tracking-tight text-black font-headline italic">
                      {t('start_season')}
                    </div>
                  </div>
                </div>
                <div className="text-[10px] font-black text-black/60 group-hover/action:translate-x-0.5 transition-transform font-mono">
                  [GO ▶]
                </div>
              </Button>
            </div>
          )}

          {/* Special Controls: Co-op & Hybrid (if applicable) */}
          {activeSeason.status === 'Not Started' && (isSeasonCoop || activeSeason.type === 'Hybrid') && (
            <div className="flex flex-wrap items-center gap-2 mt-2.5 pt-2.5 border-t border-white/5">
              <span className="text-[9px] font-black uppercase tracking-wider text-white/40 font-mono mr-1">
                FORMAT_EXTENSIONS:
              </span>
              {isSeasonCoop && (
                <>
                  <Button
                    onClick={() => withAdminCheck(() => setShowDrawDialog(true))}
                    disabled={(individualPool?.length ?? 0) < 2}
                    variant="outline"
                    className="h-9 px-3.5 font-black text-[10px] uppercase tracking-wider rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20 transition-all flex items-center gap-1.5"
                  >
                    <Shuffle className="h-3.5 w-3.5 text-blue-400" />
                    UNDI PASANGAN
                  </Button>
                  <Button
                    onClick={() => withAdminCheck(() => setShowManualPairingDialog(true))}
                    disabled={(individualPool?.length ?? 0) < 2}
                    variant="outline"
                    className="h-9 px-3.5 font-black text-[10px] uppercase tracking-wider rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20 transition-all flex items-center gap-1.5"
                  >
                    <Users className="h-3.5 w-3.5 text-cyan-400" />
                    PASANG MANUAL
                  </Button>
                </>
              )}
              {activeSeason.type === 'Hybrid' && (
                <Button
                  onClick={() => withAdminCheck(() => setShowGroupDrawDialog(true))}
                  disabled={(participantEntries?.length ?? 0) < 2}
                  variant="outline"
                  className="h-9 px-3.5 font-black text-[10px] uppercase tracking-wider rounded-xl bg-white/[0.03] border border-white/10 hover:border-primary/40 transition-all flex items-center gap-1.5 text-white/80"
                >
                  <Group className="h-3.5 w-3.5 text-primary" />
                  UNDI GRUP
                </Button>
              )}
            </div>
          )}

          {/* Tournament Action Pipeline: In Progress */}
          {activeSeason.status === 'In Progress' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {isHybrid && groupStageMatches.length > 0 && !hasPlayoffs && (
                <Button
                  onClick={() =>
                    areGroupStageMatchesComplete
                      ? withAdminCheck(handleGeneratePlayoffs)
                      : withAdminCheck(() => setShowFinishGroupStageConfirm(true))
                  }
                  className="h-13 px-5 font-black text-[11px] uppercase tracking-wider rounded-2xl bg-gradient-to-r from-amber-400 via-primary to-amber-300 text-black shadow-[0_0_35px_rgba(245,158,11,0.4)] hover:brightness-110 transition-all flex items-center justify-between group/playoff font-headline italic"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-black text-amber-400 flex items-center justify-center shrink-0">
                      <Swords className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-[8px] font-black uppercase tracking-wider text-black/70 font-mono">
                        KNOCKOUT PHASE
                      </div>
                      <div className="text-xs font-black uppercase tracking-tight">
                        START PLAYOFF ROUND
                      </div>
                    </div>
                  </div>
                  <div className="text-[10px] font-black text-black/70 font-mono">[PLAYOFF ▶]</div>
                </Button>
              )}
              <Button
                onClick={() => withAdminCheck(() => setShowFinishSeasonConfirm(true))}
                variant="destructive"
                className="h-13 px-5 font-black text-[11px] uppercase tracking-wider rounded-2xl bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-white transition-all flex items-center justify-between group/finish font-headline italic shadow-sm hover:shadow-[0_0_25px_rgba(239,68,68,0.3)]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-red-500/20 text-red-400 group-hover/finish:bg-white group-hover/finish:text-red-500 flex items-center justify-center shrink-0 transition-colors">
                    <Flag className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-[8px] font-black uppercase tracking-wider text-red-400/80 group-hover/finish:text-white/80 font-mono">
                      SEASON FINALE
                    </div>
                    <div className="text-xs font-black uppercase tracking-tight">
                      {t('finish_season')}
                    </div>
                  </div>
                </div>
                <div className="text-[10px] font-black text-red-400/70 group-hover/finish:text-white font-mono">
                  [FINISH 🏁]
                </div>
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
