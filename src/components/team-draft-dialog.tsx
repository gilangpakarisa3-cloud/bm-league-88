'use client';

import { useState, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Shield, Users, CheckCircle2, Binary, Loader2, Zap, Trash2 } from 'lucide-react';
import type { Team, LeagueEntry, Season, WithId } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

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
  const [priorityPlayers, setPriorityPool] = useState<Set<string>>(new Set()); // entryIds of players who lost a draw
  const [isDrawing, setIsDrawing] = useState(false);

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
    }));
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
  };

  const handleRunDraw = useCallback(() => {
    if (!selectedTeamId || selectedPlayerIds.length === 0) return;

    const team = allTeams.find(t => t.id === selectedTeamId)!;
    
    const candidates = selectedPlayerIds;
    const prioritizedOnes = candidates.filter(id => priorityPlayers.has(id));
    
    setIsDrawing(true);

    setTimeout(() => {
        let winnerId: string;
        const pool = prioritizedOnes.length > 0 ? prioritizedOnes : candidates;
        winnerId = pool[Math.floor(Math.random() * pool.length)];

        setAssignments(prev => ({ ...prev, [winnerId]: selectedTeamId }));
        
        // Those who lost get added to Priority Pool ONLY IF team is Tier 1
        const losers = candidates.filter(id => id !== winnerId);
        if (team.tier === 1) {
            setPriorityPool(prev => {
                const next = new Set(prev);
                losers.forEach(id => next.add(id));
                return next;
            });
        }
        
        // Remove winner from priority if they were in it
        setPriorityPool(prev => {
            const next = new Set(prev);
            next.delete(winnerId);
            return next;
        });

        toast({
            title: "Draft Result Verified!",
            description: `${registeredPlayers.find(p => p.id === winnerId)?.playerName} has secured ${team.name}.`
        });

        setSelectedTeamId(null);
        setSelectedPlayerIds([]);
        setIsDrawing(false);
    }, 1500);
  }, [selectedTeamId, selectedPlayerIds, priorityPlayers, allTeams, registeredPlayers, toast, setPriorityPool]);

  const handleFinalSubmit = () => {
    const data = Object.entries(assignments).map(([entryId, teamId]) => {
        const team = allTeams.find(t => t.id === teamId)!;
        return { entryId, teamId, teamName: team.name };
    });
    onSaveAssignments(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl p-0 overflow-hidden border-primary border-4 bg-background/95 backdrop-blur-3xl rounded-[2.5rem]">
        <div className="flex flex-col h-[90vh]">
          {/* Header Locked Section */}
          <DialogHeader className="p-6 sm:p-8 border-b border-white/10 bg-black/40 relative overflow-hidden shrink-0">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(204,253,1,0.05),transparent)] pointer-events-none" />
            <div className="flex items-center gap-4 relative z-10">
                <div className="p-3 bg-primary/10 rounded-2xl border-2 border-primary/20 text-primary shadow-[0_0_20px_rgba(204,253,1,0.2)]">
                    <Binary className="w-6 h-6 sm:w-8 h-8" />
                </div>
                <div className="space-y-1">
                    <DialogTitle className="text-xl sm:text-3xl font-black tracking-tighter uppercase italic pr-4">Tiered Seeded Draft System</DialogTitle>
                    <DialogDescription className="text-[8px] sm:text-xs font-bold text-white/40 uppercase tracking-[0.3em]">Protocol: Multi-Tier Fairness Engine v2.0</DialogDescription>
                </div>
            </div>
          </DialogHeader>

          {/* Main Grid Content Area */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
            {/* Left: Teams Grid (Scrollable) */}
            <div className="lg:col-span-7 flex flex-col overflow-hidden border-r border-white/5 bg-black/20">
                <div className="p-4 sm:p-6 pb-2 sm:pb-4 flex items-center justify-between shrink-0">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/60 italic">Available Strategic Units</h3>
                    <Badge variant="outline" className="h-6 font-black border-white/10 text-white/40">{availableTeams.length} Units Rem.</Badge>
                </div>
                <ScrollArea className="flex-1 px-4 sm:px-6">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 pb-10">
                        {availableTeams.map(team => (
                            <button
                                key={team.id}
                                onClick={() => setSelectedTeamId(team.id === selectedTeamId ? null : team.id)}
                                className={cn(
                                    "flex flex-col items-center p-3 sm:p-4 rounded-2xl border-2 transition-all duration-500 group relative overflow-hidden",
                                    selectedTeamId === team.id 
                                        ? "bg-primary/15 border-primary shadow-[0_0_30px_rgba(204,253,1,0.15)]" 
                                        : "bg-white/[0.03] border-white/5 hover:border-primary/30 hover:bg-white/[0.05]"
                                )}
                            >
                                <Badge className={cn(
                                    "absolute top-2 right-2 text-[7px] font-black italic h-4 sm:h-5",
                                    team.tier === 1 ? "bg-yellow-400 text-black" : "bg-white/10 text-white/60"
                                )}>T{team.tier || 3}</Badge>
                                <Avatar className="h-10 w-10 sm:h-14 sm:w-14 border-2 border-white/10 mb-2 sm:mb-3 group-hover:scale-110 transition-transform">
                                    <AvatarImage src={team.logoUrl} className="object-cover" />
                                    <AvatarFallback><Shield/></AvatarFallback>
                                </Avatar>
                                <span className={cn(
                                    "text-[9px] sm:text-[10px] font-black uppercase italic tracking-tighter transition-colors text-center px-1",
                                    selectedTeamId === team.id ? "text-primary" : "text-white/60 group-hover:text-white"
                                )}>{team.name}</span>
                            </button>
                        ))}
                    </div>
                </ScrollArea>
            </div>

            {/* Right: Roster & Draft Control (Scrollable + Sticky Footer) */}
            <div className="lg:col-span-5 flex flex-col bg-black/40 overflow-hidden">
                <div className="p-4 sm:p-6 border-b border-white/10 shrink-0">
                    <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-primary" />
                        <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/60">Athlete Manifest</h3>
                    </div>
                </div>
                
                <div className="flex-1 flex flex-col min-h-0">
                    <ScrollArea className="flex-1 px-4 sm:px-6 py-4">
                        <div className="space-y-6">
                            {/* Unassigned Section */}
                            <div className="space-y-2">
                                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white/20 ml-1">Available Roster</span>
                                {unassignedPlayers.length > 0 ? unassignedPlayers.map(player => {
                                    const isPriority = priorityPlayers.has(player.id);
                                    const isSelected = selectedPlayerIds.includes(player.id);
                                    return (
                                        <button
                                            key={player.id}
                                            onClick={() => togglePlayerSelection(player.id)}
                                            className={cn(
                                                "w-full flex items-center justify-between p-2.5 sm:p-3 rounded-xl border-2 transition-all duration-300 relative overflow-hidden group",
                                                isSelected ? "bg-primary/10 border-primary/40" : "bg-white/[0.02] border-white/5 hover:bg-white/5"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={cn("w-1 h-5 sm:h-6 rounded-full", isSelected ? "bg-primary" : "bg-white/5")} />
                                                <div className="text-left">
                                                    <p className={cn("text-[11px] sm:text-xs font-black uppercase italic", isSelected ? "text-primary" : "text-white/80")}>{player.playerName}</p>
                                                    {isPriority && (
                                                        <div className="flex items-center gap-1">
                                                            <Zap className="w-2 h-2 text-amber-500 fill-amber-500" />
                                                            <span className="text-[7px] font-black text-amber-500 uppercase tracking-widest">Priority Seed Level 1</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            {isSelected && <CheckCircle2 className="w-4 h-4 text-primary" />}
                                        </button>
                                    );
                                }) : (
                                    <div className="p-4 text-center border-2 border-dashed border-white/5 rounded-xl opacity-20">
                                        <p className="text-[10px] font-black uppercase italic">All Athletes Assigned</p>
                                    </div>
                                )}
                            </div>

                            {/* Assigned Section */}
                            {assignedPlayers.length > 0 && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between ml-1">
                                        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-green-400/60">Assigned & Verified</span>
                                        <Badge variant="outline" className="h-4 text-[6px] border-green-500/20 text-green-400/60">{assignedPlayers.length} Units</Badge>
                                    </div>
                                    {assignedPlayers.map(player => (
                                        <div key={player.id} className="w-full flex items-center justify-between p-2.5 sm:p-3 rounded-xl border-2 border-green-500/20 bg-green-500/5 transition-all duration-300 relative group/assigned">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-8 w-8 border border-green-500/30">
                                                    <AvatarImage src={player.team?.logoUrl} />
                                                    <AvatarFallback><Shield className="w-4 h-4 text-green-500/20"/></AvatarFallback>
                                                </Avatar>
                                                <div className="text-left">
                                                    <p className="text-[11px] sm:text-xs font-black uppercase italic text-white/90">{player.playerName}</p>
                                                    <p className="text-[8px] font-black text-green-400 uppercase tracking-widest italic">{player.team?.name}</p>
                                                </div>
                                            </div>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-8 w-8 text-white/10 hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover/assigned:opacity-100 transition-opacity"
                                                onClick={() => removeAssignment(player.id)}
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </div>

                {/* Sticky Draft Control Section */}
                <div className="p-4 sm:p-8 shrink-0 bg-black/40 border-t border-white/5">
                    <div className="space-y-4 sm:space-y-6">
                        <div className="bg-primary/5 border-2 border-primary/20 rounded-2xl p-4 sm:p-5 space-y-3 sm:space-y-4 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 -mr-12 -mt-12 rounded-full blur-2xl" />
                            <div className="flex items-center justify-between">
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/60 italic">Draft Processor</span>
                                {isDrawing && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                                <div className="flex items-center justify-between px-3 py-2 bg-black/40 rounded-lg border border-white/5">
                                    <span className="text-[8px] font-black text-white/20 uppercase">Selected Unit</span>
                                    <span className="text-[9px] sm:text-[10px] font-black text-primary uppercase italic truncate max-w-[140px]" suppressHydrationWarning>
                                        {selectedTeamId ? allTeams.find(t => t.id === selectedTeamId)?.name : "---"}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between px-3 py-2 bg-black/40 rounded-lg border border-white/5">
                                    <span className="text-[8px] font-black text-white/20 uppercase">Conflict Load</span>
                                    <span className="text-[9px] sm:text-[10px] font-black text-white uppercase italic">{selectedPlayerIds.length} Athletes</span>
                                </div>
                            </div>
                            <Button 
                                onClick={handleRunDraw} 
                                disabled={!selectedTeamId || selectedPlayerIds.length === 0 || isDrawing}
                                className="w-full h-12 sm:h-14 font-black uppercase italic text-xs sm:text-sm tracking-[0.1em] sm:tracking-[0.2em] gap-3 rounded-xl shadow-xl shadow-primary/10"
                            >
                                {isDrawing ? "CALIBRATING DRAW..." : "INITIALIZE SEEDED DRAW"}
                            </Button>
                        </div>

                        {Object.keys(assignments).length > 0 && (
                            <div className="flex flex-col gap-2">
                                <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.3em] text-center italic">Verified Log: {Object.keys(assignments).length} Assignments Finalized</p>
                                <Button onClick={handleFinalSubmit} variant="outline" className="w-full h-10 sm:h-12 font-black uppercase italic tracking-widest border-primary/40 text-primary hover:bg-primary hover:text-black text-[10px] sm:text-xs">
                                    KUNCI & SIMPAN HASIL DRAFT
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
