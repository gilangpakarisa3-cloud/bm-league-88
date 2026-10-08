'use client';

import { useState, useMemo } from 'react';
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
import type { Player, Team, WithId, SeasonRecord } from '@/lib/types';
import { useCollection, deleteDocumentNonBlocking } from '@/firebase';
import { useFirestore, useMemoFirebase } from '@/firebase/provider';
import { collection, doc } from 'firebase/firestore';
import { Skeleton } from './ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useTranslation } from '@/hooks/use-translation';
import { Card, CardContent, CardFooter, CardHeader } from './ui/card';
import { Button } from './ui/button';
import { 
  User, 
  Pencil, 
  Trash2, 
  Shield, 
  Trophy, 
  Target, 
  Zap, 
  Activity, 
  Users, 
  Scan, 
  Star, 
  Medal, 
  Binary, 
  Search, 
  LayoutGrid, 
  ListOrdered, 
  Flame, 
  Gauge, 
  Sparkles,
  TrendingUp,
  X,
  Crosshair,
  Crown
} from 'lucide-react';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';
import { Progress } from './ui/progress';
import { Input } from './ui/input';
import { PlayerHoloCard } from './player/player-holo-card';
import { PlayerMobilePod } from './player/player-mobile-pod';
import { PlayerTelemetryTable } from './player/player-telemetry-table';

export { PlayerHoloCard } from './player/player-holo-card';
export { PlayerMobilePod } from './player/player-mobile-pod';
export { PlayerTelemetryTable } from './player/player-telemetry-table';

interface PlayerListProps {
  onEdit: (player: WithId<Player>) => void;
  isAdmin: boolean;
  withAdminCheck: (action: () => void) => void;
  onStatsUpdate?: (stats: { totalPlayers: number; avgOvr: number; totalGoals: number; activeClubs: number }) => void;
}

