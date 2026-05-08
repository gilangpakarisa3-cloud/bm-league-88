'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import type { WithId, Season, Player, LeagueEntry, CoOpLeagueEntry } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Shuffle, Users, Swords, Group, Loader, Trophy, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { cn } from '@/lib/utils';
import { Badge } from './ui/badge';

const LEAGUE_ID = 'main-league';

type PlayerInPot = any & { prevRank: number; displayName: string };

interface GroupDrawDialogProps {
  season: WithId<Season> | null;
  registeredPlayers: any[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveGroups: (groups: { groupA: any[], groupB: any[] }) => void;
}

const shuffleArray = <T,>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};

export function GroupDrawDialog({ season, registeredPlayers, open, onOpenChange, onSaveGroups }: GroupDrawDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [previousSeasonTable, setPreviousSeasonTable] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pot1, setPot1] = useState<PlayerInPot[]>([]);
  const [pot2, setPot2] = useState<PlayerInPot[]>([]);
  const [drawnGroups, setDrawnGroups] = useState<{ groupA: PlayerInPot[], groupB: PlayerInPot[] } | null>(null);
  
  // Reveal state
  const [revealedCount, setRevealedCount] = useState(0);
  const [isRevealing, setIsRevealing] = useState(false);

  const isCoop = season?.type === 'Co-Op Hybrid';

  useEffect(() => {
    if (!open || !firestore) return;

    const findPreviousSeason = async () => {
        setIsLoading(true);
        setDrawnGroups(null);
        setRevealedCount(0);
        setIsRevealing(false);
        
        const seasonsQuery = query(collection(firestore, `leagues/${LEAGUE_ID}/seasons`), orderBy('createdAt', 'desc'));
        const seasonsSnap = await getDocs(seasonsQuery);
        const allSeasons = seasonsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as WithId<Season>));
        
        // Find previous season of the SAME format if possible
        const prevSeason = allSeasons.find(s => s.status === 'Completed' && s.type === season?.type);
        
        if (prevSeason) {
            const tableName = isCoop ? 'coopLeagueTable' : 'leagueTable';
            const prevTableQuery = query(
                collection(firestore, `leagues/${LEAGUE_ID}/seasons/${prevSeason.id}/${tableName}`),
                orderBy('points', 'desc')
            );
            const prevTableSnap = await getDocs(prevTableQuery);
            const prevTable = prevTableSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setPreviousSeasonTable(prevTable);
        } else {
            setPreviousSeasonTable([]); 
        }
        setIsLoading(false);
    };

    findPreviousSeason();
  }, [open, firestore, season, isCoop]);
  
  useEffect(() => {
      if (isLoading || registeredPlayers.length === 0) {
        setPot1([]);
        setPot2([]);
        return;
      }

      // Rank mapping based on ID or PlayerID
      const previousSeasonRankMap = new Map(previousSeasonTable.map((p, index) => [p.playerId || p.id, index + 1]));

      const playersInCurrentSeason: PlayerInPot[] = registeredPlayers
        .map(entry => ({ 
            ...entry,
            displayName: isCoop ? (entry as CoOpLeagueEntry).teamName : (entry as LeagueEntry).playerName,
            prevRank: previousSeasonRankMap.get(entry.playerId || entry.id) || Infinity
        }))
        .sort((a, b) => a.prevRank - b.prevRank);
      
      const pot1Size = Math.ceil(playersInCurrentSeason.length / 2);
      const newPot1 = playersInCurrentSeason.slice(0, pot1Size);
      const newPot2 = playersInCurrentSeason.slice(pot1Size);

      setPot1(newPot1);
      setPot2(newPot2);

  }, [isLoading, previousSeasonTable, registeredPlayers, isCoop]);

  const handleDraw = useCallback(() => {
    const shuffledPot1 = shuffleArray(pot1);
    const shuffledPot2 = shuffleArray(pot2);

    const groupA: PlayerInPot[] = [];
    const groupB: PlayerInPot[] = [];
    
    shuffledPot1.forEach((player, index) => {
        if (index % 2 === 0) groupA.push(player);
        else groupB.push(player);
    });

    shuffledPot2.forEach((player, index) => {
         if (groupA.length <= groupB.length) groupA.push(player);
         else groupB.push(player);
    });

    setDrawnGroups({ groupA, groupB });
    setRevealedCount(0);
    setIsRevealing(true);

    const totalToReveal = groupA.length + groupB.length;
    let current = 0;

    const interval = setInterval(() => {
        current++;
        setRevealedCount(current);
        if (current >= totalToReveal) {
            clearInterval(interval);
            setIsRevealing(false);
            toast({ title: "Undian selesai!", description: "Seluruh tim telah terbagi ke dalam grup kompetisi." });
        }
    }, 1200);

  }, [pot1, pot2, toast]);
  
  const handleFinalSave = () => {
    if (!drawnGroups || isRevealing) return;
    onSaveGroups(drawnGroups);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl p-0 overflow-hidden border-primary/20 bg-background/95 backdrop-blur-xl">
        <ScrollArea className="max-h-[90vh]">
          <div className="p-8">
            <DialogHeader className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <Trophy className="w-6 h-6" />
                </div>
                <DialogTitle className="text-3xl font-black tracking-tighter">Undian grup: {season?.name}</DialogTitle>
              </div>
              <DialogDescription className="text-base font-medium">
                Sistem seeded draw: {isCoop ? 'Pasangan' : 'Pemain'} dibagi menjadi pot unggulan dan penantang. Unit akan diundi secara acak bergantian antara grup A dan grup B untuk menjaga keseimbangan kompetisi.
              </DialogDescription>
            </DialogHeader>
            
            {isLoading ? (
                <div className="flex flex-col items-center justify-center h-80 gap-4">
                    <div className="relative">
                        <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-ping" />
                        <Loader2 className="h-12 w-12 animate-spin text-primary relative z-10" />
                    </div>
                    <p className="font-bold tracking-widest text-primary animate-pulse uppercase text-xs">Menganalisis performa musim lalu...</p>
                </div>
            ) : (
                 <div className="space-y-8">
                    {!drawnGroups ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in zoom-in-95 duration-500">
                            <PotDisplay title="Pot 1" subtitle="Unggulan utama" players={pot1} variant="primary" />
                            <PotDisplay title="Pot 2" subtitle="Penantang" players={pot2} variant="gold" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                             <GroupDisplay 
                                title="Grup A" 
                                players={drawnGroups.groupA} 
                                revealedCount={revealedCount}
                                groupIndex={0}
                                variant="primary"
                             />
                             <GroupDisplay 
                                title="Grup B" 
                                players={drawnGroups.groupB} 
                                revealedCount={revealedCount}
                                groupIndex={1}
                                variant="gold"
                             />
                        </div>
                    )}
                </div>
            )}

            <DialogFooter className="mt-10 gap-4">
                {drawnGroups ? (
                    <Button onClick={handleFinalSave} className="w-full h-14 text-lg font-black tracking-tighter" disabled={isLoading || isRevealing}>
                        {isRevealing ? (
                            <div className="flex items-center gap-3">
                                <span className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-foreground opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-primary-foreground"></span>
                                </span>
                                Mengundi... ({revealedCount} / {drawnGroups.groupA.length + drawnGroups.groupB.length})
                            </div>
                        ) : (
                            <>
                                <Sparkles className="mr-2 h-5 w-5"/>
                                Kunci & simpan grup
                            </>
                        )}
                    </Button>
                ) : (
                    <Button onClick={handleDraw} className="w-full h-14 text-lg font-black tracking-tighter shadow-[0_10px_25px_rgba(204,253,1,0.2)]" disabled={isLoading || registeredPlayers.length < 2}>
                        <Shuffle className="mr-2 h-5 w-5"/>
                        Mulai undian sekarang
                    </Button>
                )}
            </DialogFooter>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

