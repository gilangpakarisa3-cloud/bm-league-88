
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import type { WithId, Season, Player, LeagueEntry } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Shuffle, Users, Swords, Group } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ScrollArea } from './ui/scroll-area';

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

  useEffect(() => {
    if (!open || !firestore) return;

    const findPreviousSeason = async () => {
        setIsLoading(true);
        setDrawnGroups(null);
        
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

    setDrawnGroups({ groupA, groupB });
    toast({ title: "Grup Telah Diundi!", description: "Periksa pembagian grup di bawah. Tekan simpan untuk mengkonfirmasi." });
  }, [pot1, pot2, toast]);
  
  const handleFinalSave = () => {
    if (!drawnGroups) return;
    onSaveGroups(drawnGroups);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0">
        <ScrollArea className="max-h-[90vh]">
          <div className="p-6">
            <DialogHeader>
              <DialogTitle>Undian Grup: {season?.name}</DialogTitle>
              <DialogDescription>
                Pemain dibagi menjadi Pot Unggulan dan Non-Unggulan berdasarkan performa musim lalu.
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
                             <GroupDisplay title="Grup A" players={drawnGroups.groupA} />
                             <GroupDisplay title="Grup B" players={drawnGroups.groupB} />
                        </div>
                    )}
                </div>
            )}

            <DialogFooter className="mt-4">
                {drawnGroups ? (
                    <Button onClick={handleFinalSave} className="w-full sm:w-auto" disabled={isLoading}>
                        <Group className="mr-2 h-4 w-4"/>
                        Simpan Grup
                    </Button>
                ) : (
                    <Button onClick={handleDraw} className="w-full sm:w-auto" disabled={isLoading || registeredPlayers.length < 2}>
                        <Shuffle className="mr-2 h-4 w-4"/>
                        Undi Grup
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
            <ScrollArea className="h-48">
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

const GroupDisplay = ({ title, players }: { title: string; players: PlayerInPot[]; }) => (
     <Card className="border-primary">
        <CardHeader>
            <CardTitle className="text-center text-primary">{title}</CardTitle>
        </CardHeader>
        <CardContent>
             <div className="space-y-2">
                {players.map(player => (
                    <div key={player.id} className="flex items-center text-sm font-medium p-2 bg-card rounded-md border gap-2">
                       {player.playerName}
                    </div>
                ))}
            </div>
        </CardContent>
    </Card>
);
