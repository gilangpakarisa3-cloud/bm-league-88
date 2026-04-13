
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useFirestore } from '@/firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import type { WithId, Season, Player, LeagueEntry, PlayerWithTeam } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { ArrowDownCircle, ArrowUpCircle, Loader2, Shuffle, Swords, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { Avatar, AvatarFallback } from './ui/avatar';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';


const LEAGUE_ID = 'main-league';
const SEED_POT_SIZE = 8; 

export type DrawnPair = { player1: PlayerWithTeam, player2: PlayerWithTeam };
type PlayerInPot = WithId<LeagueEntry> & { prevRank: number };

interface CoopDrawDialogProps {
  season: WithId<Season> | null;
  registeredPlayers: WithId<LeagueEntry>[];
  allPlayers: WithId<Player>[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSavePairs: (pairs: { player1: PlayerWithTeam; player2: PlayerWithTeam; teamId: string; teamName: string }[]) => void;
  isAdmin: boolean;
  onRemovePlayer: (leagueEntryId: string, playerName: string) => void;
}

const shuffleArray = <T,>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};

export function CoopDrawDialog({ season, registeredPlayers, allPlayers, open, onOpenChange, onSavePairs, isAdmin, onRemovePlayer }: CoopDrawDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [previousSeason, setPreviousSeason] = useState<WithId<Season> | null>(null);
  const [previousSeasonTable, setPreviousSeasonTable] = useState<WithId<LeagueEntry>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pot1, setPot1] = useState<PlayerInPot[]>([]);
  const [pot2, setPot2] = useState<PlayerInPot[]>([]);
  const [drawnPairs, setDrawnPairs] = useState<{player1: PlayerInPot, player2: PlayerInPot}[] | null>(null);
  
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
        setDrawnPairs(null);
        
        const seasonsQuery = query(collection(firestore, `leagues/${LEAGUE_ID}/seasons`), orderBy('createdAt', 'desc'));
        const seasonsSnap = await getDocs(seasonsQuery);
        const allSeasons = seasonsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as WithId<Season>));
        const prevSeason = allSeasons.find(s => s.status === 'Completed');
        
        if (prevSeason) {
            setPreviousSeason(prevSeason);
            const prevTableQuery = query(
                collection(firestore, `leagues/${LEAGUE_ID}/seasons/${prevSeason.id}/leagueTable`),
                orderBy('points', 'desc'),
                orderBy('goalDifference', 'desc'),
                orderBy('goalsFor', 'desc')
            );
            const prevTableSnap = await getDocs(prevTableQuery);
            setPreviousSeasonTable(prevTableSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as WithId<LeagueEntry>)));
        }
        setIsLoading(false);
    };

    findPreviousSeason();
  }, [open, firestore]);
  
  useEffect(() => {
      if (isLoading || registeredPlayers.length === 0) {
        setPot1([]); setPot2([]); return;
      };

      const previousSeasonRankMap = new Map(previousSeasonTable.map((p, index) => [p.playerId, index + 1]));
      const playersInCurrentSeason: PlayerInPot[] = registeredPlayers
        .map(entry => ({ ...entry, prevRank: previousSeasonRankMap.get(entry.playerId) || Infinity }))
        .sort((a, b) => a.prevRank - b.prevRank);

      const newPot1 = playersInCurrentSeason.slice(0, SEED_POT_SIZE);
      const pot1PlayerIds = new Set(newPot1.map(p => p.playerId));
      const newPot2 = playersInCurrentSeason.filter(p => !pot1PlayerIds.has(p.playerId));

      setPot1(newPot1); setPot2(newPot2);
  }, [isLoading, previousSeasonTable, registeredPlayers]);

  const handleMovePlayer = useCallback((playerToMove: PlayerInPot, destination: 'pot1' | 'pot2') => {
    if (destination === 'pot1') {
      setPot2(prev => prev.filter(p => p.id !== playerToMove.id));
      setPot1(prev => [...prev, playerToMove].sort((a,b) => a.prevRank - b.prevRank));
    } else {
      setPot1(prev => prev.filter(p => p.id !== playerToMove.id));
      setPot2(prev => [...prev, playerToMove].sort((a,b) => a.prevRank - b.prevRank));
    }
  }, []);

  const handleDraw = useCallback(() => {
      if (pot1.length + pot2.length < 2) {
          toast({ variant: 'destructive', title: "Pemain Tidak Cukup", description: "Minimal perlu 2 pemain untuk membuat pasangan." });
          return;
      }
      
      const shuffledPot1 = shuffleArray(pot1);
      const shuffledPot2 = shuffleArray(pot2);
      const pairs: {player1: PlayerInPot, player2: PlayerInPot}[] = [];
      
      while(shuffledPot1.length > 0 && shuffledPot2.length > 0) {
          pairs.push({ player1: shuffledPot1.pop()!, player2: shuffledPot2.pop()! });
      }

      const remainingPlayers = [...shuffledPot1, ...shuffledPot2];
      while(remainingPlayers.length >= 2) {
          pairs.push({ player1: remainingPlayers.pop()!, player2: remainingPlayers.pop()! });
      }
      
      setDrawnPairs(pairs);
  }, [pot1, pot2, toast]);
  
  const handleFinalSave = () => {
    if (!drawnPairs) return;
    const pairsToSave = drawnPairs.map(pair => ({ 
        player1: allPlayersMap[pair.player1.playerId],
        player2: allPlayersMap[pair.player2.playerId],
        teamId: '',
        teamName: '',
    }));
    onSavePairs(pairsToSave);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 border-primary border-4 bg-background/95 rounded-[2.5rem] shadow-2xl">
        <ScrollArea className="max-h-[90vh]">
          <div className="p-8">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-3xl font-black italic uppercase text-white tracking-tighter">Undian Pasangan Co-Op</DialogTitle>
              <DialogDescription className="text-xs font-bold text-white/40 uppercase tracking-widest">
                Musim: {season?.name} • Seeded Draw System Active
              </DialogDescription>
            </DialogHeader>
            
            {isLoading ? (
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <p className="font-black text-[10px] uppercase tracking-widest text-primary/60">Menganalisis Performa Musim Lalu...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <PotDisplay 
                        title="Pot 1 (Unggulan)" 
                        players={pot1} 
                        isAdmin={isAdmin} 
                        onRemovePlayer={(p) => onRemovePlayer(p.id, p.playerName)}
                        onMovePlayer={(player) => handleMovePlayer(player, 'pot2')}
                        moveIcon={<ArrowDownCircle className="h-4 w-4 text-amber-500" />}
                        variant="primary"
                    />
                    <PotDisplay 
                        title="Pot 2" 
                        players={pot2} 
                        isAdmin={isAdmin} 
                        onRemovePlayer={(p) => onRemovePlayer(p.id, p.playerName)}
                        onMovePlayer={(player) => handleMovePlayer(player, 'pot1')}
                        moveIcon={<ArrowUpCircle className="h-4 w-4 text-green-500" />}
                        variant="default"
                    />
                </div>
            )}

            {drawnPairs && (
                <div className="mt-10 animate-in fade-in zoom-in-95 duration-500">
                    <h3 className="text-xl font-black italic uppercase text-primary text-center mb-6">Hasil Undian Pasangan</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {drawnPairs.map((pair, index) => (
                            <div key={index} className="bg-black/40 border-2 border-primary/20 p-4 rounded-2xl relative overflow-hidden group">
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/40" />
                                <div className="flex items-center justify-between">
                                    <div className="flex flex-col gap-2">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-8 w-8 border border-white/10"><AvatarFallback>{pair.player1.playerName.charAt(0)}</AvatarFallback></Avatar>
                                            <span className="font-black text-xs uppercase italic text-white/90">{pair.player1.playerName}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-8 w-8 border border-white/10"><AvatarFallback>{pair.player2.playerName.charAt(0)}</AvatarFallback></Avatar>
                                            <span className="font-black text-xs uppercase italic text-white/90">{pair.player2.playerName}</span>
                                        </div>
                                    </div>
                                    <Badge className="bg-primary/10 border-primary/30 text-primary font-black italic">PAIR {index + 1}</Badge>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <DialogFooter className="mt-10 pt-6 border-t border-white/5">
                {drawnPairs ? (
                    <Button onClick={handleFinalSave} className="w-full h-14 font-black uppercase italic text-lg shadow-[0_0_30px_rgba(204,253,1,0.2)]">
                        <Swords className="mr-3 h-6 w-6"/>
                        Kunci Pasangan & Lanjut Ke Draft Tim
                    </Button>
                ): (
                    <Button onClick={handleDraw} className="w-full h-14 font-black uppercase italic text-lg" disabled={isLoading || (pot1.length + pot2.length < 2)}>
                        <Shuffle className="mr-3 h-6 w-6"/>
                        Mulai Undian Pasangan
                    </Button>
                )}
            </DialogFooter>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

const PotDisplay = ({ title, players, isAdmin, onRemovePlayer, onMovePlayer, moveIcon, variant = "default" }: { 
    title: string;
    players: PlayerInPot[];
    isAdmin: boolean;
    onRemovePlayer: (player: PlayerInPot) => void;
    onMovePlayer: (player: PlayerInPot) => void;
    moveIcon: React.ReactNode;
    variant?: "primary" | "default";
}) => (
    <Card className={cn(
        "bg-black/20 border-2 rounded-[1.5rem] overflow-hidden",
        variant === "primary" ? "border-primary/20" : "border-white/5"
    )}>
        <CardHeader className="p-4 bg-white/5 border-b border-white/5">
            <CardTitle className={cn("text-center font-black text-sm uppercase tracking-widest", variant === "primary" ? "text-primary" : "text-white/60")}>{title}</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
            <div className="space-y-2">
                {players.map(player => (
                    <div key={player.id} className="flex items-center justify-between p-3 bg-white/[0.03] border border-white/5 rounded-xl group hover:bg-white/[0.05] transition-all">
                        <span className="font-bold text-sm uppercase italic text-white/80">{player.playerName}</span>
                        {isAdmin && (
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10" onClick={() => onMovePlayer(player)}>{moveIcon}</Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-500/10 text-red-500" onClick={() => onRemovePlayer(player)}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                        )}
                    </div>
                ))}
                {players.length === 0 && <p className="text-center py-10 text-[10px] font-black uppercase text-white/10 italic">Pot Kosong</p>}
            </div>
        </CardContent>
    </Card>
);