const PotDisplay = ({ title, subtitle, players, variant }: { title: string; subtitle: string; players: PlayerInPot[]; variant: 'primary' | 'gold' }) => (
    <Card className={cn(
        "overflow-hidden border-2 transition-all duration-300", 
        variant === 'primary' 
            ? "border-primary/30 bg-primary/5" 
            : "border-yellow-500/30 bg-yellow-500/5 shadow-[0_0_20px_rgba(234,179,8,0.05)]"
    )}>
        <CardHeader className="pb-4">
            <div className="flex flex-col items-center text-center gap-1">
                <CardTitle className={cn(
                    "text-2xl font-black tracking-tighter", 
                    variant === 'primary' ? "text-primary" : "text-yellow-500"
                )}>{title}</CardTitle>
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">{subtitle}</p>
                <Badge variant="outline" className={cn("h-6 font-black mt-1", variant === 'gold' && "border-yellow-500/50 text-yellow-500")}>{players.length} Unit</Badge>
            </div>
        </CardHeader>
        <CardContent>
            <ScrollArea className="h-[300px]">
                <div className="space-y-2 pr-4">
                    {players.map((player, idx) => (
                        <div key={player.id} className={cn(
                            "flex items-center justify-between p-3 rounded-xl bg-background/50 border border-white/5 transition-all group",
                            variant === 'primary' ? "hover:border-primary/30" : "hover:border-yellow-500/30"
                        )}>
                           <div className="flex items-center gap-3">
                               <span className={cn(
                                   "text-xs font-black opacity-30 group-hover:opacity-100 transition-opacity",
                                   variant === 'gold' && "group-hover:text-yellow-500"
                                )}>#{idx + 1}</span>
                               <span className="font-bold text-sm" suppressHydrationWarning>{player.displayName}</span>
                           </div>
                           <Badge variant="secondary" className={cn("text-[9px] font-bold", variant === 'gold' && "bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20")}>Lalu: {player.prevRank === Infinity ? 'N/A' : `Rank ${player.prevRank}`}</Badge>
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </CardContent>
    </Card>
);

const GroupDisplay = ({ title, players, revealedCount, groupIndex, variant = 'primary' }: { 
    title: string; 
    players: PlayerInPot[]; 
    revealedCount: number;
    groupIndex: number;
    variant?: 'primary' | 'gold';
}) => {
    const isGold = variant === 'gold';

    return (
        <Card className={cn(
            "overflow-hidden border-4 transition-all duration-700", 
            isGold ? "border-yellow-500 shadow-[0_0_30px_rgba(234,179,8,0.15)] bg-yellow-500/5" : "border-primary shadow-[0_0_30px_rgba(204,253,1,0.15)] bg-primary/5"
        )}>
            <CardHeader className={cn("py-4 border-b-2", isGold ? "border-yellow-500/20 bg-yellow-500/10" : "border-primary/20 bg-primary/10")}>
                <div className="flex items-center justify-center gap-3">
                    <Swords className={cn("w-5 h-5", isGold ? "text-yellow-500" : "text-primary")} />
                    <CardTitle className={cn("text-center text-2xl font-black tracking-[0.2em]", isGold ? "text-yellow-500" : "text-primary")}>{title}</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="p-6">
                <div className="space-y-3">
                    {players.map((player, i) => {
                        const sequenceNumber = groupIndex + (i * 2) + 1;
                        const isRevealed = revealedCount >= sequenceNumber;
                        const isNextToReveal = revealedCount === sequenceNumber - 1;

                        return (
                            <div 
                                key={player.id} 
                                className={cn(
                                    "relative flex items-center h-14 rounded-xl border-2 transition-all duration-500 overflow-hidden",
                                    isRevealed 
                                        ? isGold 
                                            ? "bg-yellow-500/20 border-yellow-500/50 shadow-inner animate-in zoom-in-95 slide-in-from-left-4 duration-500"
                                            : "bg-primary/20 border-primary/50 shadow-inner animate-in zoom-in-95 slide-in-from-left-4 duration-500" 
                                        : isNextToReveal
                                            ? cn("bg-muted/50 animate-pulse border-dashed h-14 border-white/10")
                                            : "bg-black/20 border-transparent h-14"
                                )}
                            >
                                {isRevealed ? (
                                    <>
                                        <div className={cn("absolute left-0 top-0 bottom-0 w-1", isGold ? "bg-yellow-500" : "bg-primary")} />
                                        <div className="px-4 flex items-center justify-between w-full">
                                            <div className="flex items-center gap-3">
                                                <span className={cn("text-xs font-black opacity-50", isGold ? "text-yellow-500" : "text-primary")}>Pos {i + 1}</span>
                                                <span className="font-black text-base tracking-tight uppercase" suppressHydrationWarning>{player.displayName}</span>
                                            </div>
                                            <Badge variant="outline" className={cn("text-[8px] font-bold border-white/10", isGold ? "text-yellow-500" : "text-primary")}>Drawn</Badge>
                                        </div>
                                    </>
                                ) : isNextToReveal ? (
                                    <div className="flex items-center justify-center w-full gap-3">
                                        <Loader className={cn("h-4 w-4 animate-spin", isGold ? "text-yellow-500" : "text-primary")} />
                                        <span className="text-[10px] font-black tracking-[0.3em] opacity-50">Menanti...</span>
                                    </div>
                                ) : (
                                    <div className="w-full flex justify-center opacity-10">
                                        <span className="text-xs font-black tracking-widest">??????</span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
};
