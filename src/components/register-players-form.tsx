'use client';

import * as React from 'react';
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import type { Player, LeagueEntry, WithId, Team } from '@/lib/types';
import { ScrollArea } from './ui/scroll-area';
import { Skeleton } from './ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { User, Search, Check, Users, Shield, Zap, Sparkles, CheckCheck, X, Trophy, Award } from 'lucide-react';
import { useTranslation } from '@/hooks/use-translation';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';
import { resolveLogo } from '@/lib/logo-utils';

interface RegisterPlayersFormProps {
  allPlayers: WithId<Player>[];
  registeredPlayers: WithId<LeagueEntry>[];
  onRegister: (selectedPlayerIds: string[], targetDivision?: 'div-1' | 'div-2') => void;
  isLoading?: boolean;
  hasDivisions?: boolean;
  division1Name?: string;
  division2Name?: string;
}

export function RegisterPlayersForm({
  allPlayers,
  registeredPlayers,
  onRegister,
  isLoading = false,
  hasDivisions = false,
  division1Name = 'Divisi 1',
  division2Name = 'Divisi 2',
}: RegisterPlayersFormProps) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [targetDivision, setTargetDivision] = useState<'div-1' | 'div-2'>('div-1');
  const [searchQuery, setSearchQuery] = useState('');
  const firestore = useFirestore();

  const teamsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'teams') : null),
    [firestore]
  );
  const { data: teams, isLoading: isLoadingTeams } = useCollection<Team>(teamsCollection);

  const teamsById = useMemo(() => {
    if (!teams) return {};
    return teams.reduce((acc, team) => {
      acc[team.id] = team;
      return acc;
    }, {} as Record<string, WithId<Team>>);
  }, [teams]);

  const registeredPlayerIds = useMemo(() => 
    new Set(registeredPlayers.map(p => p.playerId))
  , [registeredPlayers]);

  const availablePlayers = useMemo(() =>
    allPlayers.filter(p => !registeredPlayerIds.has(p.id))
  , [allPlayers, registeredPlayerIds]);

  const filteredPlayers = useMemo(() => {
    if (!searchQuery.trim()) return availablePlayers;
    const q = searchQuery.toLowerCase().trim();
    return availablePlayers.filter(p => 
      p.name.toLowerCase().includes(q) || 
      (p.teamName && p.teamName.toLowerCase().includes(q))
    );
  }, [availablePlayers, searchQuery]);

  const selectedCount = useMemo(() => 
    Object.values(selected).filter(Boolean).length
  , [selected]);
  
  const areAllFilteredSelected = useMemo(() => 
    filteredPlayers.length > 0 && filteredPlayers.every(p => !!selected[p.id])
  , [filteredPlayers, selected]);

  const handleSelect = (playerId: string) => {
    setSelected(prev => ({
      ...prev,
      [playerId]: !prev[playerId],
    }));
  };
  
  const handleSelectAllFiltered = () => {
    if (areAllFilteredSelected) {
      // Unselect filtered
      setSelected(prev => {
        const next = { ...prev };
        filteredPlayers.forEach(p => delete next[p.id]);
        return next;
      });
    } else {
      // Select all filtered
      setSelected(prev => {
        const next = { ...prev };
        filteredPlayers.forEach(p => { next[p.id] = true; });
        return next;
      });
    }
  };

  const handleSubmit = () => {
    const selectedIds = Object.keys(selected).filter(id => selected[id]);
    if (selectedIds.length === 0) return;
    onRegister(selectedIds, hasDivisions ? targetDivision : undefined);
  };
  
  if (isLoading || isLoadingTeams) {
    return <RegisterPlayersSkeleton />;
  }

  if (availablePlayers.length === 0) {
    return (
      <div className="py-12 px-4 text-center space-y-3 bg-white/[0.02] border border-white/5 rounded-2xl">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 text-primary mx-auto flex items-center justify-center">
          <CheckCheck className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h4 className="font-headline font-black text-white uppercase italic text-sm tracking-wide">
            Semua Atlet Terdaftar
          </h4>
          <p className="text-xs text-white/40 font-mono">
            {t('all_players_registered')}
          </p>
        </div>
      </div>
    );
  }

  const selectionPercent = availablePlayers.length > 0 
    ? Math.round((selectedCount / availablePlayers.length) * 100) 
    : 0;

  return (
    <div className="space-y-3 sm:space-y-4">
      
      {/* Telemetry Progress & Quick Control Deck */}
      <div className="p-3 bg-black/60 border border-white/10 rounded-2xl space-y-2 shadow-inner">
        <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-black uppercase tracking-wider font-mono">
          <div className="flex items-center gap-1.5 text-primary">
            <Zap className="w-3.5 h-3.5 fill-primary" />
            <span>ROSTER_SELECTION: <strong className="text-white text-xs">{selectedCount}</strong> / {availablePlayers.length} ATLET</span>
          </div>
          <span className="text-primary/90 font-mono">[{selectionPercent}% KUOTA]</span>
        </div>
        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
          <div 
            className="h-full bg-primary rounded-full shadow-[0_0_10px_rgba(204,253,1,0.8)] transition-all duration-300"
            style={{ width: `${selectionPercent}%` }}
          />
        </div>
      </div>

      {/* Multi-Division Target Allocation */}
      {hasDivisions && (
        <div className="p-3 rounded-2xl bg-gradient-to-r from-white/[0.04] to-white/[0.01] border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-wider font-mono px-1">
            <span className="text-white/50 flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-primary animate-pulse" />
              TARGET ALOKASI DIVISI:
            </span>
            <span className={cn("font-bold px-2 py-0.5 rounded-full text-[8px]", targetDivision === 'div-1' ? "bg-primary/20 text-primary border border-primary/40" : "bg-cyan-400/20 text-cyan-300 border border-cyan-400/40")}>
              {targetDivision === 'div-1' ? division1Name : division2Name}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setTargetDivision('div-1')}
              className={cn(
                "h-10 px-3 rounded-xl font-headline font-black text-xs uppercase tracking-wide italic flex items-center justify-center gap-2 transition-all border cursor-pointer",
                targetDivision === 'div-1'
                  ? "bg-primary text-black border-primary shadow-[0_0_20px_rgba(204,253,1,0.35)]"
                  : "bg-black/40 text-white/50 border-white/10 hover:text-white hover:border-white/20"
              )}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span className="truncate">{division1Name}</span>
            </button>
            <button
              type="button"
              onClick={() => setTargetDivision('div-2')}
              className={cn(
                "h-10 px-3 rounded-xl font-headline font-black text-xs uppercase tracking-wide italic flex items-center justify-center gap-2 transition-all border cursor-pointer",
                targetDivision === 'div-2'
                  ? "bg-cyan-400 text-black border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.35)]"
                  : "bg-black/40 text-white/50 border-white/10 hover:text-white hover:border-white/20"
              )}
            >
              <Award className="w-3.5 h-3.5" />
              <span className="truncate">{division2Name}</span>
            </button>
          </div>
        </div>
      )}

      {/* Search & Bulk Select Toolbar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <Input 
            placeholder="Cari nama atlet atau klub..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 pl-9 pr-8 bg-black/40 border-white/10 hover:border-primary/40 focus:border-primary rounded-xl text-xs text-white uppercase placeholder:normal-case placeholder:text-white/30"
          />
          {searchQuery && (
            <button 
              type="button" 
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <Button
          type="button"
          onClick={handleSelectAllFiltered}
          variant="outline"
          size="sm"
          className={cn(
            "h-9 px-3 text-[10px] font-black uppercase tracking-wider italic font-headline rounded-xl border transition-all shrink-0",
            areAllFilteredSelected 
              ? "bg-primary text-black border-primary shadow-[0_0_15px_rgba(204,253,1,0.4)]" 
              : "bg-white/[0.03] border-white/10 hover:border-primary/40 text-white/80"
          )}
        >
          {areAllFilteredSelected ? "BATAL SEMUA" : "PILIH SEMUA"}
        </Button>
      </div>

      {/* High-Density Athletes Roster List */}
      <ScrollArea className="h-[320px] sm:h-[360px] pr-2 rounded-2xl border border-white/10 bg-black/40 p-2 shadow-inner">
        {filteredPlayers.length === 0 ? (
          <div className="py-12 text-center text-white/40 text-xs font-mono">
            Tidak ada atlet yang cocok dengan "{searchQuery}"
          </div>
        ) : (
          <div className="space-y-1.5">
            {filteredPlayers.map((player, idx) => {
              const isSelected = !!selected[player.id];
              const team = player.teamId ? teamsById[player.teamId] : null;
              const teamLogo = resolveLogo(team?.logoUrl, player.teamId, player.name);

              return (
                <div
                  key={player.id}
                  onClick={() => handleSelect(player.id)}
                  className={cn(
                    "flex items-center justify-between p-2 sm:p-2.5 rounded-xl border transition-all cursor-pointer select-none group/item relative overflow-hidden",
                    isSelected 
                      ? "bg-primary/10 border-primary/50 shadow-[0_0_15px_rgba(204,253,1,0.15)]" 
                      : "bg-white/[0.02] border-white/5 hover:border-white/20 hover:bg-white/[0.05]"
                  )}
                >
                  {/* Active Indicator Bar */}
                  <div className={cn(
                    "absolute left-0 top-0 bottom-0 w-1 transition-all",
                    isSelected ? "bg-primary shadow-[0_0_8px_rgba(204,253,1,0.8)]" : "bg-transparent"
                  )} />

                  {/* Left: Index & Checkbox & Avatar & Info */}
                  <div className="flex items-center gap-2.5 sm:gap-3 pl-1.5 min-w-0">
                    <div className="text-[10px] font-mono font-black text-white/30 w-5 shrink-0">
                      #{idx + 1}
                    </div>

                    <div className={cn(
                      "w-4.5 h-4.5 rounded-md border flex items-center justify-center shrink-0 transition-all",
                      isSelected 
                        ? "bg-primary border-primary text-black shadow-[0_0_8px_rgba(204,253,1,0.8)]" 
                        : "border-white/20 bg-black/40 group-hover/item:border-white/40"
                    )}>
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>

                    <Avatar className="h-8 w-8 rounded-lg border border-white/10 shrink-0">
                      <AvatarImage src={player.avatarUrl || teamLogo} className="object-cover" />
                      <AvatarFallback className="bg-white/5 text-[10px] font-black text-white/50">
                        {player.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "font-headline font-black uppercase italic tracking-tight text-xs truncate",
                          isSelected ? "text-primary" : "text-white"
                        )}>
                          {player.name}
                        </span>
                        {player.ovr && (
                          <span className="text-[8px] font-black font-mono px-1 py-0.2 rounded bg-amber-400/10 border border-amber-400/30 text-amber-300">
                            {player.ovr}
                          </span>
                        )}
                      </div>
                      <div className="text-[9px] text-white/40 font-mono truncate">
                        {player.teamName || 'Tanpa Tim'}
                      </div>
                    </div>
                  </div>

                  {/* Right: Tier Badge */}
                  {player.division && (
                    <Badge 
                      variant="outline" 
                      className="text-[8px] font-black uppercase tracking-wider font-mono border-white/10 text-white/50 shrink-0 hidden xs:inline-flex"
                    >
                      {player.division}
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Action Submit Dock */}
      <Button 
        onClick={handleSubmit} 
        disabled={selectedCount === 0}
        className={cn(
          "w-full h-12 font-headline font-black uppercase italic tracking-wider text-xs rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2",
          selectedCount > 0 
            ? hasDivisions && targetDivision === 'div-2'
              ? "bg-cyan-400 text-black hover:bg-cyan-300 shadow-[0_0_30px_rgba(34,211,238,0.5)] cursor-pointer"
              : "bg-primary text-black hover:bg-primary/90 shadow-[0_0_30px_rgba(204,253,1,0.5)] cursor-pointer" 
            : "bg-white/10 text-white/30 border border-white/5 cursor-not-allowed"
        )}
      >
        <Sparkles className="w-4 h-4" />
        {hasDivisions ? (
          <span>DAFTARKAN {selectedCount} ATLET KE {targetDivision === 'div-1' ? division1Name : division2Name}</span>
        ) : (
          <span>DAFTARKAN {selectedCount} ATLET // ROSTER CONFIRMED</span>
        )}
      </Button>
    </div>
  );
}

function RegisterPlayersSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-12 bg-white/5 rounded-2xl animate-pulse" />
      <div className="h-9 bg-white/5 rounded-xl animate-pulse" />
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-11 bg-white/5 rounded-xl animate-pulse" />
        ))}
      </div>
      <div className="h-12 bg-white/5 rounded-2xl animate-pulse" />
    </div>
  );
}