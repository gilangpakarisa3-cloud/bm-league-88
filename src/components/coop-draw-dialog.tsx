
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import type { WithId, Season, Player, LeagueEntry } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { ArrowRight, Loader2, Shuffle, Users, Swords } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

const LEAGUE_ID = 'main-league';
const SEED_POT_SIZE = 8; // Top 8 players from previous season go to Pot 1

type PlayerWithTeam = WithId<Player> & { teamId: string, teamName: string };
export type DrawnPair = { player1: PlayerWithTeam, player2: PlayerWithTeam };

interface CoopDrawDialogProps {
  season: WithId<Season> | null;
  registeredPlayers: WithId<LeagueEntry>[];
  allPlayers: WithId<Player>[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSavePairs: (pairs: DrawnPair[]) => void;
}

// Fisher-Yates shuffle algorithm
const shuffleArray = <T,>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};

export function CoopDrawDialog({ season, registeredPlayers, allPlayers, open, onOpenChange, onSavePairs }: CoopDrawDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [previousSeason, setPreviousSeason] = useState<WithId<Season> | null>(null);
  const [previousSeasonTable, setPreviousSeasonTable] = useState<WithId<LeagueEntry>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pot1, setPot1] = useState<PlayerWithTeam[]>([]);
  const [pot2, setPot2] = useState<PlayerWithTeam[]>([]);
  const [drawnPairs, setDrawnPairs] = useState<DrawnPair[] | null>(null);
  
  const allPlayersMap = useMemo(() => {
    return allPlayers.reduce((acc, p) => {
        acc[p.id] = p as PlayerWithTeam;
        return acc;
    }, {} as Record<string, PlayerWithTeam>);
  }, [allPlayers]);

  useEffect(() => {
    if (!open || !firestore) return;

    const findPreviousSeason = async () => {
        setIsLoading(true);
        // 1. Find the most recent 'Completed' season
        const seasonsQuery = query(collection(firestore, `leagues/${LEAGUE_ID}/seasons`), orderBy('createdAt', 'desc'));
        const seasonsSnap = await getDocs(seasonsQuery);
        const allSeasons = seasonsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as WithId<Season>));
        const prevSeason = allSeasons.find(s => s.status === 'Completed');
        
        if (!prevSeason) {
            toast({ variant: 'destructive', title: "Tidak Ada Musim Sebelumnya", description: "Tidak dapat menemukan musim 'Completed' untuk dasar pengundian."});
            setIsLoading(false);
            return;
        }
        setPreviousSeason(prevSeason);
        
        // 2. Fetch the league table for that previous season
        const prevTableQuery = query(
            collection(firestore, `leagues/${LEAGUE_ID}/seasons/${prevSeason.id}/leagueTable`),
            orderBy('points', 'desc'),
            orderBy('goalDifference', 'desc'),
            orderBy('goalsFor', 'desc')
        );
        const prevTableSnap = await getDocs(prevTableQuery);
        const prevTable = prevTableSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as WithId<LeagueEntry>));
        setPreviousSeasonTable(prevTable);
        setIsLoading(false);
    };

    findPreviousSeason();
  }, [open, firestore, toast]);
  
  useEffect(() => {
      if (isLoading || !previousSeason || registeredPlayers.length === 0) return;

      const registeredPlayerIds = new Set(registeredPlayers.map(p => p.playerId));
      const previousSeasonRankMap = new Map(previousSeasonTable.map((p, index) => [p.playerId, index + 1]));

      const playersInCurrentSeason = Array.from(registeredPlayerIds)
        .map(id => allPlayersMap[id])
        .filter(Boolean) // Filter out any players who might not be in the allPlayersMap
        .map(p => ({ ...p, prevRank: previousSeasonRankMap.get(p.id) || Infinity }))
        .sort((a, b) => a.prevRank - b.prevRank);

      const newPot1 = playersInCurrentSeason.slice(0, SEED_POT_SIZE);
      const pot1Ids = new Set(newPot1.map(p => p.id));
      const newPot2 = playersInCurrentSeason.filter(p => !pot1Ids.has(p.id));

      setPot1(newPot1);
      setPot2(newPot2);

  }, [isLoading, previousSeason, previousSeasonTable, registeredPlayers, allPlayersMap]);
  
  const handleDraw = useCallback(() => {
      if (pot1.length === 0 && pot2.length < 2) {
          toast({ variant: 'destructive', title: "Pemain Tidak Cukup", description: "Minimal perlu 2 pemain untuk membuat pasangan." });
          return;
      }
      
      const shuffledPot1 = shuffleArray(pot1);
      const shuffledPot2 = shuffleArray(pot2);
      const pairs: DrawnPair[] = [];
      
      // Pair players from Pot 1 with players from Pot 2
      while(shuffledPot1.length > 0 && shuffledPot2.length > 0) {
          const p1 = shuffledPot1.pop()!;
          const p2 = shuffledPot2.pop()!;
          pairs.push({ player1: p1, player2: p2 });
      }

      // Pair remaining players from the larger pot
      const remainingPlayers = [...shuffledPot1, ...shuffledPot2];
      while(remainingPlayers.length >= 2) {
          const p1 = remainingPlayers.pop()!;
          const p2 = remainingPlayers.pop()!;
          pairs.push({ player1: p1, player2: p2 });
      }
      
      setDrawnPairs(pairs);
  }, [pot1, pot2, toast]);


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Undian Pasangan Co-Op: {season?.name}</DialogTitle>
          <DialogDescription>
            Berdasarkan klasemen musim lalu '{previousSeason?.name}'. {SEED_POT_SIZE} pemain teratas masuk Pot 1 (Unggulan).
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-4">Mencari data musim lalu...</p>
            </div>
        ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh]">
                <PotDisplay title="Pot 1 (Unggulan)" players={pot1} />
                <PotDisplay title="Pot 2" players={pot2} />
             </div>
        )}

        {drawnPairs && (
            <div className="mt-4">
                <h3 className="text-lg font-semibold text-center mb-2">Hasil Undian</h3>
                <ScrollArea className="h-48 border rounded-md p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {drawnPairs.map((pair, index) => (
                             <div key={index} className="flex items-center justify-center gap-2 p-2 bg-muted rounded-md text-sm">
                                <span className="font-semibold">{pair.player1.name}</span>
                                <span className="text-primary">&</span>
                                <span className="font-semibold">{pair.player2.name}</span>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </div>
        )}

        <DialogFooter className="mt-4">
            {drawnPairs ? (
                 <Button onClick={() => onSavePairs(drawnPairs)} className="w-full sm:w-auto" disabled={isLoading}>
                    <Swords className="mr-2 h-4 w-4"/>
                    Simpan Pasangan & Buat Klasemen
                 </Button>
            ): (
                 <Button onClick={handleDraw} className="w-full sm:w-auto" disabled={isLoading || (pot1.length === 0 && pot2.length < 2)}>
                    <Shuffle className="mr-2 h-4 w-4"/>
                    Undi Pasangan
                </Button>
            )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const PotDisplay = ({ title, players }: { title: string, players: PlayerWithTeam[] }) => (
    <Card>
        <CardHeader>
            <CardTitle className="text-center text-primary">{title}</CardTitle>
        </CardHeader>
        <CardContent>
            <ScrollArea className="h-48">
                 <div className="space-y-2 pr-4">
                    {players.map(player => (
                        <div key={player.id} className="text-sm font-medium p-2 bg-card rounded-md border">
                            {player.name}
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </CardContent>
    </Card>
);
