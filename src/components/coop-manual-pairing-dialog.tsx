'use client';

import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Users, Trash2, Binary, CheckCircle2, User, Zap, Scan, X, Plus } from 'lucide-react';
import type { WithId, Season, LeagueEntry, PlayerWithTeam } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface CoopManualPairingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  season: WithId<Season> | null;
  registeredPlayers: WithId<LeagueEntry>[];
  allPlayersMap: Record<string, PlayerWithTeam>;
  onSavePairs: (pairs: { player1: PlayerWithTeam; player2: PlayerWithTeam; teamId: string; teamName: string }[]) => void;
}

export function CoopManualPairingDialog({ open, onOpenChange, season, registeredPlayers, allPlayersMap, onSavePairs }: CoopManualPairingDialogProps) {
  const { toast } = useToast();
  const [selectedIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [pairs, setPairs] = useState<{ p1: WithId<LeagueEntry>, p2: WithId<LeagueEntry> }[]>([]);

  const unassignedPlayers = useMemo(() => {
    const assignedIds = new Set(pairs.flatMap(p => [p.p1.playerId, p.p2.playerId]));
    return registeredPlayers.filter(p => !assignedIds.has(p.playerId));
  }, [registeredPlayers, pairs]);

  const toggleSelection = (player: WithId<LeagueEntry>) => {
    if (selectedIds.includes(player.id)) {
      setSelectedPlayerIds(prev => prev.filter(id => id !== player.id));
    } else {
      if (selectedIds.length < 2) {
        setSelectedPlayerIds(prev => [...prev, player.id]);
      } else {
        toast({ variant: 'destructive', title: "Maksimal 2 Pemain", description: "Hanya dapat memilih 2 pemain untuk dipasangkan." });
      }
    }
  };

  const handleAddPair = () => {
    if (selectedIds.length !== 2) return;
    const p1 = registeredPlayers.find(p => p.id === selectedIds[0])!;
    const p2 = registeredPlayers.find(p => p.id === selectedIds[1])!;
    setPairs(prev => [...prev, { p1, p2 }]);
    setSelectedPlayerIds([]);
  };

  const removePair = (index: number) => {
    setPairs(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (unassignedPlayers.length > 0) {
      toast({ variant: 'destructive', title: "Pemain Tersisa", description: `Masih ada ${unassignedPlayers.length} pemain yang belum memiliki pasangan.` });
      return;
    }
    const pairsToSave = pairs.map(pair => ({
      player1: allPlayersMap[pair.p1.playerId],
      player2: allPlayersMap[pair.p2.playerId],
      teamId: '',
      teamName: '',
    }));
    onSavePairs(pairsToSave);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl p-0 border-primary border-4 bg-background/95 rounded-[2.5rem] shadow-[0_0_100px_rgba(204,253,1,0.15)]">
        <div className="flex flex-col h-[85vh]">
          <DialogHeader className="p-8 border-b border-white/5 bg-black/40 shrink-0">
             <div className="flex items-center gap-5">
                <div className="p-4 bg-primary/10 rounded-2xl border-2 border-primary/30 text-primary shadow-[0_0_30px_rgba(204,253,1,0.3)]">
                    <Users className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                    <DialogTitle className="text-3xl font-black italic uppercase text-white tracking-tighter leading-none">Tentukan Pasangan Manual</DialogTitle>
                    <div className="flex items-center gap-3">
                        <Badge variant="outline" className="bg-primary/10 border-primary/20 text-primary text-[8px] font-black uppercase tracking-[0.2em] h-5">Manual Unit Allocation Protocol</Badge>
                        <span className="text-[8px] font-bold text-white/20 uppercase tracking-[0.4em]">Tournament System v5.0</span>
                    </div>
                </div>
             </div>
          </DialogHeader>

          <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 overflow-hidden">
            {/* Left: Player Pool */}
            <div className="flex flex-col border-r border-white/5 bg-black/20 overflow-hidden">
                <div className="p-6 flex items-center justify-between border-b border-white/5 bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                        <div className="h-4 w-1 bg-primary rounded-full shadow-[0_0_10px_rgba(204,253,1,0.8)]" />
                        <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/60 italic">Pool Pemain Terdaftar</h3>
                    </div>
                    <Badge variant="outline" className="h-6 font-black border-white/10 text-white/30">{unassignedPlayers.length} UNIT REM.</Badge>
                </div>
                <ScrollArea className="flex-1">
                    <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-3 pb-20">
                        {unassignedPlayers.map(player => {
                            const isSelected = selectedIds.includes(player.id);
                            return (
                                <button
                                    key={player.id}
                                    onClick={() => toggleSelection(player)}
                                    className={cn(
                                        "flex items-center justify-between p-4 rounded-xl border-2 transition-all duration-300 relative overflow-hidden group",
                                        isSelected ? "bg-primary/15 border-primary shadow-[inset_0_0_20px_rgba(204,253,1,0.1)]" : "bg-black/40 border-white/5 hover:border-white/20"
                                    )}
                                >
                                    <div className="flex items-center gap-3 relative z-10">
                                        <div className={cn("w-1 h-5 rounded-full", isSelected ? "bg-primary shadow-[0_0_8px_rgba(204,253,1,0.8)]" : "bg-white/10")} />
                                        <span className={cn("font-black text-sm uppercase italic transition-colors truncate pr-4", isSelected ? "text-primary" : "text-white/60 group-hover:text-white")} suppressHydrationWarning>{player.playerName}</span>
                                    </div>
                                    {isSelected && <CheckCircle2 className="w-4 h-4 text-primary animate-in zoom-in duration-300" />}
                                </button>
                            );
                        })}
                    </div>
                </ScrollArea>
                
                {/* Selection HUD */}
                {selectedIds.length > 0 && (
                    <div className="p-4 bg-black/60 border-t border-white/10 backdrop-blur-md animate-in slide-in-from-bottom-2 duration-500">
                        <div className="flex items-center justify-between bg-primary/10 border-2 border-primary/30 p-3 rounded-2xl relative overflow-hidden">
                            <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(204,253,1,0.05)_50%,transparent_100%)] bg-[length:200%_100%] animate-marquee opacity-30" />
                            <div className="flex items-center gap-3 relative z-10">
                                <Zap className="w-4 h-4 text-primary fill-primary animate-pulse" />
                                <span className="text-[10px] font-black text-primary uppercase italic tracking-tighter">Ready to Pair: {selectedIds.length}/2</span>
                            </div>
                            <Button 
                                onClick={handleAddPair} 
                                disabled={selectedIds.length !== 2}
                                size="sm" 
                                className="h-9 px-6 bg-primary text-black font-black uppercase italic text-[10px] tracking-widest rounded-lg shadow-lg relative z-10"
                            >
                                <Plus className="w-3.5 h-3.5 mr-1.5" /> PASANGKAN UNIT
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Right: Formed Pairs */}
            <div className="flex flex-col bg-black/40 overflow-hidden">
                <div className="p-6 flex items-center justify-between border-b border-white/5 bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                        <Scan className="w-5 h-5 text-primary" />
                        <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/60 italic">Manifest Unit Pasangan</h3>
                    </div>
                    <Badge className="bg-primary text-black h-6 font-black">{pairs.length} PASANG</Badge>
                </div>
                <ScrollArea className="flex-1">
                    <div className="p-6 space-y-4 pb-20">
                        {pairs.length > 0 ? pairs.map((pair, idx) => (
                            <div key={idx} className="relative overflow-hidden rounded-2xl border-2 border-white/10 bg-black/40 p-5 group/pair transition-all hover:border-primary/20">
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/40 group-hover/pair:bg-primary transition-all shadow-[0_0_15px_rgba(204,253,1,0.4)]" />
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-6">
                                        <div className="flex flex-col items-center">
                                            <Avatar className="h-10 w-10 border-2 border-white/10 shadow-lg"><AvatarFallback className="bg-black/40 text-[10px] font-black">P1</AvatarFallback></Avatar>
                                            <span className="text-[9px] font-black text-white/40 uppercase mt-1.5">P1</span>
                                        </div>
                                        <div className="flex flex-col text-left">
                                            <p className="text-[13px] font-black text-white uppercase italic tracking-tight" suppressHydrationWarning>{pair.p1.playerName}</p>
                                            <p className="text-[13px] font-black text-white uppercase italic tracking-tight mt-1" suppressHydrationWarning>{pair.p2.playerName}</p>
                                        </div>
                                        <div className="flex flex-col items-center">
                                            <Avatar className="h-10 w-10 border-2 border-white/10 shadow-lg"><AvatarFallback className="bg-black/60 text-[10px] font-black">P2</AvatarFallback></Avatar>
                                            <span className="text-[9px] font-black text-white/40 uppercase mt-1.5">P2</span>
                                        </div>
                                    </div>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-10 w-10 text-white/20 hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover/pair:opacity-100 transition-all rounded-xl"
                                        onClick={() => removePair(idx)}
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </Button>
                                </div>
                                <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
                                    <Badge variant="outline" className="border-white/10 text-white/20 text-[7px] font-black uppercase tracking-[0.3em]">UNIT_PAIR_LOG_{idx + 1}</Badge>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-1 h-1 rounded-full bg-primary/40" />
                                        <span className="text-[7px] font-black text-white/20 uppercase">VERIFIED</span>
                                    </div>
                                </div>
                            </div>
                        )) : (
                            <div className="py-20 text-center border-4 border-dashed border-white/5 rounded-[2.5rem] opacity-20">
                                <Binary className="w-16 h-16 mx-auto mb-4" />
                                <p className="text-xs font-black uppercase tracking-[0.4em] italic">Awaiting Manual Configuration</p>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </div>
          </div>

          <DialogFooter className="p-8 border-t border-white/5 bg-black/40 shrink-0">
              <Button 
                onClick={handleSave} 
                disabled={pairs.length === 0 || unassignedPlayers.length > 0}
                className="w-full h-16 text-lg font-black uppercase italic tracking-tighter gap-4 shadow-2xl rounded-2xl transition-all hover:scale-[1.01] active:scale-95"
              >
                  <CheckCircle2 className="w-6 h-6" /> KUNCI PASANGAN & LANJUT KE DRAFT TIM
              </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