export function PlayerList({ onEdit, isAdmin, withAdminCheck }: PlayerListProps) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [deletingPlayer, setDeletingPlayer] = useState<WithId<Player> | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTier, setSelectedTier] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  
  const firestore = useFirestore();

  const playersCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'players') : null),
    [firestore]
  );
  const { data: players, isLoading: isLoadingPlayers } = useCollection<Player>(playersCollection);

  const teamsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'teams') : null),
    [firestore]
  );
  const { data: teams, isLoading: isLoadingTeams } = useCollection<Team>(teamsCollection);

  const hallOfFameCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'hallOfFame') : null),
    [firestore]
  );
  const { data: hallOfFame } = useCollection<SeasonRecord>(hallOfFameCollection);
  
  // Calculate OVR and Ranks among all players
  // RULES: Players with < 20 official matches are "Not Calibrated" (ovrRating: null / unranked OVR)
  const playersWithRanks = useMemo(() => {
    if (!players) return [];
    
    // 1. Calculate OVR & calibration status for all
    const withOvr = players.map(p => {
      const played = p.overallPlayed || 0;
      const isCalibrated = played >= 20;
      const poss = played * 3;
      const actualPoints = ((p.overallWin || 0) * 3) + ((p.overallDraw || 0) * 1);
      const ovrRating = isCalibrated && poss > 0 ? (actualPoints / poss) * 100 : 0;
      const winRate = played > 0 ? ((p.overallWin || 0) / played) * 100 : 0;
      return { ...p, ovrRating, isCalibrated, winRate };
    });

    // 2. Separate calibrated vs not calibrated
    const calibrated = withOvr
      .filter(p => p.isCalibrated)
      .sort((a, b) => b.ovrRating - a.ovrRating || (b.overallPlayed || 0) - (a.overallPlayed || 0))
      .map((p, index) => ({
        ...p,
        ovrRank: index + 1
      }));

    const notCalibrated = withOvr
      .filter(p => !p.isCalibrated)
      .sort((a, b) => (b.overallPlayed || 0) - (a.overallPlayed || 0) || b.winRate - a.winRate)
      .map((p) => ({
        ...p,
        ovrRank: null // unranked
      }));

    return [...calibrated, ...notCalibrated];
  }, [players]);

  const teamsById = useMemo(() => {
    if (!teams) return {};
    return teams.reduce((acc, team) => {
      acc[team.id] = team;
      return acc;
    }, {} as Record<string, WithId<Team>>);
  }, [teams]);

  // Defined Tiers configuration including NOT_CALIBRATED
  const tiersConfig = useMemo(() => {
    if (playersWithRanks.length === 0) return [];
    const calibratedPlayers = playersWithRanks.filter(p => p.isCalibrated);
    const uncalibratedPlayers = playersWithRanks.filter(p => !p.isCalibrated);

    const baseTiers = [
      { 
        id: 'LEGEND',
        title: 'Legend', 
        players: calibratedPlayers.slice(0, 4), 
        color: 'text-yellow-400', 
        borderColor: 'border-yellow-400/40 hover:border-yellow-400',
        bgPill: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/30',
        bgBadge: 'bg-yellow-400 text-black shadow-[0_0_20px_rgba(250,204,21,0.5)]',
        accentGlow: 'from-yellow-400/20 via-amber-500/10 to-transparent',
        badgeTitle: 'TITAN CLASS',
        hudBar: 'bg-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.8)]'
      },
      { 
        id: 'TOP_PLAYER',
        title: 'Top Player', 
        players: calibratedPlayers.slice(4, 8), 
        color: 'text-primary', 
        borderColor: 'border-primary/40 hover:border-primary',
        bgPill: 'bg-primary/10 text-primary border-primary/30',
        bgBadge: 'bg-primary text-black shadow-[0_0_20px_rgba(204,253,1,0.5)]',
        accentGlow: 'from-primary/20 via-primary/5 to-transparent',
        badgeTitle: 'PRO DIVISION',
        hudBar: 'bg-primary shadow-[0_0_15px_rgba(204,253,1,0.8)]'
      },
      { 
        id: 'REGULER',
        title: 'Reguler', 
        players: calibratedPlayers.slice(8, 12), 
        color: 'text-accent', 
        borderColor: 'border-accent/40 hover:border-accent',
        bgPill: 'bg-accent/10 text-accent border-accent/30',
        bgBadge: 'bg-accent text-black shadow-[0_0_20px_rgba(100,255,218,0.5)]',
        accentGlow: 'from-accent/20 via-accent/5 to-transparent',
        badgeTitle: 'CORE SQUAD',
        hudBar: 'bg-accent shadow-[0_0_15px_rgba(100,255,218,0.8)]'
      },
      { 
        id: 'AMATEUR',
        title: 'Amateur', 
        players: calibratedPlayers.slice(12), 
        color: 'text-rose-400', 
        borderColor: 'border-rose-400/40 hover:border-rose-400',
        bgPill: 'bg-rose-400/10 text-rose-400 border-rose-400/30',
        bgBadge: 'bg-rose-400 text-black shadow-[0_0_20px_rgba(251,113,133,0.5)]',
        accentGlow: 'from-rose-400/20 via-rose-500/5 to-transparent',
        badgeTitle: 'ROOKIE FIELD',
        hudBar: 'bg-rose-400 shadow-[0_0_15px_rgba(251,113,133,0.8)]'
      },
    ];

    if (uncalibratedPlayers.length > 0) {
      baseTiers.push({
        id: 'NOT_CALIBRATED',
        title: 'Not Calibrated',
        players: uncalibratedPlayers,
        color: 'text-slate-400',
        borderColor: 'border-slate-500/40 hover:border-slate-400',
        bgPill: 'bg-slate-500/10 text-slate-300 border-slate-500/30',
        bgBadge: 'bg-slate-800 text-slate-300 border border-slate-600 shadow-[0_0_15px_rgba(148,163,184,0.15)]',
        accentGlow: 'from-slate-500/15 via-slate-600/5 to-transparent',
        badgeTitle: 'PROVISIONAL (<20 MATCH)',
        hudBar: 'bg-slate-500 shadow-[0_0_10px_rgba(148,163,184,0.4)]'
      });
    }

    return baseTiers;
  }, [playersWithRanks]);

  // Overall league quick stats
  const leagueMetrics = useMemo(() => {
    const totalPlayers = playersWithRanks.length;
    if (totalPlayers === 0) return { totalPlayers: 0, avgOvr: 0, totalGoals: 0, activeClubs: 0, highestOvr: 0 };
    
    const calibratedPlayers = playersWithRanks.filter(p => p.isCalibrated);
    const avgOvr = calibratedPlayers.length > 0 
      ? Math.round(calibratedPlayers.reduce((acc, p) => acc + p.ovrRating, 0) / calibratedPlayers.length)
      : 0;
    const totalGoals = playersWithRanks.reduce((acc, p) => acc + (p.overallGoalsFor || 0), 0);
    const uniqueTeams = new Set(playersWithRanks.map(p => p.teamId).filter(Boolean)).size;
    const highestOvr = calibratedPlayers.length > 0 ? Math.round(calibratedPlayers[0]?.ovrRating || 0) : 0;

    return { totalPlayers, avgOvr, totalGoals, activeClubs: uniqueTeams, highestOvr };
  }, [playersWithRanks]);

  // Filtered players based on search query and selected tier
  const filteredTiers = useMemo(() => {
    return tiersConfig.map(tier => {
      if (selectedTier !== 'ALL' && tier.id !== selectedTier) {
        return { ...tier, players: [] };
      }

      const matching = tier.players.filter(p => {
        const team = p.teamId ? teamsById[p.teamId] : null;
        const q = searchQuery.toLowerCase().trim();
        if (!q) return true;
        return (
          p.name.toLowerCase().includes(q) ||
          (team && team.name.toLowerCase().includes(q))
        );
      });

      return { ...tier, players: matching };
    }).filter(tier => tier.players.length > 0);
  }, [tiersConfig, selectedTier, searchQuery, teamsById]);

  const allFilteredPlayers = useMemo(() => {
    return filteredTiers.flatMap(t => t.players);
  }, [filteredTiers]);

  const handleDelete = () => {
    if (!firestore || !deletingPlayer) return;
    const playerRef = doc(firestore, 'players', deletingPlayer.id);
    deleteDocumentNonBlocking(playerRef);
    toast({
      title: t('player_deleted_title'),
      description: t('player_deleted_list_desc', { playerName: deletingPlayer.name }),
    });
    setDeletingPlayer(null);
  };
  
  const confirmDelete = (player: WithId<Player>) => {
    withAdminCheck(() => {
      setDeletingPlayer(player);
    });
  };

  const isLoading = isLoadingPlayers || isLoadingTeams;

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl bg-white/5 border border-white/10" />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-[460px] rounded-3xl bg-white/5 border border-white/10" />
          ))}
        </div>
      </div>
    );
  }
  
  if (playersWithRanks.length === 0) {
    return (
      <div className="w-full overflow-hidden rounded-3xl border border-dashed border-white/15 bg-black/60 p-16 text-center backdrop-blur-2xl">
        <Users className="w-16 h-16 text-white/20 mx-auto mb-4 animate-pulse" />
        <h2 className="text-xl font-black text-white/70 uppercase tracking-widest">{t('no_players_found_title')}</h2>
        <p className="text-xs font-bold text-white/40 mt-2 uppercase tracking-tight">
          {t('no_players_found_desc')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Quick Telemetry KPI Cards Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-black/50 p-4 backdrop-blur-xl group hover:border-primary transition-all">
          <div className="absolute top-0 right-0 w-16 h-16 bg-primary/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between text-white/40 text-[9px] font-black uppercase tracking-[0.2em] mb-2">
            <span>ATHLETES_ROSTER</span>
            <Users className="w-3.5 h-3.5 text-primary" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black italic text-white tracking-tighter tabular-nums leading-none">
              {leagueMetrics.totalPlayers}
            </span>
            <span className="text-[10px] font-black uppercase text-primary tracking-widest">ACTIVE</span>
          </div>
          <div className="mt-2 h-1 w-full bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full w-full shadow-[0_0_10px_rgba(204,253,1,0.8)]" />
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-yellow-400/30 bg-black/50 p-4 backdrop-blur-xl group hover:border-yellow-400 transition-all">
          <div className="absolute top-0 right-0 w-16 h-16 bg-yellow-400/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between text-white/40 text-[9px] font-black uppercase tracking-[0.2em] mb-2">
            <span>PEAK_OVR_RATING</span>
            <Trophy className="w-3.5 h-3.5 text-yellow-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black italic text-yellow-400 tracking-tighter tabular-nums leading-none drop-shadow-[0_0_15px_rgba(250,204,21,0.4)]">
              {leagueMetrics.highestOvr}
            </span>
            <span className="text-[10px] font-black uppercase text-white/40 tracking-widest">/ 100</span>
          </div>
          <div className="mt-2 h-1 w-full bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-yellow-400 rounded-full shadow-[0_0_10px_rgba(250,204,21,0.8)]" style={{ width: `${leagueMetrics.highestOvr}%` }} />
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-accent/30 bg-black/50 p-4 backdrop-blur-xl group hover:border-accent transition-all">
          <div className="absolute top-0 right-0 w-16 h-16 bg-accent/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between text-white/40 text-[9px] font-black uppercase tracking-[0.2em] mb-2">
            <span>LEAGUE_AVERAGE</span>
            <Gauge className="w-3.5 h-3.5 text-accent" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black italic text-white tracking-tighter tabular-nums leading-none">
              {leagueMetrics.avgOvr}
            </span>
            <span className="text-[10px] font-black uppercase text-accent tracking-widest">OVR MEAN</span>
          </div>
          <div className="mt-2 h-1 w-full bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-accent rounded-full shadow-[0_0_10px_rgba(100,255,218,0.8)]" style={{ width: `${leagueMetrics.avgOvr}%` }} />
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-rose-500/30 bg-black/50 p-4 backdrop-blur-xl group hover:border-rose-500 transition-all">
          <div className="absolute top-0 right-0 w-16 h-16 bg-rose-500/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between text-white/40 text-[9px] font-black uppercase tracking-[0.2em] mb-2">
            <span>OFFENSIVE_PAYLOAD</span>
            <Flame className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black italic text-white tracking-tighter tabular-nums leading-none">
              {leagueMetrics.totalGoals}
            </span>
            <span className="text-[10px] font-black uppercase text-rose-400 tracking-widest">GOALS</span>
          </div>
          <div className="mt-2 h-1 w-full bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-rose-500 rounded-full w-3/4 shadow-[0_0_10px_rgba(244,63,94,0.8)]" />
          </div>
        </div>
      </div>

      {/* Cyberpunk Interactive Filter & View Controls */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-4 rounded-3xl border border-white/10 bg-black/60 backdrop-blur-2xl">
        {/* Real-time Search Input */}
        <div className="relative flex-1 max-w-md group/search">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 group-focus-within/search:text-primary transition-colors" />
          <Input 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Pencarian atlet, klub, ID divisi..." 
            className="h-12 pl-11 pr-10 bg-black/50 border-white/10 focus:border-primary/60 text-xs font-bold text-white placeholder:text-white/30 rounded-2xl tracking-wider uppercase transition-all"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-white/40 hover:text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Tier Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <button
            onClick={() => setSelectedTier('ALL')}
            className={cn(
              "px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap flex items-center gap-2",
              selectedTier === 'ALL'
                ? "bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.4)]"
                : "bg-white/5 text-white/50 border-white/10 hover:border-white/30 hover:text-white"
            )}
          >
            <span>ALL</span>
            <span className={cn(
              "text-[9px] px-1.5 py-0.2 rounded-md font-mono",
              selectedTier === 'ALL' ? "bg-black text-white" : "bg-white/10 text-white/70"
            )}>
              {playersWithRanks.length}
            </span>
          </button>

          {tiersConfig.map(t => {
            const count = t.players.length;
            const isSelected = selectedTier === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setSelectedTier(t.id)}
                className={cn(
                  "px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap flex items-center gap-2",
                  isSelected
                    ? cn(t.bgBadge, "border-transparent")
                    : cn("bg-white/5 border-white/10 hover:border-white/30 text-white/50 hover:", t.color)
                )}
              >
                <span>{t.title}</span>
                <span className={cn(
                  "text-[9px] px-1.5 py-0.2 rounded-md font-mono",
                  isSelected ? "bg-black text-white" : "bg-white/10 text-white/70"
                )}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* View Mode Toggle Switcher */}
        <div className="flex items-center p-1 bg-black/60 border border-white/10 rounded-2xl shrink-0 self-end md:self-auto">
          <button
            onClick={() => setViewMode('grid')}
            className={cn(
              "p-2 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-1.5",
              viewMode === 'grid' 
                ? "bg-primary text-black shadow-[0_0_15px_rgba(204,253,1,0.4)]" 
                : "text-white/40 hover:text-white"
            )}
            title="Tampilan Kartu Holo"
          >
            <LayoutGrid className="w-4 h-4" />
            <span className="hidden sm:inline text-[9px] tracking-widest">HOLO</span>
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={cn(
              "p-2 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-1.5",
              viewMode === 'table' 
                ? "bg-primary text-black shadow-[0_0_15px_rgba(204,253,1,0.4)]" 
                : "text-white/40 hover:text-white"
            )}
            title="Tampilan Tabel Telemetri"
          >
            <ListOrdered className="w-4 h-4" />
            <span className="hidden sm:inline text-[9px] tracking-widest">TABEL</span>
          </button>
        </div>
      </div>

      {allFilteredPlayers.length === 0 ? (
        <div className="w-full overflow-hidden rounded-3xl border border-white/10 bg-black/40 p-12 text-center backdrop-blur-xl">
          <Crosshair className="w-12 h-12 text-white/20 mx-auto mb-3 animate-spin-slow" />
          <h3 className="text-base font-black text-white uppercase tracking-widest">Tidak ada atlet yang cocok</h3>
          <p className="text-xs text-white/40 uppercase tracking-wider mt-1">Coba sesuaikan kata kunci pencarian atau filter tier Anda.</p>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW: Apex Holographic Athlete Cards */
        <div className="space-y-16">
          {filteredTiers.map((tier) => (
            <div key={tier.id} className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-500">
              {/* Tier Section Header Banner */}
              <div className="flex items-center justify-between px-2 border-b border-white/10 pb-3">
                <div className="flex items-center gap-3">
                  <div className={cn("w-2.5 h-7 rounded-full", tier.hudBar)} />
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className={cn("text-2xl sm:text-3xl font-black uppercase italic tracking-tighter leading-none", tier.color)}>
                        {tier.title}
                      </h2>
                      <Badge variant="outline" className={cn("text-[8px] font-black uppercase tracking-[0.25em] px-2 py-0.5 rounded-full border", tier.bgPill)}>
                        {tier.badgeTitle}
                      </Badge>
                    </div>
                    <span className="text-[9px] font-bold text-white/30 uppercase tracking-[0.3em]">
                      Tier Classification Division • {tier.players.length} Registered Contenders
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[9px] font-black text-white/40 uppercase tracking-widest font-mono">
                  <Scan className="w-3.5 h-3.5 text-primary animate-pulse" />
                  <span>HUD // SYNC_OK</span>
                </div>
              </div>

              {/* Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {tier.players.map((player) => (
                  <PlayerHoloCard
                    key={player.id}
                    player={player}
                    team={player.teamId ? teamsById[player.teamId] : null}
                    tier={tier}
                    wonSeasons={hallOfFame?.filter(record => record.winnerPlayerId === player.id) || []}
                    isAdmin={isAdmin}
                    onEdit={onEdit}
                    onDelete={confirmDelete}
                    editLabel={t('edit_player_title')}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* TABLE VIEW: Cyber Telemetry Leaderboard Matrix - Ultra Sport & Mobile Optimized */
        <div className="space-y-4">
          {/* Matrix HUD Sub-Header Bar */}
          <div className="overflow-hidden rounded-2xl sm:rounded-3xl border border-white/10 bg-gradient-to-r from-black/90 via-[#0A192F]/90 to-black/90 backdrop-blur-2xl shadow-[0_15px_50px_rgba(0,0,0,0.85)] p-3.5 sm:p-5 relative">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_20px_rgba(204,253,1,0.8)]" />
            <div className="flex flex-wrap items-center justify-between gap-3 relative z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10 border border-primary/30 text-primary shadow-[0_0_15px_rgba(204,253,1,0.2)]">
                  <Scan className="w-4 h-4 animate-pulse" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs sm:text-sm font-black uppercase italic tracking-[0.25em] text-white flex items-center gap-2 font-headline">
                    ALL-TIME PLAYER METRICS
                    <span className="inline-block w-2 h-2 rounded-full bg-primary animate-ping" />
                  </span>
                  <span className="text-[8px] sm:text-[9px] font-mono text-white/50 uppercase tracking-widest">
                    SYS_NODE: STAT_REGISTRY_V4 // TOTAL: {allFilteredPlayers.length} ATHLETES
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-[9px] font-black uppercase tracking-wider text-white/60">
                  <Gauge className="w-3.5 h-3.5 text-primary" />
                  <span>OVR SORT: DYNAMIC</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/15 border border-primary/40 text-[9px] font-black uppercase italic tracking-wider text-primary shadow-[0_0_12px_rgba(204,253,1,0.25)]">
                  <Zap className="w-3.5 h-3.5 fill-primary" />
                  <span>LIVE TELEMETRY</span>
                </div>
              </div>
            </div>
          </div>

          {/* MOBILE VIEW: Ultra Sport Futuristic Athlete Pods (Visible on screen < lg) */}
          <div className="lg:hidden space-y-3">
            {allFilteredPlayers.map((player) => (
              <PlayerMobilePod
                key={player.id}
                player={player}
                team={player.teamId ? teamsById[player.teamId] : null}
                tier={tiersConfig.find(t => t.players.some(p => p.id === player.id)) || tiersConfig[3]}
                wonSeasons={hallOfFame?.filter(record => record.winnerPlayerId === player.id) || []}
                isAdmin={isAdmin}
                onEdit={onEdit}
                onDelete={confirmDelete}
              />
            ))}
          </div>

          {/* DESKTOP VIEW: Cyber Telemetry Leaderboard Matrix (Screen >= lg) */}
          <PlayerTelemetryTable
            players={allFilteredPlayers}
            teamsById={teamsById}
            hallOfFame={hallOfFame}
            tiersConfig={tiersConfig}
            isAdmin={isAdmin}
            onEdit={onEdit}
            onDelete={confirmDelete}
          />
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <AlertDialog open={!!deletingPlayer} onOpenChange={(isOpen) => !isOpen && setDeletingPlayer(null)}>
        <AlertDialogContent className="border border-rose-500/40 bg-[#0A192F]/95 backdrop-blur-3xl rounded-3xl p-6 sm:p-8 shadow-[0_0_80px_rgba(239,68,68,0.25)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black tracking-tight uppercase italic text-rose-500">
              {t('are_you_sure')}
            </AlertDialogTitle>
            <AlertDialogDescription className="font-bold text-white/50 uppercase tracking-wider text-[10px]">
              {t('delete_player_confirm_desc', { playerName: deletingPlayer?.name || '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 mt-6">
            <AlertDialogCancel className="font-black tracking-widest text-[10px] uppercase h-12 rounded-xl border border-white/10 bg-white/5">
              {t('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-rose-500 text-white hover:bg-rose-600 font-black tracking-widest text-[10px] uppercase h-12 rounded-xl shadow-lg shadow-rose-500/25"
            >
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
