'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Input } from './ui/input';
import { 
  Users, CheckCircle2, Binary, Loader2, Zap, Trash2, Trophy, 
  Shuffle, Scan, Activity, X, Search, RotateCcw, 
  ShieldCheck, Dices, Shield, Check, ArrowRight, Sparkles, Crown
} from 'lucide-react';
import type { Team, LeagueEntry, Season, WithId, CoOpLeagueEntry } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { resolveLogo } from '@/lib/logo-utils';
import { getSeasonTheme } from '@/lib/season-theme';

interface TeamDraftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  season: WithId<Season> | null;
  registeredPlayers: any[]; // Bisa individu atau pasangan CO-OP
  allTeams: WithId<Team>[];
  onSaveAssignments: (assignments: { entryId: string, teamId: string, teamName: string }[]) => void;
  isAdmin: boolean;
}

export function TeamDraftDialog({ 
  open, 
  onOpenChange, 
  season, 
  registeredPlayers, 
  allTeams, 
  onSaveAssignments, 
  isAdmin 
}: TeamDraftDialogProps) {
  const { toast } = useToast();
  const theme = useMemo(() => getSeasonTheme(season), [season]);
  const { primaryHex, secondaryHex, glowRgba } = theme;

  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string>>({}); 
  const [isDrawing, setIsDrawing] = useState(false);
  const [rouletteName, setRouletteName] = useState<string>('');
  const [lastDrawResult, setLastDrawResult] = useState<{ winnerName: string, teamName: string, isManual: boolean } | null>(null);
  
  // High-performance Popout Winner Modal state
  const [popoutWinner, setPopoutWinner] = useState<{
    winnerName: string;
    teamName: string;
    teamLogoUrl: string;
    teamTier: number;
  } | null>(null);

  // Filters & modes
  const [draftMode, setDraftMode] = useState<'draw' | 'manual'>('draw');
  const [allowSameTeam, setAllowSameTeam] = useState(false);
  const [searchTeam, setSearchTeam] = useState('');
  const [tierFilter, setTierFilter] = useState<'ALL' | '1' | '2' | '3'>('ALL');
  const [searchPlayer, setSearchPlayer] = useState('');
  const [activePlayerTab, setActivePlayerTab] = useState<'unassigned' | 'assigned'>('unassigned');

  const isCoop = season?.type === 'Co-Op' || season?.type === 'Co-Op Hybrid';
  const canUseDuplicateTeam = isCoop || allowSameTeam || draftMode === 'manual';

  // Synchronize pre-existing assignments from registeredPlayers when opened
  useEffect(() => {
    if (open && registeredPlayers && registeredPlayers.length > 0) {
      const initial: Record<string, string> = {};
      const validEntryIds = new Set(registeredPlayers.map(p => p.id));
      
      // First populate with actual team assignments from registeredPlayers
      registeredPlayers.forEach(p => {
        const tid = p.teamId || (p as any).team?.id || (p as any).player?.teamId;
        if (tid && tid !== '' && tid !== 'TBD') {
          initial[p.id] = tid;
        }
      });

      // Preserve any in-dialog draft picks that are still valid
      setAssignments(prev => {
        const merged = { ...initial };
        Object.entries(prev).forEach(([id, tid]) => {
          if (validEntryIds.has(id)) {
            merged[id] = tid;
          }
        });
        return merged;
      });
    } else if (!open) {
      setAssignments({});
    }
  }, [open, registeredPlayers]);

  // Reset transient state when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedTeamId(null);
      setSelectedPlayerIds([]);
      setSearchTeam('');
      setSearchPlayer('');
      setLastDrawResult(null);
    }
  }, [open]);

  // Available & filtered teams
  const availableTeams = useMemo(() => {
    let list = [...allTeams];
    if (!canUseDuplicateTeam) {
      const assignedTeamIds = new Set(Object.values(assignments));
      list = list.filter(t => !assignedTeamIds.has(t.id));
    }
    return list.sort((a, b) => (a.tier || 3) - (b.tier || 3) || a.name.localeCompare(b.name));
  }, [allTeams, assignments, canUseDuplicateTeam]);

  const filteredTeams = useMemo(() => {
    return availableTeams.filter(team => {
      const matchesSearch = team.name.toLowerCase().includes(searchTeam.toLowerCase().trim());
      const matchesTier = tierFilter === 'ALL' || (team.tier || 3).toString() === tierFilter;
      return matchesSearch && matchesTier;
    });
  }, [availableTeams, searchTeam, tierFilter]);

  // Unassigned entries (Peserta yang belum dapat tim)
  const unassignedEntries = useMemo(() => {
    return registeredPlayers
      .filter(p => !assignments[p.id])
      .map(p => ({
        id: p.id,
        name: (isCoop ? (p as CoOpLeagueEntry).teamName : (p as LeagueEntry).playerName) || 'Unit Tanpa Nama'
      }))
      .filter(p => p.name.toLowerCase().includes(searchPlayer.toLowerCase().trim()))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [registeredPlayers, assignments, isCoop, searchPlayer]);

  // Assigned entries (Peserta yang sudah dapat tim)
  const assignedEntries = useMemo(() => {
    return registeredPlayers
      .filter(p => !!assignments[p.id])
      .map(p => ({
        id: p.id,
        name: (isCoop ? (p as CoOpLeagueEntry).teamName : (p as LeagueEntry).playerName) || 'Unit Tanpa Nama',
        teamId: assignments[p.id],
        team: allTeams.find(t => t.id === assignments[p.id])
      }))
      .filter(p => p.name.toLowerCase().includes(searchPlayer.toLowerCase().trim()) || (p.team?.name || '').toLowerCase().includes(searchPlayer.toLowerCase().trim()))
      .sort((a, b) => (a.team?.tier || 3) - (b.team?.tier || 3) || a.name.localeCompare(b.name));
  }, [registeredPlayers, assignments, allTeams, isCoop, searchPlayer]);

  const totalRegistered = registeredPlayers.length;
  const totalAssigned = Object.keys(assignments).length;
  const progressPercent = totalRegistered > 0 ? Math.round((totalAssigned / totalRegistered) * 100) : 0;

  const togglePlayerSelection = (id: string) => {
    setSelectedPlayerIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleSelectAllUnassigned = () => {
    if (selectedPlayerIds.length === unassignedEntries.length && unassignedEntries.length > 0) {
      setSelectedPlayerIds([]);
    } else {
      setSelectedPlayerIds(unassignedEntries.map(e => e.id));
    }
  };

  const removeAssignment = (entryId: string) => {
    setAssignments(prev => {
      const next = { ...prev };
      delete next[entryId];
      return next;
    });
    if (lastDrawResult) setLastDrawResult(null);
  };

  const handleResetDraft = () => {
    setAssignments({});
    setSelectedTeamId(null);
    setSelectedPlayerIds([]);
    setLastDrawResult(null);
    toast({
      title: "DRAFT DIRESET",
      description: "Seluruh alokasi tim telah dikosongkan."
    });
  };

  // Run Draft: Either Direct (Manual) or Animated Lottery Roulette (Random)
  const handleRunDraw = useCallback(() => {
    if (!selectedTeamId || selectedPlayerIds.length === 0) return;

    const team = allTeams.find(t => t.id === selectedTeamId)!;

    // Mode Manual: Assign Langsung
    if (draftMode === 'manual') {
      const newAssigns: Record<string, string> = {};
      selectedPlayerIds.forEach(pId => {
        newAssigns[pId] = selectedTeamId;
      });
      setAssignments(prev => ({ ...prev, ...newAssigns }));

      const firstEntry = registeredPlayers.find(p => p.id === selectedPlayerIds[0]);
      const name = isCoop ? (firstEntry as CoOpLeagueEntry)?.teamName : (firstEntry as LeagueEntry)?.playerName;
      const displayName = selectedPlayerIds.length === 1 ? name : `${selectedPlayerIds.length} Peserta`;

      setLastDrawResult({
        winnerName: displayName || 'Unit Terpilih',
        teamName: team.name,
        isManual: true
      });

      toast({
        title: "ALOKASI BERHASIL",
        description: `${displayName} telah ditetapkan ke tim ${team.name}.`
      });

      setSelectedPlayerIds([]);
      return;
    }

    // Mode Undian Acak (Lottery Roulette)
    setIsDrawing(true);
    setLastDrawResult(null);
    setPopoutWinner(null);

    const candidates = selectedPlayerIds.map(id => {
      const p = registeredPlayers.find(rp => rp.id === id);
      return {
        id,
        name: (isCoop ? (p as CoOpLeagueEntry)?.teamName : (p as LeagueEntry)?.playerName) || 'Peserta'
      };
    });

    // High-performance rapid suspense cycling animation (1.4s duration)
    let counter = 0;
    const interval = setInterval(() => {
      setRouletteName(candidates[counter % candidates.length].name);
      counter++;
    }, 55);

    setTimeout(() => {
      clearInterval(interval);
      const winner = candidates[Math.floor(Math.random() * candidates.length)];
      const teamLogo = resolveLogo(team.logoUrl, team.id, team.name);

      setAssignments(prev => ({ ...prev, [winner.id]: selectedTeamId }));
      setLastDrawResult({
        winnerName: winner.name,
        teamName: team.name,
        isManual: false
      });

      // Trigger the spectacular center-stage Popout modal
      setPopoutWinner({
        winnerName: winner.name,
        teamName: team.name,
        teamLogoUrl: teamLogo,
        teamTier: team.tier || 3
      });

      setRouletteName('');
      setIsDrawing(false);
      setSelectedTeamId(null);
      setSelectedPlayerIds([]);

      toast({
        title: "🎯 HASIL UNDIAN TERKUNCI!",
        description: `${winner.name} berhasil mendapatkan ${team.name}!`
      });
    }, 1400);
  }, [selectedTeamId, selectedPlayerIds, allTeams, registeredPlayers, toast, isCoop, draftMode]);

  // 1-Click Auto-Draft All Remaining Players
  const handleAutoDraftAll = useCallback(() => {
    if (unassignedEntries.length === 0) {
      toast({ title: "SEMUA PESERTA SUDAH TER-ALOKASI", description: "Tidak ada peserta yang belum memiliki tim." });
      return;
    }

    let pool = [...availableTeams];
    if (pool.length === 0) {
      pool = [...allTeams];
    }

    if (pool.length < unassignedEntries.length && !canUseDuplicateTeam) {
      toast({
        variant: "destructive",
        title: "TIM TIDAK CUKUP",
        description: `Hanya ada ${pool.length} tim tersedia untuk ${unassignedEntries.length} peserta. Aktifkan fitur "Tim Sama" untuk melanjutkan.`
      });
      return;
    }

    setIsDrawing(true);
    setLastDrawResult(null);

    const shuffledTeams = [...pool].sort(() => Math.random() - 0.5);
    const newAssignments = { ...assignments };

    unassignedEntries.forEach((entry, idx) => {
      const assignedTeam = canUseDuplicateTeam
        ? shuffledTeams[idx % shuffledTeams.length]
        : shuffledTeams[idx];
      if (assignedTeam) {
        newAssignments[entry.id] = assignedTeam.id;
      }
    });

    setTimeout(() => {
      setAssignments(newAssignments);
      setSelectedTeamId(null);
      setSelectedPlayerIds([]);
      setIsDrawing(false);
      setLastDrawResult({
        winnerName: `Semua ${unassignedEntries.length} Peserta`,
        teamName: "Ter-alokasi Otomatis Acak",
        isManual: false
      });
      toast({
        title: "⚡ AUTO-DRAFT SELESAI!",
        description: `Seluruh ${unassignedEntries.length} peserta telah dialokasikan tim secara acak dan adil.`
      });
    }, 1000);
  }, [unassignedEntries, availableTeams, allTeams, canUseDuplicateTeam, assignments, toast]);

  // Assign current selected team to all unassigned players (e.g. Real Madrid for everyone)
  const handleAssignTeamToAll = useCallback(() => {
    if (!selectedTeamId || unassignedEntries.length === 0) return;
    const team = allTeams.find(t => t.id === selectedTeamId)!;
    const newAssigns: Record<string, string> = {};
    unassignedEntries.forEach(entry => {
      newAssigns[entry.id] = selectedTeamId;
    });
    setAssignments(prev => ({ ...prev, ...newAssigns }));
    setLastDrawResult({
      winnerName: `Semua ${unassignedEntries.length} Peserta`,
      teamName: team.name,
      isManual: true
    });
    setSelectedPlayerIds([]);
    toast({
      title: "ASSIGN SEMUA BERHASIL",
      description: `Seluruh peserta tersisa telah memakai tim ${team.name}.`
    });
  }, [selectedTeamId, unassignedEntries, allTeams, toast]);

  const handleFinalSubmit = () => {
    const data = Object.entries(assignments).map(([entryId, teamId]) => {
      const team = allTeams.find(t => t.id === teamId)!;
      return { entryId, teamId, teamName: team.name };
    });
    onSaveAssignments(data);
  };

  const selectedTeam = allTeams.find(t => t.id === selectedTeamId);
  const firstSelectedPlayerName = useMemo(() => {
    if (selectedPlayerIds.length === 0) return null;
    const p = registeredPlayers.find(rp => rp.id === selectedPlayerIds[0]);
    return isCoop ? (p as CoOpLeagueEntry)?.teamName : (p as LeagueEntry)?.playerName;
  }, [selectedPlayerIds, registeredPlayers, isCoop]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className={cn(
          "!fixed !left-1/2 !top-1/2 !-translate-x-1/2 !-translate-y-1/2",
          "w-[98vw] max-w-[98vw] xl:max-w-7xl h-[94vh] max-h-[94vh]",
          "p-0 overflow-hidden border-2 bg-[#070B14]/98 backdrop-blur-3xl rounded-2xl sm:rounded-3xl",
          "flex flex-col focus:outline-none focus-visible:ring-0 z-50",
          "[&>button:last-child]:hidden" // hide default dialog close button since custom cockpit close button is present
        )}
        style={{
          borderColor: `${primaryHex}66`,
          boxShadow: `0 0 90px ${glowRgba ? glowRgba.replace('0.9', '0.2') : 'rgba(16,185,129,0.2)'}`
        }}
      >
        
        {/* Top Laser Accent Tracer */}
        <div 
          className="absolute top-0 left-0 right-0 h-[2px] z-30 pointer-events-none" 
          style={{
            background: `linear-gradient(to right, transparent, ${primaryHex}, transparent)`,
            boxShadow: `0 0 20px ${primaryHex}`
          }}
        />

        {/* 1. ULTRA-SLIM COCKPIT TELEMETRY HEADER (~56px) */}
        <div className="h-14 px-4 sm:px-6 bg-gradient-to-r from-black/95 via-black/80 to-black/95 border-b border-white/10 shrink-0 flex items-center justify-between gap-3 relative z-20">
          
          {/* Left: Title & Badge */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <div 
              className="w-8 h-8 rounded-xl flex items-center justify-center border transition-colors shadow-lg"
              style={{
                backgroundColor: `${primaryHex}1A`,
                borderColor: `${primaryHex}66`,
                color: primaryHex,
                boxShadow: `0 0 15px ${primaryHex}4D`
              }}
            >
              <Dices className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-sm sm:text-base font-black text-white uppercase italic tracking-tight font-headline">
                  Team Allocation <span style={{ color: primaryHex }}>Arena</span>
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Arena alokasi dan pengundian tim peserta turnamen
                </DialogDescription>
                <Badge 
                  variant="outline" 
                  className="text-[8px] font-black uppercase tracking-wider h-4.5 px-1.5 hidden sm:inline-flex"
                  style={{
                    color: primaryHex,
                    borderColor: `${primaryHex}4D`
                  }}
                >
                  {isCoop ? 'CO-OP SQUAD' : 'SINGLE ATHLETE'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Center: Progress Tracker */}
          <div className="hidden md:flex items-center gap-3 max-w-sm flex-1 mx-4">
            <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-white/50 shrink-0">
              <Activity className="w-3 h-3 animate-pulse" style={{ color: primaryHex }} />
              <span>Alokasi: <strong className="text-white font-mono">{totalAssigned}/{totalRegistered}</strong></span>
            </div>
            <div className="relative h-2 flex-1 bg-white/5 rounded-full overflow-hidden border border-white/10">
              <div 
                className="absolute left-0 top-0 h-full rounded-full transition-all duration-500" 
                style={{ 
                  width: `${progressPercent}%`,
                  background: `linear-gradient(to right, ${secondaryHex}, ${primaryHex})`,
                  boxShadow: `0 0 10px ${primaryHex}`
                }} 
              />
            </div>
            <span className="text-[9px] font-black font-mono shrink-0" style={{ color: primaryHex }}>[{progressPercent}%]</span>
          </div>

          {/* Right: Mode Switchers & Close */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Mode Switcher */}
            <div className="bg-black/60 p-0.5 rounded-lg border border-white/10 flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => setDraftMode('draw')}
                className={cn(
                  "h-7 px-2.5 text-[9px] font-black uppercase tracking-wider italic rounded-md transition-all font-headline",
                  draftMode === 'draw' 
                    ? "text-black" 
                    : "text-white/40 hover:text-white"
                )}
                style={draftMode === 'draw' ? {
                  backgroundColor: primaryHex,
                  boxShadow: `0 0 12px ${primaryHex}80`
                } : {}}
              >
                <Shuffle className="w-3 h-3 inline mr-1" />
                Undian
              </button>
              <button
                type="button"
                onClick={() => setDraftMode('manual')}
                className={cn(
                  "h-7 px-2.5 text-[9px] font-black uppercase tracking-wider italic rounded-md transition-all font-headline",
                  draftMode === 'manual' 
                    ? "text-black" 
                    : "text-white/40 hover:text-white"
                )}
                style={draftMode === 'manual' ? {
                  backgroundColor: primaryHex,
                  boxShadow: `0 0 12px ${primaryHex}80`
                } : {}}
              >
                <CheckCircle2 className="w-3 h-3 inline mr-1" />
                Assign
              </button>
            </div>

            {/* Mirror Match Toggle */}
            {!isCoop && (
              <button
                type="button"
                onClick={() => setAllowSameTeam(!allowSameTeam)}
                className={cn(
                  "h-7 px-2.5 text-[8px] sm:text-[9px] font-black uppercase tracking-wider italic rounded-lg border transition-all hidden sm:inline-flex items-center",
                  allowSameTeam 
                    ? "bg-amber-400/20 text-amber-300 border-amber-400/50" 
                    : "text-white/40 border-white/10 hover:text-white"
                )}
                title="Izinkan tim yang sama untuk lebih dari 1 peserta"
              >
                <Users className="w-3 h-3 mr-1" />
                {allowSameTeam ? "Tim Sama: ON" : "Tim Sama: OFF"}
              </button>
            )}

            {/* Close Button */}
            <button
              onClick={() => onOpenChange(false)}
              className="w-7 h-7 rounded-lg text-white/40 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

        </div>

        {/* 2. SLIM INTERACTIVE BRIDGE BAR (~52px) */}
        <div className="h-13 sm:h-14 px-4 sm:px-6 bg-gradient-to-r from-black/80 via-white/[0.02] to-black/80 border-b border-white/10 shrink-0 flex items-center justify-between gap-2 sm:gap-4 relative overflow-hidden">
          
          {/* Left Chip: Selected Team */}
          <div className="flex items-center gap-2 min-w-0 max-w-[32%] sm:max-w-[35%]">
            {selectedTeam ? (
              <div 
                className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-xl border truncate"
                style={{
                  backgroundColor: `${primaryHex}1A`,
                  borderColor: `${primaryHex}66`,
                  boxShadow: `0 0 15px ${primaryHex}26`
                }}
              >
                <Avatar className="w-7 h-7 rounded-lg border border-white/20 bg-black/60 shrink-0">
                  <AvatarImage src={resolveLogo(selectedTeam.logoUrl, selectedTeam.id, selectedTeam.name)} className="object-cover" />
                  <AvatarFallback className="text-[7px] font-black">TM</AvatarFallback>
                </Avatar>
                <div className="truncate text-left">
                  <div className="flex items-center gap-1">
                    <span className="text-[7px] font-black uppercase" style={{ color: primaryHex }}>KLUB TARGET</span>
                    <Badge className={cn("text-[6px] h-3 px-1 rounded font-black", selectedTeam.tier === 1 ? "bg-amber-400 text-black" : "bg-white/10 text-white/70")}>
                      T{selectedTeam.tier || 3}
                    </Badge>
                  </div>
                  <p className="text-[11px] font-black text-white uppercase italic truncate font-headline leading-tight">
                    {selectedTeam.name}
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedTeamId(null)}
                  className="w-4 h-4 rounded-full text-white/40 hover:text-white hover:bg-white/10 flex items-center justify-center shrink-0 ml-1"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dashed border-white/15 text-white/30 text-[9px] font-black uppercase tracking-wider italic">
                <span>👈 Pilih 1 Tim di Kiri</span>
              </div>
            )}
          </div>

          {/* Center Action Button (Reactor) */}
          <div className="flex flex-col items-center justify-center shrink-0">
            <Button
              onClick={handleRunDraw}
              disabled={!selectedTeamId || selectedPlayerIds.length === 0 || isDrawing}
              className={cn(
                "h-9 sm:h-10 px-5 sm:px-7 font-black uppercase italic text-[11px] sm:text-xs tracking-wider rounded-xl transition-all shadow-xl font-headline",
                isDrawing 
                  ? "cursor-wait animate-pulse" 
                  : (!selectedTeamId || selectedPlayerIds.length === 0)
                    ? "bg-white/5 text-white/30 border border-white/10 cursor-not-allowed"
                    : "text-black hover:scale-105 active:scale-95"
              )}
              style={
                isDrawing ? {
                  backgroundColor: `${primaryHex}26`,
                  color: primaryHex,
                  borderColor: `${primaryHex}66`
                } : (!selectedTeamId || selectedPlayerIds.length === 0) ? {} : {
                  backgroundColor: primaryHex,
                  boxShadow: `0 0 25px ${primaryHex}80`
                }
              }
            >
              {isDrawing ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" style={{ color: primaryHex }} />
                  <span className="truncate">{rouletteName ? `UNDIAN: ${rouletteName}` : 'MENGOCOR DRAFT...'}</span>
                </span>
              ) : draftMode === 'manual' ? (
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>KUNCI ALOKASI ({selectedPlayerIds.length})</span>
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Shuffle className="w-4 h-4" />
                  <span>{selectedPlayerIds.length === 1 ? 'ASSIGN KE ATLET' : 'PUTAR ROULETTE'}</span>
                </span>
              )}
            </Button>
          </div>

          {/* Right Chip: Selected Athlete(s) */}
          <div className="flex items-center justify-end gap-2 min-w-0 max-w-[32%] sm:max-w-[35%]">
            {selectedPlayerIds.length > 0 ? (
              <div 
                className="flex items-center gap-2 p-1 pl-2.5 pr-1.5 rounded-xl border truncate"
                style={{
                  backgroundColor: `${primaryHex}1A`,
                  borderColor: `${primaryHex}66`,
                  boxShadow: `0 0 15px ${primaryHex}26`
                }}
              >
                <div className="truncate text-right">
                  <span className="text-[7px] font-black uppercase" style={{ color: primaryHex }}>
                    {selectedPlayerIds.length > 1 ? `${selectedPlayerIds.length} ATLET TERPILIH` : 'ATLET TERPILIH'}
                  </span>
                  <p className="text-[11px] font-black text-white uppercase italic truncate font-headline leading-tight">
                    {selectedPlayerIds.length === 1 ? firstSelectedPlayerName : `${selectedPlayerIds.length} Peserta`}
                  </p>
                </div>
                <div 
                  className="w-7 h-7 rounded-lg bg-black/60 border border-white/20 flex items-center justify-center shrink-0"
                  style={{ color: primaryHex }}
                >
                  <Users className="w-3.5 h-3.5" />
                </div>
                <button 
                  onClick={() => setSelectedPlayerIds([])}
                  className="w-4 h-4 rounded-full text-white/40 hover:text-white hover:bg-white/10 flex items-center justify-center shrink-0 ml-0.5"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dashed border-white/15 text-white/30 text-[9px] font-black uppercase tracking-wider italic">
                <span>Pilih Peserta di Kanan 👉</span>
              </div>
            )}
          </div>

        </div>

        {/* Outcome Notification Banner (if any) */}
        {lastDrawResult && !isDrawing && (
          <div 
            className="px-4 py-1.5 border-b flex items-center justify-between gap-2 shrink-0 animate-in slide-in-from-top-1"
            style={{
              backgroundColor: `${primaryHex}14`,
              borderColor: `${primaryHex}4D`
            }}
          >
            <div className="flex items-center gap-2 text-xs font-black uppercase italic truncate" style={{ color: primaryHex }}>
              <Trophy className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                {lastDrawResult.isManual ? 'ASSIGN SELESAI' : 'HASIL UNDIAN'}: {" "}
                <strong className="text-white underline">{lastDrawResult.winnerName}</strong> &bull; MENGAMBIL TIM {" "}
                <strong style={{ color: primaryHex }}>{lastDrawResult.teamName}</strong>
              </span>
            </div>
            <button onClick={() => setLastDrawResult(null)} className="text-white/40 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* 3. HIGH-DENSITY SIDE-BY-SIDE PANELS (MAIN BODY) */}
        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-3 p-3 overflow-hidden">
          
          {/* SISI KIRI: DAFTAR KLUB (HIGH DENSITY TILES) */}
          <div className="flex flex-col overflow-hidden border border-white/10 rounded-2xl bg-black/50 shadow-inner">
            
            {/* Header Toolbar Klub */}
            <div className="p-2.5 bg-black/70 border-b border-white/5 shrink-0 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 shrink-0">
                <Shield className="w-3.5 h-3.5" style={{ color: primaryHex }} />
                <span className="text-[10px] font-black uppercase tracking-wider text-white/80 italic font-headline">
                  Daftar Klub ({filteredTeams.length})
                </span>
              </div>

              {/* Search Bar */}
              <div className="relative flex-1 max-w-[160px] sm:max-w-[200px]">
                <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30" />
                <Input
                  type="text"
                  value={searchTeam}
                  onChange={(e) => setSearchTeam(e.target.value)}
                  placeholder="Cari klub..."
                  className="h-7 pl-7 pr-6 bg-white/5 border-white/10 text-[10px] font-black uppercase tracking-wider text-white placeholder:text-white/20 rounded-lg focus:border-white/40"
                />
                {searchTeam && (
                  <button onClick={() => setSearchTeam('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white">
                    <X className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>

              {/* Tier Filters */}
              <div className="flex items-center gap-0.5 bg-black/60 p-0.5 rounded-lg border border-white/10 shrink-0">
                {(['ALL', '1', '2', '3'] as const).map(tier => (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => setTierFilter(tier)}
                    className={cn(
                      "px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider italic rounded transition-all",
                      tierFilter === tier 
                        ? "text-black font-headline" 
                        : "text-white/40 hover:text-white"
                    )}
                    style={tierFilter === tier ? {
                      backgroundColor: primaryHex,
                      boxShadow: `0 0 8px ${primaryHex}80`
                    } : {}}
                  >
                    {tier === 'ALL' ? 'ALL' : `T${tier}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable Compact Tiles (Grid of 3 columns) */}
            <ScrollArea className="flex-1 p-2">
              {filteredTeams.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pb-4">
                  {filteredTeams.map(team => {
                    const isSelected = selectedTeamId === team.id;
                    const logoUrl = resolveLogo(team.logoUrl, team.id, team.name);
                    const isTier1 = team.tier === 1;

                    return (
                      <button
                        key={team.id}
                        type="button"
                        onClick={() => setSelectedTeamId(isSelected ? null : team.id)}
                        className={cn(
                          "h-11 px-2 rounded-xl border flex items-center gap-2 transition-all duration-200 text-left relative overflow-hidden group",
                          isSelected 
                            ? "scale-[1.02]" 
                            : "bg-white/[0.02] border-white/5 hover:bg-white/[0.05]"
                        )}
                        style={isSelected ? {
                          backgroundColor: `${primaryHex}26`,
                          borderColor: primaryHex,
                          boxShadow: `0 0 15px ${primaryHex}59`
                        } : {}}
                      >
                        {/* Crest */}
                        <Avatar className="h-7 w-7 rounded-lg border border-white/15 bg-black/60 shrink-0 shadow">
                          <AvatarImage src={logoUrl} className="object-cover" />
                          <AvatarFallback className="bg-black text-[7px] font-black uppercase text-white/40">
                            {team.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>

                        {/* Name & Tier */}
                        <div className="flex-1 min-w-0 pr-1">
                          <p 
                            className={cn(
                              "text-[10px] font-black uppercase italic tracking-tight truncate leading-tight transition-colors font-headline",
                              !isSelected && "text-white/80 group-hover:text-white"
                            )}
                            style={isSelected ? {
                              color: primaryHex,
                              textShadow: `0 0 8px ${primaryHex}80`
                            } : {}}
                          >
                            {team.name}
                          </p>
                        </div>

                        {/* Tier Badge */}
                        <Badge className={cn(
                          "text-[7px] font-black italic h-3.5 px-1 rounded shrink-0",
                          isTier1 
                            ? "bg-amber-400 text-black shadow-[0_0_6px_rgba(251,191,36,0.6)]" 
                            : team.tier === 2 
                              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30" 
                              : "bg-white/10 text-white/50"
                        )}>
                          T{team.tier || 3}
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center border border-dashed border-white/10 rounded-xl opacity-40">
                  <Shield className="w-6 h-6 mx-auto mb-1.5 text-white/30" />
                  <p className="text-[9px] font-black uppercase tracking-wider italic">Tidak ada klub cocok</p>
                </div>
              )}
            </ScrollArea>
          </div>

          {/* SISI KANAN: MANIFEST PESERTA (HIGH DENSITY ROWS) */}
          <div className="flex flex-col overflow-hidden border border-white/10 rounded-2xl bg-black/50 shadow-inner">
            
            {/* Header Toolbar Peserta */}
            <div className="p-2.5 bg-black/70 border-b border-white/5 shrink-0 flex items-center justify-between gap-2">
              
              {/* Dual Tab Switcher */}
              <div className="bg-black/60 p-0.5 rounded-lg border border-white/10 flex items-center gap-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setActivePlayerTab('unassigned')}
                  className={cn(
                    "h-6 px-2.5 text-[8px] sm:text-[9px] font-black uppercase tracking-wider italic rounded-md transition-all font-headline whitespace-nowrap",
                    activePlayerTab === 'unassigned'
                      ? "text-black"
                      : "text-white/40 hover:text-white"
                  )}
                  style={activePlayerTab === 'unassigned' ? {
                    backgroundColor: primaryHex,
                    boxShadow: `0 0 10px ${primaryHex}80`
                  } : {}}
                >
                  <span className="inline-block pr-0.5">Belum Draft ({unassignedEntries.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActivePlayerTab('assigned')}
                  className={cn(
                    "h-6 px-2.5 text-[8px] sm:text-[9px] font-black uppercase tracking-wider italic rounded-md transition-all font-headline whitespace-nowrap",
                    activePlayerTab === 'assigned'
                      ? "text-black"
                      : "text-white/40 hover:text-white"
                  )}
                  style={activePlayerTab === 'assigned' ? {
                    backgroundColor: primaryHex,
                    boxShadow: `0 0 10px ${primaryHex}80`
                  } : {}}
                >
                  <span className="inline-block pr-0.5">Terkunci ({assignedEntries.length})</span>
                </button>
              </div>

              {/* Search Peserta */}
              <div className="relative flex-1 max-w-[150px] sm:max-w-[180px]">
                <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30" />
                <Input
                  type="text"
                  value={searchPlayer}
                  onChange={(e) => setSearchPlayer(e.target.value)}
                  placeholder="Cari peserta..."
                  className="h-7 pl-7 pr-6 bg-white/5 border-white/10 text-[10px] font-black uppercase tracking-wider text-white placeholder:text-white/20 rounded-lg focus:border-white/40"
                />
                {searchPlayer && (
                  <button onClick={() => setSearchPlayer('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white">
                    <X className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>

              {/* Select All (Only in unassigned) */}
              {activePlayerTab === 'unassigned' && unassignedEntries.length > 0 && (
                <button
                  type="button"
                  onClick={handleSelectAllUnassigned}
                  className="h-7 px-2 text-[8px] font-black uppercase tracking-wider italic rounded-lg border border-white/10 transition-all shrink-0 hover:text-white"
                  style={{
                    borderColor: selectedPlayerIds.length === unassignedEntries.length ? primaryHex : undefined,
                    color: selectedPlayerIds.length === unassignedEntries.length ? primaryHex : undefined
                  }}
                >
                  {selectedPlayerIds.length === unassignedEntries.length ? 'Batal Semua' : 'Pilih Semua'}
                </button>
              )}
            </div>

            {/* Scrollable Compact Rows */}
            <ScrollArea className="flex-1 p-2">
              {activePlayerTab === 'unassigned' ? (
                unassignedEntries.length > 0 ? (
                  <div className="space-y-1 pb-4">
                    {unassignedEntries.map((entry, idx) => {
                      const isSelected = selectedPlayerIds.includes(entry.id);

                      return (
                        <button
                          key={entry.id}
                          type="button"
                          onClick={() => togglePlayerSelection(entry.id)}
                          className={cn(
                            "w-full h-9 px-2.5 rounded-xl border flex items-center justify-between gap-2.5 transition-all duration-150 text-left relative overflow-hidden group",
                            !isSelected && "bg-white/[0.02] border-white/5 hover:border-white/20 hover:bg-white/[0.04]"
                          )}
                          style={isSelected ? {
                            backgroundColor: `${primaryHex}26`,
                            borderColor: `${primaryHex}99`,
                            boxShadow: `0 0 12px ${primaryHex}40`
                          } : {}}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            {/* Checkbox indicator */}
                            <div 
                              className={cn(
                                "w-4 h-4 rounded-md border flex items-center justify-center transition-all shrink-0",
                                !isSelected && "border-white/20 bg-black/40"
                              )}
                              style={isSelected ? {
                                backgroundColor: primaryHex,
                                borderColor: primaryHex,
                                color: '#000000',
                                boxShadow: `0 0 8px ${primaryHex}`
                              } : {}}
                            >
                              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>

                            {/* Index */}
                            <span className="text-[9px] font-mono text-white/30 shrink-0 w-4">
                              #{idx + 1}
                            </span>

                            {/* Athlete Name */}
                            <p 
                              className={cn(
                                "text-xs font-black uppercase italic tracking-tight truncate transition-colors font-headline flex-1 min-w-0 pr-1.5",
                                !isSelected && "text-white/80 group-hover:text-white"
                              )}
                              style={isSelected ? { color: primaryHex } : {}}
                            >
                              {entry.name}
                            </p>
                          </div>

                          <span className="text-[7px] font-black uppercase tracking-wider text-white/30 border border-white/10 px-1.5 py-0.5 rounded shrink-0">
                            PENDING
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-12 text-center border border-dashed border-white/10 rounded-xl opacity-40">
                    <CheckCircle2 className="w-6 h-6 mx-auto mb-1.5" style={{ color: primaryHex }} />
                    <p className="text-[9px] font-black uppercase tracking-wider italic">Semua peserta telah ter-alokasi tim!</p>
                  </div>
                )
              ) : (
                /* Tab Assigned */
                assignedEntries.length > 0 ? (
                  <div className="space-y-1 pb-4">
                    {assignedEntries.map(entry => {
                      const logoUrl = resolveLogo(entry.team?.logoUrl, entry.teamId, entry.team?.name);

                      return (
                        <div 
                          key={entry.id}
                          className="w-full h-9 px-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all"
                          style={{
                            backgroundColor: `${primaryHex}0A`,
                            borderColor: `${primaryHex}33`
                          }}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className="text-xs font-black uppercase italic text-white tracking-tight truncate font-headline max-w-[130px] sm:max-w-[170px] pr-1.5 shrink-0">
                              {entry.name}
                            </span>

                            <ArrowRight className="w-3 h-3 shrink-0" style={{ color: `${primaryHex}99` }} />

                            {/* Assigned Team */}
                            <div className="flex items-center gap-1.5 min-w-0 truncate flex-1">
                              <Avatar className="h-5 w-5 rounded border border-white/15 bg-black shrink-0">
                                <AvatarImage src={logoUrl} className="object-cover" />
                                <AvatarFallback className="text-[6px] font-black">TM</AvatarFallback>
                              </Avatar>
                              <span 
                                className="text-[10px] font-black uppercase tracking-wider truncate font-headline pr-1"
                                style={{ color: primaryHex }}
                              >
                                {entry.team?.name}
                              </span>
                              <Badge className={cn(
                                "text-[6px] font-black italic h-3 px-1 rounded shrink-0",
                                entry.team?.tier === 1 ? "bg-amber-400 text-black" : "bg-white/10 text-white/60"
                              )}>
                                T{entry.team?.tier || 3}
                              </Badge>
                            </div>
                          </div>

                          {/* Unassign button */}
                          <button 
                            type="button" 
                            onClick={() => removeAssignment(entry.id)}
                            className="w-6 h-6 text-white/20 hover:text-rose-400 hover:bg-rose-500/10 rounded flex items-center justify-center transition-colors shrink-0"
                            title="Hapus alokasi tim peserta ini"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-12 text-center border border-dashed border-white/10 rounded-xl opacity-40">
                    <Activity className="w-6 h-6 mx-auto mb-1.5 text-white/30" />
                    <p className="text-[9px] font-black uppercase tracking-wider italic">Belum ada peserta yang terkunci</p>
                  </div>
                )
              )}
            </ScrollArea>
          </div>

        </div>

        {/* 4. COMPACT COCKPIT ACTION DOCK (FOOTER) (~54px) */}
        <div className="h-14 px-4 sm:px-6 bg-black/95 border-t border-white/10 shrink-0 backdrop-blur-2xl flex items-center justify-between gap-3 relative z-20">
          
          {/* Quick Tools */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={unassignedEntries.length === 0 || isDrawing}
              onClick={handleAutoDraftAll}
              className="h-8 sm:h-9 px-3 text-[9px] sm:text-[10px] font-black uppercase tracking-wider italic rounded-xl transition-all shadow-lg font-headline hover:text-black"
              style={{
                backgroundColor: `${primaryHex}1A`,
                borderColor: `${primaryHex}66`,
                color: primaryHex
              }}
            >
              <Zap className="w-3.5 h-3.5 mr-1" />
              Auto-Draft Sisa ({unassignedEntries.length})
            </Button>

            {/* Team to All */}
            {(draftMode === 'manual' || allowSameTeam) && selectedTeamId && unassignedEntries.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAssignTeamToAll}
                className="h-8 sm:h-9 px-2.5 text-[8px] sm:text-[9px] font-black uppercase tracking-wider italic border-amber-400/40 text-amber-300 hover:bg-amber-400/20 rounded-xl transition-all hidden sm:inline-flex"
              >
                <Users className="w-3 h-3 mr-1" />
                Klub Ini Ke Semua
              </Button>
            )}

            {/* Reset */}
            {totalAssigned > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleResetDraft}
                className="h-8 sm:h-9 px-2.5 text-[8px] sm:text-[9px] font-black uppercase tracking-wider italic text-rose-400/70 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Reset
              </Button>
            )}
          </div>

          {/* Primary Submit */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 sm:h-9 px-3 text-[9px] sm:text-[10px] font-black uppercase tracking-wider italic text-white/40 hover:text-white rounded-xl"
            >
              Batal
            </Button>

            <Button
              type="button"
              onClick={handleFinalSubmit}
              disabled={totalAssigned === 0}
              className={cn(
                "h-8 sm:h-9 px-4 sm:px-5 font-black uppercase italic text-[10px] sm:text-xs tracking-wider rounded-xl transition-all shadow-xl font-headline",
                totalAssigned > 0
                  ? "text-black hover:scale-105 active:scale-95"
                  : "bg-white/5 text-white/20 border border-white/5 cursor-not-allowed"
              )}
              style={totalAssigned > 0 ? {
                backgroundColor: primaryHex,
                boxShadow: `0 0 20px ${primaryHex}80`
              } : {}}
            >
              <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
              Kunci & Simpan ({totalAssigned})
            </Button>
          </div>

        </div>

        {/* 5. ULTRA-LIGHTWEIGHT CENTER-STAGE POPOUT WINNER MODAL */}
        {popoutWinner && (
          <div 
            className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 select-none"
            onClick={() => setPopoutWinner(null)}
          >
            {/* Background Radial Atmosphere Glow */}
            <div 
              className="absolute inset-0 pointer-events-none opacity-40 animate-pulse"
              style={{
                background: `radial-gradient(circle at center, ${primaryHex}4D 0%, transparent 65%)`
              }}
            />

            {/* Main Center Popout Card */}
            <div 
              className="relative w-full max-w-sm sm:max-w-md bg-[#070B14]/95 border-2 rounded-3xl p-6 sm:p-7 flex flex-col items-center text-center shadow-2xl overflow-hidden animate-popout-bounce"
              style={{
                borderColor: primaryHex,
                boxShadow: `0 0 50px ${primaryHex}80, inset 0 0 30px ${primaryHex}26`
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Top Accent Light Beam */}
              <div 
                className="absolute top-0 left-0 right-0 h-1.5"
                style={{
                  background: `linear-gradient(90deg, transparent, ${primaryHex}, transparent)`,
                  boxShadow: `0 0 15px ${primaryHex}`
                }}
              />

              {/* Close Icon Button */}
              <button 
                onClick={() => setPopoutWinner(null)}
                className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white/60 hover:text-white flex items-center justify-center transition-all z-10"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Header Badge */}
              <div className="flex items-center gap-1.5 mb-4">
                <span 
                  className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.25em] italic flex items-center gap-1.5 border"
                  style={{
                    backgroundColor: `${primaryHex}1A`,
                    borderColor: `${primaryHex}66`,
                    color: primaryHex,
                    boxShadow: `0 0 12px ${primaryHex}4D`
                  }}
                >
                  <Sparkles className="w-3 h-3 animate-spin-slow" />
                  HASIL UNDIAN ROULETTE
                </span>
              </div>

              {/* Winner Name Banner with Radar Pulse Aura */}
              <div className="relative mb-6">
                <div 
                  className="absolute -inset-4 rounded-2xl animate-radar-pulse pointer-events-none border opacity-40"
                  style={{ borderColor: primaryHex }}
                />
                <div 
                  className="relative px-5 py-2.5 rounded-2xl border"
                  style={{
                    backgroundColor: `${primaryHex}14`,
                    borderColor: `${primaryHex}4D`
                  }}
                >
                  <span className="text-[8px] font-black uppercase tracking-widest text-white/50 block mb-0.5">
                    PESERTA TERPILIH
                  </span>
                  <h3 
                    className="text-xl sm:text-2xl font-black uppercase italic tracking-tight font-headline"
                    style={{
                      color: '#ffffff',
                      textShadow: `0 0 20px ${primaryHex}`
                    }}
                  >
                    {popoutWinner.winnerName}
                  </h3>
                </div>
              </div>

              {/* Transition Indicator */}
              <div className="flex items-center justify-center gap-2 mb-4 w-full px-6">
                <div className="h-[1px] flex-1" style={{ background: `linear-gradient(to right, transparent, ${primaryHex}66)` }} />
                <span className="text-[8px] font-black uppercase tracking-widest italic text-white/40">
                  MEMPEROLEH KLUB
                </span>
                <div className="h-[1px] flex-1" style={{ background: `linear-gradient(to left, transparent, ${primaryHex}66)` }} />
              </div>

              {/* Assigned Team Crest and Display Card */}
              <div 
                className="w-full p-4 rounded-2xl border bg-black/60 flex items-center gap-3.5 mb-6 text-left"
                style={{ borderColor: `${primaryHex}40` }}
              >
                <div className="relative shrink-0">
                  <Avatar className="h-14 w-14 rounded-2xl border-2 border-white/20 bg-black shadow-xl">
                    <AvatarImage src={popoutWinner.teamLogoUrl} className="object-cover" />
                    <AvatarFallback className="font-black text-xs">TM</AvatarFallback>
                  </Avatar>
                  <div 
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center border text-black shadow-md font-black text-[9px]"
                    style={{ backgroundColor: primaryHex, borderColor: '#ffffff' }}
                  >
                    <Crown className="w-3 h-3 text-black fill-black" />
                  </div>
                </div>

                <div className="flex-1 min-w-0 pr-1">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Badge className={cn(
                      "text-[8px] font-black italic h-4 px-1.5 rounded",
                      popoutWinner.teamTier === 1 
                        ? "bg-amber-400 text-black shadow-[0_0_8px_rgba(251,191,36,0.6)]" 
                        : popoutWinner.teamTier === 2 
                          ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30" 
                          : "bg-white/10 text-white/60"
                    )}>
                      TIER {popoutWinner.teamTier}
                    </Badge>
                    <span className="text-[8px] font-black uppercase tracking-widest text-white/30">OFFICIAL SEED</span>
                  </div>
                  <h4 
                    className="text-base sm:text-lg font-black uppercase italic tracking-tight truncate font-headline"
                    style={{ color: primaryHex }}
                  >
                    {popoutWinner.teamName}
                  </h4>
                </div>
              </div>

              {/* Confirm / Continue Button */}
              <Button
                type="button"
                onClick={() => setPopoutWinner(null)}
                className="w-full h-10 font-black uppercase italic text-xs tracking-wider rounded-xl transition-all shadow-xl font-headline text-black hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  backgroundColor: primaryHex,
                  boxShadow: `0 0 25px ${primaryHex}80`
                }}
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5 stroke-[2.5]" />
                Lanjutkan Draft
              </Button>
            </div>
          </div>
        )}

      </DialogContent>
    </Dialog>
  );
}
