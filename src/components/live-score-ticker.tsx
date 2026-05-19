
'use client';

import { useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, updateDoc, increment } from 'firebase/firestore';
import type { Match, Team, Player, WithId } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Zap, Scan, Binary, Radio, Plus, Minus, Swords } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { resolveLogo } from '@/lib/logo-utils';

interface LiveScoreTickerProps {
  activeSeasonId: string | null;
  teamsById: Record<string, WithId<Team>>;
  playersById: Record<string, WithId<Player>>;
  isAdmin?: boolean;
}

export function LiveScoreTicker({ activeSeasonId, teamsById, playersById, isAdmin }: LiveScoreTickerProps) {
  const firestore = useFirestore();

  const liveMatchesQuery = useMemoFirebase(() => {
    if (!firestore || !activeSeasonId) return null;
    return query(
      collection(firestore, `leagues/main-league/seasons/${activeSeasonId}/matches`),
      where('status', '==', 'Live')
    );
  }, [firestore, activeSeasonId]);

  const { data: liveMatches, isLoading } = useCollection<Match>(liveMatchesQuery);

  const handleQuickUpdate = async (matchId: string, field: string, delta: number) => {
    if (!firestore || !activeSeasonId || !isAdmin) return;
    const matchRef = doc(firestore, `leagues/main-league/seasons/${activeSeasonId}/matches`, matchId);
    try {
        await updateDoc(matchRef, {
            [field]: increment(delta)
        });
    } catch (e) {
        console.error("Quick update failed:", e);
    }
  };

  if (isLoading || !liveMatches || liveMatches.length === 0) return null;

  return (
    <div className="w-full bg-black/40 border-y-4 border-primary/10 py-6 sm:py-10 overflow-hidden relative group backdrop-blur-3xl animate-in fade-in slide-in-from-top-4 duration-1000 mb-12">
      {/* HUD Background Decoration */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(204,253,1,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(204,253,1,0.01)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20 pointer-events-none" />
      
      {/* Dynamic Scan Line Across Ticker */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 opacity-10">
          <div className="w-full h-[2px] bg-primary blur-[1px] absolute top-0 left-0 animate-scanning" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* CENTERED HEADER */}
        <div className="flex flex-col items-center gap-4 mb-8">
            <div className="bg-red-500 px-8 py-2 flex items-center justify-center relative overflow-hidden -skew-x-[15deg] border-r-4 border-black/20 shadow-[0_0_30px_rgba(239,68,68,0.3)]">
                <div className="absolute top-0 right-0 w-1/2 h-full bg-black/10 -skew-x-[25deg] translate-x-1/4 pointer-events-none" />
                <div className="flex items-center gap-3 relative z-10 skew-x-[15deg]">
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                    </span>
                    <h2 className="text-xs sm:text-sm font-black text-white uppercase tracking-[0.4em] italic pr-2">Live Score</h2>
                </div>
            </div>
            <div className="flex items-center gap-2 opacity-30">
                <div className="h-px w-12 bg-white" />
                <Binary className="w-4 h-4 text-white" />
                <div className="h-px w-12 bg-white" />
            </div>
        </div>

        {/* CENTERED MATCH CARDS */}
        <div className="flex flex-wrap gap-6 sm:gap-10 justify-center">
          {liveMatches.map((match) => {
            const p1 = playersById[match.player1Id];
            const p2 = playersById[match.player2Id];
            const t1 = teamsById[p1?.teamId || ''];
            const t2 = teamsById[p2?.teamId || ''];
            
            const logo1 = resolveLogo(t1?.logoUrl, match.player1Id, p1?.name || match.player1Id);
            const logo2 = resolveLogo(t2?.logoUrl, match.player2Id, p2?.name || match.player2Id);

            const isBo3 = match.player1Wins !== null;
            const gameIdx = isBo3 ? (match.player1Wins! + match.player2Wins! + 1) : 1;

            return (
              <div key={match.id} className="relative group/live-card">
                {/* Glow Effect */}
                <div className="absolute -inset-2 bg-primary/5 rounded-[2.5rem] blur-2xl opacity-0 group-hover/live-card:opacity-100 transition-opacity duration-700" />
                
                <div className="bg-black/60 border-2 border-white/10 rounded-[2rem] sm:rounded-[2.5rem] p-5 sm:p-8 flex flex-col sm:flex-row items-center gap-6 sm:gap-10 shadow-2xl hover:border-primary/40 transition-all duration-500 relative overflow-hidden backdrop-blur-3xl min-w-[280px] sm:min-w-[450px]">
                    
                    {/* Interior Scan Line */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 opacity-0 group-hover/live-card:opacity-20 transition-opacity">
                        <div className="w-full h-1 bg-primary blur-[1px] animate-scanning" />
                    </div>

                    <div className="flex items-center justify-between w-full relative z-10 gap-4 sm:gap-8">
                        {/* Player 1 */}
                        <div className="flex items-center gap-4 flex-1">
                            {isAdmin && (
                                <div className="flex flex-col gap-1 shrink-0 animate-in fade-in slide-in-from-left-2 duration-500">
                                    <Button size="icon" variant="outline" className="h-7 w-7 rounded-lg border-primary/30 bg-primary/10 hover:bg-primary hover:text-black" onClick={() => handleQuickUpdate(match.id, isBo3 ? 'player1Wins' : 'player1Score', 1)}><Plus className="h-3 w-3" /></Button>
                                    <Button size="icon" variant="outline" className="h-7 w-7 rounded-lg border-white/10 bg-white/5 hover:bg-red-500 hover:text-white" onClick={() => handleQuickUpdate(match.id, isBo3 ? 'player1Wins' : 'player1Score', -1)}><Minus className="h-3 w-3" /></Button>
                                </div>
                            )}
                            <div className="flex flex-col items-center gap-3 flex-1">
                                <div className="relative">
                                    <div className="absolute -inset-2 bg-primary/10 rounded-full blur-lg opacity-0 group-hover/live-card:opacity-100 transition-opacity" />
                                    <Avatar className="h-14 w-14 sm:h-20 sm:w-20 border-2 border-white/10 group-hover/live-card:border-primary transition-all duration-500 shadow-xl scale-100 group-hover/live-card:scale-110">
                                        <AvatarImage src={logo1} className="object-cover" />
                                        <AvatarFallback className="bg-black/40 text-[10px] font-black">P1</AvatarFallback>
                                    </Avatar>
                                    {isBo3 && (
                                        <div className="absolute -top-1 -right-1 bg-primary text-black font-black text-[10px] w-6 h-6 rounded-full flex items-center justify-center border-2 border-background shadow-lg">
                                            {match.player1Wins}
                                        </div>
                                    )}
                                </div>
                                <span className="text-[10px] sm:text-xs font-black text-white/80 uppercase tracking-widest italic truncate max-w-[100px] text-center pr-2">{p1?.name || match.player1Id}</span>
                            </div>
                        </div>
                        
                        {/* CENTER SCORE HUB */}
                        <div className="flex flex-col items-center gap-3">
                            <div className="relative group/score-box">
                                <div className="absolute -inset-4 bg-primary/5 rounded-2xl blur-xl animate-pulse" />
                                <div className="bg-[#0A192F] border-2 border-primary/30 px-6 sm:px-10 py-3 sm:py-4 rounded-2xl shadow-[0_0_40px_rgba(204,253,1,0.1)] flex flex-col items-center relative z-10 -skew-x-[12deg] group-hover/live-card:border-primary transition-colors">
                                    <div className="flex items-center gap-4 sm:gap-6">
                                        <span className="text-3xl sm:text-5xl font-black text-primary italic tabular-nums skew-x-[12deg] drop-shadow-[0_0_15px_rgba(204,253,1,0.5)] leading-none">{match.player1Score ?? 0}</span>
                                        <div className="w-px h-8 sm:h-12 bg-white/10 skew-x-[12deg]" />
                                        <span className="text-3xl sm:text-5xl font-black text-primary italic tabular-nums skew-x-[12deg] drop-shadow-[0_0_15px_rgba(204,253,1,0.5)] leading-none">{match.player2Score ?? 0}</span>
                                    </div>
                                    {isBo3 && (
                                        <div className="mt-2 flex items-center gap-2 skew-x-[12deg]">
                                            <span className="text-[7px] font-black text-white/20 uppercase tracking-[0.2em]">Series Wins</span>
                                            <div className="flex items-center gap-1.5 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                                                <span className="text-[10px] font-black text-white/60 tabular-nums">{match.player1Wins}</span>
                                                <div className="w-px h-2 bg-white/10" />
                                                <span className="text-[10px] font-black text-white/60 tabular-nums">{match.player2Wins}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-col items-center gap-1">
                                <Badge className="bg-red-500 text-white border-none font-black text-[8px] h-5 px-3 uppercase italic shadow-lg animate-pulse">LIVE BROADCAST</Badge>
                                {isBo3 && (
                                    <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary text-[7px] font-black uppercase tracking-widest px-2 h-4 italic">
                                        GAME {gameIdx} OF 3
                                    </Badge>
                                )}
                            </div>
                        </div>

                        {/* Player 2 */}
                        <div className="flex items-center gap-4 flex-1">
                            <div className="flex flex-col items-center gap-3 flex-1">
                                <div className="relative">
                                    <div className="absolute -inset-2 bg-primary/10 rounded-full blur-lg opacity-0 group-hover/live-card:opacity-100 transition-opacity" />
                                    <Avatar className="h-14 w-14 sm:h-20 sm:w-20 border-2 border-white/10 group-hover/live-card:border-primary transition-all duration-500 shadow-xl scale-100 group-hover/live-card:scale-110">
                                        <AvatarImage src={logo2} className="object-cover" />
                                        <AvatarFallback className="bg-black/40 text-[10px] font-black">P2</AvatarFallback>
                                    </Avatar>
                                    {isBo3 && (
                                        <div className="absolute -top-1 -left-1 bg-primary text-black font-black text-[10px] w-6 h-6 rounded-full flex items-center justify-center border-2 border-background shadow-lg">
                                            {match.player2Wins}
                                        </div>
                                    )}
                                </div>
                                <span className="text-[10px] sm:text-xs font-black text-white/80 uppercase tracking-widest italic truncate max-w-[100px] text-center pr-2">{p2?.name || match.player2Id}</span>
                            </div>
                            {isAdmin && (
                                <div className="flex flex-col gap-1 shrink-0 animate-in fade-in slide-in-from-right-2 duration-500">
                                    <Button size="icon" variant="outline" className="h-7 w-7 rounded-lg border-primary/30 bg-primary/10 hover:bg-primary hover:text-black" onClick={() => handleQuickUpdate(match.id, isBo3 ? 'player2Wins' : 'player2Score', 1)}><Plus className="h-3 w-3" /></Button>
                                    <Button size="icon" variant="outline" className="h-7 w-7 rounded-lg border-white/10 bg-white/5 hover:bg-red-500 hover:text-white" onClick={() => handleQuickUpdate(match.id, isBo3 ? 'player2Wins' : 'player2Score', -1)}><Minus className="h-3 w-3" /></Button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

