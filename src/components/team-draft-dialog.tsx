'use client';

import { useState, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Users, CheckCircle2, Binary, Loader2, Zap, Trash2, Trophy, Shuffle, Scan, Activity, X } from 'lucide-react';
import type { Team, LeagueEntry, Season, WithId } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

interface TeamDraftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  season: WithId<Season> | null;
  registeredPlayers: WithId<LeagueEntry>[];
  allTeams: WithId<Team>[];
  onSaveAssignments: (assignments: { entryId: string, teamId: string, teamName: string }[]) => void;
  isAdmin: boolean;
}

export function TeamDraftDialog({ open, onOpenChange, season, registeredPlayers, allTeams, onSaveAssignments, isAdmin }: TeamDraftDialogProps) {
  const { toast } = useToast();
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string>>({}); // playerEntryId -> teamId
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastDrawResult, setLastDrawResult] = useState<{ winnerName: string, teamName: string, isManual: boolean } | null>(null);

  const availableTeams = useMemo(() => {
    const assignedTeamIds = new Set(Object.values(assignments));
    return allTeams.filter(t => !assignedTeamIds.has(t.id)).sort((a, b) => (a.tier || 3) - (b.tier || 3));
  }, [allTeams, assignments]);

  const unassignedPlayers = useMemo(() => {
    return registeredPlayers.filter(p => !assignments[p.id]).sort((a,b) => a.playerName.localeCompare(b.playerName));
  }, [registeredPlayers, assignments]);

  const assignedPlayers = useMemo(() => {
    return registeredPlayers.filter(p => !!assignments[p.id]).map(p => ({
        ...p,
        teamId: assignments[p.id],
        team: allTeams.find(t => t.id === assignments[p.id])
    })).sort((a, b) => (a.team?.tier || 3) - (b.team?.tier || 3));
  }, [registeredPlayers, assignments, allTeams]);

  const togglePlayerSelection = (id: string) => {
    setSelectedPlayerIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const removeAssignment = (entryId: string) => {
      setAssignments(prev => {
          const next = { ...prev };
          delete next[entryId];
          return next;
      });
      if (lastDrawResult) setLastDrawResult(null);
  };

  const handleRunDraw = useCallback(() => {
    if (!selectedTeamId || selectedPlayerIds.length === 0) return;

    const team = allTeams.find(t => t.id === selectedTeamId)!;
    const isManual = selectedPlayerIds.length === 1;
    
    setIsDrawing(true);
    setLastDrawResult(null);

    const delay = isManual ? 400 : 1500;

    setTimeout(() => {
        const pool = selectedPlayerIds;
        const winnerId = pool[Math.floor(Math.random() * pool.length)];
        const winnerEntry = registeredPlayers.find(p => p.id === winnerId);

        setAssignments(prev => ({ ...prev, [winnerId]: selectedTeamId }));
        setLastDrawResult({
            winnerName: winnerEntry?.playerName || 'Unknown',
            teamName: team.name,
            isManual
        });

        toast({
            title: isManual ? "VERIFICATION SUCCESS" : "OUTCOME LOCKED",
            description: isManual 
                ? `${winnerEntry?.playerName} assigned to ${team.name}.`
                : `${winnerEntry?.playerName} won ${team.name} via Seeded Draw.`
        });

        setSelectedTeamId(null);
        setSelectedPlayerIds([]);
        setIsDrawing(false);
    }, delay);
  }, [selectedTeamId, selectedPlayerIds, allTeams, registeredPlayers, toast]);

  const handleFinalSubmit = () => {
    const data = Object.entries(assignments).map(([entryId, teamId]) => {
        const team = allTeams.find(t => t.id === teamId)!;
        return { entryId, teamId, teamName: team.name };
    });
    onSaveAssignments(data);
  };

  const isManualMode = selectedPlayerIds.length === 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl p-0 overflow-hidden border-primary border-4 bg-[#0A192F]/95 backdrop-blur-3xl rounded-[2.5rem] shadow-[0_0_100px_rgba(204,253,1,0.15)]">
        <div className="flex flex-col h-[90vh]">
          {/* Header */}
          <DialogHeader className="p-6 sm:p-10 border-b border-white/5 bg-black/40 relative overflow-hidden shrink-0">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(204,253,1,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(204,253,1,0.02)_1px,transparent_1px)] bg-[size:20px_20px] opacity-20 pointer-events-none" />
            
            <div className="flex items-center gap-5 relative z-10">
                <div className="relative group">
                    <div className="absolute -inset-2 bg-primary/20 rounded-2xl blur-lg animate-pulse" />
                    <div className="p-4 bg-primary/10 rounded-2xl border-2 border-primary/30 text-primary shadow-[0_0_30px_rgba(204,253,1,0.3)] relative z-10">
                        <Binary className="w-8 h-8 sm:w-10 h-10" />
                    </div>
                </div>
                <div className="space-y-1">
                    <DialogTitle className="text-2xl sm:text-4xl font-black tracking-tighter uppercase italic pr-4 drop-shadow-[0_0_20px_255,255,255,0.1)]">Team Draft System</DialogTitle>
                    <div className="flex items-center gap-3">
                        <Badge variant="outline" className="bg-primary/10 border-primary/20 text-primary text-[8px] font-black uppercase tracking-[0.2em] h-5">Protocol: Multi-Tier Fairness Engine v2.0</Badge>
                        <span className="text-[8px] font-bold text-white/20 uppercase tracking-[0.4em] hidden sm:block">Real-time Allocation Matrix</span>
                    </div>
                </div>
            </div>
          </DialogHeader>

          {/* Main Area */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
            {/* Sisi Kiri: Tim */}
            <div className="lg:col-span-6 flex flex-col overflow-hidden border-r border-white/5 bg-black/20">
                <div className="p-6 pb-4 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="h-4 w-1 bg-primary rounded-full shadow-[0_0_10px_rgba(204,253,1,0.8)]" />
                        <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/60 italic pr-2">Available Strategic Units</h3>
                    </div>
                    <Badge variant="outline" className="h-6 font-black border-white/10 text-white/30 tracking-widest">{availableTeams.length} UNITS REM.</Badge>
                </div>
                <ScrollArea className="flex-1 px-6">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pb-12">
                        {availableTeams.map(team => (
                            <button
                                key={team.id}
                                onClick={() => setSelectedTeamId(team.id === selectedTeamId ? null : team.id)}
                                className={cn(
                                    "flex flex-col items-center p-4 rounded-2xl border-2 transition-all duration-500 group relative overflow-hidden",
                                    selectedTeamId === team.id 
                                        ? "bg-primary/15 border-primary shadow-[0_0_40px_rgba(204,253,1,0.2)] scale-[1.02]" 
                                        : "bg-white/[0.03] border-white/5 hover:border-primary/30 hover:bg-white/[0.05]"
                                )}
                            >
                                <Badge className={cn(
                                    "absolute top-2 right-2 text-[8px] font-black italic h-5 px-2",
                                    team.tier === 1 ? "bg-yellow-400 text-black shadow-lg" : "bg-white/10 text-white/60"
                                )}>T{team.tier || 3}</Badge>
                                
                                <Avatar className="h-14 w-14 sm:h-16 sm:w-16 border-2 border-white/10 mb-3 group-hover:scale-110 transition-transform duration-500 relative z-10">
                                    <AvatarImage src={team.logoUrl} className="object-cover" />
                                    <AvatarFallback className="bg-black/40 text-[8px] font-black uppercase leading-tight text-center px-0.5">LOGO NULL</AvatarFallback>
                                </Avatar>
                                <span className={cn(
                                    "text-[10px] font-black uppercase italic tracking-tighter transition-colors text-center px-1 relative z-10 leading-none",
                                    selectedTeamId === team.id ? "text-primary" : "text-white/60 group-hover:text-white"
                                )}>{team.name}</span>
                            </button>
                        ))}
                    </div>
                </ScrollArea>
            </div>

            {/* Sisi Kanan: Pemain (dengan Tab) */}
            <div className="lg:col-span-6 flex flex-col bg-black/40 overflow-hidden relative">
                <Tabs defaultValue="unassigned" className="flex-1 flex flex-col overflow-hidden">
                    <div className="p-6 border-b border-white/5 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <Users className="w-5 h-5 text-primary" />
                            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/60 italic pr-2">Athlete Manifest</h3>
                        </div>
                        <TabsList className="bg-black/40 border-2 border-white/5 h-11 p-1 rounded-xl">
                            <TabsTrigger 
                                value="unassigned" 
                                className="text-[9px] font-black uppercase tracking-widest italic data-[state=active]:bg-primary data-[state=active]:text-black rounded-lg transition-all px-4"
                            >
                                Free Agent [{unassignedPlayers.length}]
                            </TabsTrigger>
                            <TabsTrigger 
                                value="assigned" 
                                className="text-[9px] font-black uppercase tracking-widest italic data-[state=active]:bg-primary data-[state=active]:text-black rounded-lg transition-all px-4"
                            >
                                Locked [{assignedPlayers.length}]
                            </TabsTrigger>
                        </TabsList>
                    </div>
                    
                    <div className="flex-1 relative overflow-hidden">
                        <TabsContent value="unassigned" className="h-full m-0 outline-none data-[state=active]:flex flex-col">
                            <ScrollArea className="flex-1">
                                <div className="px-6 py-6 space-y-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-pulse" />
                                        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white/30 italic">Available Roster</span>
                                    </div>
                                    {unassignedPlayers.length > 0 ? unassignedPlayers.map(player => {
                                        const isSelected = selectedPlayerIds.includes(player.id);
                                        return (
                                            <button
                                                key={player.id}
                                                onClick={() => togglePlayerSelection(player.id)}
                                                className={cn(
                                                    "w-full flex items-center justify-between p-3.5 rounded-xl border-2 transition-all duration-300 relative overflow-hidden group",
                                                    isSelected ? "bg-primary/15 border-primary/50 shadow-inner" : "bg-white/[0.02] border-white/5 hover:bg-white/[0.05]"
                                                )}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={cn("w-1 h-6 rounded-full transition-all duration-500", isSelected ? "bg-primary shadow-[0_0_10px_rgba(204,253,1,0.8)]" : "bg-white/10")} />
                                                    <p className={cn("text-[13px] font-black uppercase italic tracking-tight transition-colors", isSelected ? "text-primary" : "text-white/80 group-hover:text-white")}>{player.playerName}</p>
                                                </div>
                                                {isSelected && <CheckCircle2 className="w-5 h-5 text-primary drop-shadow-[0_0_10px_rgba(204,253,1,0.4)]" />}
                                            </button>
                                        );
                                    }) : (
                                        <div className="py-12 text-center border-4 border-dashed border-white/5 rounded-3xl opacity-20">
                                            <Users className="w-10 h-10 mx-auto mb-3" />
                                            <p className="text-[10px] font-black uppercase tracking-[0.3em] italic">All Athletes Assigned</p>
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </TabsContent>

                        <TabsContent value="assigned" className="h-full m-0 outline-none data-[state=active]:flex flex-col">
                            <ScrollArea className="flex-1">
                                <div className="px-6 py-6 space-y-3">
                                    <div className="flex items-center gap-2 mb-1 px-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                                        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-green-400/60 italic">Verified Allocation</span>
                                    </div>
                                    <div className="grid grid-cols-1 gap-2.5">
                                        {assignedPlayers.length > 0 ? assignedPlayers.map(player => (
                                            <div key={player.id} className="w-full flex items-center justify-between p-3.5 rounded-xl border-2 border-green-500/20 bg-green-500/5 relative group/assigned overflow-hidden">
                                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500/40" />
                                                <div className="flex items-center gap-4">
                                                    <Avatar className="h-10 w-10 border-2 border-green-500/30 shadow-lg">
                                                        <AvatarImage src={player.team?.logoUrl} />
                                                        <AvatarFallback className="bg-black/40 text-[8px] font-black uppercase">TEAM</AvatarFallback>
                                                    </Avatar>
                                                    <div className="text-left">
                                                        <p className="text-sm font-black uppercase italic text-white/90 tracking-tight leading-tight pr-4">{player.playerName}</p>
                                                        <div className="flex items-center gap-2">
                                                            <Badge className="bg-green-500/20 text-green-400 border-none text-[7px] h-4 font-black">T{player.team?.tier || 3}</Badge>
                                                            <p className="text-[9px] font-black text-white/30 uppercase tracking-widest italic">{player.team?.name}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-9 w-9 text-white/10 hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover/assigned:opacity-100 transition-all rounded-lg"
                                                    onClick={() => removeAssignment(player.id)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        )) : (
                                            <div className="py-12 text-center border-4 border-dashed border-white/5 rounded-3xl opacity-20">
                                                <Activity className="w-10 h-10 mx-auto mb-3" />
                                                <p className="text-[10px] font-black uppercase tracking-[0.3em] italic">No Verified Units</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </ScrollArea>
                        </TabsContent>
                    </div>
                </Tabs>

                {/* Outcome HUD - Nested inside flow to avoid roster overlap */}
                {lastDrawResult && !isDrawing && (
                    <div className="px-6 py-2 animate-in slide-in-from-bottom-2 duration-500 shrink-0 bg-black/40 border-t border-white/10 relative z-20">
                        <div className={cn(
                            "border-2 rounded-2xl p-3 flex items-center gap-4 relative overflow-hidden shadow-2xl backdrop-blur-md",
                            lastDrawResult.isManual ? "bg-primary/20 border-primary/50" : "bg-yellow-500/20 border-yellow-500/50"
                        )}>
                            <div className={cn(
                                "p-2 rounded-lg shrink-0 shadow-lg",
                                lastDrawResult.isManual ? "bg-primary text-black" : "bg-yellow-500 text-black"
                            )}>
                                {lastDrawResult.isManual ? <CheckCircle2 className="w-5 h-5" /> : <Trophy className="w-5 h-5" />}
                            </div>
                            <div className="flex-1 min-w-0 relative z-10">
                                <p className={cn(
                                    "text-[7px] font-black uppercase tracking-[0.3em] mb-0.5",
                                    lastDrawResult.isManual ? "text-primary" : "text-yellow-500"
                                )}>{lastDrawResult.isManual ? "MANUAL ALLOCATION VERIFIED" : "RANDOM DRAW OUTCOME"}</p>
                                <p className="text-xs sm:text-sm font-black text-white uppercase italic truncate pr-4">
                                    <span className={lastDrawResult.isManual ? "text-primary" : "text-yellow-500"}>{lastDrawResult.winnerName}</span> SECURED <span className="text-white">{lastDrawResult.teamName}</span>
                                </p>
                            </div>
                            
                            <Button 
                                type="button"
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-white/40 hover:text-white hover:bg-white/10 rounded-full shrink-0 relative z-30"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setLastDrawResult(null);
                                }}
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                )}

                {/* Draft Control Footer - Compact Style */}
                <div className="p-4 sm:p-6 shrink-0 bg-black/60 border-t border-white/10 backdrop-blur-xl relative z-10">
                    <div className="bg-black/40 border-2 border-primary/20 rounded-2xl p-4 relative overflow-hidden group/processor">
                        <div className="flex items-center justify-between mb-3 px-1">
                            <div className="flex items-center gap-2">
                                <Binary className="w-4 h-4 text-primary/60" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 italic pr-2">Processor</span>
                            </div>
                            {isDrawing && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="flex flex-col p-3 bg-white/[0.02] rounded-xl border border-white/5">
                                <span className="text-[7px] font-black text-white/20 uppercase tracking-widest mb-1">Unit</span>
                                <span className="text-[11px] font-black text-primary uppercase italic truncate pr-2" suppressHydrationWarning>
                                    {selectedTeamId ? allTeams.find(t => t.id === selectedTeamId)?.name : "---"}
                                </span>
                            </div>
                            <div className="flex flex-col p-3 bg-white/[0.02] rounded-xl border border-white/5">
                                <span className="text-[7px] font-black text-white/20 uppercase tracking-widest mb-1">Load</span>
                                <span className="text-[11px] font-black text-white uppercase italic" suppressHydrationWarning>{selectedPlayerIds.length} Athletes</span>
                            </div>
                        </div>

                        <Button 
                            onClick={handleRunDraw} 
                            disabled={!selectedTeamId || selectedPlayerIds.length === 0 || isDrawing}
                            className={cn(
                                "w-full h-12 font-black uppercase italic text-[10px] sm:text-xs tracking-[0.2em] gap-3 rounded-xl shadow-[0_10px_30px_rgba(204,253,1,0.2)] transition-all duration-500",
                                isDrawing ? "bg-primary/20 text-white/20 cursor-wait" : "bg-primary text-black hover:bg-primary/90"
                            )}
                        >
                            {isDrawing ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> {isManualMode ? "VERIFYING..." : "CALIBRATING..."}</>
                            ) : (
                                <>{isManualMode ? <CheckCircle2 className="w-4 h-4" /> : <Shuffle className="w-4 h-4" />} {isManualMode ? "ASSIGN MANUALLY" : "START RANDOM DRAW"}</>
                            )}
                        </Button>
                    </div>

                    {Object.keys(assignments).length > 0 && (
                        <Button 
                            onClick={handleFinalSubmit} 
                            className="w-full h-10 mt-4 font-black uppercase italic tracking-[0.2em] bg-white/[0.05] border-2 border-primary/40 text-primary hover:bg-primary hover:text-black text-[9px] rounded-xl transition-all"
                        >
                            KUNCI & SIMPAN HASIL DRAFT ({Object.keys(assignments).length})
                        </Button>
                    )}
                </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
