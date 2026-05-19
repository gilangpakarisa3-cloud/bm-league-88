'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useFirestore } from '@/firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import type { WithId, Season, Player, LeagueEntry, PlayerWithTeam } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Shuffle, Swords, Trash2, Zap, Scan, Loader, CheckCircle2, Binary, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';


const LEAGUE_ID = 'main-league';

export type DrawnPair = { player1: PlayerWithTeam, player2: PlayerWithTeam };
type PlayerInPool = WithId<LeagueEntry> & { prevRank: number };

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
  const [previousSeasonTable, setPreviousSeasonTable] = useState<WithId<LeagueEntry>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [playerPool, setPlayerPool] = useState<PlayerInPool[]>([]);
  const [drawnPairs, setDrawnPairs] = useState<{player1: PlayerInPool, player2: PlayerInPool}[] | null>(null);
  
  // Reveal state
  const [revealedCount, setRevealedCount] = useState(0);
  const [isRevealing, setIsRevealing] = useState(false);

  const allPlayersMap = useMemo(() => {
    return allPlayers.reduce((acc, p) => {
        acc[p.id] = p as PlayerWithTeam;
        return acc;
    }, {} as Record<string, PlayerWithTeam>);
  }, [allPlayers]);

  useEffect(() => {
    if (!open || !firestore) return;

    const findPreviousSeasonData = async () => {
        setIsLoading(true);
        setDrawnPairs(null);
        setRevealedCount(0);
        setIsRevealing(false);
        
        const seasonsQuery = query(collection(firestore, `leagues/${LEAGUE_ID}/seasons`), orderBy('createdAt', 'desc'));
        const seasonsSnap = await getDocs(seasonsQuery);
        const allSeasons = seasonsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as WithId<Season>));
        const prevSeason = allSeasons.find(s => s.status === 'Completed');
        
        if (prevSeason) {
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

    findPreviousSeasonData();
  }, [open, firestore]);
  
  useEffect(() => {
      if (isLoading || registeredPlayers.length === 0) {
        setPlayerPool([]); return;
      };

      const previousSeasonRankMap = new Map(previousSeasonTable.map((p, index) => [p.playerId, index + 1]));
      const players: PlayerInPool[] = registeredPlayers
        .map(entry => ({ ...entry, prevRank: previousSeasonRankMap.get(entry.playerId) || Infinity }))
        .sort((a, b) => a.playerName.localeCompare(b.playerName));

      setPlayerPool(players);
  }, [isLoading, previousSeasonTable, registeredPlayers]);

  const handleDraw = useCallback(() => {
      if (playerPool.length < 2) {
          toast({ variant: 'destructive', title: "Pemain Tidak Cukup", description: "Minimal perlu 2 pemain untuk membuat pasangan." });
          return;
      }
      
      const shuffled = shuffleArray(playerPool);
      const pairs: {player1: PlayerInPool, player2: PlayerInPool}[] = [];
      
      while(shuffled.length >= 2) {
          pairs.push({ player1: shuffled.pop()!, player2: shuffled.pop()! });
      }

      if (shuffled.length > 0) {
          toast({ 
              variant: 'destructive', 
              title: "Jumlah Ganjil Detected", 
              description: `Pemain '${shuffled[0].playerName}' tidak mendapatkan pasangan. Harap daftarkan 1 pemain lagi atau hapus 1 pemain.` 
          });
          return;
      }
      
      setDrawnPairs(pairs);
      setRevealedCount(0);
      setIsRevealing(true);

      const totalToReveal = pairs.length;
      let current = 0;

      const interval = setInterval(() => {
          current++;
          setRevealedCount(current);
          if (current >= totalToReveal) {
              clearInterval(interval);
              setIsRevealing(false);
              toast({ title: "Undian Pasangan Selesai!", description: "Seluruh pemain telah dipasangkan secara acak." });
          }
      }, 1000);
  }, [playerPool, toast]);
  
  const handleFinalSave = () => {
    if (!drawnPairs || isRevealing) return;
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
      <DialogContent className="max-w-4xl p-0 border-primary border-4 bg-background/95 rounded-[2.5rem] shadow-[0_0_100px_rgba(204,253,1,0.15)]">
        <ScrollArea className="max-h-[90vh]">
          <div className="p-8 relative">
             <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:30px_30px] pointer-events-none" />

            <DialogHeader className="mb-10 text-center relative z-10">
              <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="p-3 bg-primary/10 rounded-2xl border-2 border-primary/20 text-primary shadow-[0_0_30px_rgba(204,253,1,0.2)]">
                      <Shuffle className="w-8 h-8" />
                  </div>
              </div>
              <DialogTitle className="text-4xl font-black italic uppercase text-white tracking-tighter leading-none">Undian Pasangan CO-OP</DialogTitle>
              <div className="flex items-center justify-center gap-3 mt-4">
                <Badge variant="outline" className="bg-primary/10 border-primary/20 text-primary text-[8px] font-black uppercase tracking-[0.3em] h-6 px-4 italic">Single Pool Randomizer Active</Badge>
                <div className="h-px w-12 bg-white/10" />
                <span className="text-[8px] font-bold text-white/30 uppercase tracking-[0.4em]">Protocol v5.0</span>
              </div>
            </DialogHeader>
            
            {isLoading ? (
                <div className="flex flex-col items-center justify-center h-80 gap-6 relative z-10">
                    <div className="relative">
                        <div className="absolute -inset-8 bg-primary/20 rounded-full blur-3xl animate-pulse" />
                        <Loader2 className="h-16 w-16 animate-spin text-primary relative z-10" />
                    </div>
                    <p className="font-black text-[11px] uppercase tracking-[0.4em] text-primary/60 animate-pulse italic">Menganalisis Performa Musim Lalu...</p>
                </div>
            ) : (
                <div className="space-y-10 relative z-10">
                    {!drawnPairs && (
                        <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
                            <Card className="bg-black/40 border-2 border-white/5 rounded-[2rem] overflow-hidden transition-all duration-500 group/pool hover:border-primary/20">
                                <CardHeader className="p-6 bg-white/[0.02] border-b border-white/5">
                                    <div className="flex flex-col items-center gap-1">
                                        <CardTitle className="text-center font-black text-base uppercase tracking-[0.2em] italic text-white/60">Pool Pemain Terdaftar</CardTitle>
                                        <p className="text-[8px] font-black uppercase tracking-[0.4em] text-white/20 italic">Verified Tournament Roster</p>
                                        <Badge variant="outline" className="mt-2 h-6 font-black border-primary/30 text-primary bg-primary/5 uppercase">{playerPool.length} Unit Tersedia</Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {playerPool.map((player, idx) => (
                                            <div key={player.id} className="flex items-center justify-between p-3.5 bg-white/[0.02] border border-white/5 rounded-xl group/item hover:bg-white/[0.05] hover:border-primary/20 transition-all">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-[10px] font-black text-white/20 tabular-nums">#{idx + 1}</span>
                                                    <span className="font-black text-sm uppercase italic text-white/80 tracking-tight" suppressHydrationWarning>{player.playerName}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {isAdmin && (
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-500/10 text-white/20 hover:text-red-500 rounded-lg opacity-0 group-hover/item:opacity-100 transition-opacity" onClick={() => onRemovePlayer(player.id, player.playerName)}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                    <Badge className="bg-white/5 text-white/40 border-none text-[8px] font-black h-5 uppercase">RANK {player.prevRank === Infinity ? 'NEW' : player.prevRank}</Badge>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {playerPool.length === 0 && (
                                        <div className="py-20 text-center opacity-10 flex flex-col items-center gap-4">
                                            <Users className="w-12 h-12" />
                                            <p className="text-xs font-black uppercase tracking-[0.4em] italic">Belum Ada Pemain Terdaftar</p>
                                        </div>
                                    )}
                                    {playerPool.length % 2 !== 0 && playerPool.length > 0 && (
                                        <div className="mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-4 animate-pulse">
                                            <Zap className="w-5 h-5 text-red-500" />
                                            <p className="text-[10px] font-black text-red-500/80 uppercase tracking-widest leading-relaxed">
                                                Warning: Jumlah pemain ganjil ({playerPool.length}). Harap daftarkan pemain genap untuk mode CO-OP.
                                            </p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {drawnPairs && (
                        <div className="space-y-8 animate-in fade-in duration-500">
                            <div className="flex items-center justify-center gap-4">
                                <div className="h-px flex-1 bg-gradient-to-l from-primary/40 to-transparent" />
                                <h3 className="text-xl font-black italic uppercase text-primary tracking-widest px-4">HASIL UNIT PASANGAN</h3>
                                <div className="h-px flex-1 bg-gradient-to-r from-primary/40 to-transparent" />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                {drawnPairs.map((pair, index) => {
                                    const isRevealed = revealedCount > index;
                                    const isRevealingNow = revealedCount === index;

                                    return (
                                        <div key={index} className={cn(
                                            "relative overflow-hidden rounded-2xl border-2 transition-all duration-700 h-28 flex flex-col justify-center px-6",
                                            isRevealed 
                                                ? "bg-primary/10 border-primary shadow-[inset_0_0_20px_rgba(204,253,1,0.1)] scale-100 animate-in zoom-in-95 duration-500" 
                                                : isRevealingNow
                                                    ? "bg-white/5 border-primary/50 animate-pulse border-dashed"
                                                    : "bg-black/20 border-white/5 opacity-40"
                                        )}>
                                            {isRevealed ? (
                                                <>
                                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary shadow-[0_0_15px_rgba(204,253,1,0.8)]" />
                                                    <div className="flex items-center justify-between relative z-10">
                                                        <div className="space-y-3">
                                                            <div className="flex items-center gap-3">
                                                                <Avatar className="h-7 w-7 border-2 border-primary/30 shadow-lg">
                                                                    <AvatarFallback className="bg-black/40 font-black text-[10px]">{pair.player1.playerName.charAt(0)}</AvatarFallback>
                                                                </Avatar>
                                                                <span className="font-black text-xs uppercase italic text-white tracking-tight" suppressHydrationWarning>{pair.player1.playerName}</span>
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                <Avatar className="h-7 w-7 border-2 border-primary/30 shadow-lg">
                                                                    <AvatarFallback className="bg-black/40 font-black text-[10px]">{pair.player2.playerName.charAt(0)}</AvatarFallback>
                                                                </Avatar>
                                                                <span className="font-black text-xs uppercase italic text-white tracking-tight" suppressHydrationWarning>{pair.player2.playerName}</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col items-end gap-1">
                                                            <Badge className="bg-primary text-black font-black italic text-[9px] h-5 px-2">UNIT {index + 1}</Badge>
                                                            <CheckCircle2 className="w-4 h-4 text-primary animate-in fade-in zoom-in duration-500 delay-300" />
                                                        </div>
                                                    </div>
                                                </>
                                            ) : isRevealingNow ? (
                                                <div className="flex flex-col items-center justify-center gap-3">
                                                    <Loader className="w-6 h-6 text-primary animate-spin" />
                                                    <span className="text-[10px] font-black text-primary/60 uppercase tracking-[0.4em] animate-pulse">Scanning Unit...</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-center opacity-10">
                                                    <Binary className="w-8 h-8 text-white" />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <DialogFooter className="mt-12 pt-8 border-t border-white/5 relative z-10">
                {drawnPairs ? (
                    <Button 
                        onClick={handleFinalSave} 
                        disabled={isRevealing}
                        className={cn(
                            "w-full h-16 font-black uppercase italic text-lg tracking-tighter gap-4 shadow-[0_0_50px_rgba(204,253,1,0.2)] rounded-2xl transition-all duration-500",
                            isRevealing ? "bg-primary/20 text-white/20 cursor-wait" : "bg-primary text-black hover:bg-primary/90"
                        )}
                    >
                        {isRevealing ? (
                             <div className="flex items-center gap-3">
                                <Loader2 className="h-6 w-6 animate-spin" />
                                <span>Menghubungkan Sinyal... ({revealedCount} / {drawnPairs.length})</span>
                             </div>
                        ) : (
                            <>
                                <Swords className="h-6 w-6"/>
                                Kunci Pasangan & Lanjut Ke Draft Tim
                            </>
                        )}
                    </Button>
                ): (
                    <Button 
                        onClick={handleDraw} 
                        className="w-full h-16 font-black uppercase italic text-lg tracking-tighter gap-4 bg-primary text-black hover:bg-primary/90 rounded-2xl shadow-2xl transition-all hover:scale-[1.02] active:scale-95" 
                        disabled={isLoading || (playerPool.length < 2) || (playerPool.length % 2 !== 0)}
                    >
                        <Shuffle className="h-6 w-6"/>
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
