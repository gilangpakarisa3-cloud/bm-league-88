'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useFirestore } from '@/firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import type { WithId, Season, Player, LeagueEntry, PlayerWithTeam } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { ArrowDownCircle, ArrowUpCircle, Loader2, Shuffle, Swords, Trash2, Zap, Scan, Loader, CheckCircle2, Binary } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
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

    const findPreviousSeason = async () => {
        setIsLoading(true);
        setDrawnPairs(null);
        setRevealedCount(0);
        setIsRevealing(false);
        
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
      }, 1000); // Reveal one pair every 1 second
  }, [pot1, pot2, toast]);
  
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
             {/* HUD Texture Overlay */}
             <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:30px_30px] pointer-events-none" />

            <DialogHeader className="mb-10 text-center relative z-10">
              <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="p-3 bg-primary/10 rounded-2xl border-2 border-primary/20 text-primary shadow-[0_0_30px_rgba(204,253,1,0.2)]">
                      <Shuffle className="w-8 h-8" />
                  </div>
              </div>
              <DialogTitle className="text-4xl font-black italic uppercase text-white tracking-tighter leading-none">Undian Pasangan Co-Op</DialogTitle>
              <div className="flex items-center justify-center gap-3 mt-4">
                <Badge variant="outline" className="bg-primary/10 border-primary/20 text-primary text-[8px] font-black uppercase tracking-[0.3em] h-6 px-4 italic">Seeded Draw System Active</Badge>
                <div className="h-px w-12 bg-white/10" />
                <span className="text-[8px] font-bold text-white/30 uppercase tracking-[0.4em]">Protocol v4.0.1</span>
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                            <PotDisplay 
                                title="Pot 1 (Unggulan)" 
                                subtitle="Top Performance Tier"
                                players={pot1} 
                                isAdmin={isAdmin} 
                                onRemovePlayer={(p) => onRemovePlayer(p.id, p.playerName)}
                                onMovePlayer={(player) => handleMovePlayer(player, 'pot2')}
                                moveIcon={<ArrowDownCircle className="h-4 w-4 text-amber-500" />}
                                variant="primary"
                            />
                            <PotDisplay 
                                title="Pot 2 (Challengers)" 
                                subtitle="Rising Competitors"
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
                        disabled={isLoading || (pot1.length + pot2.length < 2)}
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

const PotDisplay = ({ title, subtitle, players, isAdmin, onRemovePlayer, onMovePlayer, moveIcon, variant = "default" }: { 
    title: string;
    subtitle: string;
    players: PlayerInPot[];
    isAdmin: boolean;
    onRemovePlayer: (player: PlayerInPot) => void;
    onMovePlayer: (player: PlayerInPot) => void;
    moveIcon: React.ReactNode;
    variant?: "primary" | "default";
}) => (
    <Card className={cn(
        "bg-black/40 border-2 rounded-[2rem] overflow-hidden transition-all duration-500 group/pot",
        variant === "primary" ? "border-primary/20 hover:border-primary/40" : "border-white/5 hover:border-white/20"
    )}>
        <CardHeader className="p-6 bg-white/[0.02] border-b border-white/5">
            <div className="flex flex-col items-center gap-1">
                <CardTitle className={cn(
                    "text-center font-black text-base uppercase tracking-[0.2em] italic", 
                    variant === "primary" ? "text-primary" : "text-white/60"
                )}>{title}</CardTitle>
                <p className="text-[8px] font-black uppercase tracking-[0.4em] text-white/20 italic">{subtitle}</p>
            </div>
        </CardHeader>
        <CardContent className="p-4">
            <div className="space-y-2">
                {players.map((player, idx) => (
                    <div key={player.id} className="flex items-center justify-between p-3.5 bg-white/[0.02] border border-white/5 rounded-xl group/item hover:bg-white/[0.05] hover:border-white/10 transition-all">
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black text-white/20 tabular-nums">#{idx + 1}</span>
                            <span className="font-black text-sm uppercase italic text-white/80 tracking-tight" suppressHydrationWarning>{player.playerName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            {isAdmin && (
                                <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 rounded-lg" onClick={() => onMovePlayer(player)}>{moveIcon}</Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-500/10 text-red-500 rounded-lg" onClick={() => onRemovePlayer(player)}><Trash2 className="h-4 w-4" /></Button>
                                </div>
                            )}
                            <Badge className="bg-white/5 text-white/40 border-none text-[8px] font-black h-5">RANK {player.prevRank === Infinity ? 'NEW' : player.prevRank}</Badge>
                        </div>
                    </div>
                ))}
                {players.length === 0 && (
                    <div className="py-12 text-center opacity-10 flex flex-col items-center gap-3">
                        <Scan className="w-10 h-10" />
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] italic">No Signal Detected</p>
                    </div>
                )}
            </div>
        </CardContent>
    </Card>
);
