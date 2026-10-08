
'use client';

import { useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, updateDoc, increment } from 'firebase/firestore';
import type { Match, Team, Player, WithId } from '@/lib/types';
import { Zap, Plus, Minus, Crosshair, Flame, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
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

  // Dynamic Theme Palette
  const primaryHex = theme?.primaryHex || '#CCFD01';
  const secondaryHex = theme?.secondaryHex || '#00E5FF';
  const glowRgba = theme?.glowRgba || 'rgba(204,253,1,0.5)';
  const sysTag = theme?.sysTag || 'SYS_ARENA_88';

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
    <div className="w-full relative py-2 sm:py-3 mb-4 sm:mb-6 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
      {/* Aggressive Cyber Grid Background with Pulse Radar Wave */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          background: `radial-gradient(circle at 50% 40%, ${primaryHex}20 0%, transparent 70%)`
        }}
      />
      
      {/* High-voltage strobe hazard lines across container top & bottom */}
      <div 
        className="absolute top-0 left-0 right-0 h-[1.5px] opacity-80"
        style={{
          background: `linear-gradient(90deg, transparent 0%, #ef4444 25%, ${primaryHex} 50%, #ef4444 75%, transparent 100%)`,
          boxShadow: `0 0 10px #ef4444`
        }}
      />
      <div 
        className="absolute bottom-0 left-0 right-0 h-[1.5px] opacity-50"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${secondaryHex} 30%, ${primaryHex} 70%, transparent 100%)`,
          boxShadow: `0 0 10px ${primaryHex}`
        }}
      />

      <div className="container max-w-5xl mx-auto px-1 sm:px-3 relative z-10">
        
        {/* ============================================================ */}
        {/* COMPACT & RIGID WARZONE HEADER HUD                           */}
        {/* ============================================================ */}
        <div className="flex items-center justify-between gap-2 mb-2.5 sm:mb-3 px-1">
            {/* Left Mecha Beacon */}
            <div className="inline-flex items-center gap-2 p-1 px-3 sm:px-4 bg-[#070b14]/95 border border-white/10 rounded-xl backdrop-blur-xl shadow-lg"
              style={{
                borderColor: `${primaryHex}50`,
                boxShadow: `0 0 20px ${glowRgba}`
              }}
            >
                {/* Red Overdrive Flashing Strobe */}
                <div className="flex items-center gap-1.5 bg-red-600 text-white font-black text-[8px] sm:text-[10px] tracking-widest uppercase italic px-2 py-0.5 rounded-md shadow-[0_0_12px_rgba(239,68,68,0.7)] animate-pulse">
                    <Flame className="w-3 h-3 fill-current text-amber-300" />
                    LIVE COMBAT
                </div>

                <div className="flex items-center gap-1.5">
                    <span 
                      className="text-[9px] sm:text-[11px] font-black uppercase tracking-wider font-mono italic"
                      style={{ color: primaryHex }}
                    >
                      WARZONE ARENA
                    </span>
                    <span className="text-white/20 font-mono hidden sm:inline">|</span>
                    <span className="text-[8px] font-mono text-white/50 tracking-wider hidden sm:inline uppercase">
                      {sysTag}
                    </span>
                </div>
            </div>

            {/* Combat Target Count Badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-black/80 border border-white/10 rounded-xl shadow-inner">
                <ShieldAlert className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                <span className="text-[8px] sm:text-[10px] font-black tracking-widest font-mono text-white/80 uppercase">
                  {liveMatches.length} {liveMatches.length === 1 ? 'MATCH' : 'MATCHES'} IN PLAY
                </span>
            </div>
        </div>

        {/* ============================================================ */}
        {/* COMPACT & RIGID MATCH CHASSIS CARDS                          */}
        {/* ============================================================ */}
        <div className="grid grid-cols-1 gap-3 sm:gap-4 justify-items-center">
          {liveMatches.map((match) => {
            const p1 = playersById[match.player1Id];
            const p2 = playersById[match.player2Id];
            const t1 = teamsById[p1?.teamId || ''];
            const t2 = teamsById[p2?.teamId || ''];
            
            const logo1 = resolveLogo(t1?.logoUrl, match.player1Id, p1?.name || match.player1Id);
            const logo2 = resolveLogo(t2?.logoUrl, match.player2Id, p2?.name || match.player2Id);

            const isBo3 = match.player1Wins !== null;
            const gameIdx = isBo3 ? (match.player1Wins! + match.player2Wins! + 1) : 1;

            const p1Score = match.player1Score ?? 0;
            const p2Score = match.player2Score ?? 0;
            const p1Winning = p1Score > p2Score;
            const p2Winning = p2Score > p1Score;

            return (
              <div 
                key={match.id} 
                className="w-full max-w-5xl relative group/card transition-all duration-500 hover:scale-[1.01]"
              >
                {/* Aggressive Chamfered Outline Border Glow */}
                <div 
                  className="absolute -inset-1 opacity-40 group-hover/card:opacity-85 blur-xl transition-all duration-700 pointer-events-none"
                  style={{
                    background: `linear-gradient(135deg, ${primaryHex}80, #ef4444 50%, ${secondaryHex}80)`
                  }}
                />

                {/* Main Mecha Hull Chassis with Compact Rigid Form */}
                <div 
                  className="relative bg-gradient-to-b from-[#0c121d]/98 via-[#060a12]/98 to-[#020306]/98 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.95)] overflow-hidden p-3 sm:p-5 rounded-2xl sm:rounded-3xl"
                  style={{
                    borderColor: `${primaryHex}35`
                  }}
                >
                    {/* Top Laser Slanted Splitter Line */}
                    <div 
                      className="absolute top-0 left-0 right-0 h-[2px]"
                      style={{
                        background: `linear-gradient(90deg, ${primaryHex}, #ef4444 50%, ${secondaryHex})`,
                        boxShadow: `0 0 12px ${primaryHex}`
                      }}
                    />

                    {/* Corner Reticle Accents */}
                    <div className="absolute top-2 left-2 pointer-events-none">
                        <Crosshair className="w-3 h-3 opacity-30 text-white" />
                    </div>
                    <div className="absolute top-2 right-2 pointer-events-none">
                        <Crosshair className="w-3 h-3 opacity-30 text-white" />
                    </div>

                    {/* Background Predator Carbon Slant Stripes */}
                    <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_20px,rgba(255,255,255,0.015)_20px,rgba(255,255,255,0.015)_40px)] pointer-events-none" />

                    {/* Arena Division & Match Format Bar */}
                    <div className="flex items-center justify-between gap-2 mb-3 sm:mb-4 pb-2 border-b border-white/10 relative z-10">
                        <div className="flex items-center gap-2">
                            <span 
                                className="px-2.5 py-0.5 font-mono font-black text-[8px] sm:text-[9px] uppercase tracking-wider rounded-md border"
                                style={{ 
                                  backgroundColor: `${primaryHex}15`,
                                  borderColor: `${primaryHex}50`,
                                  color: primaryHex
                                }}
                            >
                              SECTOR // {match.division === 'div-2' ? 'DIVISI 2 BATTLE' : 'DIVISI 1 TITAN'}
                            </span>
                            {match.round && (
                              <span className="text-[9px] font-mono font-bold text-white/50 uppercase tracking-widest hidden xs:inline">
                                [{match.round}]
                              </span>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            {isBo3 ? (
                              <div 
                                className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border"
                                style={{
                                  borderColor: `${secondaryHex}50`,
                                  backgroundColor: `${secondaryHex}15`,
                                  color: secondaryHex
                                }}
                              >
                                  <Zap className="w-3 h-3 fill-current animate-pulse" />
                                  <span className="font-mono text-[8px] sm:text-[9px] font-black uppercase tracking-widest">
                                    ROUND {gameIdx} / 3 • BO3
                                  </span>
                              </div>
                            ) : (
                              <span className="font-mono text-[8px] font-black uppercase tracking-widest text-white/40 px-2 py-0.5 bg-white/5 border border-white/10 rounded-full">
                                SINGLE
                              </span>
                            )}
                        </div>
                    </div>

                    {/* ============================================================ */}
                    {/* COMBAT ARENA: P1 WING VS RIGID SCORE CORE VS P2 WING         */}
                    {/* ============================================================ */}
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-4 relative z-10">
                        
                        {/* ----------------- PLAYER 1 (HOME COMBATANT) ----------------- */}
                        <div className={cn(
                          "relative p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border transition-all duration-300 min-w-0 flex items-center justify-between gap-2.5 sm:gap-3 order-1",
                          p1Winning 
                            ? "bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/40 shadow-[0_0_20px_rgba(204,253,1,0.1)]" 
                            : "bg-white/[0.02] border-white/10 hover:border-white/20"
                        )}>
                            {/* P1 Admin Overdrive Controls */}
                            {isAdmin && (
                              <div className="flex flex-row xl:flex-col gap-1.5 shrink-0 z-20">
                                  <Button 
                                    size="icon" 
                                    variant="outline" 
                                    className="h-9 w-9 sm:h-8 sm:w-8 rounded-lg font-black border transition-all active:scale-90"
                                    style={{
                                      borderColor: `${primaryHex}60`,
                                      backgroundColor: `${primaryHex}20`,
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
                                    className="h-9 w-9 sm:h-8 sm:w-8 rounded-lg font-black border-white/10 bg-white/5 hover:bg-red-500/20 hover:text-red-400 active:scale-90 transition-all text-white/60"
                                    onClick={() => handleQuickUpdate(match.id, isBo3 ? 'player1Wins' : 'player1Score', -1)}
                                    title="Kurangi Poin P1"
                                  >
                                      <Minus className="h-4 w-4" />
                                  </Button>
                              </div>
                            )}

                            <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                                {/* Mecha Angled Logo Shield with Cyber Reticle */}
                                <div className="relative shrink-0 group/crest">
                                    {/* Neon Outer Halo */}
                                    <div 
                                      className="absolute -inset-1 rounded-xl blur-md opacity-35 group-hover/card:opacity-80 transition-opacity pointer-events-none"
                                      style={{ backgroundColor: primaryHex }}
                                    />
                                    {/* Chamfered Box Shield */}
                                    <div 
                                      className="w-11 h-11 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-xl sm:rounded-2xl border-2 p-1.5 relative flex items-center justify-center overflow-hidden transition-all duration-300 group-hover/card:scale-105 shadow-xl bg-[#070b14]/95 backdrop-blur-md"
                                      style={{ 
                                        borderColor: `${primaryHex}70`,
                                        boxShadow: `0 0 18px ${primaryHex}25`
                                      }}
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
                                        {logo1 ? (
                                          <img 
                                            src={logo1} 
                                            alt={p1?.name || 'Player 1'} 
                                            className="w-full h-full object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] select-none"
                                          />
                                        ) : (
                                          <span className="font-black text-xs text-white uppercase font-mono">P1</span>
                                        )}
                                    </div>

                                    {/* Series Wins Pip Node */}
                                    {isBo3 && (
                                      <div 
                                        className="absolute -top-1.5 -right-1.5 font-black text-[10px] w-5 h-5 rounded-md flex items-center justify-center border border-[#090d16] shadow-md text-black font-headline italic"
                                        style={{ 
                                          backgroundColor: primaryHex,
                                          boxShadow: `0 0 8px ${primaryHex}`
                                        }}
                                      >
                                          {match.player1Wins ?? 0}
                                      </div>
                                    )}
                                </div>

                                <div className="flex flex-col min-w-0 pr-1">
                                    <span 
                                      className="text-[8px] sm:text-[9px] font-mono uppercase tracking-wider font-black truncate flex items-center gap-1.5"
                                      style={{ color: primaryHex }}
                                    >
                                      <span className="w-1.5 h-1.5 rounded-full animate-ping shrink-0" style={{ backgroundColor: primaryHex }} />
                                      <span className="truncate">{t1?.name || 'HOME COMBATANT'}</span>
                                    </span>
                                    <h3 className="text-base sm:text-xl lg:text-2xl font-black text-white uppercase italic tracking-tight drop-shadow-md pr-1 leading-tight break-words">
                                      {p1?.name || match.player1Id}
                                    </h3>
                                    {isBo3 && (
                                      <div className="flex items-center gap-1 mt-0.5">
                                          {[...Array(2)].map((_, i) => (
                                              <span 
                                                key={i} 
                                                className={cn(
                                                  "w-3 sm:w-3.5 h-1 rounded-sm border transition-all",
                                                  i < (match.player1Wins || 0) 
                                                    ? "bg-primary border-primary shadow-[0_0_6px_rgba(204,253,1,0.8)]" 
                                                    : "bg-white/10 border-white/20"
                                                )}
                                                style={i < (match.player1Wins || 0) ? { backgroundColor: primaryHex, borderColor: primaryHex } : {}}
                                              />
                                          ))}
                                          <span className="text-[7.5px] font-mono text-white/40 uppercase tracking-widest ml-1">SERIES</span>
                                      </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* ----------------- AGGRESSIVE VS & SCORE CORE ----------------- */}
                        <div className="flex flex-col items-center justify-center order-2 px-1">
                            {/* Mecha Aggressive Score Chassis */}
                            <div 
                              className="relative px-4 sm:px-6 py-2 sm:py-3 rounded-xl sm:rounded-2xl border backdrop-blur-2xl shadow-xl transition-all duration-300 overflow-hidden w-full sm:w-auto"
                              style={{
                                background: `radial-gradient(ellipse at center, #0e1628 0%, #05070e 100%)`,
                                borderColor: `${primaryHex}50`,
                                boxShadow: `0 0 25px ${glowRgba}`
                              }}
                            >
                                {/* Diagonal Racing Hazard Accent */}
                                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary via-red-500 to-secondary" />

                                <div className="flex items-center justify-center gap-4 sm:gap-6 relative z-10">
                                    
                                    {/* P1 Score */}
                                    <div className="flex flex-col items-center">
                                        <span 
                                          className={cn(
                                            "font-headline text-3xl sm:text-5xl font-black italic tabular-nums tracking-tighter leading-none transition-all duration-300",
                                            p1Winning ? "scale-105" : "opacity-90"
                                          )}
                                          style={{ 
                                            color: primaryHex,
                                            textShadow: `0 0 18px ${glowRgba}`
                                          }}
                                        >
                                            {p1Score}
                                        </span>
                                    </div>

                                    {/* VS Clash Center Piece */}
                                    <div className="flex flex-col items-center gap-1 px-1">
                                        <div 
                                          className="font-headline font-black text-[10px] sm:text-xs tracking-wider italic px-2 py-0.5 rounded border text-white shadow-md"
                                          style={{
                                            background: `linear-gradient(135deg, #ef4444, #b91c1c)`,
                                            borderColor: `#ef4444`,
                                            boxShadow: `0 0 10px rgba(239,68,68,0.7)`
                                          }}
                                        >
                                          VS
                                        </div>
                                        <div className="w-[1.5px] h-5 sm:h-7 bg-gradient-to-b from-red-500 via-white/30 to-secondary rounded-full" />
                                    </div>

                                    {/* P2 Score */}
                                    <div className="flex flex-col items-center">
                                        <span 
                                          className={cn(
                                            "font-headline text-3xl sm:text-5xl font-black italic tabular-nums tracking-tighter leading-none transition-all duration-300",
                                            p2Winning ? "scale-105" : "opacity-90"
                                          )}
                                          style={{ 
                                            color: secondaryHex,
                                            textShadow: `0 0 18px ${secondaryHex}`
                                          }}
                                        >
                                            {p2Score}
                                        </span>
                                    </div>
                                </div>

                                {/* Under-score Telemetry Pill */}
                                <div className="mt-1.5 pt-1.5 border-t border-white/10 flex items-center justify-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                                    <span className="text-[8px] font-black uppercase tracking-widest font-mono text-white/70 italic">
                                      IN PLAY
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* ----------------- PLAYER 2 (AWAY COMBATANT) ----------------- */}
                        <div className={cn(
                          "relative p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border transition-all duration-300 min-w-0 flex items-center justify-between gap-2.5 sm:gap-3 order-3",
                          p2Winning 
                            ? "bg-gradient-to-l from-secondary/10 via-secondary/5 to-transparent border-secondary/40 shadow-[0_0_20px_rgba(0,229,255,0.1)]" 
                            : "bg-white/[0.02] border-white/10 hover:border-white/20"
                        )}>
                            <div className="flex items-center justify-end gap-2.5 sm:gap-3 min-w-0 flex-1 text-right md:order-1">
                                <div className="flex flex-col min-w-0 items-end pl-1">
                                    <span 
                                      className="text-[8px] sm:text-[9px] font-mono uppercase tracking-wider font-black truncate flex items-center gap-1.5"
                                      style={{ color: secondaryHex }}
                                    >
                                      <span className="truncate">{t2?.name || 'AWAY COMBATANT'}</span>
                                      <span className="w-1.5 h-1.5 rounded-full animate-ping shrink-0" style={{ backgroundColor: secondaryHex }} />
                                    </span>
                                    <h3 className="text-base sm:text-xl lg:text-2xl font-black text-white uppercase italic tracking-tight drop-shadow-md pl-1 leading-tight break-words">
                                      {p2?.name || match.player2Id}
                                    </h3>
                                    {isBo3 && (
                                      <div className="flex items-center gap-1 mt-0.5">
                                          <span className="text-[7.5px] font-mono text-white/40 uppercase tracking-widest mr-1">SERIES</span>
                                          {[...Array(2)].map((_, i) => (
                                              <span 
                                                key={i} 
                                                className={cn(
                                                  "w-3 sm:w-3.5 h-1 rounded-sm border transition-all",
                                                  i < (match.player2Wins || 0) 
                                                    ? "bg-secondary border-secondary shadow-[0_0_6px_rgba(0,229,255,0.8)]" 
                                                    : "bg-white/10 border-white/20"
                                                )}
                                                style={i < (match.player2Wins || 0) ? { backgroundColor: secondaryHex, borderColor: secondaryHex } : {}}
                                              />
                                          ))}
                                      </div>
                                    )}
                                </div>

                                {/* Mecha Angled Logo Shield with Cyber Reticle */}
                                <div className="relative shrink-0 group/crest">
                                    {/* Neon Outer Halo */}
                                    <div 
                                      className="absolute -inset-1 rounded-xl blur-md opacity-35 group-hover/card:opacity-80 transition-opacity pointer-events-none"
                                      style={{ backgroundColor: secondaryHex }}
                                    />
                                    {/* Chamfered Box Shield */}
                                    <div 
                                      className="w-11 h-11 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-xl sm:rounded-2xl border-2 p-1.5 relative flex items-center justify-center overflow-hidden transition-all duration-300 group-hover/card:scale-105 shadow-xl bg-[#070b14]/95 backdrop-blur-md"
                                      style={{ 
                                        borderColor: `${secondaryHex}70`,
                                        boxShadow: `0 0 18px ${secondaryHex}25`
                                      }}
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
                                        {logo2 ? (
                                          <img 
                                            src={logo2} 
                                            alt={p2?.name || 'Player 2'} 
                                            className="w-full h-full object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] select-none"
                                          />
                                        ) : (
                                          <span className="font-black text-xs text-white uppercase font-mono">P2</span>
                                        )}
                                    </div>

                                    {/* Series Wins Pip Node */}
                                    {isBo3 && (
                                      <div 
                                        className="absolute -top-1.5 -left-1.5 font-black text-[10px] w-5 h-5 rounded-md flex items-center justify-center border border-[#090d16] shadow-md text-black font-headline italic"
                                        style={{ 
                                          backgroundColor: secondaryHex,
                                          boxShadow: `0 0 8px ${secondaryHex}`
                                        }}
                                      >
                                          {match.player2Wins ?? 0}
                                      </div>
                                    )}
                                </div>
                            </div>

                            {/* P2 Admin Overdrive Controls */}
                            {isAdmin && (
                              <div className="flex flex-row md:flex-col gap-1.5 shrink-0 md:order-2 z-20">
                                  <Button 
                                    size="icon" 
                                    variant="outline" 
                                    className="h-9 w-9 sm:h-8 sm:w-8 rounded-lg font-black border transition-all active:scale-90"
                                    style={{
                                      borderColor: `${secondaryHex}60`,
                                      backgroundColor: `${secondaryHex}20`,
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
                                    className="h-9 w-9 sm:h-8 sm:w-8 rounded-lg font-black border-white/10 bg-white/5 hover:bg-red-500/20 hover:text-red-400 active:scale-90 transition-all text-white/60"
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

