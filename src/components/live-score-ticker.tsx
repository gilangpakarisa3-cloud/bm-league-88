
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

import type { TISeasonTheme } from '@/lib/season-theme';

interface LiveScoreTickerProps {
  activeSeasonId: string | null;
  teamsById: Record<string, WithId<Team>>;
  playersById: Record<string, WithId<Player>>;
  isAdmin?: boolean;
  theme?: TISeasonTheme;
}

export function LiveScoreTicker({ activeSeasonId, teamsById, playersById, isAdmin, theme }: LiveScoreTickerProps) {
  const firestore = useFirestore();

  // Fallback default theme styling if theme not explicitly provided
  const primaryHex = theme?.primaryHex || '#CCFD01';
  const secondaryHex = theme?.secondaryHex || '#00E5FF';
  const glowRgba = theme?.glowRgba || 'rgba(204,253,1,0.4)';
  const sysTag = theme?.sysTag || 'SYS_FEED_88';
  const editionName = theme?.editionName || 'OFFICIAL MATCH BROADCAST';

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
    <div className="w-full relative py-6 sm:py-10 mb-8 sm:mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
      {/* Aerodynamic Background Speed Grid & Ambient Aura */}
      <div 
        className="absolute inset-0 rounded-3xl opacity-20 pointer-events-none blur-3xl"
        style={{
          background: `radial-gradient(circle at 50% 30%, ${primaryHex}20, transparent 70%)`
        }}
      />

      <div className="container max-w-6xl mx-auto px-2 sm:px-4 relative z-10">
        {/* ============================================================ */}
        {/* ULTRA-SPORT BROADCAST TELEMETRY HEADER                       */}
        {/* ============================================================ */}
        <div className="flex flex-col items-center gap-3 mb-6 sm:mb-8">
            <div className="inline-flex items-center gap-2.5 p-1 pr-4 rounded-full bg-[#070b14]/90 border backdrop-blur-xl shadow-2xl relative overflow-hidden"
              style={{ borderColor: `${primaryHex}40` }}
            >
                {/* Laser Pulse Light Tag */}
                <div 
                  className="px-3 py-1 rounded-full flex items-center gap-2 font-black text-[10px] sm:text-xs uppercase italic tracking-widest text-white shadow-lg"
                  style={{
                    background: `linear-gradient(135deg, #ef4444, #dc2626)`,
                    boxShadow: `0 0 16px rgba(239,68,68,0.6)`
                  }}
                >
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-90"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                    </span>
                    LIVE TRANSMISSION
                </div>

                {/* Sub Telemetry Label */}
                <div className="flex items-center gap-2">
                    <span 
                      className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.25em] font-mono italic"
                      style={{ color: primaryHex }}
                    >
                      REAL-TIME HUD
                    </span>
                    <span className="text-[8px] font-mono text-white/30 hidden xs:inline">•</span>
                    <span className="text-[8px] font-mono text-white/40 tracking-wider hidden xs:inline uppercase">
                      {sysTag}
                    </span>
                </div>
            </div>

            {/* Aerodynamic Carbon Speed Center Rule */}
            <div className="flex items-center gap-3 opacity-60">
                <div 
                  className="h-px w-12 sm:w-24 rounded-full"
                  style={{ background: `linear-gradient(to right, transparent, ${primaryHex})` }}
                />
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/[0.03] border border-white/10">
                    <Swords className="w-3 h-3" style={{ color: primaryHex }} />
                    <span className="text-[8px] font-black tracking-[0.2em] font-mono text-white/50 uppercase">
                      {liveMatches.length} {liveMatches.length === 1 ? 'MATCH' : 'MATCHES'} IN ARENA
                    </span>
                </div>
                <div 
                  className="h-px w-12 sm:w-24 rounded-full"
                  style={{ background: `linear-gradient(to left, transparent, ${primaryHex})` }}
                />
            </div>
        </div>

        {/* ============================================================ */}
        {/* ULTRA FUTURISTIC LIVE MATCH CARDS (CHASSIS HUD)               */}
        {/* ============================================================ */}
        <div className="grid grid-cols-1 gap-6 sm:gap-8 justify-items-center">
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
              <div 
                key={match.id} 
                className="w-full max-w-4xl relative group/card rounded-[2rem] sm:rounded-[2.5rem] p-[1px] transition-all duration-500 hover:scale-[1.008]"
                style={{
                  background: `linear-gradient(135deg, ${primaryHex}40, rgba(255,255,255,0.06) 45%, ${secondaryHex}30)`
                }}
              >
                {/* Exterior Neon Shadow Glow */}
                <div 
                  className="absolute -inset-1 rounded-[2.5rem] opacity-30 group-hover/card:opacity-75 blur-xl transition-all duration-700 pointer-events-none"
                  style={{
                    background: `radial-gradient(ellipse at center, ${glowRgba}, transparent 70%)`
                  }}
                />

                {/* Inner Main Carbon Hull */}
                <div className="relative rounded-[1.95rem] sm:rounded-[2.45rem] bg-gradient-to-b from-[#090d16]/98 via-[#05080e]/98 to-[#020306]/98 backdrop-blur-3xl overflow-hidden p-4 xs:p-5 sm:p-8">
                    
                    {/* Top Edge Aerodynamic Tracer */}
                    <div 
                      className="absolute top-0 left-10 right-10 h-[2px] opacity-70 pointer-events-none"
                      style={{
                        background: `linear-gradient(to right, transparent, ${primaryHex}, ${secondaryHex}, transparent)`,
                        boxShadow: `0 0 12px ${glowRgba}`
                      }}
                    />

                    {/* HUD Watermark & Subtle Hex Matrix Pattern */}
                    <div className="absolute right-4 bottom-2 font-mono text-[9px] font-black tracking-[0.3em] text-white/[0.04] select-none pointer-events-none uppercase">
                      TELEMETRY_ENGINE_V8 // {editionName}
                    </div>

                    {/* Arena Match Header Telemetry */}
                    <div className="flex items-center justify-between gap-2 mb-4 sm:mb-6 border-b border-white/5 pb-3">
                        <div className="flex items-center gap-2">
                            <span 
                              className="px-2.5 py-0.5 rounded-full text-[9px] font-mono font-black uppercase tracking-widest border"
                              style={{ 
                                backgroundColor: `${primaryHex}10`,
                                borderColor: `${primaryHex}30`,
                                color: primaryHex
                              }}
                            >
                              COURT_ARENA // {match.division === 'div-2' ? 'DIVISI 2' : 'DIVISI 1'}
                            </span>
                            {match.round && (
                              <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest hidden xs:inline">
                                {match.round}
                              </span>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            {isBo3 ? (
                              <Badge 
                                variant="outline" 
                                className="font-mono text-[8px] sm:text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border"
                                style={{
                                  borderColor: `${secondaryHex}40`,
                                  backgroundColor: `${secondaryHex}10`,
                                  color: secondaryHex
                                }}
                              >
                                GAME {gameIdx} / 3 [BO3]
                              </Badge>
                            ) : (
                              <Badge 
                                variant="outline" 
                                className="font-mono text-[8px] sm:text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border-white/10 bg-white/5 text-white/60"
                              >
                                SINGLE MATCH
                              </Badge>
                            )}
                        </div>
                    </div>

                    {/* ============================================================ */}
                    {/* BATTLE PODIUM: PLAYER 1 vs COCKPIT SCORE vs PLAYER 2        */}
                    {/* ============================================================ */}
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-center gap-4 sm:gap-6 relative z-10">
                        
                        {/* ---------------- PLAYER 1 (HOME) ---------------- */}
                        <div className="flex items-center justify-between sm:justify-start gap-3 sm:gap-4 order-1 min-w-0">
                            {isAdmin && (
                              <div className="flex flex-row sm:flex-col gap-1.5 shrink-0">
                                  <Button 
                                    size="icon" 
                                    variant="outline" 
                                    className="h-9 w-9 sm:h-8 sm:w-8 rounded-xl font-black border transition-all active:scale-90"
                                    style={{
                                      borderColor: `${primaryHex}40`,
                                      backgroundColor: `${primaryHex}15`,
                                      color: primaryHex
                                    }}
                                    onClick={() => handleQuickUpdate(match.id, isBo3 ? 'player1Wins' : 'player1Score', 1)}
                                    title="Tambah Poin P1"
                                  >
                                      <Plus className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    size="icon" 
                                    variant="outline" 
                                    className="h-9 w-9 sm:h-8 sm:w-8 rounded-xl font-black border-white/10 bg-white/5 hover:bg-red-500/20 hover:text-red-400 active:scale-90 transition-all text-white/60"
                                    onClick={() => handleQuickUpdate(match.id, isBo3 ? 'player1Wins' : 'player1Score', -1)}
                                    title="Kurangi Poin P1"
                                  >
                                      <Minus className="h-4 w-4" />
                                  </Button>
                              </div>
                            )}

                            <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                                {/* Crest Avatar with Neon Halo */}
                                <div className="relative shrink-0">
                                    <div 
                                      className="absolute -inset-1.5 rounded-full blur-md opacity-30 group-hover/card:opacity-80 transition-opacity"
                                      style={{ backgroundColor: primaryHex }}
                                    />
                                    <Avatar className="h-16 w-16 sm:h-20 sm:w-20 border-2 bg-black/80 shadow-2xl relative ring-2 ring-white/10 transition-transform duration-500 group-hover/card:scale-105"
                                      style={{ borderColor: `${primaryHex}60` }}
                                    >
                                        <AvatarImage src={logo1} className="object-contain p-2" />
                                        <AvatarFallback className="bg-black/90 font-black text-xs text-white">P1</AvatarFallback>
                                    </Avatar>
                                    {isBo3 && (
                                      <div 
                                        className="absolute -top-1 -right-1 font-black text-[10px] w-6 h-6 rounded-full flex items-center justify-center border-2 border-[#090d16] shadow-lg text-black"
                                        style={{ backgroundColor: primaryHex }}
                                      >
                                          {match.player1Wins}
                                      </div>
                                    )}
                                </div>

                                <div className="flex flex-col min-w-0">
                                    <span className="text-[9px] font-mono uppercase tracking-[0.2em] font-black" style={{ color: primaryHex }}>
                                      {t1?.name || 'HOME UNIT'}
                                    </span>
                                    <h3 className="text-base sm:text-xl font-black text-white uppercase italic tracking-tight truncate drop-shadow-md">
                                      {p1?.name || match.player1Id}
                                    </h3>
                                    {isBo3 && (
                                      <span className="text-[9px] font-mono text-white/40 tracking-wider">
                                        WINS: <strong className="text-white">{match.player1Wins ?? 0}</strong>
                                      </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* ---------------- COCKPIT SCORE DISPLAY ---------------- */}
                        <div className="flex flex-col items-center justify-center order-2 px-2 sm:px-4 py-2">
                            {/* Aerodynamic Carbon Glass Score Box */}
                            <div 
                              className="relative px-6 sm:px-10 py-3 sm:py-4 rounded-2xl sm:rounded-3xl border backdrop-blur-2xl shadow-2xl transition-all duration-500 group-hover/card:shadow-[0_0_40px_rgba(0,0,0,0.9)]"
                              style={{
                                background: `radial-gradient(circle at center, #0e1526, #060911)`,
                                borderColor: `${primaryHex}50`,
                                boxShadow: `0 0 25px ${glowRgba}`
                              }}
                            >
                                {/* Inner Laser Split Line */}
                                <div className="flex items-center gap-4 sm:gap-6">
                                    <span 
                                      className="font-headline text-4xl sm:text-6xl font-black italic tabular-nums tracking-tighter leading-none"
                                      style={{ 
                                        color: primaryHex,
                                        textShadow: `0 0 20px ${glowRgba}`
                                      }}
                                    >
                                        {match.player1Score ?? 0}
                                    </span>

                                    {/* High-Voltage Divider Tracer */}
                                    <div className="flex flex-col items-center gap-1">
                                        <div 
                                          className="w-1.5 h-1.5 rounded-full"
                                          style={{ backgroundColor: secondaryHex, boxShadow: `0 0 8px ${secondaryHex}` }}
                                        />
                                        <div className="w-[2px] h-6 sm:h-10 bg-white/20 rounded-full" />
                                        <div 
                                          className="w-1.5 h-1.5 rounded-full"
                                          style={{ backgroundColor: secondaryHex, boxShadow: `0 0 8px ${secondaryHex}` }}
                                        />
                                    </div>

                                    <span 
                                      className="font-headline text-4xl sm:text-6xl font-black italic tabular-nums tracking-tighter leading-none"
                                      style={{ 
                                        color: primaryHex,
                                        textShadow: `0 0 20px ${glowRgba}`
                                      }}
                                    >
                                        {match.player2Score ?? 0}
                                    </span>
                                </div>

                                {/* Micro Live Indicator Inside Pod */}
                                <div className="mt-2 pt-1.5 border-t border-white/10 flex items-center justify-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                    <span className="text-[8px] font-black uppercase tracking-[0.25em] text-white/60 italic">
                                      IN PROGRESS
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* ---------------- PLAYER 2 (AWAY) ---------------- */}
                        <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 order-3 min-w-0">
                            <div className="flex items-center justify-end gap-3 sm:gap-4 min-w-0 flex-1 text-right sm:order-1">
                                <div className="flex flex-col min-w-0 items-end">
                                    <span className="text-[9px] font-mono uppercase tracking-[0.2em] font-black" style={{ color: secondaryHex }}>
                                      {t2?.name || 'AWAY UNIT'}
                                    </span>
                                    <h3 className="text-base sm:text-xl font-black text-white uppercase italic tracking-tight truncate drop-shadow-md">
                                      {p2?.name || match.player2Id}
                                    </h3>
                                    {isBo3 && (
                                      <span className="text-[9px] font-mono text-white/40 tracking-wider">
                                        WINS: <strong className="text-white">{match.player2Wins ?? 0}</strong>
                                      </span>
                                    )}
                                </div>

                                {/* Crest Avatar with Neon Halo */}
                                <div className="relative shrink-0">
                                    <div 
                                      className="absolute -inset-1.5 rounded-full blur-md opacity-30 group-hover/card:opacity-80 transition-opacity"
                                      style={{ backgroundColor: secondaryHex }}
                                    />
                                    <Avatar className="h-16 w-16 sm:h-20 sm:w-20 border-2 bg-black/80 shadow-2xl relative ring-2 ring-white/10 transition-transform duration-500 group-hover/card:scale-105"
                                      style={{ borderColor: `${secondaryHex}60` }}
                                    >
                                        <AvatarImage src={logo2} className="object-contain p-2" />
                                        <AvatarFallback className="bg-black/90 font-black text-xs text-white">P2</AvatarFallback>
                                    </Avatar>
                                    {isBo3 && (
                                      <div 
                                        className="absolute -top-1 -left-1 font-black text-[10px] w-6 h-6 rounded-full flex items-center justify-center border-2 border-[#090d16] shadow-lg text-black"
                                        style={{ backgroundColor: secondaryHex }}
                                      >
                                          {match.player2Wins}
                                      </div>
                                    )}
                                </div>
                            </div>

                            {isAdmin && (
                              <div className="flex flex-row sm:flex-col gap-1.5 shrink-0 sm:order-2">
                                  <Button 
                                    size="icon" 
                                    variant="outline" 
                                    className="h-9 w-9 sm:h-8 sm:w-8 rounded-xl font-black border transition-all active:scale-90"
                                    style={{
                                      borderColor: `${secondaryHex}40`,
                                      backgroundColor: `${secondaryHex}15`,
                                      color: secondaryHex
                                    }}
                                    onClick={() => handleQuickUpdate(match.id, isBo3 ? 'player2Wins' : 'player2Score', 1)}
                                    title="Tambah Poin P2"
                                  >
                                      <Plus className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    size="icon" 
                                    variant="outline" 
                                    className="h-9 w-9 sm:h-8 sm:w-8 rounded-xl font-black border-white/10 bg-white/5 hover:bg-red-500/20 hover:text-red-400 active:scale-90 transition-all text-white/60"
                                    onClick={() => handleQuickUpdate(match.id, isBo3 ? 'player2Wins' : 'player2Score', -1)}
                                    title="Kurangi Poin P2"
                                  >
                                      <Minus className="h-4 w-4" />
                                  </Button>
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

