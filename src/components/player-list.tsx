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
  const playersWithRanks = useMemo(() => {
    if (!players) return [];
    
    // 1. Calculate OVR for all
    const withOvr = players.map(p => {
      const poss = (p.overallPlayed || 0) * 3;
      const actualPoints = ((p.overallWin || 0) * 3) + ((p.overallDraw || 0) * 1);
      const ovrRating = poss > 0 ? (actualPoints / poss) * 100 : 0;
      const winRate = p.overallPlayed > 0 ? ((p.overallWin || 0) / p.overallPlayed) * 100 : 0;
      return { ...p, ovrRating, winRate };
    });

    // 2. Sort by OVR to determine rank
    const sortedByOvr = [...withOvr].sort((a, b) => b.ovrRating - a.ovrRating || (b.overallPlayed || 0) - (a.overallPlayed || 0));
    
    // 3. Map to final display objects with ovrRank
    return sortedByOvr.map((p, index) => ({
      ...p,
      ovrRank: index + 1
    }));
  }, [players]);

  const teamsById = useMemo(() => {
    if (!teams) return {};
    return teams.reduce((acc, team) => {
      acc[team.id] = team;
      return acc;
    }, {} as Record<string, WithId<Team>>);
  }, [teams]);

  // Defined Tiers configuration
  const tiersConfig = useMemo(() => {
    if (playersWithRanks.length === 0) return [];
    return [
      { 
        id: 'LEGEND',
        title: 'Legend', 
        players: playersWithRanks.slice(0, 4), 
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
        players: playersWithRanks.slice(4, 8), 
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
        players: playersWithRanks.slice(8, 12), 
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
        players: playersWithRanks.slice(12), 
        color: 'text-rose-400', 
        borderColor: 'border-rose-400/40 hover:border-rose-400',
        bgPill: 'bg-rose-400/10 text-rose-400 border-rose-400/30',
        bgBadge: 'bg-rose-400 text-black shadow-[0_0_20px_rgba(251,113,133,0.5)]',
        accentGlow: 'from-rose-400/20 via-rose-500/5 to-transparent',
        badgeTitle: 'ROOKIE FIELD',
        hudBar: 'bg-rose-400 shadow-[0_0_15px_rgba(251,113,133,0.8)]'
      },
    ];
  }, [playersWithRanks]);

  // Overall league quick stats
  const leagueMetrics = useMemo(() => {
    const totalPlayers = playersWithRanks.length;
    if (totalPlayers === 0) return { totalPlayers: 0, avgOvr: 0, totalGoals: 0, activeClubs: 0, highestOvr: 0 };
    
    const avgOvr = Math.round(playersWithRanks.reduce((acc, p) => acc + p.ovrRating, 0) / totalPlayers);
    const totalGoals = playersWithRanks.reduce((acc, p) => acc + (p.overallGoalsFor || 0), 0);
    const uniqueTeams = new Set(playersWithRanks.map(p => p.teamId).filter(Boolean)).size;
    const highestOvr = Math.round(playersWithRanks[0]?.ovrRating || 0);

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
            <span className="hidden sm:inline text-[9px] tracking-widest">MATRIX</span>
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
                {tier.players.map((player) => {
                  const team = player.teamId ? teamsById[player.teamId] : null;
                  const wonSeasons = hallOfFame?.filter(record => record.winnerPlayerId === player.id) || [];
                  const hasWins = wonSeasons.length > 0;
                  const winRate = player.winRate || 0;
                  const goalsPerMatch = player.overallPlayed > 0 
                    ? ((player.overallGoalsFor || 0) / player.overallPlayed).toFixed(1) 
                    : '0.0';

                  return (
                    <div key={player.id} className="group relative">
                      {/* Ambient Holographic Aura Glow on Hover */}
                      <div className={cn(
                        "absolute -inset-1 rounded-[2.2rem] opacity-0 group-hover:opacity-100 blur-xl transition-all duration-700 pointer-events-none bg-gradient-to-b",
                        tier.accentGlow
                      )} />

                      <Card className={cn(
                        "relative flex flex-col h-full bg-gradient-to-b from-[#0B1526]/90 via-[#070D18]/95 to-[#040810] border border-white/10 rounded-[2.2rem] overflow-hidden transition-all duration-500 shadow-[0_15px_40px_rgba(0,0,0,0.8)]",
                        tier.borderColor,
                        "hover:-translate-y-1.5"
                      )}>
                        {/* Top Laser Accent Line */}
                        <div className={cn("h-1 w-full", tier.hudBar)} />

                        {/* Card Header & Avatar Area */}
                        <div className="relative pt-6 pb-4 px-6 flex flex-col items-center overflow-hidden">
                          {/* Background Watermark Player Name */}
                          <span className="absolute top-2 left-4 text-5xl font-black text-white/[0.02] uppercase tracking-tighter whitespace-nowrap pointer-events-none group-hover:text-white/[0.05] transition-colors select-none">
                            {player.name}
                          </span>

                          {/* Top Card Badge / Rank Pill */}
                          <div className="w-full flex items-center justify-between mb-4 z-10">
                            <div className="flex items-center gap-1.5">
                              <Badge className={cn("text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border", tier.bgPill)}>
                                #{player.ovrRank} RANK
                              </Badge>
                              {player.ovrRank <= 3 && (
                                <Medal className={cn(
                                  "w-4 h-4",
                                  player.ovrRank === 1 ? "text-yellow-400" :
                                  player.ovrRank === 2 ? "text-slate-300" : "text-amber-600"
                                )} />
                              )}
                            </div>

                            <span className="text-[8px] font-mono text-white/30 uppercase tracking-widest">
                              ID_{player.id.slice(0, 5)}
                            </span>
                          </div>

                          {/* Avatar with OVR Hex Badge */}
                          <div className="relative z-10 mb-3">
                            {/* Scanning laser beam on hover */}
                            <div className="absolute inset-0 overflow-hidden rounded-full pointer-events-none z-20 opacity-0 group-hover:opacity-30 transition-opacity">
                              <div className={cn("w-full h-1 blur-[1px] animate-scanning", tier.hudBar)} />
                            </div>

                            <Avatar className={cn(
                              "h-24 w-24 border-2 transition-all duration-500 shadow-2xl scale-100 group-hover:scale-105",
                              tier.color.includes('yellow') ? "border-yellow-400/50 group-hover:border-yellow-400" :
                              tier.color.includes('primary') ? "border-primary/50 group-hover:border-primary" :
                              tier.color.includes('accent') ? "border-accent/50 group-hover:border-accent" :
                              "border-rose-400/50 group-hover:border-rose-400"
                            )}>
                              <AvatarImage src={team?.logoUrl} alt={player.name} className="object-cover" />
                              <AvatarFallback className="bg-black/80 font-black text-white/30 text-xl">
                                {player.name.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>

                            {/* OVR Rating Badge with Cyber Cut Corner */}
                            <div className={cn(
                              "absolute -bottom-2 -right-2 h-12 w-12 rounded-2xl flex flex-col items-center justify-center border-2 border-[#0A192F] shadow-2xl transition-transform duration-500 group-hover:scale-110",
                              tier.bgBadge
                            )}>
                              <span className="text-[7px] font-black leading-none uppercase tracking-tighter opacity-70">OVR</span>
                              <span className="text-base font-black leading-none italic tabular-nums tracking-tighter mt-0.5">
                                {player.ovrRating.toFixed(0)}
                              </span>
                            </div>
                          </div>

                          {/* Player Identity */}
                          <div className="text-center space-y-1.5 z-10 w-full px-2">
                            <h3 className={cn(
                              "font-black text-xl tracking-tight uppercase italic truncate transition-colors",
                              "text-white group-hover:text-white"
                            )}>
                              {player.name}
                            </h3>
                            <div className="flex items-center justify-center gap-2">
                              {team ? (
                                <Badge variant="outline" className={cn(
                                  "bg-white/5 border-white/10 text-[9px] font-black uppercase tracking-widest gap-1 py-0.5 px-2.5 rounded-full text-white/80"
                                )}>
                                  <Shield className="w-2.5 h-2.5 text-primary" />
                                  <span className="truncate max-w-[130px]">{team.name}</span>
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-white/5 border-white/10 text-[9px] font-black uppercase tracking-widest text-white/40 py-0.5 px-2.5 rounded-full">
                                  Free Agent
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Card Content & Telemetry Section */}
                        <CardContent className="flex-grow space-y-4 px-5 pb-5 pt-2 relative z-10">
                          {/* Win Rate Meter */}
                          <div className="space-y-1.5 bg-black/40 border border-white/5 rounded-2xl p-3">
                            <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest">
                              <span className="text-white/40 flex items-center gap-1">
                                <TrendingUp className="w-3 h-3 text-primary" /> Victory Rate
                              </span>
                              <span className={cn("font-mono font-black italic", tier.color)}>
                                {winRate.toFixed(1)}%
                              </span>
                            </div>
                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                              <div 
                                className={cn("h-full rounded-full transition-all duration-1000", tier.hudBar)} 
                                style={{ width: `${Math.min(100, Math.max(5, winRate))}%` }} 
                              />
                            </div>
                          </div>

                          {/* W / D / L Tri-Grid */}
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="p-2.5 rounded-xl bg-black/50 border border-emerald-500/20 hover:border-emerald-500/50 transition-colors">
                              <span className="block text-[7px] font-black uppercase tracking-[0.2em] text-emerald-400 mb-0.5">WIN</span>
                              <span className="text-xl font-black italic tabular-nums text-white leading-none">
                                {player.overallWin || 0}
                              </span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-black/50 border border-yellow-500/20 hover:border-yellow-500/50 transition-colors">
                              <span className="block text-[7px] font-black uppercase tracking-[0.2em] text-yellow-400 mb-0.5">DRAW</span>
                              <span className="text-xl font-black italic tabular-nums text-white leading-none">
                                {player.overallDraw || 0}
                              </span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-black/50 border border-rose-500/20 hover:border-rose-500/50 transition-colors">
                              <span className="block text-[7px] font-black uppercase tracking-[0.2em] text-rose-400 mb-0.5">LOSS</span>
                              <span className="text-xl font-black italic tabular-nums text-white leading-none">
                                {player.overallLoss || 0}
                              </span>
                            </div>
                          </div>

                          {/* Offensive Telemetry: Goals & GPM */}
                          <div className="flex items-center justify-between p-3 rounded-2xl bg-black/50 border border-white/5">
                            <div className="flex items-center gap-2.5">
                              <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 text-primary">
                                <Zap className="w-3.5 h-3.5" />
                              </div>
                              <div>
                                <span className="block text-[7px] font-black uppercase tracking-[0.2em] text-white/40">Total Goals</span>
                                <span className="text-lg font-black italic tabular-nums text-white leading-none">
                                  {player.overallGoalsFor || 0} <span className="text-[9px] font-normal text-white/40">PTS</span>
                                </span>
                              </div>
                            </div>

                            <div className="text-right">
                              <span className="block text-[7px] font-black uppercase tracking-[0.2em] text-white/40">Per Match</span>
                              <span className="text-sm font-black font-mono text-primary italic leading-none">
                                {goalsPerMatch}
                              </span>
                            </div>
                          </div>

                          {/* Championship Legacy Pod */}
                          <div className={cn(
                            "rounded-2xl p-3 border transition-all relative overflow-hidden",
                            hasWins 
                              ? "bg-yellow-400/10 border-yellow-400/30 shadow-[0_0_20px_rgba(250,204,21,0.05)]" 
                              : "bg-white/[0.02] border-white/5"
                          )}>
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-1.5">
                                <Trophy className={cn("w-3 h-3", hasWins ? "text-yellow-400" : "text-white/30")} />
                                <span className={cn(
                                  "text-[8px] font-black uppercase tracking-widest",
                                  hasWins ? "text-yellow-400" : "text-white/40"
                                )}>
                                  Championship Legacy
                                </span>
                              </div>
                              <span className="text-[9px] font-black font-mono text-white/60">
                                {hasWins ? `${wonSeasons.length} TITLES` : '0 TITLES'}
                              </span>
                            </div>

                            <div className="flex flex-wrap gap-1 min-h-[22px] items-center">
                              {hasWins ? (
                                wonSeasons.map(rec => (
                                  <Badge 
                                    key={rec.seasonId}
                                    className="bg-yellow-400/20 border-yellow-400/40 text-yellow-400 text-[8px] font-black uppercase tracking-tight py-0 px-2 rounded-md"
                                  >
                                    🏆 {rec.seasonName}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-[8px] font-black uppercase tracking-widest text-white/20 italic">
                                  Menunggu gelar pertama
                                </span>
                              )}
                            </div>
                          </div>
                        </CardContent>

                        {/* Admin Controls Footer */}
                        {isAdmin && (
                          <CardFooter className="grid grid-cols-2 gap-2 p-3 border-t border-white/10 bg-black/80 rounded-b-[2.2rem]">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => onEdit(player)}
                              className="font-black text-[9px] uppercase tracking-widest h-9 rounded-xl border border-white/10 hover:bg-primary/10 hover:text-primary hover:border-primary/40 transition-all"
                            >
                              <Pencil className="w-3 h-3 mr-1.5" />
                              {t('edit_player_title')}
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => confirmDelete(player)}
                              className="font-black text-[9px] uppercase tracking-widest h-9 rounded-xl border border-white/10 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/40 transition-all"
                            >
                              <Trash2 className="w-3 h-3 mr-1.5" />
                              {t('delete')}
                            </Button>
                          </CardFooter>
                        )}
                      </Card>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* TABLE VIEW: Cyber Telemetry Leaderboard Matrix */
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-[#0A192F]/90 via-black/85 to-[#0A192F]/95 backdrop-blur-3xl shadow-[0_25px_80px_rgba(0,0,0,0.95)] relative group/matrix">
          {/* Top Racing Accent Tracer */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent z-20 shadow-[0_0_20px_rgba(204,253,1,0.8)]" />
          
          {/* Matrix HUD Sub-Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 sm:p-4 px-4 sm:px-6 bg-gradient-to-r from-white/[0.04] via-black/60 to-white/[0.02] border-b border-white/10 relative z-10">
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/30 text-primary">
                <Scan className="w-4 h-4 animate-pulse" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] sm:text-xs font-black uppercase italic tracking-[0.25em] text-white flex items-center gap-2">
                  ALL-TIME TELEMETRY MATRIX
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                </span>
                <span className="text-[8px] font-mono text-white/40 uppercase tracking-widest">
                  SYS_NODE: STAT_REGISTRY_V4 // TOTAL: {allFilteredPlayers.length} ATHLETES
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-xl bg-white/[0.03] border border-white/10 text-[9px] font-black uppercase tracking-wider text-white/60">
                <Gauge className="w-3 h-3 text-primary" />
                <span>OVR SORT: DYNAMIC</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-primary/10 border border-primary/30 text-[9px] font-black uppercase italic tracking-wider text-primary">
                <Zap className="w-3 h-3 fill-primary" />
                <span>LIVE SYNC</span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
            <table className="w-full text-left text-xs text-white border-collapse font-sans">
              <thead>
                <tr className="border-b border-white/10 bg-black/60 text-[9px] font-black uppercase tracking-[0.25em] text-white/40 select-none">
                  <th className="py-4 px-3 sm:px-4 text-center w-16">
                    <span className="inline-flex items-center gap-1">RANK</span>
                  </th>
                  <th className="py-4 px-4 min-w-[200px]">
                    <span className="inline-flex items-center gap-1.5">
                      <User className="w-3 h-3 text-white/40" />
                      ATLET // DRIVER KLUB
                    </span>
                  </th>
                  <th className="py-4 px-3 text-center">
                    <span className="inline-flex items-center gap-1">
                      <Shield className="w-3 h-3 text-white/40" />
                      TIER
                    </span>
                  </th>
                  <th className="py-4 px-3 text-center">
                    <span className="inline-flex items-center gap-1 text-primary">
                      <Flame className="w-3 h-3 text-primary" />
                      OVR
                    </span>
                  </th>
                  <th className="py-4 px-3 text-center">MAIN</th>
                  <th className="py-4 px-3 text-center text-emerald-400">W</th>
                  <th className="py-4 px-3 text-center text-yellow-400">D</th>
                  <th className="py-4 px-3 text-center text-rose-400">L</th>
                  <th className="py-4 px-4 text-center text-primary min-w-[140px]">
                    <span className="inline-flex items-center gap-1 text-primary">
                      <TrendingUp className="w-3 h-3" />
                      WIN RATE
                    </span>
                  </th>
                  <th className="py-4 px-3 text-center min-w-[70px]">
                    <span className="inline-flex items-center gap-1 text-white/80">
                      <Target className="w-3 h-3 text-white/40" />
                      GOL
                    </span>
                  </th>
                  <th className="py-4 px-4 min-w-[220px]">
                    <span className="inline-flex items-center gap-1 text-amber-400">
                      <Trophy className="w-3 h-3 text-amber-400" />
                      GELAR JUARA
                    </span>
                  </th>
                  {isAdmin && <th className="py-4 px-4 text-center w-24">AKSI</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {allFilteredPlayers.map((player) => {
                  const team = player.teamId ? teamsById[player.teamId] : null;
                  const wonSeasons = hallOfFame?.filter(record => record.winnerPlayerId === player.id) || [];
                  const tier = tiersConfig.find(t => t.players.some(p => p.id === player.id)) || tiersConfig[3];
                  const isTopPodium = player.ovrRank <= 3;
                  const winPercent = player.winRate || 0;

                  return (
                    <tr 
                      key={player.id}
                      className={cn(
                        "transition-all duration-300 group/row relative",
                        player.ovrRank === 1 ? "bg-gradient-to-r from-yellow-500/[0.08] via-transparent to-transparent hover:bg-yellow-500/[0.12]" :
                        player.ovrRank === 2 ? "bg-gradient-to-r from-slate-300/[0.05] via-transparent to-transparent hover:bg-slate-300/[0.09]" :
                        player.ovrRank === 3 ? "bg-gradient-to-r from-amber-600/[0.05] via-transparent to-transparent hover:bg-amber-600/[0.09]" :
                        "hover:bg-white/[0.04]"
                      )}
                    >
                      {/* Rank with Podium Cut Badge */}
                      <td className="py-4 px-3 sm:px-4 text-center">
                        <div className="flex items-center justify-center">
                          <div className={cn(
                            "relative w-8 h-8 rounded-xl flex items-center justify-center font-black italic tracking-tighter text-xs transition-transform duration-300 group-hover/row:scale-110",
                            player.ovrRank === 1 ? "bg-gradient-to-br from-yellow-300 via-yellow-400 to-amber-500 text-black shadow-[0_0_20px_rgba(250,204,21,0.6)] border border-yellow-200" :
                            player.ovrRank === 2 ? "bg-gradient-to-br from-slate-200 via-slate-300 to-slate-400 text-black shadow-[0_0_15px_rgba(203,213,225,0.5)] border border-white" :
                            player.ovrRank === 3 ? "bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 text-white shadow-[0_0_15px_rgba(217,119,6,0.5)] border border-amber-400/40" :
                            "bg-white/5 text-white/50 border border-white/10 group-hover/row:border-white/30 group-hover/row:text-white"
                          )}>
                            {player.ovrRank === 1 ? (
                              <Crown className="w-4 h-4 fill-black" />
                            ) : (
                              <span>#{player.ovrRank}</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Athlete & Team with Futuristic HUD Capsule */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="relative shrink-0">
                            <Avatar className={cn(
                              "h-11 w-11 rounded-2xl border-2 transition-transform duration-300 group-hover/row:scale-105 shadow-md",
                              isTopPodium ? "border-primary/50 shadow-[0_0_15px_rgba(204,253,1,0.25)]" : "border-white/10"
                            )}>
                              <AvatarImage src={team?.logoUrl} alt={player.name} className="object-cover" />
                              <AvatarFallback className="bg-black/80 text-[11px] font-black text-white italic">
                                {player.name.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            {isTopPodium && (
                              <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-primary flex items-center justify-center shadow-[0_0_8px_rgba(204,253,1,0.9)]">
                                <Sparkles className="w-2 h-2 text-black" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <span className="block font-black text-sm uppercase italic tracking-tight text-white group-hover/row:text-primary transition-colors truncate drop-shadow-sm">
                              {player.name}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="w-1 h-1 rounded-full bg-white/40" />
                              <span className="text-[10px] font-black uppercase tracking-wider text-white/50 truncate">
                                {team?.name || 'Free Agent'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Tier Badge */}
                      <td className="py-4 px-3 text-center">
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-[8px] font-black uppercase tracking-[0.2em] italic px-2.5 py-1 rounded-full border shadow-sm transition-all whitespace-nowrap",
                            tier.bgPill
                          )}
                        >
                          {tier.title}
                        </Badge>
                      </td>

                      {/* OVR Rating with Futuristic Glowing Pod */}
                      <td className="py-4 px-3 text-center">
                        <div className="inline-flex items-center justify-center">
                          <div className={cn(
                            "px-3 py-1 rounded-xl bg-black/60 border font-black italic tabular-nums text-base tracking-tight shadow-inner flex items-baseline gap-0.5",
                            player.ovrRating >= 70 ? "border-yellow-400/40 text-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.2)]" :
                            player.ovrRating >= 55 ? "border-primary/40 text-primary shadow-[0_0_15px_rgba(204,253,1,0.2)]" :
                            player.ovrRating >= 45 ? "border-accent/40 text-accent shadow-[0_0_15px_rgba(100,255,218,0.2)]" :
                            "border-white/10 text-white/70"
                          )}>
                            <span>{player.ovrRating.toFixed(0)}</span>
                            <span className="text-[8px] font-mono opacity-50 not-italic">OVR</span>
                          </div>
                        </div>
                      </td>

                      {/* Played (Capsule) */}
                      <td className="py-4 px-3 text-center font-mono font-black text-white/80 tabular-nums">
                        <span className="px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/5">
                          {player.overallPlayed || 0}
                        </span>
                      </td>

                      {/* Win (Emerald Tactical) */}
                      <td className="py-4 px-3 text-center font-mono font-black text-emerald-400 tabular-nums">
                        <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                          {player.overallWin || 0}
                        </span>
                      </td>

                      {/* Draw (Amber Tactical) */}
                      <td className="py-4 px-3 text-center font-mono font-black text-yellow-400 tabular-nums">
                        <span className="px-2 py-0.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                          {player.overallDraw || 0}
                        </span>
                      </td>

                      {/* Loss (Rose Tactical) */}
                      <td className="py-4 px-3 text-center font-mono font-black text-rose-400 tabular-nums">
                        <span className="px-2 py-0.5 rounded-lg bg-rose-500/10 border border-rose-500/20">
                          {player.overallLoss || 0}
                        </span>
                      </td>

                      {/* Win Rate with Sporty Racing Progress Gauge */}
                      <td className="py-4 px-4 text-center">
                        <div className="flex flex-col gap-1.5 w-full max-w-[130px] mx-auto">
                          <div className="flex items-center justify-between text-[10px] font-black italic tabular-nums leading-none">
                            <span className="text-white/40 text-[8px] uppercase tracking-wider">VICTORY</span>
                            <span className={cn(
                              winPercent >= 60 ? "text-primary drop-shadow-[0_0_8px_rgba(204,253,1,0.6)]" :
                              winPercent >= 45 ? "text-accent" : "text-white/70"
                            )}>
                              {winPercent.toFixed(0)}%
                            </span>
                          </div>
                          <div className="h-2 w-full bg-black/70 border border-white/10 rounded-full overflow-hidden p-[1px] relative shadow-inner">
                            <div 
                              className={cn(
                                "h-full rounded-full transition-all duration-700 relative",
                                winPercent >= 60 ? "bg-gradient-to-r from-primary/80 to-primary shadow-[0_0_10px_rgba(204,253,1,0.8)]" :
                                winPercent >= 45 ? "bg-gradient-to-r from-accent/80 to-accent shadow-[0_0_10px_rgba(100,255,218,0.8)]" :
                                "bg-gradient-to-r from-white/30 to-white/60"
                              )} 
                              style={{ width: `${Math.min(100, Math.max(6, winPercent))}%` }} 
                            />
                          </div>
                        </div>
                      </td>

                      {/* Goals */}
                      <td className="py-4 px-3 text-center font-mono font-black text-white tabular-nums text-sm">
                        <div className="inline-flex items-center gap-1">
                          <span>{player.overallGoalsFor || 0}</span>
                          <span className="text-[8px] text-white/30 uppercase">G</span>
                        </div>
                      </td>

                      {/* Titles / Championships */}
                      <td className="py-4 px-4 font-sans">
                        {wonSeasons.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 items-center">
                            {wonSeasons.map(rec => (
                              <div 
                                key={rec.seasonId}
                                className="group/badge inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-500/20 via-yellow-500/15 to-transparent border border-amber-500/40 text-amber-400 rounded-lg px-2.5 py-1 shadow-[0_0_12px_rgba(245,158,11,0.15)] hover:border-amber-400 hover:shadow-[0_0_18px_rgba(245,158,11,0.3)] transition-all"
                              >
                                <Trophy className="w-3 h-3 text-amber-400 shrink-0 fill-amber-400/20" />
                                <span className="text-[9px] font-black uppercase tracking-tight italic text-amber-300 truncate max-w-[160px]">
                                  {rec.seasonName}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[10px] text-white/20 font-mono tracking-widest pl-2">-</span>
                        )}
                      </td>

                      {/* Admin Actions */}
                      {isAdmin && (
                        <td className="py-4 px-4 text-center">
                          <div className="flex items-center justify-center gap-1 font-sans">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onEdit(player)}
                              className="h-8 w-8 text-white/40 hover:text-primary hover:bg-primary/10 rounded-xl transition-colors"
                              title="Edit Athlete"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => confirmDelete(player)}
                              className="h-8 w-8 text-white/40 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"
                              title="Delete Athlete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Matrix HUD Footer Telemetry */}
          <div className="p-3 px-6 bg-black/70 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-[9px] font-mono text-white/40">
            <div className="flex items-center gap-2">
              <Binary className="w-3.5 h-3.5 text-primary" />
              <span className="uppercase tracking-widest">TELEMETRY ENCODED // PROTOCOL 88-RACING</span>
            </div>
            <div className="flex items-center gap-4 uppercase tracking-wider">
              <span>PODIUM TIERS: TITAN / PRO / CORE / ROOKIE</span>
              <span className="text-white/20">•</span>
              <span className="text-primary font-bold">STATUS: OPERATIONAL</span>
            </div>
          </div>
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
