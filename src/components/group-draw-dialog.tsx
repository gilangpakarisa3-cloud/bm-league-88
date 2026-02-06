
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import type { WithId, Season, Player, LeagueEntry } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Shuffle, Users, Swords, Group, Loader } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { cn } from '@/lib/utils';

const LEAGUE_ID = 'main-league';

type PlayerInPot = WithId<LeagueEntry> & { prevRank: number };

interface GroupDrawDialogProps {
  season: WithId<Season> | null;
  registeredPlayers: WithId<LeagueEntry>[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveGroups: (groups: { groupA: WithId<LeagueEntry>[], groupB: WithId<LeagueEntry>[] }) => void;
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
  const [previousSeasonTable, setPreviousSeasonTable] = useState<WithId<LeagueEntry>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pot1, setPot1] = useState<PlayerInPot[]>([]);
  const [pot2, setPot2] = useState<PlayerInPot[]>([]);
  const [drawnGroups, setDrawnGroups] = useState<{ groupA: PlayerInPot[], groupB: PlayerInPot[] } | null>(null);
  
  // Reveal state
  const [revealedCount, setRevealedCount] = useState(0);
  const [isRevealing, setIsRevealing] = useState(false);

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
        const prevSeason = allSeasons.find(s => s.status === 'Completed' && s.type !== 'Co-Op');
        
        if (prevSeason) {
            const prevTableQuery = query(
                collection(firestore, `leagues/${LEAGUE_ID}/seasons/${prevSeason.id}/leagueTable`),
                orderBy('points', 'desc'),
                orderBy('goalDifference', 'desc'),
                orderBy('goalsFor', 'desc')
            );
            const prevTableSnap = await getDocs(prevTableQuery);
            const prevTable = prevTableSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as WithId<LeagueEntry>));
            setPreviousSeasonTable(prevTable);
        } else {
            setPreviousSeasonTable([]); // No previous season, so no seeding
        }
        setIsLoading(false);
    };

    findPreviousSeason();
  }, [open, firestore]);
  
  useEffect(() => {
      if (isLoading || registeredPlayers.length === 0) {
        setPot1([]);
        setPot2([]);
        return;
      }

      const previousSeasonRankMap = new Map(previousSeasonTable.map((p, index) => [p.playerId, index + 1]));

      const playersInCurrentSeason: PlayerInPot[] = registeredPlayers
        .map(entry => ({ 
            ...entry,
            prevRank: previousSeasonRankMap.get(entry.playerId) || Infinity
        }))
        .sort((a, b) => a.prevRank - b.prevRank);
      
      const pot1Size = Math.ceil(playersInCurrentSeason.length / 2);
      const newPot1 = playersInCurrentSeason.slice(0, pot1Size);
      const newPot2 = playersInCurrentSeason.slice(pot1Size);

      setPot1(newPot1);
      setPot2(newPot2);

  }, [isLoading, previousSeasonTable, registeredPlayers]);

  const handleDraw = useCallback(() => {
    const shuffledPot1 = shuffleArray(pot1);
    const shuffledPot2 = shuffleArray(pot2);

    const groupA: PlayerInPot[] = [];
    const groupB: PlayerInPot[] = [];
    
    // Distribute Pot 1
    shuffledPot1.forEach((player, index) => {
        if (index % 2 === 0) {
            groupA.push(player);
        } else {
            groupB.push(player);
        }
    });

    // Distribute Pot 2
    shuffledPot2.forEach((player, index) => {
         if (groupA.length <= groupB.length) {
            groupA.push(player);
        } else {
            groupB.push(player);
        }
    });

    const results = { groupA, groupB };
    setDrawnGroups(results);
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
            toast({ title: "Grup Telah Diundi!", description: "Seluruh tim telah berhasil diundi ke dalam grup." });
        }
    }, 1200); // 1.2s per reveal for suspense

  }, [pot1, pot2, toast]);
  
  const handleFinalSave = () => {
    if (!drawnGroups || isRevealing) return;
    onSaveGroups(drawnGroups);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden">
        <ScrollArea className="max-h-[90vh]">
          <div className="p-6">
            <DialogHeader>
              <DialogTitle>Undian Grup: {season?.name}</DialogTitle>
              <DialogDescription>
                Pemain dibagi menjadi Pot Unggulan dan Non-Unggulan berdasarkan performa musim lalu. Tim akan diundi satu per satu secara bergantian antara Grup A dan Grup B.
              </DialogDescription>
            </DialogHeader>
            
            {isLoading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="ml-4">Mencari data musim lalu...</p>
                </div>
            ) : (
                 <div className="my-4">
                    {!drawnGroups ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <PotDisplay title="Pot 1 (Unggulan)" players={pot1} />
                            <PotDisplay title="Pot 2 (Non-Unggulan)" players={pot2} />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <GroupDisplay 
                                title="Grup A" 
                                players={drawnGroups.groupA} 
                                revealedCount={revealedCount}
                                groupIndex={0} // Index 0 for A (reveals at 1, 3, 5...)
                                variant="primary"
                             />
                             <GroupDisplay 
                                title="Grup B" 
                                players={drawnGroups.groupB} 
                                revealedCount={revealedCount}
                                groupIndex={1} // Index 1 for B (reveals at 2, 4, 6...)
                                variant="gold"
                             />
                        </div>
                    )}
                </div>
            )}

            <DialogFooter className="mt-4">
                {drawnGroups ? (
                    <Button onClick={handleFinalSave} className="w-full sm:w-auto" disabled={isLoading || isRevealing}>
                        {isRevealing ? (
                            <>
                                <Loader className="mr-2 h-4 w-4 animate-spin" />
                                Mengundi... ({revealedCount} / {drawnGroups.groupA.length + drawnGroups.groupB.length})
                            </>
                        ) : (
                            <>
                                <Group className="mr-2 h-4 w-4"/>
                                Simpan Grup
                            </>
                        )}
                    </Button>
                ) : (
                    <Button onClick={handleDraw} className="w-full sm:w-auto" disabled={isLoading || registeredPlayers.length < 2}>
                        <Shuffle className="mr-2 h-4 w-4"/>
                        Mulai Undian
                    </Button>
                )}
            </DialogFooter>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

const PotDisplay = ({ title, players }: { title: string; players: PlayerInPot[]; }) => (
    <Card>
        <CardHeader>
            <CardTitle className="text-center text-primary">{title} ({players.length})</CardTitle>
        </CardHeader>
        <CardContent>
            <ScrollArea className="h-96">
                <div className="space-y-2 pr-4">
                    {players.map(player => (
                        <div key={player.id} className="flex items-center justify-between text-sm font-medium p-2 bg-card rounded-md border gap-2">
                           <span className="font-semibold">{player.playerName}</span>
                           <span className="text-xs text-muted-foreground">Peringkat Lalu: {player.prevRank === Infinity ? 'N/A' : player.prevRank}</span>
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
            "overflow-hidden border-2 transition-all duration-500", 
            isGold ? "border-yellow-400 shadow-lg shadow-yellow-400/10" : "border-primary"
        )}>
            <CardHeader className={cn("py-3", isGold ? "bg-yellow-400/10" : "bg-primary/5")}>
                <CardTitle className={cn("text-center text-lg", isGold ? "text-yellow-400" : "text-primary")}>{title}</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
                <div className="space-y-2">
                    {players.map((player, i) => {
                        // Sequence logic: A0=1, B0=2, A1=3, B1=4...
                        // General: GroupIndex (0 or 1) + (PlayerIndex * 2) + 1
                        const sequenceNumber = groupIndex + (i * 2) + 1;
                        const isRevealed = revealedCount >= sequenceNumber;
                        const isNextToReveal = revealedCount === sequenceNumber - 1;

                        return (
                            <div 
                                key={player.id} 
                                className={cn(
                                    "flex items-center text-sm font-bold p-3 rounded-md border-2 transition-all duration-500",
                                    isRevealed 
                                        ? isGold 
                                            ? "bg-yellow-400/10 border-yellow-400/50 text-foreground animate-in zoom-in-95 fade-in duration-500"
                                            : "bg-primary/10 border-primary/50 text-foreground animate-in zoom-in-95 fade-in duration-500" 
                                        : isNextToReveal
                                            ? cn("bg-muted animate-pulse border-dashed text-muted-foreground h-11", isGold ? "border-yellow-400/20" : "border-primary/20")
                                            : "bg-muted/30 border-muted text-transparent h-11"
                                )}
                            >
                                {isRevealed ? (
                                    <>
                                        <span className={cn("mr-2 opacity-50", isGold ? "text-yellow-400" : "text-primary")}>#{i + 1}</span>
                                        {player.playerName}
                                    </>
                                ) : isNextToReveal ? (
                                    <div className="flex items-center justify-center w-full gap-2">
                                        <Loader2 className={cn("h-3 w-3 animate-spin", isGold ? "text-yellow-400" : "text-primary")} />
                                        <span className="text-[10px] uppercase tracking-tighter">Menunggu...</span>
                                    </div>
                                ) : null}
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
};
